import { describe, expect, it } from "vitest";
import { ParticipantId, RoomId, RoundId, type Result, type AppError } from "@fibonaipe/domain";
import type { RealtimeClient, RealtimePublisher, RoomEvent } from "@fibonaipe/application";

type VoteChangedPayload = Extract<RoomEvent, { type: "vote.changed" }>["payload"];
type VotePayloadExact = Exclude<keyof VoteChangedPayload, "participantId" | "hasVoted"> extends never
  ? "participantId" extends keyof VoteChangedPayload
    ? "hasVoted" extends keyof VoteChangedPayload
      ? true
      : never
    : never
  : never;

const votePayloadIsHasVotedOnly: VotePayloadExact = true;

export interface RealtimeContractHarness {
  readonly publisher: RealtimePublisher;
  createClient(): RealtimeClient;
  simulateDisconnect(roomId: RoomId): void;
  simulatePollingFallback(roomId: RoomId): void;
  simulateReconnect(roomId: RoomId): void;
}

const at = "2026-10-26T12:00:00.000Z";

export function describeRealtimeContract(name: string, factory: () => RealtimeContractHarness): void {
  describe(name, () => {
    it("delivers contiguous versions in order and vote.changed carries only participantId and hasVoted", async () => {
      expect(votePayloadIsHasVotedOnly).toBe(true);
      const harness = factory();
      const roomId = must(RoomId.create("room-ordered"));
      const received: RoomEvent[] = [];
      const client = harness.createClient();
      const subscription = client.subscribe(roomId, { onEvent: (event) => received.push(event) });

      expect(subscription.getLastVersion()).toBe(0);
      await publish(harness, voteChanged(roomId, 1, false));
      await publish(harness, voteChanged(roomId, 2, true));
      await publish(harness, voteChanged(roomId, 3, true));

      expect(received.map((event) => event.version)).toEqual([1, 2, 3]);
      expect(subscription.getLastVersion()).toBe(3);
      for (const event of received) {
        expect(event.type).toBe("vote.changed");
        expect(event.roomId).toBe(roomId);
        expect(event.at).toBe(at);
        if (event.type !== "vote.changed") throw new Error("expected vote.changed");
        expect(Object.keys(event.payload).sort()).toEqual(["hasVoted", "participantId"]);
        expect(event.payload.participantId).toBe(participant);
        expect(typeof event.payload.hasVoted).toBe("boolean");
      }
    });

    it("ignores duplicate and stale versions", async () => {
      const harness = factory();
      const roomId = must(RoomId.create("room-duplicate"));
      const received: number[] = [];
      const gaps: unknown[] = [];
      harness.createClient().subscribe(roomId, {
        onEvent: (event) => received.push(event.version),
        onVersionGap: (gap) => gaps.push(gap),
      });

      await publish(harness, voteChanged(roomId, 1, true));
      await publish(harness, voteChanged(roomId, 1, false));
      await publish(harness, voteChanged(roomId, 2, true));
      await publish(harness, voteChanged(roomId, 1, true));

      expect(received).toEqual([1, 2]);
      expect(gaps).toEqual([]);
    });

    it("reports an out-of-order version gap and flushes the buffered event once the missing version arrives", async () => {
      const harness = factory();
      const roomId = must(RoomId.create("room-gap"));
      const received: number[] = [];
      const gaps: { roomId: RoomId; expectedVersion: number; receivedVersion: number }[] = [];
      const subscription = harness.createClient().subscribe(roomId, {
        onEvent: (event) => received.push(event.version),
        onVersionGap: (gap) => gaps.push(gap),
      });

      await publish(harness, voteChanged(roomId, 1, true));
      await publish(harness, voteChanged(roomId, 3, false));

      expect(received).toEqual([1]);
      expect(subscription.getLastVersion()).toBe(1);
      expect(gaps).toEqual([{ roomId, expectedVersion: 2, receivedVersion: 3 }]);

      await publish(harness, voteChanged(roomId, 2, true));
      expect(received).toEqual([1, 2, 3]);
      expect(subscription.getLastVersion()).toBe(3);
    });

    it("moves connected to reconnecting to polling to connected and replays missed events in order", async () => {
      const harness = factory();
      const roomId = must(RoomId.create("room-1"));
      const received: RoomEvent[] = [];
      const statuses: string[] = [];
      const client = harness.createClient();
      const subscription = client.subscribe(roomId, {
        onEvent: (event) => received.push(event),
        onConnectionStateChange: (state) => {
          statuses.push(state.status);
          expect(state.pendingOpCount).toBe(0);
        },
      });

      expect(statuses).toEqual(["connected"]);
      expect(client.getConnectionState()).toMatchObject({
        status: "connected",
        pendingOpCount: 0,
        lastSyncedVersion: 0,
      });

      for (let version = 1; version <= 4; version += 1) {
        await publish(harness, voteChanged(roomId, version, version % 2 === 0));
      }
      expect(received.map((event) => event.version)).toEqual([1, 2, 3, 4]);

      harness.simulateDisconnect(roomId);
      await Promise.resolve();
      expect(client.getConnectionState().status).toBe("reconnecting");
      await publish(harness, voteChanged(roomId, 5, true));
      expect(received).toHaveLength(4);

      harness.simulatePollingFallback(roomId);
      await Promise.resolve();
      expect(client.getConnectionState().status).toBe("polling");
      await publish(harness, roundRevealed(roomId, 6));
      expect(received).toHaveLength(4);
      expect(client.getConnectionState().lastSyncedVersion).toBe(4);

      harness.simulateReconnect(roomId);
      await Promise.resolve();
      expect(client.getConnectionState()).toMatchObject({
        status: "connected",
        pendingOpCount: 0,
        lastSyncedVersion: 6,
      });
      expect(statuses).toEqual(["connected", "reconnecting", "polling", "connected"]);
      expect(received.map((event) => event.version)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(subscription.getLastVersion()).toBe(6);

      const revealed = received[5];
      if (!revealed || revealed.type !== "round.revealed") throw new Error("expected round.revealed");
      expect(Object.keys(revealed.payload).sort()).toEqual(["roundId"]);
      const fifth = received[4];
      if (!fifth || fifth.type !== "vote.changed") throw new Error("expected vote.changed");
      expect(Object.keys(fifth.payload).sort()).toEqual(["hasVoted", "participantId"]);
      expect(fifth.payload.hasVoted).toBe(true);
    });

    it("stops delivery after unsubscribe and reports disconnected", async () => {
      const harness = factory();
      const roomId = must(RoomId.create("room-unsub"));
      const received: number[] = [];
      const statuses: string[] = [];
      const client = harness.createClient();
      const subscription = client.subscribe(roomId, {
        onEvent: (event) => received.push(event.version),
        onConnectionStateChange: (state) => statuses.push(state.status),
      });
      await publish(harness, voteChanged(roomId, 1, true));
      subscription.unsubscribe();
      expect(client.getConnectionState().status).toBe("disconnected");
      expect(statuses).toEqual(["connected", "disconnected"]);
      await publish(harness, voteChanged(roomId, 2, true));
      expect(received).toEqual([1]);
    });

    it("does not deliver events from another room", async () => {
      const harness = factory();
      const roomA = must(RoomId.create("room-iso-a"));
      const roomB = must(RoomId.create("room-iso-b"));
      const received: string[] = [];
      harness.createClient().subscribe(roomA, {
        onEvent: (event) => received.push(event.roomId),
      });
      await publish(harness, voteChanged(roomB, 1, true));
      await publish(harness, voteChanged(roomA, 1, false));
      expect(received).toEqual([roomA]);
    });
  });
}

const participant = must(ParticipantId.create("participant-1"));
const roundId = must(RoundId.create("round-1"));

function voteChanged(roomId: RoomId, version: number, hasVoted: boolean): RoomEvent {
  return {
    type: "vote.changed",
    roomId,
    version,
    at,
    payload: { participantId: participant, hasVoted },
  };
}

function roundRevealed(roomId: RoomId, version: number): RoomEvent {
  return {
    type: "round.revealed",
    roomId,
    version,
    at,
    payload: { roundId },
  };
}

async function publish(harness: RealtimeContractHarness, event: RoomEvent): Promise<void> {
  const result = await harness.publisher.publish(event.roomId, event);
  expect(result.ok).toBe(true);
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}
