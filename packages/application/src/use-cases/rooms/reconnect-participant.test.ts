import { describe, expect, it } from "vitest";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { CastVote } from "../voting/voting-commands.js";
import { CreateRoom } from "./create-room.js";
import { JoinRoom } from "./join-room.js";
import { GetRoomSnapshot } from "./room-commands.js";
import { ReconnectParticipant } from "./reconnect-participant.js";
import { asOk, asView, createPorts, type Harness } from "../__tests__/harness.js";

describe("ReconnectParticipant", () => {
  it("restores the same participant and own 8 of clubs, and hides the card from other viewers", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    const bea = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Bea",
        ip: "203.0.113.11",
        mode: "voter",
        role: "dev",
        clientOpId: "join-bea",
      }),
    );
    await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "Bridge work",
      clientOpId: "add-bridge",
    });
    const queued = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    await new SetCurrentItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: queued.queue[0]?.id ?? "",
      clientOpId: "current-bridge",
    });
    const voted = asOk(
      await new CastVote(ports.deps).execute({
        code: created.code,
        participantId: created.participantId,
        card: "8",
        suit: "clubs",
        clientOpId: "vote-8",
      }),
    );
    expect(voted.realtimePending).not.toBe(true);
    const changed = ports.published.filter((event) => event.type === "vote.changed");
    expect(changed).toHaveLength(1);
    expect(changed[0]?.payload).toEqual({ participantId: created.participantId, hasVoted: true });
    expect(ports.order.indexOf("publish")).toBeGreaterThan(ports.order.indexOf("commit"));

    const other = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: bea.participantId },
        }),
      ),
    );
    expect(other.votes).toBeNull();
    expect(other.ownVote).toBeNull();
    expect(other.participants.find((seat) => seat.id === created.participantId)?.hasVoted).toBe(true);
    expect(JSON.stringify({ participants: other.participants, votes: other.votes, ownVote: other.ownVote })).not.toMatch(
      /clubs|hearts|spades|diamonds/,
    );

    const restarted = createPorts({ store: ports.store, clock: ports.clock });
    const again = asOk(
      await new ReconnectParticipant(restarted.deps).execute({
        code: created.code,
        sessionToken: created.hostToken,
      }),
    );
    expect(again.participantId).toBe(created.participantId);
    expect(again.view.ownVote).toMatchObject({
      card: { label: "8", numeric: 8, kind: "numeric" },
      suit: { kind: "clubs" },
      comment: null,
    });
    expect(again.view.votes).toBeNull();
  });

  it("returns FORBIDDEN for a bad cookie", async () => {
    const ports = createPorts();
    const created = await openGuest(ports);
    const bad = await new ReconnectParticipant(ports.deps).execute({
      code: created.code,
      sessionToken: "not-the-cookie",
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) throw new Error("expected FORBIDDEN");
    expect(bad.error.code).toBe("FORBIDDEN");
    expect(JSON.stringify(bad.error)).not.toContain(created.hostToken);
  });
});

async function openGuest(ports: Harness): Promise<{ code: string; hostToken: string; participantId: string }> {
  return asOk(
    await new CreateRoom(ports.deps).execute({
      name: "Sprint",
      ip: "203.0.113.10",
      hostNickname: "Ada",
    }),
  );
}
