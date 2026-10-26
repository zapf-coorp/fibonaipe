import { describe, expect, it } from "vitest";
import {
  MAX_PARTICIPANTS,
  OPERATIONAL_CONSTANTS,
  RATE_LIMIT_CREATE_ROOM,
  ROOM_CODE_ALPHABET,
  RoomCode,
  RoomId,
  isOk,
} from "../../index.js";

describe("ids", () => {
  it("accepts a compact entity id and rejects blank or ambiguous whitespace", () => {
    expect(isOk(RoomId.create("room_01"))).toBe(true);
    expect(RoomId.create("").ok).toBe(false);
    expect(RoomId.create("has space").ok).toBe(false);
    expect(RoomId.create("bad\nid").ok).toBe(false);
  });

  it("accepts an unambiguous room code and rejects lookalikes", () => {
    expect(RoomCode.create("23456789").ok).toBe(true);
    expect(RoomCode.create(" 23456789 ").ok).toBe(true);
    expect(RoomCode.create("2345678O").ok).toBe(false);
    expect(RoomCode.create("23456781").ok).toBe(false);
    expect(RoomCode.create("2345678I").ok).toBe(false);
    expect(RoomCode.create("2345678L").ok).toBe(false);
    expect(RoomCode.create("2345678").ok).toBe(false);
    for (const char of ROOM_CODE_ALPHABET) {
      expect("01OIL".includes(char)).toBe(false);
    }
  });
});

describe("constants", () => {
  it("matches the operational limits and is frozen", () => {
    expect(MAX_PARTICIPANTS).toBe(30);
    expect(OPERATIONAL_CONSTANTS.ANON_ROOM_TTL_MINUTES).toBe(60);
    expect(OPERATIONAL_CONSTANTS.ONLINE_WINDOW_SECONDS).toBe(45);
    expect(OPERATIONAL_CONSTANTS.HEARTBEAT_INTERVAL_SECONDS).toBe(20);
    expect(OPERATIONAL_CONSTANTS.HOST_GRACE_SECONDS).toBe(60);
    expect(OPERATIONAL_CONSTANTS.MAX_ITEMS_PER_ROOM).toBe(500);
    expect(OPERATIONAL_CONSTANTS.MAX_ITEM_TITLE_LENGTH).toBe(200);
    expect(OPERATIONAL_CONSTANTS.MAX_ITEM_DESC_LENGTH).toBe(2000);
    expect(OPERATIONAL_CONSTANTS.MAX_VOTE_COMMENT_LENGTH).toBe(140);
    expect(OPERATIONAL_CONSTANTS.MIN_SPRINTS_FOR_FORECAST).toBe(3);
    expect(OPERATIONAL_CONSTANTS.MAX_SPRINTS_FOR_FORECAST).toBe(6);
    expect(OPERATIONAL_CONSTANTS.BUNDLE_BUDGET_ROOM_GZIP_KB).toBe(150);
    expect(OPERATIONAL_CONSTANTS.BUNDLE_BUDGET_ROOM_GZIP_BYTES).toBe(153600);
    expect(RATE_LIMIT_CREATE_ROOM).toEqual({ limit: 10, windowSeconds: 3600, scope: "ip" });
    expect(Object.isFrozen(OPERATIONAL_CONSTANTS)).toBe(true);
    expect(Object.isFrozen(RATE_LIMIT_CREATE_ROOM)).toBe(true);
  });
});
