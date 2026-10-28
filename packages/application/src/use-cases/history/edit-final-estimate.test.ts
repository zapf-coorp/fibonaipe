import { RoomId, UserId, ok } from "@fibonaipe/domain";
import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { GetRoomSnapshot } from "../rooms/room-commands.js";
import { CreateTeam } from "../teams/create-team.js";
import { CreateTeamRoom } from "../teams/create-team-room.js";
import { asOk, asView, createPorts, readHistory, readRoomByCode, type Harness } from "../__tests__/harness.js";
import { CastVote, RevealRound, SetFinalEstimate } from "../voting/voting-commands.js";
import { EditFinalEstimateWithAudit } from "./edit-final-estimate.js";

const REDIRECT = "https://app.example/callback";

interface HistoryRow {
  readonly roundNumber?: number;
  readonly mean?: number;
  readonly finalEstimate?: string;
}

interface AuditRow {
  readonly from: string;
  readonly to: string;
  readonly changedBy: string;
  readonly at: Date;
}

function seatsOf(room: PersistedRoomRecord | null): readonly { readonly id: string; readonly userId: string | null }[] {
  const planning = (room as { planning?: { participants?: { id: string; userId: string | null }[] } } | null)?.planning;
  return planning?.participants ?? [];
}

function auditsOf(ports: Harness): readonly AuditRow[] {
  const internal = ports.store as unknown as { store?: { audits: Map<string, AuditRow> } };
  return [...(internal.store?.audits.values() ?? [])];
}

async function signIn(ports: Harness, auth: FakeAuthProvider, email: string): Promise<string> {
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  ).userId;
}

async function teamRoom(ports: Harness, userId: string) {
  const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: userId }));
  const created = asOk(
    await new CreateTeamRoom(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: userId,
      name: "Sprint",
      mode: "voter",
    }),
  );
  const stored = await readRoomByCode(ports.store, created.code);
  const host = seatsOf(stored)[0];
  if (!stored || !host) throw new Error("missing team room");
  expect((await new AddItem(ports.deps).execute({
    code: created.code,
    actorParticipantId: host.id,
    title: "Bridge work",
    clientOpId: "add-bridge",
  })).ok).toBe(true);
  const view = asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code: created.code,
        since: 0,
        viewer: { kind: "participant", participantId: host.id },
      }),
    ),
  );
  const itemId = view.queue[0]?.id;
  if (itemId === undefined) throw new Error("missing item");
  expect((await new SetCurrentItem(ports.deps).execute({
    code: created.code,
    actorParticipantId: host.id,
    itemId,
    clientOpId: "current-bridge",
  })).ok).toBe(true);
  expect((await new CastVote(ports.deps).execute({
    code: created.code,
    participantId: host.id,
    card: "13",
    suit: "clubs",
    clientOpId: "vote-13",
  })).ok).toBe(true);
  expect((await new RevealRound(ports.deps).execute({
    code: created.code,
    actorParticipantId: host.id,
    clientOpId: "reveal-13",
  })).ok).toBe(true);
  expect((await new SetFinalEstimate(ports.deps).execute({
    code: created.code,
    actorParticipantId: host.id,
    itemId,
    label: "13",
    clientOpId: "final-13",
  })).ok).toBe(true);
  return { code: created.code, teamId: team.teamId, hostId: host.id, itemId, roomId: stored.id };
}

async function means(ports: Harness, roomId: string): Promise<number[]> {
  const parsed = RoomId.create(roomId);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const rows = (await readHistory(ports.store, parsed.value)) as readonly HistoryRow[];
  return rows.map((row) => {
    if (typeof row.mean !== "number") throw new Error("history row is missing mean");
    return row.mean;
  });
}

describe("EditFinalEstimateWithAudit", () => {
  it("records from 13 to 8 with the actor user id and the injected clock, and keeps the round mean", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const userId = await signIn(ports, auth, "ada@example.com");
    const room = await teamRoom(ports, userId);
    const before = await means(ports, room.roomId);
    expect(before.length).toBeGreaterThan(0);
    ports.clock.advanceSeconds(90);
    const edited = await new EditFinalEstimateWithAudit(ports.deps).execute({
      itemId: room.itemId,
      toCard: "8",
      actorId: userId,
    });
    expect(edited.ok, JSON.stringify(edited)).toBe(true);
    expect(await means(ports, room.roomId)).toEqual(before);
    const audits = auditsOf(ports);
    expect(audits).toHaveLength(1);
    expect(audits[0]?.from).toBe("13");
    expect(audits[0]?.to).toBe("8");
    expect(audits[0]?.changedBy).toBe(userId);
    expect(audits[0]?.changedBy).not.toBe(room.hostId);
    expect(audits[0]?.at.toISOString()).toBe(ports.clock.now().toISOString());
    const parsed = RoomId.create(room.roomId);
    if (!parsed.ok) throw new Error(parsed.error.code);
    const latest = (await readHistory(ports.store, parsed.value)).find((row) => (row as HistoryRow).roundNumber === 1) as HistoryRow;
    expect(latest.finalEstimate).toBe("8");
    expect(JSON.stringify(audits)).not.toContain("Ada");
  });

  it("returns VALIDATION when the new final card is ?, Coringa, or AFK", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const userId = await signIn(ports, auth, "ada@example.com");
    const room = await teamRoom(ports, userId);
    const before = await means(ports, room.roomId);
    for (const toCard of ["?", "Coringa", "AFK"]) {
      const edited = await new EditFinalEstimateWithAudit(ports.deps).execute({
        itemId: room.itemId,
        toCard,
        actorId: userId,
      });
      expect(edited.ok, toCard).toBe(false);
      if (edited.ok) throw new Error("expected VALIDATION");
      expect(edited.error.code, toCard).toBe("VALIDATION");
      expect(edited.error.messageKey, toCard).toBe("errors.VALIDATION");
    }
    expect(auditsOf(ports)).toHaveLength(0);
    expect(await means(ports, room.roomId)).toEqual(before);
  });

  it("returns FORBIDDEN when a dev is neither host nor facilitator", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const adminId = await signIn(ports, auth, "ada@example.com");
    const devId = await signIn(ports, auth, "bea@example.com");
    const room = await teamRoom(ports, adminId);
    const devUser = UserId.create(devId);
    const teamUser = UserId.create(adminId);
    if (!devUser.ok || !teamUser.ok) throw new Error("user ids");
    const saved = await ports.store.transaction({}, async (repos) => {
      const team = await repos.teams.findById((await repos.memberships.listByUser(teamUser.value))[0]?.teamId ?? room.teamId);
      if (!team) return ok(false);
      await repos.memberships.save({ userId: devUser.value, teamId: team.id, role: "dev" });
      return ok(true);
    });
    expect(saved.ok && saved.value).toBe(true);
    const edited = await new EditFinalEstimateWithAudit(ports.deps).execute({
      itemId: room.itemId,
      toCard: "8",
      actorId: devId,
    });
    expect(edited.ok).toBe(false);
    if (edited.ok) throw new Error("expected FORBIDDEN");
    expect(edited.error.code).toBe("FORBIDDEN");
    expect(edited.error.messageKey).toBe("errors.FORBIDDEN");
    expect(auditsOf(ports)).toHaveLength(0);
    expect((await means(ports, room.roomId)).length).toBeGreaterThan(0);
  });
});
