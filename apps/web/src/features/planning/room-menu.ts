export type RoomMenuAction = "reveal" | "timer" | "queue" | "settings" | "estimate" | "qr";

const listeners = new Set<(action: RoomMenuAction) => void>();

export function requestRoomMenu(action: RoomMenuAction): void {
  for (const listener of listeners) listener(action);
}

export function subscribeRoomMenu(listener: (action: RoomMenuAction) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
