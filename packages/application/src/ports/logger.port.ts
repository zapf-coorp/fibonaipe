import type { ErrorCode } from "@fibonaipe/domain";

export interface LogEntry {
  readonly event: string;
  readonly requestId?: string;
  readonly roomId?: string;
  readonly useCase?: string;
  readonly errorCode?: ErrorCode;
  readonly durationMs?: number;
}

export interface StructuredLogger {
  info(entry: LogEntry): void;
  warn(entry: LogEntry): void;
  error(entry: LogEntry): void;
}

export interface ErrorReporter {
  capture(entry: LogEntry): void;
}
