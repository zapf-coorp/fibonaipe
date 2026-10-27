import { describe, expect, it, vi } from "vitest";
import { ParticipantId, RoomId, RoundId, type AppError, type Result } from "@fibonaipe/domain";
import type { RoomEvent } from "@fibonaipe/application";
import { createRealtimeClient, type RealtimeProviderClient } from "./client.js";

const at = "2026-10-26T12:00:00.000Z";
const SECRET_KEYS = ["card", "cards", "suit", "comment", "shortcomment", "votes", "vote"] as const;

describe("supabase realtime client", () => {
  it("polls within 10s when the provider throws, returns to connected, and fetches one snapshot on a version gap", async () => {
    vi.useFakeTimers();
    try {
      const roomId = must(RoomId.create("room-outage"));
      const participantId = must(ParticipantId.create("participant-outage"));
      const roundId = must(RoundId.create("round-outage"));
      const missing = voteChanged(roomId, participantId, 1);
      const revealed = roundRevealed(roomId, roundId, 2);
      assertNoCardBeforeReveal([missing, revealed]);

      const provider = new ThrowingProvider();
      const fetches: number[] = [];
      const statuses: string[] = [];
      const received: RoomEvent[] = [];
      const gaps: { roomId: RoomId; expectedVersion: number; receivedVersion: number }[] = [];
      const client = createRealtimeClient({
        provider,
        fetchSnapshot: ({ sinceVersion }) => {
          fetches.push(sinceVersion);
          return Promise.resolve([missing, revealed]);
        },
      });

      client.subscribe(roomId, {
        onEvent: (event) => received.push(event),
        onVersionGap: (gap) => gaps.push(gap),
        onConnectionStateChange: (state) => {
          statuses.push(state.status);
          expect(state.pendingOpCount).toBe(0);
        },
      });

      await vi.advanceTimersByTimeAsync(10_000);
      expect(client.getConnectionState()).toMatchObject({
        status: "polling",
        pendingOpCount: 0,
        lastSyncedVersion: 0,
      });
      expect(statuses).toContain("reconnecting");
      expect(statuses).toContain("polling");
      expect(statuses.indexOf("reconnecting")).toBeLessThan(statuses.lastIndexOf("polling"));
      expect(provider.channels).toContain(`room:${roomId}`);

      provider.down = false;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(client.getConnectionState().status).toBe("connected");

      const fetchesBeforeGap = fetches.length;
      provider.emit(revealed);
      await vi.advanceTimersByTimeAsync(0);
      await Promise.resolve();
      expect(fetches.length - fetchesBeforeGap).toBe(1);
      expect(fetches[fetches.length - 1]).toBe(0);
      expect(gaps).toEqual([{ roomId, expectedVersion: 1, receivedVersion: 2 }]);
      expect(received.map((event) => event.version)).toEqual([1, 2]);
      expect(client.getConnectionState()).toMatchObject({ status: "connected", lastSyncedVersion: 2, pendingOpCount: 0 });
      const vote = received[0];
      const reveal = received[1];
      if (!vote || vote.type !== "vote.changed") throw new Error("expected vote.changed");
      if (!reveal || reveal.type !== "round.revealed") throw new Error("expected round.revealed");
      expect(Object.keys(vote.payload).sort()).toEqual(["hasVoted", "participantId"]);
      expect(Object.keys(reveal.payload).sort()).toEqual(["roundId"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

class ThrowingProvider implements RealtimeProviderClient {
  down = true;
  readonly channels: string[] = [];
  private listeners: Array<(event: RoomEvent) => void> = [];

  subscribe(channel: string, handlers: { onEvent(event: RoomEvent): void }): { unsubscribe(): void } {
    this.channels.push(channel);
    if (this.down) throw new Error("provider down");
    this.listeners.push(handlers.onEvent);
    return {
      unsubscribe: () => {
        this.listeners = this.listeners.filter((listener) => listener !== handlers.onEvent);
      },
    };
  }

  emit(event: RoomEvent): void {
    for (const listener of [...this.listeners]) listener(event);
  }
}

function voteChanged(roomId: RoomId, participantId: ParticipantId, version: number): RoomEvent {
  return {
    type: "vote.changed",
    roomId,
    version,
    at,
    payload: { participantId, hasVoted: true },
  };
}

function roundRevealed(roomId: RoomId, roundId: RoundId, version: number): RoomEvent {
  return {
    type: "round.revealed",
    roomId,
    version,
    at,
    payload: { roundId },
  };
}

function assertNoCardBeforeReveal(events: readonly RoomEvent[]): void {
  const revealAt = events.findIndex((event) => event.type === "round.revealed");
  const beforeReveal = revealAt === -1 ? events : events.slice(0, revealAt);
  expect(beforeReveal.length).toBeGreaterThan(0);
  for (const event of beforeReveal) {
    expect(event.type).not.toBe("round.revealed");
    walk(event);
  }
}

function walk(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      expect(SECRET_KEYS).not.toContain(key.toLowerCase() as (typeof SECRET_KEYS)[number]);
      walk(child);
    }
  }
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}
