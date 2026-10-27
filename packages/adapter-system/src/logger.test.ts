import { describe, expect, it } from "vitest";
import type { LogEntry, StructuredLogger } from "@fibonaipe/application";
import { createRedactingLogger } from "./logger.js";

const secrets = {
  nickname: "Ada Lovelace",
  email: "ada@example.com",
  token: "raw-session-token-9f3c",
  card: "voted-card-89",
  suit: "hearts",
  comment: "secret-comment-zzz",
} as const;

describe("redacting logger", () => {
  it("keeps the create-join-vote-reveal fields and omits nickname, email, token, card, suit, and comment", () => {
    const lines: string[] = [];
    const logger = createRedactingLogger({
      write: (line) => lines.push(line),
    });
    write(logger, "info", {
      event: "room.created",
      requestId: "req-create",
      roomId: "room-log-1",
      useCase: "CreateRoom",
      ...secrets,
    });
    write(logger, "info", {
      event: "participant.joined",
      requestId: "req-join",
      roomId: "room-log-1",
      useCase: "JoinRoom",
      nickname: secrets.nickname,
      email: secrets.email,
      token: secrets.token,
    });
    write(logger, "info", {
      event: "vote.cast",
      requestId: "req-vote",
      roomId: "room-log-1",
      useCase: "CastVote",
      card: secrets.card,
      suit: secrets.suit,
      comment: secrets.comment,
      token: secrets.token,
      meta: { nickname: secrets.nickname, card: secrets.card, suit: secrets.suit, comment: secrets.comment },
    });
    write(logger, "info", {
      event: "round.revealed",
      requestId: "req-reveal",
      roomId: "room-log-1",
      useCase: "RevealRound",
      card: secrets.card,
      suit: secrets.suit,
    });
    write(logger, "warn", {
      event: "use_case.failed",
      requestId: "req-warn",
      roomId: "room-log-1",
      useCase: "JoinRoom",
      errorCode: "VALIDATION",
      email: secrets.email,
    });
    write(logger, "error", {
      event: "use_case.failed",
      requestId: "req-error",
      roomId: "room-log-1",
      useCase: "CastVote",
      errorCode: "NOT_FOUND",
      token: secrets.token,
    });

    const buffer = lines.join("\n");
    for (const secret of Object.values(secrets)) expect(buffer).not.toContain(secret);
    for (const marker of ["req-create", "req-join", "req-vote", "req-reveal", "req-warn", "req-error"]) {
      expect(buffer).toContain(marker);
    }
    for (const useCase of ["CreateRoom", "JoinRoom", "CastVote", "RevealRound"]) expect(buffer).toContain(useCase);
    expect(buffer).toContain("room-log-1");
    expect(buffer).toContain("VALIDATION");
    expect(buffer).toContain("NOT_FOUND");
  });
});

function write(logger: StructuredLogger, level: "info" | "warn" | "error", entry: LogEntry & Record<string, unknown>): void {
  logger[level](entry as LogEntry);
}
