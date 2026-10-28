import { useSyncExternalStore } from "react";

export type ConnectionPhase = "connected" | "syncing" | "reconnecting";

let phase: ConnectionPhase = "connected";
const listeners = new Set<() => void>();

export function getConnectionStatus(): ConnectionPhase {
  return phase;
}

export function setConnectionStatus(next: ConnectionPhase): void {
  if (phase === next) return;
  phase = next;
  for (const listener of listeners) listener();
}

export function useConnectionStatus(): ConnectionPhase {
  return useSyncExternalStore(subscribe, getConnectionStatus, getConnectionStatus);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
