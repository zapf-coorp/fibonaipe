import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.number().int().positive(),
  PUBLIC_APP_URL: z.string().min(1),
  PERSISTENCE_DRIVER: z.enum(["in-memory", "postgres"]),
  REALTIME_DRIVER: z.enum(["fake", "supabase", "polling-only"]),
  SESSION_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const defaults: ServerEnv = {
  NODE_ENV: "test",
  PORT: 5173,
  PUBLIC_APP_URL: "http://localhost:5173",
  PERSISTENCE_DRIVER: "in-memory",
  REALTIME_DRIVER: "fake",
  SESSION_SECRET: "test-session-secret",
  CRON_SECRET: "test-cron-secret",
};

export function loadServerEnv(overrides?: Partial<ServerEnv>): ServerEnv {
  return serverEnvSchema.parse({
    ...defaults,
    ...readProcessEnv(),
    ...definedOverrides(overrides),
  });
}

function definedOverrides(overrides?: Partial<ServerEnv>): Partial<ServerEnv> {
  if (!overrides) return {};
  const entries = Object.entries(overrides).filter((entry) => entry[1] !== undefined);
  return Object.fromEntries(entries) as Partial<ServerEnv>;
}

function readProcessEnv(): Partial<ServerEnv> {
  const source = globalProcessEnv();
  const partial: Partial<ServerEnv> = {};
  const nodeEnv = source.NODE_ENV;
  if (nodeEnv === "development" || nodeEnv === "test" || nodeEnv === "production") partial.NODE_ENV = nodeEnv;
  const port = source.PORT;
  if (port && /^\d+$/.test(port)) partial.PORT = Number(port);
  const publicUrl = source.PUBLIC_APP_URL;
  if (publicUrl) partial.PUBLIC_APP_URL = publicUrl;
  const persistence = source.PERSISTENCE_DRIVER;
  if (persistence === "in-memory" || persistence === "postgres") partial.PERSISTENCE_DRIVER = persistence;
  const realtime = source.REALTIME_DRIVER;
  if (realtime === "fake" || realtime === "supabase" || realtime === "polling-only") {
    partial.REALTIME_DRIVER = realtime;
  }
  if (source.SESSION_SECRET) partial.SESSION_SECRET = source.SESSION_SECRET;
  if (source.CRON_SECRET) partial.CRON_SECRET = source.CRON_SECRET;
  return partial;
}

function globalProcessEnv(): Record<string, string | undefined> {
  const processRef = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processRef?.env ?? {};
}
