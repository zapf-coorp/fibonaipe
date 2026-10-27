import { createHash } from "node:crypto";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@fibonaipe/domain";
import type { IdGenerator } from "@fibonaipe/application";

export class SequentialIdGenerator implements IdGenerator {
  private idCounter = 0;
  private tokenCounter = 0;
  private roomCodeIndexes = initialRoomCodeIndexes();
  private roomCodePrimed = false;

  newId(): string {
    this.idCounter += 1;
    return `01J${String(this.idCounter).padStart(23, "0")}`;
  }

  newRoomCode(): string {
    if (!this.roomCodePrimed) {
      this.roomCodePrimed = true;
      return this.formatRoomCode();
    }
    this.incrementRoomCode();
    return this.formatRoomCode();
  }

  newToken(): string {
    this.tokenCounter += 1;
    return this.tokenCounter.toString(16).padStart(64, "0");
  }

  sha256(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }

  reset(): void {
    this.idCounter = 0;
    this.tokenCounter = 0;
    this.roomCodeIndexes = initialRoomCodeIndexes();
    this.roomCodePrimed = false;
  }

  private formatRoomCode(): string {
    return this.roomCodeIndexes.map((index) => charAt(index)).join("");
  }

  private incrementRoomCode(): void {
    for (let index = this.roomCodeIndexes.length - 1; index >= 0; index -= 1) {
      const current = this.roomCodeIndexes[index] ?? 0;
      if (current < ROOM_CODE_ALPHABET.length - 1) {
        this.roomCodeIndexes[index] = current + 1;
        return;
      }
      this.roomCodeIndexes[index] = 0;
    }
  }
}

function initialRoomCodeIndexes(): number[] {
  return Array.from({ length: ROOM_CODE_LENGTH }, (_, index) => index);
}

function charAt(index: number): string {
  const char = ROOM_CODE_ALPHABET[index];
  if (char === undefined) throw new Error("room code index is outside the alphabet");
  return char;
}
