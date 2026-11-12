# PRD: Non-functional requirements

Targets are verified by `npm run verify` (see [operations](../specs/operations.md)). Functional requirements are in [functional-requirements.md](functional-requirements.md).

| ID | Category | Requirement and target |
| :--- | :--- | :--- |
| RNF-01 | Realtime performance | Vote, presence and reveal events reach all connected participants in 1 s or less at p95 under normal network conditions. |
| RNF-02 | Web Vitals | Initial LCP under 2.5 s on a 4G mid-range mobile profile. Initial JS for the room route at most **150 KB gzip**. |
| RNF-03 | Capacity | Rooms of up to 30 simultaneous participants and multiple concurrent rooms within free-tier quotas. |
| RNF-04 | Availability | 99% during validation. Free-plan cold starts show clear feedback ("Reconnecting / Waking server..."). |
| RNF-05 | Resilience and idempotency | Brief network drops lose no vote. Every mutation carries a `clientOpId` (ULID) for server dedup, plus a local retry queue and reconciliation by `Room.version` on reconnect. |
| RNF-06 | Mobile first | Designed from a 360 px viewport with no horizontal scroll and touch targets of at least 44×44 px. |
| RNF-07 | Multi-screen | Fluid on phones, tablets, desktops and 1920×1080 projectors (projector mode). |
| RNF-08 | Accessibility | **WCAG 2.2 AA**: verified contrast in light and dark themes, clear `:focus-visible`, 100% keyboard operation, screen-reader support (NVDA, VoiceOver, TalkBack). |
| RNF-09 | Visual and assistive semantics | Nothing conveyed by color or symbol alone. Cards and suits expose value and meaning as text (for example `aria-label="5 pontos, Paus: Risco Alto"`). Table events announced through `aria-live="polite"`. Honors `prefers-reduced-motion` and `prefers-color-scheme`. Every SVG chart has an equivalent HTML table. |
| RNF-10 | Accessibility verification | `@axe-core/playwright` on every screen in CI, plus a manual screen-reader script each release. |
| RNF-11 | i18n | No hardcoded strings in components, accessibility attributes or error messages. Dates, numbers and currency formatted with native `Intl`. |
| RNF-12 | Application security | HTTPS only; room codes from a CSPRNG; schema validation on every endpoint; XSS protection (React escaping, no raw HTML injection); `Origin` check; CSV formula-injection protection. |
| RNF-13 | Data and network security | Authorization is checked only on the server with `can(...)`. **Hidden vote values never travel over the realtime channel or HTTP responses before reveal.** Guest sessions use an `httpOnly`, `Secure`, `SameSite=Lax` cookie and only the SHA-256 hash is stored. Rate limiting per IP and per participant. |
| RNF-14 | Privacy and LGPD | Minimal collection (nickname in session; email and name only for authenticated accounts). Individual votes never persist in history. Clear terms and privacy page and a complete account-deletion flow. |
| RNF-15 | Ephemeral purge | An automated, idempotent `PurgeExpiredRooms` cascades deletion of anonymous rooms inactive for more than 60 minutes, logging no nicknames or content. |
| RNF-16 | Clean architecture | Strict `domain` ← `application` ← `adapters` ← `apps/web`. `domain` has zero runtime dependencies and no database, network, UI framework, `Date.now()` or `Math.random()`. |
| RNF-17 | Infrastructure portability | Every external dependency (Persistence, Realtime, Auth, IssueTracker, Exporter, Clock, IdGenerator, RateLimiter) sits behind a port in `application`, with contract tests in `packages/testing`. |
| RNF-18 | Quality | Strict TypeScript, at least 90% coverage in `domain` and `application`, property-based tests for statistical math and architecture-boundary tests in CI. |
| RNF-19 | Operational observability | Structured JSON logs (`requestId`, `roomId`, `useCase`, `errorCode`, latency) and aggregate health metrics with no PII or votes. |
| RNF-20 | Zero cost in the MVP | Run entirely within free plans, with quota limits documented and a warning at 80% of each quota. |
| RNF-21 | Browser support | The last two stable versions of Chrome, Edge, Firefox and Safari (desktop and mobile). |
| RNF-22 | PWA | Web manifest and Service Worker for home-screen install and static asset caching (never cache `/api` responses). |
| RNF-23 | Data integrity and concurrency | Versioned SQL migrations; same-room mutations serialized by a transactional lock (`SELECT ... FOR UPDATE`) with `Room.version` increment; dates stored in UTC (`timestamptz`); periodic backup/export. |
| RNF-24 | Package standard | **npm only** with npm workspaces and a single root `package-lock.json`; Node.js LTS pinned in `.nvmrc` and `engines`. |
| RNF-25 | Open-source governance | Permissive license, automated third-party license check in CI, DCO/CLA for external contributions. |
| RNF-26 | Integration credentials | ClickUp and Jira tokens encrypted at rest on the server (AES-256-GCM), never sent to the browser, with minimum scope. |

## Operational limits and default parameters

These are configurable constants in `domain` and `application`.

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `MAX_PARTICIPANTS` | 30 | Voters plus Observers per room. |
| `ANON_ROOM_TTL_MINUTES` | 60 | Idle time (zero connections) before an ephemeral room is deleted. |
| `ONLINE_WINDOW_SECONDS` | 45 | Time since last heartbeat or event within which a participant is `online`. |
| `HEARTBEAT_INTERVAL_SECONDS` | 20 | Client heartbeat interval in polling fallback. |
| `HOST_GRACE_SECONDS` | 60 | Host disconnection before automatic host transfer. |
| `MAX_ITEMS_PER_ROOM` | 500 | Queue size and rows per CSV/text import. |
| `MAX_ITEM_TITLE_LENGTH` | 200 | Item title length. |
| `MAX_ITEM_DESC_LENGTH` | 2000 | Item description length. |
| `MAX_VOTE_COMMENT_LENGTH` | 140 | Ephemeral vote comment length (R3). |
| `MIN_SPRINTS_FOR_FORECAST` | 3 | Closed valid sprints needed before forecasting. |
| `MAX_SPRINTS_FOR_FORECAST` | 6 | Rolling window of recent sprints for median pace. |
| `RATE_LIMIT_CREATE_ROOM` | 10 / hour / IP | Room creation. |
| `RATE_LIMIT_JOIN_ATTEMPTS` | 20 / min / IP | Join attempts by room code. |
| `RATE_LIMIT_MUTATIONS` | 60 / min / participant | Voting and change actions. |
| `BUNDLE_BUDGET_ROOM_GZIP` | 150 KB (153,600 bytes) | Initial JS for the voting room route. |
