# Spec: Architecture

Implements RNF-16, RNF-17, RNF-24. Product context: [product PRD](../prd/product.md).

## Dependency rule

```text
packages/domain  ←  packages/application  ←  packages/adapter-*  ←  apps/web (composition root)
```

- **`packages/domain`**: aggregates, value objects, the `can` policy, math engines and Builders. Zero runtime dependencies. It must not call `Date.now()`, `new Date()` with no argument, `Math.random()`, `crypto.randomUUID()` or `process.env`. Time, ids and randomness are passed in.
- **`packages/application`**: use cases, ports and projections. Depends only on `@fibonaipe/domain`, with no third-party runtime dependencies.
- **`packages/testing`**: in-memory fakes and reusable contract suites that validate both fakes and real adapters.
- **`packages/adapter-*`**: concrete ports. An adapter never imports another adapter.
- **`apps/web`**: React PWA, thin Hono routes and the **composition root** (`src/server/composition.ts`), the only place allowed to import and wire concrete adapters.

## Packages

| Package | Role |
| :--- | :--- |
| `domain` | `shared` (Result, AppError, ids, constants), `scales`, `policy`, `entities`, `math`. |
| `application` | `ports`, `projections` (events, `projectRoomForViewer`), `use-cases` (rooms, items, voting, auth-teams, history, sprints, maintenance). |
| `testing` | `InMemoryPersistence`, `FakeRealtime`, `FakeClock`, `SequentialIdGenerator`, `FakeAuthProvider`, `FakeRateLimiter`, `describe*Contract` suites. |
| `adapter-system` | Real Clock, CSPRNG ids and room codes, ULID, SHA-256, AES-256-GCM vault, rate limiter, zero-PII JSON logger. |
| `adapter-persistence-postgres` | `postgres.js`, SQL migrations, room lock, RLS. |
| `adapter-persistence-sqlite` | `node:sqlite` stand-in for local dev when Postgres is absent. Never imports the Postgres adapter. |
| `adapter-realtime-supabase` | WebSocket plus 2–3 s HTTP polling fallback. |
| `adapter-auth-supabase` | Supabase GoTrue over native `fetch`: Magic Link (`verifyMagicLink` with documented fallbacks), Google OAuth code exchange, session tokens. Selected by `AUTH_DRIVER=supabase`. |
| `adapter-auth-devfake` | Dev-only fake login for `AUTH_DRIVER=dev-fake` (local simulator at `/login`). |
| `adapter-issuetracker-manual` | Free text and RFC 4180 CSV. ClickUp and Jira adapters are planned for R4. |
| `adapter-exporter-csvjson` | UTF-8 BOM, injection-safe CSV and JSON. |
| `apps/web` | `src/server` (composition, env, app, routes, `main.ts` production entry) and `src/client` (router, query client, i18n, styles, components, pages). |

Large modules are split by responsibility without changing behavior. Public import paths are unchanged; the new files are internal:

- `apps/web/src/server/routes/`: `auth-teams.ts` is a facade over `auth-routes.ts`, `team-routes.ts`, `sprint-routes.ts`, with shared helpers in `http-helpers.ts`.
- `packages/application/src/use-cases/`: `room-session.ts` re-exports `room-hydration.ts` (load, hydrate and persist room records) and `room-events.ts` (planning and room event mapping), so existing importers keep working.
- `packages/adapter-persistence-sqlite/src/`: `sqlite-schema.ts` (DDL and column guards) and `sqlite-mappers.ts` (row mappers).
- `packages/adapter-persistence-postgres/src/`: `postgres-mappers.ts` (row types and mappers).

Component folders in `apps/web/src/client/components`: `deck`, `table`, `queue`, `charts`, `status`. Each component keeps a `.module.css` beside it.

## Ports

`Clock`, `IdGenerator`, `Persistence` (`transaction({ lockRoomId }, fn)` and repositories), `RealtimePublisher` (server), `RealtimeClient` (browser), `AuthProvider`, `IssueTracker`, `Exporter`, `RateLimiter`, `CryptoVault`, `Logger`/`ErrorReporter`.

## Error handling: `Result<T, AppError>`

Expected failures never throw. Builders, domain mutations, port methods and use cases return `Result<T, AppError>`. Only defects throw (and propagate after a transaction rollback).

```ts
type ErrorCode =
  | "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "ROOM_FULL" | "NICKNAME_TAKEN"
  | "ROUND_NOT_VOTING" | "LIMIT_EXCEEDED" | "RATE_LIMITED" | "INSUFFICIENT_DATA"
  | "LAST_ADMIN" | "AUTH_LINK_INVALID" | "ACCOUNT_SUSPENDED";

interface AppError {
  readonly code: ErrorCode;
  readonly messageKey: string; // i18n key, for example "errors.ROOM_FULL"
  readonly params?: Readonly<Record<string, string | number>>;
}
```

`ok(value)` and `err(error)` build results; `map` and `andThen` compose them. `AppError` and `Result` are deliberate hubs in the knowledge graph.

## Builders

Aggregates and value objects (`Room`, `RoomSettings`, `Scale`, `Sprint`, `ForecastReport`) have private constructors and fluent Builders (`RoomBuilder`, `RoomSettingsBuilder`, `ScaleBuilder`, `SprintBuilder`, `ForecastReportBuilder`) with valid defaults. `.build()` checks the invariants (see [domain](domain.md)) and returns `Result`. Builders take id, time and other outside values from the caller.

## Transactional use cases

Use cases get ports by constructor injection. Each room mutation runs inside `persistence.transaction({ lockRoomId })`, checks idempotency by `(actorId, clientOpId)`, mutates the aggregate, saves, then records the op. Realtime events are published **strictly after commit**. The returned view always goes through `projectRoomForViewer`.

## Architecture decisions

| ID | Area | Choice | Rejected | Why |
| :--- | :--- | :--- | :--- | :--- |
| ADR-01 | Monorepo | npm workspaces, Node 24, one root lockfile | pnpm, yarn, Turborepo | Mandatory (RNF-24); no global binaries. |
| ADR-02 | Frontend | React 19, TanStack Router and Query v5, Vite 6 | Next.js, SvelteKit, Remix | Type-safe routes (`/r/$code`, `/r/$code/screen`); Query handles snapshot cache, optimistic UI and polling fallback. |
| ADR-03 | HTTP API | Hono v4 | Fastify, Express | Web-standard `Request`/`Response`, no native deps; runs on Node, Workers and Vercel. |
| ADR-04 | DB driver | `postgres.js` plus pure SQL versioned migrations | Prisma, Drizzle, `pg`, `better-sqlite3` | No C++ build; explicit transactions give room-level serialization. |
| ADR-05 | Realtime | Supabase Realtime plus HTTP polling fallback (2–3 s) | Socket.io, Pusher, Ably | Works on serverless free tiers; events carry no vote values. |
| ADR-06 | Styling and charts | CSS Modules, CSS custom properties, custom SVG charts | Tailwind, Recharts, Chart.js | Zero runtime CSS; keeps the 150 KB budget; keyboard focus and pattern fills per data point. |
| ADR-07 | Testing | Vitest, `fast-check`, Playwright, `@axe-core/playwright` | Jest, Cypress | Property tests prove stats and non-leakage; axe enforces WCAG across viewports. |

## Layer matrix

| Layer | Choice |
| :--- | :--- |
| Clients | React 19, TanStack Router and Query, Vite, CSS Modules and tokens, custom SVG charts, `qrcode` (client-side SVG), typed i18n (`pt-BR` default, `Intl`), `vite-plugin-pwa`. |
| Edge | Cloudflare Pages or Vercel CDN, strict `Origin` / `Sec-Fetch-Site` checks, `RateLimiter` port. |
| API | Hono, Zod for request and env validation, application use cases, `AuthProvider` (Supabase Magic Link and Google, plus guest cookie). |
| Messaging | Realtime ports over Supabase or WebSocket, polling fallback, platform cron calling the purge endpoint. |
| Data | Managed Postgres 16+ (Supabase or Neon free), versioned SQL migrations, `InMemoryPersistence` fake, optional `node:sqlite`, browser `localStorage` for theme, locale and the offline op queue. |
| Search | Postgres B-tree and `pg_trgm` for history filtering. No vector DB. |
| AI | None in the product runtime. All stats, capacity and forecasts are deterministic pure TypeScript. |
| Testing and CI | Vitest, `fast-check`, Playwright, axe, GitHub Actions running `npm run verify`. |
| Security | `node:crypto` CSPRNG, SHA-256 token hashes, AES-256-GCM vault, Postgres RLS, JSON logger without PII. |

## Dependency policy

1. `domain` has no runtime dependencies. `application` depends only on `domain`.
2. No native C++ addons (`better-sqlite3`, `bcrypt`, `sharp`, `canvas`, and anything that needs `node-gyp`), so `npm ci` works on Windows, Linux and serverless.
3. Room-route initial JS stays at or under 150 KB gzip. Adding a frontend runtime dependency requires re-running `npm run check:bundle`.
4. Runtime licenses must be permissive: MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, BlueOak-1.0.0. GPL, AGPL and LGPL are rejected by `npm run check:licenses`.

## Coding standards

- `tsconfig.base.json`: target ES2023, `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `skipLibCheck`.
- ESLint forbids in `domain` and `application`: `Date.now()`, zero-argument `new Date()`, `Math.random()`, `crypto.randomUUID()`, `process.env`, `@ts-ignore` and explicit `any`.
- `domain` and `application` must not read `process.env` or `import.meta.env`. Config arrives through Builders or use-case inputs.
- New interface copy goes only in `apps/web/src/client/i18n/locales/pt-BR.json`. `en-US` and `es-ES` stay frozen until localization.
