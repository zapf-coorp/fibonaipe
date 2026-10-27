import type {
  RealtimeClient,
  RealtimeConnectionState,
  RealtimeConnectionStatus,
  RealtimeSubscription,
  RoomEvent,
} from "@fibonaipe/application";

const POLLING_AFTER_MS = 1_000;
const PROVIDER_RETRY_MS = 2_500;

export interface RealtimeProviderClient {
  subscribe(channel: string, handlers: { onEvent(event: RoomEvent): void }): { unsubscribe(): void };
}

export interface RealtimeClientDeps {
  readonly provider: RealtimeProviderClient;
  readonly fetchSnapshot: (query: { sinceVersion: number }) => Promise<readonly RoomEvent[]>;
}

export function createRealtimeClient(deps: RealtimeClientDeps): RealtimeClient {
  let status: RealtimeConnectionStatus = "disconnected";
  let lastSyncedVersion = 0;

  const state = (): RealtimeConnectionState => ({
    status,
    pendingOpCount: 0,
    lastSyncedVersion,
  });

  return {
    getConnectionState: state,
    subscribe(roomId, handlers): RealtimeSubscription {
      let closed = false;
      let providerSub: { unsubscribe(): void } | null = null;
      let promoteTimer: ReturnType<typeof setTimeout> | null = null;
      let retryTimer: ReturnType<typeof setInterval> | null = null;

      const setStatus = (next: RealtimeConnectionStatus): void => {
        status = next;
        handlers.onConnectionStateChange?.(state());
      };

      const handleEvent = (event: RoomEvent): void => {
        if (closed || event.roomId !== roomId) return;
        const expectedVersion = lastSyncedVersion + 1;
        if (event.version > expectedVersion) {
          handlers.onVersionGap?.({ roomId, expectedVersion, receivedVersion: event.version });
          const sinceVersion = lastSyncedVersion;
          void deps.fetchSnapshot({ sinceVersion }).then((events) => {
            if (closed) return;
            for (const snapshotEvent of events) {
              handlers.onEvent(snapshotEvent);
              if (snapshotEvent.version > lastSyncedVersion) lastSyncedVersion = snapshotEvent.version;
            }
          });
          return;
        }
        if (event.version < expectedVersion) return;
        handlers.onEvent(event);
        lastSyncedVersion = event.version;
      };

      const connect = (): void => {
        if (closed || providerSub) return;
        try {
          providerSub = deps.provider.subscribe(`room:${roomId}`, { onEvent: handleEvent });
          if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
          }
          if (promoteTimer) {
            clearTimeout(promoteTimer);
            promoteTimer = null;
          }
          setStatus("connected");
        } catch {
          if (status === "disconnected") setStatus("reconnecting");
          if (promoteTimer === null && status !== "polling") {
            promoteTimer = setTimeout(() => {
              promoteTimer = null;
              if (!closed && providerSub === null) setStatus("polling");
            }, POLLING_AFTER_MS);
          }
          if (retryTimer === null) retryTimer = setInterval(connect, PROVIDER_RETRY_MS);
        }
      };

      connect();

      return {
        unsubscribe() {
          closed = true;
          providerSub?.unsubscribe();
          providerSub = null;
          if (promoteTimer) clearTimeout(promoteTimer);
          if (retryTimer) clearInterval(retryTimer);
        },
        getLastVersion() {
          return lastSyncedVersion;
        },
      };
    },
  };
}
