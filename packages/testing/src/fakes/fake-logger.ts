import type { ErrorCode } from "@fibonaipe/domain";
import type { ErrorReporter, LogEntry, StructuredLogger } from "@fibonaipe/application";

const FORBIDDEN_LOG_KEYS = new Set(["nickname", "email", "token", "card", "suit", "comment"]);

export interface StoredLog {
  readonly level: "info" | "warn" | "error" | "capture";
  readonly entry: LogEntry;
}

export class FakeLogger implements StructuredLogger, ErrorReporter {
  private readonly stored: StoredLog[] = [];
  private readonly leaks: string[] = [];

  info(entry: LogEntry): void {
    this.record("info", entry);
  }

  warn(entry: LogEntry): void {
    this.record("warn", entry);
  }

  error(entry: LogEntry): void {
    this.record("error", entry);
  }

  capture(entry: LogEntry): void {
    this.record("capture", entry);
  }

  entries(): readonly StoredLog[] {
    return this.stored.map((item) => ({ level: item.level, entry: allowListed(item.entry) }));
  }

  forbiddenKeys(): readonly string[] {
    return [...this.leaks];
  }

  assertNoLeaks(): void {
    if (this.leaks.length > 0) {
      throw new Error(`log contained forbidden fields: ${this.leaks.join(",")}`);
    }
  }

  private record(level: StoredLog["level"], entry: LogEntry): void {
    for (const key of Object.keys(entry)) {
      if (FORBIDDEN_LOG_KEYS.has(key)) this.leaks.push(key);
    }
    this.stored.push({ level, entry: allowListed(entry) });
  }
}

function allowListed(entry: LogEntry): LogEntry {
  const clean: {
    event: string;
    requestId?: string;
    roomId?: string;
    useCase?: string;
    errorCode?: ErrorCode;
    durationMs?: number;
  } = { event: entry.event };
  if (entry.requestId !== undefined) clean.requestId = entry.requestId;
  if (entry.roomId !== undefined) clean.roomId = entry.roomId;
  if (entry.useCase !== undefined) clean.useCase = entry.useCase;
  if (entry.errorCode !== undefined) clean.errorCode = entry.errorCode;
  if (entry.durationMs !== undefined) clean.durationMs = entry.durationMs;
  return clean;
}
