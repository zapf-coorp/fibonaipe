# Fidelity Review — Fibonaipe (`sa-analyze-core`)

**Document Reviewed:** `.docs/requirements.md` (v1.0 — Consolidada)  
**Reference Baseline:** `userIdea` prompt & constraints  
**Verdict:** **PASS**

---

## 1. Executive Summary

`.docs/requirements.md` achieves **100% fidelity** against every functional, mathematical, architectural, and operational constraint specified in `userIdea`. All mandatory technical constraints (Hexagonal Architecture / Ports & Adapters, Builder/Constructor pattern, Clean Code, `Result<T, AppError>` pattern, pure `npm workspaces` monorepo without `pnpm`/`yarn`, Node.js LTS with strict TypeScript, React + TanStack Router & Query + Vite mobile-first PWA, and 100% free-tier hosting with WebSocket + HTTP polling fallback) are explicitly documented and mapped to verifiable Functional Requirements (`RF-*`), Domain Invariants (`INV-*`), and Non-Functional Requirements (`RNF-*`).

---

## 2. Traceability Matrix (`userIdea` vs. `.docs/requirements.md`)

| # | `userIdea` Constraint | Coverage in `.docs/requirements.md` | Status |
| :- | :--- | :--- | :---: |
| **1** | **Planning Poker: Fibonacci + Naipe de Risco** (2D estimation, special cards `?`, `Coringa`, `AFK`, item tags `A/K/Q/J`, suit divergence detection) | §1, §2 (Items 2–6), §4.3 (`RF-20`–`RF-27`), §4.4 (`RF-30`–`RF-33`), §4.5 (`RF-40`–`RF-56`), §5.1, §6 (`INV-01`–`INV-08`, `INV-14`), UX Addendum | **PASS** |
| **2** | **Gestão de Sprints** (lifecycle `planned → active → closed`, holiday calendar, member capacity & focus, scope commitment, carry-over, immutable closure) | §2 (Item 10), §4.7 (`RF-70`–`RF-75`), §5.2, §6 (`INV-10`–`INV-12`) | **PASS** |
| **3** | **Dashboard de Capacity / Velocity** (Committed vs. Delivered points, `addedAfterStart`, available person-days, normalized pace `velocity ÷ capacity`, estimation quality observability) | §1.1, §4.8 (`RF-80`, `RF-81`, `RF-83`, `RF-86`), §5.2, §5.3, UX Addendum (#7) | **PASS** |
| **4** | **Previsão Estatística de Entregas** (median pace over 3–6 closed sprints, P25–P75 range for $N=6$ or min/max for $3 \le N < 6$, insufficient data guard $<3$ sprints, risk suit alert, `errorPct` accuracy tracking) | §1.1, §4.8 (`RF-82`, `RF-84`, `RF-85`), §5.3 (Items 1–6), §10 (`MIN_SPRINTS_FOR_FORECAST = 3`, `MAX_SPRINTS_FOR_FORECAST = 6`) | **PASS** |
| **5** | **Arquitetura Hexagonal (Ports & Adapters)** (`domain ← application ← adapter-* ← apps/web`, zero external runtime deps in `domain`, contract test suites in `packages/testing`) | §2 (Item 11), §7 (`RNF-16`, `RNF-17`), §8.1 | **PASS** |
| **6** | **Padrão Builder / Constructor** (`RoomBuilder`, `RoomSettingsBuilder`, `SprintBuilder`, `ForecastReportBuilder` + invariant enforcement on construction) | §2 (Item 11), §8.1 (Item 1) | **PASS** |
| **7** | **Clean Code + Result Pattern** (`Result<T, AppError>`, deterministic pure domain functions, no unhandled exceptions for domain/expected errors, $\ge 90\%$ coverage in `domain`/`application`, architectural lint gates) | §2 (Item 11), §5, §7 (`RNF-16`, `RNF-18`), §9 (`R0`) | **PASS** |
| **8** | **Monorepo com npm puro** (`npm workspaces`, single root `package-lock.json`, explicit prohibition of `pnpm` and `yarn`) | §2 (Item 11), §7 (`RNF-24`), §8.1, §9 (`R0`) | **PASS** |
| **9** | **Node.js LTS + TypeScript Estrito** (`strict: true`, `noUncheckedIndexedAccess: true`, `.nvmrc` + `engines`) | §2 (Item 11), §7 (`RNF-18`, `RNF-24`) | **PASS** |
| **10** | **React + TanStack (Router & Query) + Vite como PWA Mobile-First** (360px viewport baseline, $44\times44\text{ px}$ touch targets, WCAG 2.2 AA, Service Worker + Web Manifest, $\le 150\text{ KB}$ gzip room bundle budget) | §2 (Item 11), §7 (`RNF-02`, `RNF-06`–`RNF-10`, `RNF-22`), §8.1 (Item 5), §9 (`R0`), UX Addendum | **PASS** |
| **11** | **Hospedagem 100% em Planos Gratuitos + Realtime com Fallback de Polling** (Cloudflare/Vercel/Render/Railway/Fly + Supabase/Neon Postgres, WebSocket primary + 2–3s HTTP polling fallback, cold-start UX handling, quota limits) | §2 (Item 1), §7 (`RNF-03`, `RNF-04`, `RNF-05`, `RNF-20`), §8.1 (Item 4), §8.2, §10, UX Addendum (#6) | **PASS** |
| **12** | **Quebra em tarefas menores por specs em `.docs/specs/`** (each spec containing only the detailed description of how to implement that spec) | §8.1 (modular package topology) & §9 (phased roadmap `R0`–`R4` ready for granular `.docs/specs/*.spec.md` decomposition) | **PASS** |

---

## 3. Prioritized Architectural & Product Attention Points for Spec Breakdown (`.docs/specs/`)

While `.docs/requirements.md` has zero missing requirements, the downstream decomposition into `.docs/specs/*.spec.md` must address the following prioritized risks and design constraints:

### P0 — Critical Architectural & Security Guardrails

1. **Specification Format Compliance (`.docs/specs/*.spec.md`):**
   - Per `userIdea`, each file in `.docs/specs/` must contain **only the detailed description of how to implement that spec** (responsibilities, contracts/ports, inputs/outputs, domain invariants enforced, edge cases, state transitions, and verification criteria) without dumping full implementation code.
2. **Strict Hexagonal Dependency Direction (`RNF-16`, `RNF-17`):**
   - `packages/domain` must remain 100% free of runtime dependencies, I/O, framework imports, `Date.now()`, or `Math.random()`. Time and IDs must be injected via `Clock` and `IdGenerator` ports in `packages/application`.
   - Every port in `packages/application` (`Persistence`, `RealtimePublisher`, `RealtimeClient`, `AuthProvider`, `IssueTracker`, `Exporter`, `RateLimiter`, `Clock`, `IdGenerator`) must have a corresponding reusable contract test suite in `packages/testing` (`describePersistenceContract`, etc.) before concrete adapters are wired.
3. **Zero Vote Leakage Before Reveal (`RF-40`, `RNF-13`, §8.2):**
   - The `projectRoomForViewer(room, viewerParticipantId)` projector in `packages/application` must strip other participants' card values, suits, and vote comments whenever `Round.status === 'voting'`, exposing only `{ participantId, hasVoted: boolean }`.
   - Realtime events (`vote.changed`) must never carry card values; full values are emitted only in the state projection after `Round.status === 'revealed'`.
4. **Strict Aggregate-Only History Persistence (`RF-60`, `RF-61`, `INV-13`, `RNF-14`):**
   - The database schema and `Persistence` port for permanent team history (`ItemEstimateHistory` / `RoundSummary`) must structurally lack columns or collections for individual voter identities or per-vote comments. Ephemeral rooms (`teamId = null`) must be completely purged after `ANON_ROOM_TTL_MINUTES = 60` of inactivity (`PurgeExpiredRooms`).

### P1 — High-Priority Domain & Realtime Resilience Mechanics

5. **Versioned State Reconciliation & Polling Fallback (`RNF-05`, §8.2):**
   - Every room mutation must execute under transactional serialization (`SELECT ... FOR UPDATE` or atomic equivalent) and increment `Room.version`.
   - Mutations must accept a `clientOpId` (ULID) for server-side idempotency so retries during free-tier cold starts or mobile network drops never duplicate side effects.
   - The `RealtimeClient` adapter must seamlessly downgrade from WebSocket to HTTP polling (`GET /api/rooms/:code/state?since=version` every 2–3s with `HEARTBEAT_INTERVAL_SECONDS = 20`) and reconcile version gaps automatically.
6. **Host Succession & Presence Window (`RF-23`, `INV-02`, §10):**
   - Host disconnection detection (`ONLINE_WINDOW_SECONDS = 45`, `HOST_GRACE_SECONDS = 60`) must deterministically promote the next eligible online participant (Delegated Facilitator > PM > PO > Dev > QA > Observer, tie-breaking by earliest join timestamp) so rooms never become orphaned.
   - Screen/Projector mode (`/r/:code/screen`, `RF-27`) must connect as a read-only viewer that does **not** consume a slot in `MAX_PARTICIPANTS = 30` (`INV-01`).
7. **Exactness of Statistical & Forecasting Formulas (§5.1–§5.3):**
   - Domain math functions must keep full floating-point precision internally (rounding only at UI presentation).
   - Special cards (`?`, `Coringa`, `AFK`) must be excluded from numeric `mean`, `median`, `modes`, `consensus`, and `nearConsensus`.
   - Suit divergence (`suitDivergence = true` when $\max_{\text{suit}} - \min_{\text{suit}} \ge 2$ on the $1..4$ ordinal scale, ignoring `Coringa`) must be tested independently of numeric consensus (e.g., all voters pick `5`, but suits include `♣ Alto (4)` and `♠ Baixo (2)`).
   - Sprint forecast must strictly enforce `MIN_SPRINTS_FOR_FORECAST = 3` eligible closed sprints ($\text{capacityTotal} > 0$), using `min/max` for $3 \le N < 6$ and linear-interpolated `P25/P75` for $N = 6$.

### P2 — UX, Accessibility & Free-Tier Operational Constraints

8. **Bundle Budget & Mobile-First Accessibility (`RNF-02`, `RNF-06`, `RNF-08`, `RNF-09`):**
   - Route-level code splitting via TanStack Router must keep the voting room route initial JS bundle $\le 150\text{ KB}$ (gzip), lazy-loading Sprint Dashboard SVG charts and CSV/JSON import/export modules.
   - Every interactive choreography in the UX/Juice Addendum (card elevation, suit pop, 3D flip reveal, timer shake, SVG chart transitions) must implement an explicit `@media (prefers-reduced-motion: reduce)` alternative and pair every visual cue with textual labels + `aria-live` announcements, backed by accessible HTML tables alongside all SVG charts.
9. **Encrypted Integration Credentials & CSV Injection Defense (`RF-63`, `RNF-12`, `RNF-26`):**
   - ClickUp and Jira API tokens (`RF-91`, `RF-92`) must be encrypted at rest on the server using `AES-256-GCM` and never serialized to client responses.
   - CSV exports (`RF-63`, `RF-64`, `RF-86`) must include UTF-8 BOM and neutralize leading formula characters (`=`, `+`, `-`, `@`, `\t`, `\r`) to prevent CSV Formula Injection.
