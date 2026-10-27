import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@fibonaipe/domain";
import { createIdGenerator } from "./ids.js";

const ROOM_CODE_ALPHABET_SPEC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

describe("system ids", () => {
  it("draws 10000 unique room codes from the unambiguous alphabet", () => {
    expect(ROOM_CODE_ALPHABET).toBe(ROOM_CODE_ALPHABET_SPEC);
    expect(ROOM_CODE_LENGTH).toBe(8);
    const generator = createIdGenerator();
    const codes = new Set<string>();
    const codePattern = new RegExp(`^[${ROOM_CODE_ALPHABET_SPEC}]{${ROOM_CODE_LENGTH}}$`);
    for (let index = 0; index < 10_000; index += 1) {
      const code = generator.newRoomCode();
      expect(code).toMatch(codePattern);
      codes.add(code);
    }
    expect(codes.size).toBe(10_000);
  });

  it("hashes a base64url token as lowercase SHA-256 hex and issues ULID ids", () => {
    const generator = createIdGenerator();
    const token = generator.newToken();
    const other = generator.newToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(other).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(token).not.toBe(other);
    const digest = generator.sha256(token);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(createHash("sha256").update(token).digest("hex"));
    expect(generator.sha256(token)).toBe(digest);

    const ids = new Set<string>();
    for (let index = 0; index < 32; index += 1) ids.add(generator.newId());
    expect(ids.size).toBe(32);
    for (const id of ids) expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });
});
