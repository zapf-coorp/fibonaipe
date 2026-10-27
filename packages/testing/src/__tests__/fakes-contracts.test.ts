import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, RoomCode, isOk } from "@fibonaipe/domain";
import {
  FakeAuthProvider,
  FakeClock,
  FakeExporter,
  FakeIssueTracker,
  FakeRealtime,
  InMemoryPersistence,
  InMemoryRateLimiter,
  SequentialIdGenerator,
} from "@fibonaipe/testing";
import { describeAuthProviderContract } from "../contracts/auth-provider.contract.js";
import { describeExporterContract } from "../contracts/exporter.contract.js";
import { describeIssueTrackerContract } from "../contracts/issue-tracker.contract.js";
import { describePersistenceContract } from "../contracts/persistence.contract.js";
import { describeRateLimiterContract } from "../contracts/rate-limiter.contract.js";
import { describeRealtimeContract } from "../contracts/realtime.contract.js";

describePersistenceContract("InMemoryPersistence", () => new InMemoryPersistence());

describeRealtimeContract("FakeRealtime", () => {
  const hub = new FakeRealtime();
  return {
    publisher: hub,
    createClient: () => hub.createClient(),
    simulateDisconnect: (roomId) => hub.simulateDisconnect(roomId),
    simulatePollingFallback: (roomId) => hub.simulatePollingFallback(roomId),
    simulateReconnect: (roomId) => hub.simulateReconnect(roomId),
  };
});

describeRateLimiterContract("InMemoryRateLimiter", () => {
  const clock = new FakeClock();
  return {
    limiter: new InMemoryRateLimiter(clock),
    now: () => clock.now(),
    advanceSeconds: (seconds) => {
      clock.advanceSeconds(seconds);
    },
  };
});

describeAuthProviderContract("FakeAuthProvider", () => {
  const provider = new FakeAuthProvider();
  return {
    provider,
    latestMagicLinkToken: () => provider.latestMagicLinkToken(),
    latestGoogleCode: () => provider.latestGoogleCode(),
    latestSessionToken: () => provider.latestSessionToken(),
    suspendCurrentUser: () => provider.suspendCurrentUser(),
  };
});

describeIssueTrackerContract("FakeIssueTracker", () => new FakeIssueTracker());

describeExporterContract("FakeExporter", () => new FakeExporter());

describe("FakeIssueTracker", () => {
  it("is the manual provider", () => {
    expect(new FakeIssueTracker().provider).toBe("manual");
  });
});

describe("FakeClock", () => {
  it("starts at the fixed UTC instant and advances without leaking mutations", () => {
    const clock = new FakeClock();
    expect(clock.now().toISOString()).toBe("2026-10-26T12:00:00.000Z");

    const leaked = clock.now();
    leaked.setUTCFullYear(1999);
    expect(clock.now().toISOString()).toBe("2026-10-26T12:00:00.000Z");

    const advanced = clock.advanceMs(1500);
    expect(advanced.toISOString()).toBe("2026-10-26T12:00:01.500Z");
    expect(clock.now().toISOString()).toBe("2026-10-26T12:00:01.500Z");
    expect(advanced).not.toBe(clock.now());

    expect(clock.advanceSeconds(2).toISOString()).toBe("2026-10-26T12:00:03.500Z");
    clock.set("2020-01-02T03:04:05.000Z");
    expect(clock.now().toISOString()).toBe("2020-01-02T03:04:05.000Z");
    clock.set(new Date("2021-01-01T00:00:00.000Z"));
    expect(clock.now().toISOString()).toBe("2021-01-01T00:00:00.000Z");
  });

  it("accepts an explicit initial instant", () => {
    expect(new FakeClock("2020-01-02T03:04:05.000Z").now().toISOString()).toBe("2020-01-02T03:04:05.000Z");
    expect(new FakeClock(new Date("2021-01-01T00:00:00.000Z")).now().toISOString()).toBe(
      "2021-01-01T00:00:00.000Z",
    );
  });
});

describe("SequentialIdGenerator", () => {
  it("issues sequential ULIDs, deterministic tokens, and sha256 hex digests", () => {
    const generator = new SequentialIdGenerator();
    expect(generator.newId()).toBe("01J00000000000000000000001");
    expect(generator.newId()).toBe("01J00000000000000000000002");
    const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
    expect(generator.newId()).toMatch(ulid);

    const fresh = new SequentialIdGenerator();
    fresh.newId();
    const tokenA = fresh.newToken();
    const tokenB = fresh.newToken();
    expect(tokenA).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenB).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenA).not.toBe(tokenB);
    expect(fresh.sha256("fibonaipe")).toBe(createHash("sha256").update("fibonaipe").digest("hex"));
    expect(fresh.sha256("fibonaipe")).toBe(fresh.sha256("fibonaipe"));

    fresh.reset();
    expect(fresh.newId()).toBe("01J00000000000000000000001");
    expect(fresh.newToken()).toBe(tokenA);
  });

  it("issues unique 8-character room codes from the unambiguous alphabet", () => {
    const generator = new SequentialIdGenerator();
    generator.newId();
    const first = generator.newRoomCode();
    expect(first).toBe("23456789");
    expect(isOk(RoomCode.create(first))).toBe(true);

    const codes = [first];
    for (let index = 0; index < 39; index += 1) codes.push(generator.newRoomCode());
    expect(new Set(codes).size).toBe(40);
    expect(ROOM_CODE_LENGTH).toBe(8);
    for (const code of codes) {
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(isOk(RoomCode.create(code))).toBe(true);
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET.includes(char)).toBe(true);
        expect("0O1IL".includes(char)).toBe(false);
      }
    }

    generator.reset();
    expect(generator.newRoomCode()).toBe("23456789");
  });
});
