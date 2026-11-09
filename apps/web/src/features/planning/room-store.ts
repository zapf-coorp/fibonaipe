import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useSyncExternalStore } from "react";
import { nextClientOpId } from "../../client/connection/outbox.js";
import { getConnectionStatus, setConnectionStatus } from "../../client/connection/status.js";
import { isRoomView, itemsOf, type RoomView } from "./model.js";

const SNAPSHOT_KEY = "fibonaipe.room-snapshot";

const memory = new Map<string, RoomView>();
const retained = globalThis as typeof globalThis & { __fibonaipeRoomSnapshots?: Map<string, RoomView> };
retained.__fibonaipeRoomSnapshots ??= new Map();

const listeners = new Set<() => void>();
const errorListeners = new Set<() => void>();
let requestSerial = 0;
let roomError: string | null = null;

export function readRoomView(code: string): RoomView | undefined {
  const cached = memory.get(code);
  if (cached) return cached;
  const kept = retained.__fibonaipeRoomSnapshots?.get(code);
  if (kept) {
    memory.set(code, kept);
    return kept;
  }
  const stored = readSession(code);
  if (!stored) return undefined;
  memory.set(code, stored);
  retained.__fibonaipeRoomSnapshots?.set(code, stored);
  return stored;
}

export function writeRoomView(code: string, view: RoomView): void {
  memory.set(code, view);
  retained.__fibonaipeRoomSnapshots?.set(code, view);
  try {
    sessionStorage.setItem(`${SNAPSHOT_KEY}:${code}`, JSON.stringify(view));
  } catch {
    // Private mode must not block the table.
  }
  for (const listener of listeners) listener();
}

export function commitRoomView(code: string, view: RoomView): void {
  flushSync(() => writeRoomView(code, view));
}

export function mergeRoomView(code: string, incoming: RoomView): void {
  const current = readRoomView(code);
  if (!current) {
    commitRoomView(code, incoming);
    return;
  }
  const currentItems = itemsOf(current);
  const incomingItems = itemsOf(incoming);
  const next = incomingItems.length >= currentItems.length ? incoming : { ...incoming, queue: currentItems };
  commitRoomView(code, next);
}

export function useRoomView(code: string): RoomView | undefined {
  return useSyncExternalStore(subscribe, () => readRoomView(code), () => readRoomView(code));
}

export function useRoomError(): string | null {
  return useSyncExternalStore(subscribeError, () => roomError, () => roomError);
}

export function setRoomError(message: string | null): void {
  roomError = message;
  for (const listener of errorListeners) listener();
}

export async function refreshRoom(code: string): Promise<void> {
  const version = viewVersion(readRoomView(code));
  try {
    const response = await fetch(`/api/rooms/${code}/state?since=${version}`, { credentials: "include" });
    if (!response.ok) return;
    const body: unknown = await response.json();
    if (isUnchanged(body)) return;
    if (isRoomView(body)) mergeRoomView(code, body);
  } catch {
    // The next tick retries. A failed poll must not wipe the table.
  }
}

export async function beatRoom(code: string): Promise<void> {
  try {
    await fetch(`/api/rooms/${code}/heartbeat`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientOpId: nextClientOpId() }),
    });
  } catch {
    // Presence is retried on the next heartbeat.
  }
}

export function startRoomPulse(code: string): () => void {
  const beat = window.setInterval(() => {
    void beatRoom(code);
  }, 20_000);
  const poll = window.setInterval(() => {
    void refreshRoom(code);
  }, 2_500);
  void beatRoom(code);
  return () => {
    window.clearInterval(beat);
    window.clearInterval(poll);
  };
}

export function useLoadRoom(code: string): boolean {
  const [needsJoin, setNeedsJoin] = useState(() => readRoomView(code) === undefined);

  useEffect(() => {
    const requestId = ++requestSerial;
    let ignore = false;
    void fetch(`/api/rooms/${code}/state?since=0`, {
      credentials: "include",
      signal: AbortSignal.timeout(1500),
    })
      .then(async (response) => {
        if (ignore || requestId !== requestSerial) return;
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          setConnectionStatus("connected");
          flushSync(() => setNeedsJoin(true));
          return;
        }
        if (!response.ok) return;
        const body: unknown = await response.json();
        if (!isRoomView(body)) return;
        flushSync(() => {
          writeRoomView(code, body);
          setNeedsJoin(false);
        });
        if (getConnectionStatus() !== "syncing" && navigator.onLine) setConnectionStatus("connected");
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [code]);

  return needsJoin && readRoomView(code) === undefined;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeError(listener: () => void): () => void {
  errorListeners.add(listener);
  return () => errorListeners.delete(listener);
}

function viewVersion(view: RoomView | undefined): number {
  return view && typeof view.version === "number" ? view.version : 0;
}

function isUnchanged(value: unknown): boolean {
  return Boolean(value) && typeof value === "object" && (value as { unchanged?: unknown }).unchanged === true;
}

function readSession(code: string): RoomView | undefined {
  try {
    const raw = sessionStorage.getItem(`${SNAPSHOT_KEY}:${code}`);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isRoomView(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
