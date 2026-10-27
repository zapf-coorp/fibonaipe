import type { LogEntry, StructuredLogger } from "@fibonaipe/application";

const SECRET_KEYS = new Set(["nickname", "email", "token", "card", "suit", "comment"]);

export interface RedactingLoggerOptions {
  readonly write: (line: string) => void;
}

export function createRedactingLogger(options: RedactingLoggerOptions): StructuredLogger {
  const emit = (level: "info" | "warn" | "error", entry: LogEntry): void => {
    const redacted = redact(entry);
    const fields =
      redacted !== null && typeof redacted === "object" && !Array.isArray(redacted)
        ? (redacted as Record<string, unknown>)
        : {};
    options.write(JSON.stringify({ level, ...fields }));
  };
  return {
    info(entry) {
      emit("info", entry);
    },
    warn(entry) {
      emit("warn", entry);
    },
    error(entry) {
      emit("error", entry);
    },
  };
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value === null || typeof value !== "object") return value;
  if (Object.getPrototypeOf(value) !== Object.prototype) return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(key.toLowerCase())) continue;
    output[key] = redact(child);
  }
  return output;
}
