import type { AppError, Result, RoomId } from "@fibonaipe/domain";
import type { RoomEvent } from "../projections/events.js";

export type RealtimeConnectionStatus = "connected" | "reconnecting" | "polling" | "disconnected";

export interface RealtimeConnectionState {
  readonly status: RealtimeConnectionStatus;
  readonly pendingOpCount: number;
  readonly lastSyncedVersion: number;
}

export interface VersionGapInfo {
  readonly roomId: RoomId;
  readonly expectedVersion: number;
  readonly receivedVersion: number;
}

export interface RealtimeSubscriptionHandlers {
  onEvent(event: RoomEvent): void;
  onVersionGap?(gap: VersionGapInfo): void;
  onConnectionStateChange?(state: RealtimeConnectionState): void;
}

export interface RealtimeSubscription {
  unsubscribe(): void;
  getLastVersion(): number;
}

export interface RealtimePublisher {
  publish(roomId: RoomId, event: RoomEvent): Promise<Result<void, AppError>>;
}

export interface RealtimeClient {
  subscribe(roomId: RoomId, handlers: RealtimeSubscriptionHandlers): RealtimeSubscription;
  getConnectionState(): RealtimeConnectionState;
}
