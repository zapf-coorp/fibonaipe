import { createAppError, err, ok, type AppError, type Result, type RoomId } from "@fibonaipe/domain";
import type {
  RealtimeClient,
  RealtimeConnectionState,
  RealtimeConnectionStatus,
  RealtimePublisher,
  RealtimeSubscription,
  RealtimeSubscriptionHandlers,
  RoomEvent,
} from "@fibonaipe/application";

interface Subscription {
  readonly roomId: RoomId;
  readonly handlers: RealtimeSubscriptionHandlers;
  lastVersion: number;
  buffer: RoomEvent[];
  active: boolean;
}

export class FakeRealtime implements RealtimePublisher {
  private readonly clients: FakeRealtimeClient[] = [];

  createClient(): RealtimeClient {
    const client = new FakeRealtimeClient();
    this.clients.push(client);
    return client;
  }

  simulateDisconnect(roomId: RoomId): void {
    this.transition(roomId, "reconnecting");
  }

  simulatePollingFallback(roomId: RoomId): void {
    this.transition(roomId, "polling");
  }

  simulateReconnect(roomId: RoomId): void {
    this.transition(roomId, "connected");
  }

  async publish(roomId: RoomId, event: RoomEvent): Promise<Result<void, AppError>> {
    if (event.roomId !== roomId) return err(createAppError("VALIDATION"));
    for (const client of this.clients) client.receive(event);
    return ok(undefined);
  }

  private transition(roomId: RoomId, status: RealtimeConnectionStatus): void {
    for (const client of this.clients) {
      if (client.tracks(roomId)) client.transition(status);
    }
  }
}

class FakeRealtimeClient implements RealtimeClient {
  private status: RealtimeConnectionStatus = "disconnected";
  private lastSyncedVersion = 0;
  private subscription: Subscription | null = null;

  subscribe(roomId: RoomId, handlers: RealtimeSubscriptionHandlers): RealtimeSubscription {
    this.subscription = { roomId, handlers, lastVersion: 0, buffer: [], active: true };
    this.status = "connected";
    this.lastSyncedVersion = 0;
    handlers.onConnectionStateChange?.(this.connectionState());
    return {
      unsubscribe: () => this.unsubscribe(),
      getLastVersion: () => this.subscription?.lastVersion ?? 0,
    };
  }

  getConnectionState(): RealtimeConnectionState {
    return this.connectionState();
  }

  tracks(roomId: RoomId): boolean {
    return this.subscription?.active === true && this.subscription.roomId === roomId;
  }

  transition(status: RealtimeConnectionStatus): void {
    const subscription = this.subscription;
    if (!subscription?.active || this.status === status) return;
    this.status = status;
    subscription.handlers.onConnectionStateChange?.(this.connectionState());
    if (status === "connected") this.drain();
  }

  receive(event: RoomEvent): void {
    const subscription = this.subscription;
    if (!subscription?.active || event.roomId !== subscription.roomId) return;
    if (this.status !== "connected") {
      subscription.buffer.push(event);
      return;
    }
    this.deliver(event);
  }

  private deliver(event: RoomEvent): void {
    const subscription = this.subscription;
    if (!subscription?.active || this.status !== "connected") return;
    if (event.version <= subscription.lastVersion) return;
    if (event.version > subscription.lastVersion + 1) {
      if (!subscription.buffer.some((buffered) => buffered.version === event.version)) {
        subscription.buffer.push(event);
      }
      subscription.handlers.onVersionGap?.({
        roomId: subscription.roomId,
        expectedVersion: subscription.lastVersion + 1,
        receivedVersion: event.version,
      });
      return;
    }
    subscription.lastVersion = event.version;
    this.lastSyncedVersion = event.version;
    subscription.handlers.onEvent(event);
    this.flushNext();
  }

  private flushNext(): void {
    const subscription = this.subscription;
    if (!subscription || this.status !== "connected") return;
    const index = subscription.buffer.findIndex((event) => event.version === subscription.lastVersion + 1);
    if (index < 0) return;
    const next = subscription.buffer[index];
    if (!next) return;
    subscription.buffer.splice(index, 1);
    this.deliver(next);
  }

  private drain(): void {
    const subscription = this.subscription;
    if (!subscription || this.status !== "connected") return;
    const pending = subscription.buffer.splice(0).sort((left, right) => left.version - right.version);
    for (const event of pending) this.deliver(event);
  }

  private unsubscribe(): void {
    const subscription = this.subscription;
    if (!subscription?.active) return;
    subscription.active = false;
    this.status = "disconnected";
    subscription.handlers.onConnectionStateChange?.(this.connectionState());
  }

  private connectionState(): RealtimeConnectionState {
    return {
      status: this.status,
      pendingOpCount: 0,
      lastSyncedVersion: this.lastSyncedVersion,
    };
  }
}
