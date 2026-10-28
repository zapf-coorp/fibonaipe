import { createCsvJsonExporter } from "@fibonaipe/adapter-exporter-csvjson";
import { createManualIssueTracker } from "@fibonaipe/adapter-issuetracker-manual";
import { createPostgresPersistence } from "@fibonaipe/adapter-persistence-postgres";
import { createSqlitePersistence } from "@fibonaipe/adapter-persistence-sqlite";
import {
  createIdGenerator,
  createInMemoryRateLimiter,
  createRedactingLogger,
  createSystemClock,
} from "@fibonaipe/adapter-system";
import type {
  AuthProvider,
  Clock,
  IdGenerator,
  Persistence,
  RateLimiter,
  RealtimePublisher,
  StructuredLogger,
} from "@fibonaipe/application";
import type { Exporter, IssueTracker } from "@fibonaipe/application";
import { createAppError, err, ok, type UserId } from "@fibonaipe/domain";
import { loadServerEnv, type ServerEnv } from "./env.js";

export interface AppContainer {
  readonly env: ServerEnv;
  readonly clock: Clock;
  readonly idGenerator: IdGenerator;
  readonly persistence: Persistence;
  readonly realtime: RealtimePublisher;
  readonly authProvider: AuthProvider;
  readonly rateLimiter: RateLimiter;
  readonly issueTracker: IssueTracker;
  readonly exporter: Exporter;
  readonly logger: StructuredLogger;
}

export function createAppContainer(overrides?: Partial<ServerEnv>): AppContainer {
  const env = loadServerEnv(overrides);
  const clock = createSystemClock();
  return {
    env,
    clock,
    idGenerator: createIdGenerator(),
    persistence: persistenceFor(env),
    realtime: pollingPublisher(),
    authProvider: unavailableAuth(),
    rateLimiter: createInMemoryRateLimiter(clock),
    issueTracker: createManualIssueTracker(),
    exporter: createCsvJsonExporter(),
    logger: createRedactingLogger({ write: (line) => console.error(line) }),
  };
}

function persistenceFor(env: ServerEnv): Persistence {
  const databaseUrl = readDatabaseUrl();
  if (env.PERSISTENCE_DRIVER === "postgres" && databaseUrl.length > 0) {
    return createPostgresPersistence({ DATABASE_URL: databaseUrl });
  }
  return createSqlitePersistence();
}

function readDatabaseUrl(): string {
  const source = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return source?.DATABASE_URL ?? "";
}

function pollingPublisher(): RealtimePublisher {
  return {
    async publish() {
      return ok(undefined);
    },
  };
}

function unavailableAuth(): AuthProvider {
  const denied = async () => err(createAppError("AUTH_LINK_INVALID"));
  return {
    sendMagicLink: denied,
    verifyMagicLink: denied,
    getGoogleAuthUrl: () => err(createAppError("AUTH_LINK_INVALID")),
    exchangeGoogleCode: denied,
    verifySessionToken: denied,
    revokeUserSessions: async (_userId: UserId) => err(createAppError("AUTH_LINK_INVALID")),
  };
}
