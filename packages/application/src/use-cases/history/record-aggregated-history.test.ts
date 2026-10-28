import { RoomId } from "@fibonaipe/domain";
import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { CreateRoom } from "../rooms/create-room.js";
import { JoinRoom } from "../rooms/join-room.js";
import { GetRoomSnapshot } from "../rooms/room-commands.js";
import { CreateTeam } from "../teams/create-team.js";
import { CreateTeamRoom } from "../teams/create-team-room.js";
import { asOk, asView, createPorts, readHistory, readRoomByCode, type Harness } from "../__tests__/harness.js";
import { CastVote, NewRound, RevealRound, SetFinalEstimate } from "../voting/voting-commands.js";
import { RecordAggregatedHistory } from "./record-aggregated-history.js";

const REDIRECT = "https://app.example/callback";
const FORBIDDEN_KEYS = ["votes", "participantId", "nickname", "comment"] as const;

void RecordAggregatedHistory;

function forbiddenKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) forbiddenKeys(entry, found);
    return found;
  }
  if (typeof value !== "object" || value === null) return found;
  for (const [key, entry] of Object.entries(value)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) found.push(key);
    forbiddenKeys(entry, found);
  }
  return found;
}

function historyCount(ports: Harness): number {
  const internal = ports.store as unknown as { store?: { history: Map<string, unknown> } };
  return internal.store?.history.size ?? -1;
}

interface Seat {
  readonly id: string;
  readonly userId: string | null;
  readonly nickname: string;
}

function seatsOf(room: PersistedRoomRecord | null): readonly Seat[] {
  const planning = (room as { planning?: { participants?: readonly Seat[] } } | null)?.planning;
  return planning?.participants ?? [];
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

async function currentItem(ports: Harness, code: string, hostId: string, title: string, op: string): Promise<string> {
  expect((await new AddItem(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    title,
    clientOpId: `add-${op}`,
  })).ok).toBe(true);
  const view = asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code,
        since: 0,
        viewer: { kind: "participant", participantId: hostId },
      }),
    ),
  );
  const itemId = view.queue.find((item) => item.status === "pending")?.id;
  if (itemId === undefined) throw new Error("missing item");
  expect((await new SetCurrentItem(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    itemId,
    clientOpId: `current-${op}`,
  })).ok).toBe(true);
  return itemId;
}

async function vote(ports: Harness, code: string, participantId: string, card: string, op: string, comment?: string) {
  expect((await new CastVote(ports.deps).execute({
    code,
    participantId,
    card,
    suit: "clubs",
    comment,
    clientOpId: `vote-${op}`,
  })).ok).toBe(true);
}

async function reveal(ports: Harness, code: string, hostId: string, op: string) {
  expect((await new RevealRound(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    clientOpId: `reveal-${op}`,
  })).ok).toBe(true);
}

describe("RecordAggregatedHistory", () => {
  it("writes two aggregate rows when a team room sets the final estimate after two revealed rounds", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const userId = await signIn(ports, auth, "ada@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: userId }));
    const room = asOk(
      await new CreateTeamRoom(ports.deps).execute({
        teamId: team.teamId,
        actorUserId: userId,
        name: "Sprint",
        mode: "voter",
      }),
    );
    const stored = await readRoomByCode(ports.store, room.code);
    expect(stored?.kind).toBe("team");
    expect(stored?.expiresAt).toBeNull();
    const host = seatsOf(stored)[0];
    if (host === undefined) throw new Error("missing host");
    const bea = asOk(
      await new JoinRoom(ports.deps).execute({
        code: room.code,
        nickname: "Bea",
        ip: "203.0.113.21",
        mode: "voter",
        role: "dev",
        clientOpId: "join-bea",
      }),
    );
    const cam = asOk(
      await new JoinRoom(ports.deps).execute({
        code: room.code,
        nickname: "Cam",
        ip: "203.0.113.22",
        mode: "voter",
        role: "qa",
        clientOpId: "join-cam",
      }),
    );
    const itemId = await currentItem(ports, room.code, host.id, "Bridge work", "item");
    await vote(ports, room.code, host.id, "5", "h1");
    await vote(ports, room.code, bea.participantId, "8", "b1", "secret-note");
    await vote(ports, room.code, cam.participantId, "13", "c1");
    await reveal(ports, room.code, host.id, "r1");
    expect((await new NewRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: host.id,
      itemId,
      clientOpId: "round-2",
    })).ok).toBe(true);
    await vote(ports, room.code, host.id, "8", "h2");
    await vote(ports, room.code, bea.participantId, "8", "b2");
    await vote(ports, room.code, cam.participantId, "13", "c2");
    await reveal(ports, room.code, host.id, "r2");

    const before = historyCount(ports);
    const estimated = await new SetFinalEstimate(ports.deps).execute({
      code: room.code,
      actorParticipantId: host.id,
      itemId,
      label: "13",
      clientOpId: "final-13",
    });
    expect(estimated.ok, JSON.stringify(estimated)).toBe(true);

    const roomId = RoomId.create(stored?.id ?? "");
    if (!roomId.ok) throw new Error(roomId.error.code);
    const rows = await readHistory(ports.store, roomId.value);
    expect(rows).toHaveLength(2);
    expect(historyCount(ports)).toBe(before + 2);
    const numbers = rows.map((row) => (row as { roundNumber?: number }).roundNumber).sort();
    expect(numbers).toEqual([1, 2]);
    const latest = rows.find((row) => (row as { roundNumber?: number }).roundNumber === 2) as { finalEstimate?: string; mean?: number };
    expect(latest.finalEstimate).toBe("13");
    expect(typeof latest.mean).toBe("number");
    const json = JSON.stringify(rows);
    expect(forbiddenKeys(rows)).toEqual([]);
    expect(json).not.toMatch(/"votes"|"participantId"|"nickname"|"comment"/);
    expect(json).not.toContain(host.id);
    expect(json).not.toContain(bea.participantId);
    expect(json).not.toContain(cam.participantId);
    expect(json).not.toContain("Bea");
    expect(json).not.toContain("Cam");
    expect(json).not.toContain("secret-note");
  });

  it("does not write history when a guest room sets the final estimate", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.30",
        hostNickname: "Ada",
      }),
    );
    const hostId = created.participantId;
    const itemId = await currentItem(ports, created.code, hostId, "Guest item", "guest");
    await vote(ports, created.code, hostId, "8", "guest");
    await reveal(ports, created.code, hostId, "guest");
    const before = historyCount(ports);
    const estimated = await new SetFinalEstimate(ports.deps).execute({
      code: created.code,
      actorParticipantId: hostId,
      itemId,
      label: "8",
      clientOpId: "final-guest",
    });
    expect(estimated.ok, JSON.stringify(estimated)).toBe(true);
    const stored = await readRoomByCode(ports.store, created.code);
    const roomId = RoomId.create(stored?.id ?? "");
    if (!roomId.ok) throw new Error(roomId.error.code);
    expect(await readHistory(ports.store, roomId.value)).toHaveLength(0);
    expect(historyCount(ports)).toBe(before);
    expect(stored?.kind).toBe("guest");
  });
});
