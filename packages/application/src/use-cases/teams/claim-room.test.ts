import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { CreateRoom } from "../rooms/create-room.js";
import { GetRoomSnapshot } from "../rooms/room-commands.js";
import { asOk, asView, createPorts, hasIndividualVote, readHistory, readRoomByCode, type Harness } from "../__tests__/harness.js";
import { CastVote, RevealRound, SetFinalEstimate } from "../voting/voting-commands.js";
import { ClaimRoom } from "./claim-room.js";
import { CreateTeam } from "./create-team.js";

const REDIRECT = "https://app.example/callback";

interface StoredItem {
  readonly title: string;
  readonly status: string;
  readonly finalEstimate: { readonly label: string } | null;
}

function itemsOf(room: PersistedRoomRecord | null): readonly StoredItem[] {
  const planning = (room as { planning?: { items?: readonly StoredItem[] } } | null)?.planning;
  return planning?.items ?? [];
}

async function estimate(ports: Harness, code: string, hostId: string, title: string, label: string, suffix: string) {
  expect((await new AddItem(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    title,
    clientOpId: `add-${suffix}`,
  })).ok).toBe(true);
  const queued = asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code,
        since: 0,
        viewer: { kind: "participant", participantId: hostId },
      }),
    ),
  );
  const itemId = queued.queue.find((item) => item.status === "pending")?.id ?? queued.queue[queued.queue.length - 1]?.id;
  if (itemId === undefined) throw new Error(`missing item ${title}`);
  expect((await new SetCurrentItem(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    itemId,
    clientOpId: `current-${suffix}`,
  })).ok).toBe(true);
  expect((await new CastVote(ports.deps).execute({
    code,
    participantId: hostId,
    card: label,
    suit: "clubs",
    clientOpId: `vote-${suffix}`,
  })).ok).toBe(true);
  expect((await new RevealRound(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    clientOpId: `reveal-${suffix}`,
  })).ok).toBe(true);
  expect((await new SetFinalEstimate(ports.deps).execute({
    code,
    actorParticipantId: hostId,
    itemId,
    label,
    clientOpId: `final-${suffix}`,
  })).ok).toBe(true);
  return itemId;
}

describe("ClaimRoom", () => {
  it("clears expiresAt, sets the team, and keeps the two estimated items for a valid host token", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    const bridge = await estimate(ports, created.code, created.participantId, "Bridge", "5", "bridge");
    const tunnel = await estimate(ports, created.code, created.participantId, "Tunnel", "8", "tunnel");
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    const user = asOk(
      await new CompleteSignIn(ports.deps, auth).execute({
        token: auth.latestMagicLinkToken(),
        superAdminEmails: [],
      }),
    );
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: user.userId }));

    const claimed = await new ClaimRoom(ports.deps).execute({
      roomCode: created.code,
      hostToken: created.hostToken,
      teamId: team.teamId,
    });
    expect(claimed.ok, JSON.stringify(claimed)).toBe(true);
    if (!claimed.ok) throw new Error(claimed.error.code);
    expect(claimed.value.teamId).toBe(team.teamId);
    expect(claimed.value.roomId.length).toBeGreaterThan(0);
    expect(hasIndividualVote(claimed.value)).toBe(false);

    const stored = await readRoomByCode(ports.store, created.code);
    expect(stored?.kind).toBe("team");
    expect(stored?.teamId).toBe(team.teamId);
    expect(stored?.expiresAt).toBeNull();
    const items = itemsOf(stored);
    expect(items.map((item) => item.title).sort()).toEqual(["Bridge", "Tunnel"]);
    expect(items.every((item) => item.status === "estimated")).toBe(true);
    expect(items.map((item) => item.finalEstimate?.label).sort()).toEqual(["5", "8"]);
    expect(JSON.stringify(stored)).not.toContain(created.hostToken);
    expect(JSON.stringify(ports.logArgs)).not.toContain(created.hostToken);
    expect(JSON.stringify(ports.logArgs)).not.toContain("Ada");
    expect(hasIndividualVote(ports.logArgs)).toBe(false);
    expect(hasIndividualVote(await readHistory(ports.store, claimed.value.roomId))).toBe(false);
    expect(bridge).not.toBe(tunnel);
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });

  it("returns FORBIDDEN for the wrong token and leaves the guest room expiring", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.20",
        hostNickname: "Ada",
      }),
    );
    const before = await readRoomByCode(ports.store, created.code);
    expect(before?.kind).toBe("guest");
    expect(before?.expiresAt).not.toBeNull();
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    const user = asOk(
      await new CompleteSignIn(ports.deps, auth).execute({
        token: auth.latestMagicLinkToken(),
        superAdminEmails: [],
      }),
    );
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: user.userId }));

    const claimed = await new ClaimRoom(ports.deps).execute({
      roomCode: created.code,
      hostToken: "wrong-host-token",
      teamId: team.teamId,
    });
    expect(claimed.ok).toBe(false);
    if (claimed.ok) throw new Error("expected FORBIDDEN");
    expect(claimed.error.code).toBe("FORBIDDEN");
    expect(claimed.error.messageKey).toBe("errors.FORBIDDEN");

    const after = await readRoomByCode(ports.store, created.code);
    expect(after?.kind).toBe("guest");
    expect(after?.teamId).toBeNull();
    expect(after?.expiresAt?.toISOString()).toBe(before?.expiresAt?.toISOString());
    expect(JSON.stringify(after)).not.toContain("wrong-host-token");
    expect(JSON.stringify(ports.logArgs)).not.toContain("Ada");
  });
});
