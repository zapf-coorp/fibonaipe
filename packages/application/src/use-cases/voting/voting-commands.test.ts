import { ONLINE_WINDOW_SECONDS } from "@fibonaipe/domain";
import { describe, expect, it } from "vitest";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { CreateRoom } from "../rooms/create-room.js";
import { Heartbeat } from "../rooms/heartbeat.js";
import { JoinRoom } from "../rooms/join-room.js";
import { GetRoomSnapshot, UpdateRoomSettings } from "../rooms/room-commands.js";
import { CastVote, NewRound, RetractVote, RevealRound, SetFinalEstimate, StartTimer, StopTimer } from "./voting-commands.js";
import { asOk, asView, createPorts, readRoomByCode, type Harness } from "../__tests__/harness.js";

describe("voting commands", () => {
  it("publishes vote.changed after commit with participantId and hasVoted only", async () => {
    let code = "";
    let participantId = "";
    let voteVisibleAtPublish = false;
    const ports = createPorts({
      onPublish: async (event) => {
        if (event.type !== "vote.changed" || code.length === 0) return;
        const reader = createPorts({ store: ports.store, clock: ports.clock });
        const snap = await new GetRoomSnapshot(reader.deps).execute({
          code,
          since: 0,
          viewer: { kind: "participant", participantId },
        });
        if (!snap.ok || snap.value.unchanged) return;
        const ownVote = snap.value.view.ownVote;
        voteVisibleAtPublish =
          ownVote?.card.label === "8" && ownVote.card.kind === "numeric" && ownVote.suit.kind === "clubs" && snap.value.view.votes === null;
      },
    });
    const room = await openVotingRoom(ports);
    code = room.code;
    participantId = room.hostId;
    const voted = asOk(
      await new CastVote(ports.deps).execute({
        code,
        participantId,
        card: "8",
        suit: "clubs",
        clientOpId: "vote-8",
      }),
    );
    expect(voted.realtimePending).not.toBe(true);
    expect(voteVisibleAtPublish).toBe(true);
    expect(ports.order[0]).toBe("commit");
    expect(ports.order).toContain("publish");
    expect(ports.order.indexOf("publish")).toBeGreaterThan(ports.order.indexOf("commit"));
    const changed = ports.published.filter((event) => event.type === "vote.changed");
    expect(changed).toHaveLength(1);
    expect(changed[0]?.payload).toEqual({ participantId, hasVoted: true });
    expect(Object.keys(changed[0]?.payload ?? {}).sort()).toEqual(["hasVoted", "participantId"]);
  });

  it("ignores a repeated clientOpId and a same-card replay, and replaces a changed card once", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports);
    const cast = new CastVote(ports.deps);
    await cast.execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      clientOpId: "vote-1",
    });
    const replayedOp = await cast.execute({
      code: room.code,
      participantId: room.hostId,
      card: "13",
      suit: "hearts",
      clientOpId: "vote-1",
    });
    expect(replayedOp.ok).toBe(true);
    const sameCard = await cast.execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      clientOpId: "vote-2",
    });
    expect(sameCard.ok).toBe(true);
    expect(ports.published.filter((event) => event.type === "vote.changed")).toHaveLength(1);
    expect((await ownVote(ports, room)).card.label).toBe("8");

    const changed = await cast.execute({
      code: room.code,
      participantId: room.hostId,
      card: "13",
      suit: "hearts",
      clientOpId: "vote-3",
    });
    expect(changed.ok).toBe(true);
    expect(ports.published.filter((event) => event.type === "vote.changed")).toHaveLength(2);
    expect(ports.published.filter((event) => event.type === "vote.changed")[1]?.payload).toEqual({
      participantId: room.hostId,
      hasVoted: true,
    });
    expect((await ownVote(ports, room)).card.label).toBe("13");

    const revealed = await new RevealRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      clientOpId: "reveal-1",
    });
    expect(revealed.ok).toBe(true);
    const view = await hostView(ports, room);
    expect(view.currentRound?.status).toBe("revealed");
    expect(view.stats?.voteCount).toBe(1);
    expect(view.votes).toHaveLength(1);
    const revealedEvent = ports.published.find((event) => event.type === "round.revealed");
    expect(revealedEvent?.payload).toEqual({ roundId: view.currentRound?.id });
    expect(Object.keys(revealedEvent?.payload ?? {})).toEqual(["roundId"]);
  });

  it("keeps both votes when two participants cast together", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports, { secondVoter: true });
    const [first, second] = await Promise.all([
      new CastVote(ports.deps).execute({
        code: room.code,
        participantId: room.hostId,
        card: "8",
        suit: "clubs",
        clientOpId: "vote-ada",
      }),
      new CastVote(ports.deps).execute({
        code: room.code,
        participantId: room.otherId ?? "",
        card: "5",
        suit: "hearts",
        clientOpId: "vote-bea",
      }),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    const events = ports.published.filter((event) => event.type === "vote.changed");
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(Object.keys(event.payload).sort()).toEqual(["hasVoted", "participantId"]);
      expect(event.payload).toMatchObject({ hasVoted: true });
    }
    expect(ports.published.some((event) => event.type === "round.revealed")).toBe(false);
    const view = await hostView(ports, room);
    expect(view.votes).toBeNull();
    expect(view.participants.find((seat) => seat.id === room.hostId)?.hasVoted).toBe(true);
    expect(view.participants.find((seat) => seat.id === room.otherId)?.hasVoted).toBe(true);
    expect(JSON.stringify(view.participants)).not.toMatch(/clubs|hearts/);

    await new RevealRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      clientOpId: "reveal-both",
    });
    const open = await hostView(ports, room);
    expect(open.stats?.voteCount).toBe(2);
    expect(open.votes).toHaveLength(2);
  });

  it("reveals on the last online non-AFK vote and leaves a single unfinished vote hidden", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports, { autoReveal: true, secondVoter: true, observer: true, afk: true });
    const seated = await hostView(ports, room);
    expect(seated.participants.find((seat) => seat.nickname === "Fern")?.afk).toBe(true);
    expect(seated.participants.find((seat) => seat.nickname === "Omar")?.mode).toBe("observer");
    const waiting = asOk(
      await new CastVote(ports.deps).execute({
        code: room.code,
        participantId: room.hostId,
        card: "8",
        suit: "clubs",
        clientOpId: "vote-ada",
      }),
    );
    expect(waiting.realtimePending).not.toBe(true);
    expect((await hostView(ports, room)).currentRound?.status).toBe("voting");
    expect(ports.published.some((event) => event.type === "round.revealed")).toBe(false);

    ports.clock.advanceSeconds(ONLINE_WINDOW_SECONDS + 1);
    await new Heartbeat(ports.deps).execute({
      code: room.code,
      participantId: room.otherId ?? "",
      clientOpId: "hb-bea",
    });
    const finished = await new CastVote(ports.deps).execute({
      code: room.code,
      participantId: room.otherId ?? "",
      card: "5",
      suit: "hearts",
      clientOpId: "vote-bea",
    });
    expect(finished.ok).toBe(true);
    const revealed = await hostView(ports, room);
    expect(revealed.currentRound?.status).toBe("revealed");
    const wire = ports.published.find((event) => event.type === "round.revealed");
    expect(wire?.payload).toEqual({ roundId: revealed.currentRound?.id });
    for (const event of ports.published.filter((entry) => entry.type === "vote.changed")) {
      expect(Object.keys(event.payload).sort()).toEqual(["hasVoted", "participantId"]);
    }
  });

  it("does not reveal a stored vote when nobody eligible is online or when the timer is epoch zero", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports, { autoReveal: true, secondVoter: true });
    await new CastVote(ports.deps).execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      clientOpId: "vote-ada",
    });
    expect((await hostView(ports, room)).currentRound?.status).toBe("voting");
    ports.clock.advanceSeconds(ONLINE_WINDOW_SECONDS + 1);

    const started = await new StartTimer(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      endsAt: new Date(0),
      clientOpId: "timer-zero",
    });
    expect(started.ok).toBe(true);
    expect(ports.published).toContainEqual(expect.objectContaining({ type: "timer.updated", payload: { endsAt: new Date(0).toISOString() } }));
    expect((await hostView(ports, room)).currentRound?.status).toBe("voting");
    expect(ports.published.some((event) => event.type === "round.revealed")).toBe(false);

    const stopped = await new StopTimer(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      clientOpId: "timer-stop",
    });
    expect(stopped.ok).toBe(true);
    expect(ports.published).toContainEqual(expect.objectContaining({ type: "timer.updated", payload: { endsAt: null } }));
    expect((await hostView(ports, room)).currentRound?.status).toBe("voting");
  });

  it("keeps the committed vote and returns realtimePending when publish throws", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports);
    const failing = createPorts({ store: ports.store, clock: ports.clock, failPublish: true });
    const voted = await new CastVote(failing.deps).execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      clientOpId: "vote-8",
    });
    expect(voted.ok).toBe(true);
    if (!voted.ok) throw new Error("expected success");
    expect(voted.value.realtimePending).toBe(true);
    const reader = createPorts({ store: ports.store, clock: ports.clock });
    const view = await hostView(reader, room);
    expect(view.ownVote).toMatchObject({ card: { label: "8", kind: "numeric" }, suit: { kind: "clubs" } });
  });

  it("retracts a vote, reveals without values, opens a new round, and sets the final estimate", async () => {
    const ports = createPorts();
    const room = await openVotingRoom(ports, { secondVoter: true });
    const outsider = await new RevealRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.otherId ?? "",
      clientOpId: "reveal-bea",
    });
    expect(outsider.ok).toBe(false);
    if (outsider.ok) throw new Error("expected FORBIDDEN");
    expect(outsider.error.code).toBe("FORBIDDEN");

    await new CastVote(ports.deps).execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      comment: "secret-note",
      clientOpId: "vote-8",
    });
    const retracted = await new RetractVote(ports.deps).execute({
      code: room.code,
      participantId: room.hostId,
      clientOpId: "retract-8",
    });
    expect(retracted.ok).toBe(true);
    expect(ports.published.filter((event) => event.type === "vote.changed").at(-1)?.payload).toEqual({
      participantId: room.hostId,
      hasVoted: false,
    });
    expect((await hostView(ports, room)).ownVote).toBeNull();
    expect((await hostView(ports, room)).participants.find((seat) => seat.id === room.hostId)?.hasVoted).toBe(false);

    await new CastVote(ports.deps).execute({
      code: room.code,
      participantId: room.hostId,
      card: "8",
      suit: "clubs",
      clientOpId: "vote-8b",
    });
    await new CastVote(ports.deps).execute({
      code: room.code,
      participantId: room.otherId ?? "",
      card: "13",
      suit: "hearts",
      clientOpId: "vote-13",
    });
    await new RevealRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      clientOpId: "reveal-host",
    });
    const revealed = await hostView(ports, room);
    expect(revealed.currentRound?.status).toBe("revealed");
    expect(revealed.votes?.map((vote) => vote.card.label).sort()).toEqual(["13", "8"]);
    expect(JSON.stringify(revealed.votes)).not.toContain("secret-note");

    const estimated = await new SetFinalEstimate(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      itemId: room.itemId,
      label: "21",
      clientOpId: "final-21",
    });
    expect(estimated.ok).toBe(true);
    expect((await hostView(ports, room)).queue.find((item) => item.id === room.itemId)?.finalEstimate).toMatchObject({
      label: "21",
    });
    expect((await readRoomByCode(ports.store, room.code))?.teamId).toBeNull();

    const next = await new NewRound(ports.deps).execute({
      code: room.code,
      actorParticipantId: room.hostId,
      itemId: room.itemId,
      clientOpId: "round-2",
    });
    expect(next.ok).toBe(true);
    const again = await hostView(ports, room);
    expect(again.currentItem?.status).toBe("current");
    expect(again.currentRound?.status).toBe("voting");
    expect(again.ownVote).toBeNull();
    expect(again.queue.find((item) => item.id === room.itemId)?.finalEstimate).toMatchObject({ label: "21" });
    expect(ports.published).toContainEqual(
      expect.objectContaining({ type: "round.started", payload: { roundId: again.currentRound?.id, itemId: room.itemId } }),
    );
  });
});

interface VotingRoom {
  readonly code: string;
  readonly hostId: string;
  readonly itemId: string;
  readonly otherId?: string;
}

async function openVotingRoom(
  ports: Harness,
  options?: { autoReveal?: boolean; secondVoter?: boolean; observer?: boolean; afk?: boolean },
): Promise<VotingRoom> {
  const created = asOk(
    await new CreateRoom(ports.deps).execute({
      name: "Sprint",
      ip: "203.0.113.40",
      hostNickname: "Ada",
    }),
  );
  if (options?.autoReveal) {
    const updated = await new UpdateRoomSettings(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      autoReveal: true,
      clientOpId: "settings-auto",
    });
    if (!updated.ok) throw new Error(updated.error.code);
  }
  let otherId: string | undefined;
  if (options?.secondVoter) {
    otherId = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Bea",
        ip: "203.0.113.41",
        mode: "voter",
        role: "dev",
        clientOpId: "join-bea",
      }),
    ).participantId;
  }
  if (options?.observer) {
    await new JoinRoom(ports.deps).execute({
      code: created.code,
      nickname: "Omar",
      ip: "203.0.113.42",
      mode: "observer",
      role: "observer",
      clientOpId: "join-omar",
    });
  }
  if (options?.afk) {
    await new JoinRoom(ports.deps).execute({
      code: created.code,
      nickname: "Fern",
      ip: "203.0.113.43",
      mode: "voter",
      role: "dev",
      afk: true,
      clientOpId: "join-fern",
    });
  }
  const added = await new AddItem(ports.deps).execute({
    code: created.code,
    actorParticipantId: created.participantId,
    title: "Bridge work",
    clientOpId: "add-bridge",
  });
  if (!added.ok) throw new Error(added.error.code);
  const queued = asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code: created.code,
        since: 0,
        viewer: { kind: "participant", participantId: created.participantId },
      }),
    ),
  );
  const itemId = queued.queue[0]?.id;
  if (itemId === undefined) throw new Error("expected an item");
  const current = await new SetCurrentItem(ports.deps).execute({
    code: created.code,
    actorParticipantId: created.participantId,
    itemId,
    clientOpId: "current-bridge",
  });
  if (!current.ok) throw new Error(current.error.code);
  return { code: created.code, hostId: created.participantId, itemId, ...(otherId === undefined ? {} : { otherId }) };
}

async function hostView(ports: Harness, room: VotingRoom) {
  return asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code: room.code,
        since: 0,
        viewer: { kind: "participant", participantId: room.hostId },
      }),
    ),
  );
}

async function ownVote(ports: Harness, room: VotingRoom) {
  const vote = (await hostView(ports, room)).ownVote;
  if (vote === null) throw new Error("expected own vote");
  return vote;
}
