import { createHash, randomBytes } from "node:crypto";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@fibonaipe/domain";
import type { IdGenerator } from "@fibonaipe/application";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ROOM_CODE_BYTE_LIMIT = ROOM_CODE_ALPHABET.length * Math.floor(256 / ROOM_CODE_ALPHABET.length);

export function createIdGenerator(): IdGenerator {
  return {
    newId,
    newRoomCode,
    newToken,
    sha256,
  };
}

function newId(): string {
  const time = BigInt(Date.now());
  let random = 0n;
  for (const byte of randomBytes(10)) random = (random << 8n) | BigInt(byte);
  return `${encodeBase32(time, 10)}${encodeBase32(random, 16)}`;
}

function newRoomCode(): string {
  const chars: string[] = [];
  while (chars.length < ROOM_CODE_LENGTH) {
    for (const byte of randomBytes(16)) {
      if (byte >= ROOM_CODE_BYTE_LIMIT) continue;
      const symbol = ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
      if (symbol === undefined) continue;
      chars.push(symbol);
      if (chars.length === ROOM_CODE_LENGTH) break;
    }
  }
  return chars.join("");
}

function newToken(): string {
  return randomBytes(32).toString("base64url").replace(/=+$/g, "");
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function encodeBase32(value: bigint, length: number): string {
  let encoded = "";
  let remaining = value;
  for (let index = 0; index < length; index += 1) {
    const digit = Number(remaining & 31n);
    const symbol = CROCKFORD[digit];
    if (symbol === undefined) throw new Error("base32 digit out of range");
    encoded = symbol + encoded;
    remaining >>= 5n;
  }
  return encoded;
}
