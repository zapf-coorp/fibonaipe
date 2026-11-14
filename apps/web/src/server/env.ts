import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.number().int().positive(),
  PUBLIC_APP_URL: z.string().min(1),
  PERSISTENCE_DRIVER: z.enum(["in-memory", "sqlite", "postgres"]),
  REALTIME_DRIVER: z.enum(["fake", "supabase", "polling-only"]),
  SESSION_SECRET: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  AUTH_DRIVER: z.enum(["unavailable", "dev-fake", "supabase"]).optional(),
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
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
  if (persistence === "in-memory" || persistence === "sqlite" || persistence === "postgres") {
    partial.PERSISTENCE_DRIVER = persistence;
  }
  const realtime = source.REALTIME_DRIVER;
  if (realtime === "fake" || realtime === "supabase" || realtime === "polling-only") {
    partial.REALTIME_DRIVER = realtime;
  }
  const sessionSecret = source.SESSION_SECRET ?? source.AUTH_SECRET;
  if (sessionSecret) partial.SESSION_SECRET = sessionSecret;
  if (source.CRON_SECRET) partial.CRON_SECRET = source.CRON_SECRET;
  const authDriver = source.AUTH_DRIVER;
  if (authDriver === "unavailable" || authDriver === "dev-fake" || authDriver === "supabase") {
    partial.AUTH_DRIVER = authDriver;
  }
  if (source.DATABASE_URL) partial.DATABASE_URL = source.DATABASE_URL;
  if (source.SUPABASE_URL) partial.SUPABASE_URL = source.SUPABASE_URL;
  if (source.SUPABASE_ANON_KEY) partial.SUPABASE_ANON_KEY = source.SUPABASE_ANON_KEY;
  if (source.SUPABASE_SERVICE_ROLE_KEY) partial.SUPABASE_SERVICE_ROLE_KEY = source.SUPABASE_SERVICE_ROLE_KEY;
  return partial;
}

function globalProcessEnv(): Record<string, string | undefined> {
  const processRef = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return processRef?.env ?? {};
}
