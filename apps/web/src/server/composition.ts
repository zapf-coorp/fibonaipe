import type {
  AuthProvider,
  Clock,
  IdGenerator,
  Persistence,
  RateLimiter,
  RealtimePublisher,
  StructuredLogger,
} from "@fibonaipe/application";
import {
  FakeAuthProvider,
  FakeClock,
  FakeLogger,
  FakeRealtime,
  InMemoryPersistence,
  InMemoryRateLimiter,
  SequentialIdGenerator,
} from "@fibonaipe/testing";
import { loadServerEnv, type ServerEnv } from "./env.js";

export interface AppContainer {
  readonly env: ServerEnv;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly persistence: Persistence;
  readonly realtime: RealtimePublisher;
  readonly authProvider: AuthProvider;
  readonly rateLimiter: RateLimiter;
  readonly logger: StructuredLogger;
}

export function createAppContainer(overrides?: Partial<ServerEnv>): AppContainer {
  const env = loadServerEnv(overrides);
  const clock = new FakeClock();
  return {
    env,
    clock,
    idGenerator: new SequentialIdGenerator(),
    persistence: new InMemoryPersistence(),
    realtime: new FakeRealtime(),
    authProvider: new FakeAuthProvider(),
    rateLimiter: new InMemoryRateLimiter(clock),
    logger: new FakeLogger(),
  };
}
