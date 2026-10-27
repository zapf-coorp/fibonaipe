import { ok, RoomCode, type AppError, type Result, type RoomId } from "@fibonaipe/domain";
import type {
  AggregatedHistoryRecord,
  Clock,
  Exporter,
  IdGenerator,
  IssueTracker,
  Persistence,
  PersistedRoomRecord,
  RateLimiter,
  RealtimePublisher,
  RoomEvent,
  StructuredLogger,
} from "@fibonaipe/application";
import type { RoomView } from "../../projections/room-view.js";
import {
  FakeClock,
  FakeExporter,
  FakeIssueTracker,
  FakeLogger,
  InMemoryPersistence,
  InMemoryRateLimiter,
  SequentialIdGenerator,
} from "@fibonaipe/testing";

export interface UseCaseDependencies {
  readonly persistence: Persistence;
  readonly realtime: RealtimePublisher;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly rateLimiter: RateLimiter;
  readonly issueTracker: IssueTracker;
  readonly exporter: Exporter;
  readonly logger: StructuredLogger;
}

export interface Harness {
  readonly store: InMemoryPersistence;
  readonly clock: FakeClock;
  readonly ids: SequentialIdGenerator;
  readonly logs: FakeLogger;
  readonly logArgs: unknown[];
  readonly published: RoomEvent[];
  readonly order: string[];
  readonly deps: UseCaseDependencies;
  roomSaves(): number;
}

export function createPorts(options?: {
  store?: InMemoryPersistence;
  clock?: FakeClock;
  ids?: SequentialIdGenerator;
  rateLimiter?: RateLimiter;
  issueTracker?: IssueTracker;
  failPublish?: boolean;
  onPublish?: (event: RoomEvent) => Promise<void>;
}): Harness {
  const store = options?.store ?? new InMemoryPersistence();
  const clock = options?.clock ?? new FakeClock();
  const ids = options?.ids ?? new SequentialIdGenerator();
  const logs = new FakeLogger();
  const logArgs: unknown[] = [];
  const published: RoomEvent[] = [];
  const order: string[] = [];
  let roomSaves = 0;
  let depth = 0;
  let armed = false;

  const persistence: Persistence = {
    ping: () => store.ping(),
    transaction: async (txOptions, work) => {
      if (depth === 0) armed = false;
      const savesBefore = roomSaves;
      depth += 1;
      try {
        const result = await store.transaction(txOptions, async (repos) =>
          work({
            ...repos,
            rooms: {
              ...repos.rooms,
              async save(room) {
                roomSaves += 1;
                await repos.rooms.save(room);
              },
            },
          }),
        );
        if (result.ok && roomSaves > savesBefore) {
          armed = true;
          order.push("commit");
        }
        return result;
      } finally {
        depth -= 1;
      }
    },
  };

  const realtime: RealtimePublisher = {
    async publish(roomId, event) {
      if (depth !== 0 || !armed) throw new Error("publish before commit");
      order.push("publish");
      if (options?.failPublish) throw new Error("realtime down");
      published.push({ ...event, payload: { ...event.payload } } as RoomEvent);
      await options?.onPublish?.(event);
      return ok(undefined);
    },
  };

  const logger: StructuredLogger = {
    info(entry) {
      logArgs.push(entry);
      logs.info(entry);
    },
    warn(entry) {
      logArgs.push(entry);
      logs.warn(entry);
    },
    error(entry) {
      logArgs.push(entry);
      logs.error(entry);
    },
  };

  return {
    store,
    clock,
    ids,
    logs,
    logArgs,
    published,
    order,
    deps: {
      persistence,
      realtime,
      ids,
      clock,
      rateLimiter: options?.rateLimiter ?? new InMemoryRateLimiter(clock),
      issueTracker: options?.issueTracker ?? new FakeIssueTracker(),
      exporter: new FakeExporter(),
      logger,
    },
    roomSaves: () => roomSaves,
  };
}

export function asOk<T>(result: Result<T, AppError>): T {
  if (!result.ok) {
    throw new Error(`${result.error.code} ${result.error.messageKey} ${JSON.stringify(result.error.params ?? {})}`);
  }
  return result.value;
}

export function asView(value: { readonly unchanged: boolean; readonly view?: RoomView }): RoomView {
  if (value.unchanged || value.view === undefined) throw new Error("expected a room view");
  return value.view;
}

export async function readRoomByCode(store: InMemoryPersistence, code: string): Promise<PersistedRoomRecord | null> {
  const parsed = RoomCode.create(code);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const result = await store.transaction({}, async (repos) => ok(await repos.rooms.findByCode(parsed.value)));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

export async function readHistory(store: InMemoryPersistence, roomId: RoomId): Promise<readonly AggregatedHistoryRecord[]> {
  const result = await store.transaction({}, async (repos) => ok(await repos.history.query({ roomId })));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

export function differentCode(code: string): string {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const last = code[code.length - 1] ?? "2";
  const next = alphabet[(alphabet.indexOf(last) + 1) % alphabet.length] ?? "3";
  return `${code.slice(0, -1)}${next}`;
}

export function hasIndividualVote(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((entry) => hasIndividualVote(entry));
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.includes("participantId") && (keys.includes("card") || keys.includes("suit") || keys.includes("comment"))) {
    return true;
  }
  return Object.values(record).some((entry) => hasIndividualVote(entry));
}
