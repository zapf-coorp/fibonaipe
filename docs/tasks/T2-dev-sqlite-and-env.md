# T2 — Disk SQLite in Local Dev (`data/local.sqlite`) & Environment Config

**Status:** DONE  
**Depends on:** T1  
**Max files to touch:** 3 (`apps/web/src/server/env.ts`, `apps/web/src/server/composition.ts`, `apps/web/src/server/dev-gateway.ts`)

## Goal

Make local development (`npm run dev`) persist rooms, users, teams, and sprints on disk in `data/local.sqlite` across restarts, while unit/contract tests (`NODE_ENV === "test"`) keep using `:memory:`. Also expand `ServerEnv` so production Supabase credentials and `PERSISTENCE_DRIVER: "sqlite"` are typed and parsed cleanly.

## Step-by-Step Instructions

### 1. Update `apps/web/src/server/env.ts`

1. Expand `serverEnvSchema`:
   ```ts
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
   ```
2. In `readProcessEnv()`, map:
   - `PERSISTENCE_DRIVER`: allow `"in-memory" | "sqlite" | "postgres"`.
   - `AUTH_DRIVER`: allow `"unavailable" | "dev-fake" | "supabase"`.
   - `SESSION_SECRET`: read `source.SESSION_SECRET ?? source.AUTH_SECRET` so both `.env.example` (`AUTH_SECRET`) and existing tests (`SESSION_SECRET`) work.
   - `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: copy when non-empty strings.
3. Keep `defaults` with `NODE_ENV: "test"` and `PERSISTENCE_DRIVER: "in-memory"` so existing unit tests do not write to disk.

### 2. Update `apps/web/src/server/composition.ts`

1. Import `localSqlitePath` alongside `createSqlitePersistence` from `@fibonaipe/adapter-persistence-sqlite`:
   ```ts
   import { createSqlitePersistence, localSqlitePath } from "@fibonaipe/adapter-persistence-sqlite";
   ```
2. Update `persistenceFor(env: ServerEnv): Persistence`:
   ```ts
   function persistenceFor(env: ServerEnv): Persistence {
     const databaseUrl = env.DATABASE_URL ?? readDatabaseUrl();
     if (env.PERSISTENCE_DRIVER === "postgres" && databaseUrl.length > 0) {
       return createPostgresPersistence({ DATABASE_URL: databaseUrl });
     }
     if (env.PERSISTENCE_DRIVER === "sqlite" && env.NODE_ENV !== "test") {
       return createSqlitePersistence(localSqlitePath);
     }
     return createSqlitePersistence(":memory:");
   }
   ```

### 3. Update `apps/web/src/server/dev-gateway.ts`

Pass `PERSISTENCE_DRIVER: "sqlite"` by default when creating the dev container:
```ts
const devApp = createApp(
  createAppContainer({
    NODE_ENV: "development",
    AUTH_DRIVER: "dev-fake",
    PERSISTENCE_DRIVER: "sqlite",
  }),
);
```

## Verification

Run:
```sh
npm run lint
npm run typecheck
npx vitest run
```
All existing tests must pass and no `data/local.sqlite` lock issues may occur during `vitest run`.
