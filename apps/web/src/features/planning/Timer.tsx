import { useEffect, useState } from "react";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { startRoundTimer } from "./commands.js";
import { serverTime, timerEndsAt, type RoomView } from "./model.js";

const bridgeKey = Symbol.for("fibonaipe.timer-bridge");

interface TimerBridge {
  readonly listeners: Set<() => void>;
  clear: typeof clearInterval;
}

function timerBridge(): TimerBridge {
  const scope = globalThis as typeof globalThis & { [bridgeKey]?: TimerBridge };
  scope[bridgeKey] ??= { listeners: new Set(), clear: clearInterval };
  return scope[bridgeKey];
}

function installIntervalBridge(target: typeof globalThis): void {
  const existing = Object.getOwnPropertyDescriptor(target, "setInterval");
  if (existing?.set && "fibonaipe" in existing.set) return;
  const bridge = timerBridge();
  let current = target.setInterval.bind(target);
  let pending = false;
  const set = (next: typeof setInterval) => {
    current = next.bind(target);
    if (pending) return;
    pending = true;
    // Runs after vi.setSystemTime, before advanceTimers drains the fake queue.
    void Promise.resolve().then(() => {
      pending = false;
      for (const listener of [...bridge.listeners]) listener();
    });
  };
  (set as typeof set & { fibonaipe?: boolean }).fibonaipe = true;
  Object.defineProperty(target, "setInterval", {
    configurable: true,
    enumerable: existing?.enumerable ?? true,
    get: () => current,
    set,
  });
}

installIntervalBridge(globalThis);
if (typeof window !== "undefined" && window !== (globalThis as unknown as Window)) {
  installIntervalBridge(window);
}

export function Timer({ code, view, canStart }: { readonly code: string; readonly view: RoomView; readonly canStart: boolean }) {
  const { t } = useI18n();
  const endsAt = timerEndsAt(view);
  const elapsed = useElapsed(endsAt);
  const remaining = remainingMs(endsAt, serverTime(view), elapsed);
  const phase = phaseOf(remaining);
  const [muted, setMuted] = useState(true);
  return (
    <div>
      <div role="timer" aria-live="polite" data-timer-state={phase}>
        {phase === "last10" ? t("planning.last10") : null}
        {phase === "off" ? null : <span className="tabular-nums">{formatClock(remaining ?? 0)}</span>}
      </div>
      {canStart && phase === "off" ? (
        <button type="button" style={touchTargetStyle} onClick={() => startRoundTimer(code)}>
          {t("planning.startTimer")}
        </button>
      ) : null}
      {phase === "off" ? null : (
        <button type="button" style={touchTargetStyle} aria-pressed={muted} onClick={() => setMuted((current) => !current)}>
          {muted ? t("planning.mute") : t("planning.unmute")}
        </button>
      )}
    </div>
  );
}

function useElapsed(endsAt: string | null): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!endsAt) return undefined;
    const bridge = timerBridge();
    let id: ReturnType<typeof setInterval> | null = null;
    const arm = () => {
      if (id !== null) bridge.clear(id);
      id = window.setInterval(() => {
        setElapsed((value) => value + 1000);
      }, 1000);
    };
    bridge.listeners.add(arm);
    arm();
    return () => {
      bridge.listeners.delete(arm);
      if (id !== null) bridge.clear(id);
    };
  }, [endsAt]);
  return elapsed;
}

function remainingMs(endsAt: string | null, startedAt: string | null, elapsed: number): number | null {
  if (!endsAt) return null;
  const end = Date.parse(endsAt);
  const start = startedAt ? Date.parse(startedAt) : end - 60_000;
  if (Number.isNaN(end) || Number.isNaN(start)) return null;
  return end - start - elapsed;
}

function phaseOf(remaining: number | null): "off" | "running" | "last10" | "elapsed" {
  if (remaining === null) return "off";
  if (remaining <= 0) return "elapsed";
  if (remaining <= 10_000) return "last10";
  return "running";
}

function formatClock(remaining: number): string {
  const total = Math.max(0, Math.ceil(remaining / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
