# Graph Report - fibonaipe  (2026-11-12)

## Corpus Check
- 331 files · ~134,821 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .css 11, (none) 4, .example 1)

## Summary
- 2832 nodes · 9031 edges · 120 communities (97 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `260eef40`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- planning-table.ts
- compute-round-stats.test.ts
- vitest
- planning-table.test.ts
- AppError
- domain/src/index.ts
- sqlite-persistence.ts
- vitest
- createAppError
- Room
- room-session.ts
- UserId
- router.tsx
- i18n/index.ts
- PlanningTable
- auth-teams.ts
- ParticipantId
- postgres-persistence.ts
- RoomId
- dev-fake-auth-provider.ts
- HistoryEntryBuilder
- Table.tsx
- Card
- ref_react
- UseCaseDependencies
- QueueDrawer.tsx
- AppHeader.tsx
- contract.integration.test.ts
- web/package.json
- room.test.ts
- export-room-summary.ts
- room.ts
- Sprint
- rooms.ts
- team.ts
- compilerOptions
- package.json
- commands.ts
- scripts
- room-view.ts
- compute-round-stats.ts
- poker-table-and-projector-ui.test.tsx
- result.ts
- ok
- app.ts
- env.ts
- reach
- auth-teams-http.test.ts
- shell-flow.test.tsx
- DevFakeAuthProvider
- RoomEvent
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- Item
- createPostgresPersistence
- room-entry-http.test.ts
- missing-flags.ts
- composition.ts
- main.tsx
- exporter.ts
- i18n-and-theme.test.tsx
- import-items.ts
- src/ids.ts
- ItemBuilder
- can.test.ts
- devDependencies
- adapter-auth-devfake/package.json
- AuthProviderContractHarness
- list-history.ts
- ref_node_path
- Timer.tsx
- read-source.ts
- compilerOptions
- RoomBuilderChain
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- @fibonaipe/domain
- SprintBuilder
- ../../tsconfig.base.json
- adapter-auth-devfake/tsconfig.json
- RoomSettingsBuilder
- adapter-exporter-csvjson/tsconfig.json
- adapter-issuetracker-manual/package.json
- adapter-issuetracker-manual/tsconfig.json
- adapter-persistence-postgres/tsconfig.json
- @fibonaipe/application
- adapter-persistence-sqlite/tsconfig.json
- adapter-realtime-supabase/package.json
- adapter-realtime-supabase/tsconfig.json
- adapter-system/package.json
- adapter-system/tsconfig.json
- application/tsconfig.json
- testing/package.json
- testing/tsconfig.json
- RateLimiter
- domain/package.json
- SettingsBuilderChain
- loopback-guard.ts
- Hash
- check-bundle-budget.mjs
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- graphify
- tsconfig.json
- 005_team_tasks.sql
- domain-impure-date/bad.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 298 edges
2. `Result` - 297 edges
3. `ok()` - 262 edges
4. `createAppError()` - 199 edges
5. `err()` - 187 edges
6. `UseCaseDependencies` - 115 edges
7. `TeamId` - 87 edges
8. `vitest` - 87 edges
9. `UserId` - 79 edges
10. `RoomId` - 67 edges

## Surprising Connections (you probably didn't know these)
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-system/package.json → apps/web/package.json
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/adapter-system/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/testing/package.json → apps/web/package.json
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/testing/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-auth-devfake/package.json → apps/web/package.json

## Import Cycles
- None detected.

## Communities (120 total, 23 thin omitted)

### Community 0 - "planning-table.ts"
Cohesion: 0.09
Nodes (29): EstimateAudit, actorOf(), cardsByScale, isOnline(), seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND, TableOk (+21 more)

### Community 1 - "compute-round-stats.test.ts"
Cohesion: 0.14
Nodes (9): ScaleBuilder, cardFor(), fullScale(), QUIET_SPECIALS, QUIET_SUITS, scaleWithout(), VoteRow, votes() (+1 more)

### Community 2 - "vitest"
Cohesion: 0.06
Nodes (37): testApp(), testApp(), signIn(), append(), BASE, mustId(), row(), signIn() (+29 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.04
Nodes (42): ACTIONS, asModule(), AuditView, CARD_LABELS, CODE, Command, COMMANDS, EDGES (+34 more)

### Community 4 - "AppError"
Cohesion: 0.06
Nodes (21): RolledBack, createInMemoryRateLimiter(), AuthProvider, CryptoVault, RateLimitRule, RateLimitStatus, completeIdentity(), persistSignedInUser() (+13 more)

### Community 5 - "domain/src/index.ts"
Cohesion: 0.05
Nodes (54): computeAccuracy(), ForecastAccuracy, ForecastAccuracyPoint, ForecastAccuracyRecord, ClosedSprintForecastInput, ForecastInsufficient, ForecastOk, ForecastReportBuilder (+46 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.07
Nodes (48): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+40 more)

### Community 7 - "vitest"
Cohesion: 0.08
Nodes (67): createRoomUseCases(), RoomUseCases, AuditRow, HistoryRow, means(), seatsOf(), teamRoom(), RecordAggregatedHistory (+59 more)

### Community 8 - "createAppError"
Cohesion: 0.08
Nodes (22): parseBody(), EditFinalEstimateInput, seatOf(), SPECIAL_CARDS, authorize(), hydrate(), hydrateIn(), inLockedRoom() (+14 more)

### Community 9 - "Room"
Cohesion: 0.13
Nodes (9): LinkGuestToAccountInput, LinkGuestToAccountResult, LoadedRoom, PlanningTableApi, Participant, domainEvent(), isOnline(), JoinOk (+1 more)

### Community 10 - "room-session.ts"
Cohesion: 0.06
Nodes (62): IssueTrackerImportInput, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput, runItem() (+54 more)

### Community 11 - "UserId"
Cohesion: 0.05
Nodes (34): UserRepository, AcceptInviteResult, ChangeMemberRoleInput, CreateInviteInput, CreateInviteResult, TeamMemberSummary, TeamSummary, Invite (+26 more)

### Community 12 - "router.tsx"
Cohesion: 0.08
Nodes (39): ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners, setConnectionStatus() (+31 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.05
Nodes (54): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+46 more)

### Community 14 - "PlanningTable"
Cohesion: 0.13
Nodes (9): cardByLabel(), contextOf(), numericCard(), planningEvent(), PlanningTable, predominantSuit(), seatOf(), Round (+1 more)

### Community 15 - "auth-teams.ts"
Cohesion: 0.04
Nodes (81): callbackSchema, capacitySchema, clientIp(), doneSchema, emailSchema, fail(), holidaySchema, inviteSchema (+73 more)

### Community 16 - "ParticipantId"
Cohesion: 0.16
Nodes (14): IdempotencyRepository, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload, ParticipantJoinedPayload, ParticipantUpdatedPayload, RoomClaimedPayload (+6 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.07
Nodes (23): applyHistoryDetail(), asDate(), asNumber(), createRepos(), findRoom(), findRoomByCode(), HISTORY_BASE_KEYS, HistoryRow (+15 more)

### Community 18 - "RoomId"
Cohesion: 0.07
Nodes (34): MemoryStore, AggregatedHistoryRecord, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, MembershipRepository, PersistedInviteRecord (+26 more)

### Community 19 - "dev-fake-auth-provider.ts"
Cohesion: 0.11
Nodes (16): createDevFakeAuthProvider(), DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole (+8 more)

### Community 20 - "HistoryEntryBuilder"
Cohesion: 0.06
Nodes (22): HistoryRepository, PersistedRoomItem, TransactionRepos, RoundStartedPayload, dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps (+14 more)

### Community 21 - "Table.tsx"
Cohesion: 0.13
Nodes (37): matrixFor(), paintFinder(), QrCode(), EstimateDialog(), activeCards(), can(), currentItem(), DEFAULT_CARDS (+29 more)

### Community 22 - "Card"
Cohesion: 0.11
Nodes (19): OwnVote, ProjectedItem, ProjectedVote, RoomView, StoredItem, StoredRound, ReconnectParticipantResult, ItemView (+11 more)

### Community 23 - "ref_react"
Cohesion: 0.09
Nodes (38): CommitTagField(), arm(), beginErrorFlash(), listen(), showErrorFlash(), JoinMode, touchTargetStyle, ImportDialog() (+30 more)

### Community 24 - "UseCaseDependencies"
Cohesion: 0.03
Nodes (8): EditFinalEstimateWithAudit, ExportHistory, LinkGuestToAccount, UseCaseDependencies, PurgeExpiredRoomsResult, ClaimRoom, StartTimer, StopTimer

### Community 25 - "QueueDrawer.tsx"
Cohesion: 0.10
Nodes (29): TaskLine(), CopyIcon(), createRoom(), FAN, FIBONACCI, HomePage(), Phase, SUITS (+21 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.08
Nodes (34): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), useOwnSeat() (+26 more)

### Community 27 - "contract.integration.test.ts"
Cohesion: 0.15
Nodes (9): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), REQUIRED_TABLES, saveUnlocked(), walkManifests() (+1 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (30): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/domain@* (+22 more)

### Community 29 - "room.test.ts"
Cohesion: 0.12
Nodes (22): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+14 more)

### Community 30 - "export-room-summary.ts"
Cohesion: 0.21
Nodes (10): CsvExportInput, ExportArtifact, JsonExportInput, csvRows(), ExportRoomSummaryInput, SummaryItem, SummaryRound, FakeExporter (+2 more)

### Community 31 - "room.ts"
Cohesion: 0.09
Nodes (24): CreateTeamRoomInput, hasControlCharacter(), nicknameKey(), nullableSession(), nullableText(), nullableUserId(), ParticipantMode, RoomBuilder (+16 more)

### Community 32 - "Sprint"
Cohesion: 0.08
Nodes (7): submit(), mutate(), computeCapacity(), computeWorkingDays(), cloneItem(), cloneReport(), Sprint

### Community 33 - "rooms.ts"
Cohesion: 0.10
Nodes (32): accountUser(), actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail() (+24 more)

### Community 34 - "team.ts"
Cohesion: 0.26
Nodes (4): Team, TeamBuilder, TeamProps, OrganizationId

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+19 more)

### Community 36 - "package.json"
Cohesion: 0.08
Nodes (32): react-dom@^19.0.0, purityBan, devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1 (+24 more)

### Community 37 - "commands.ts"
Cohesion: 0.17
Nodes (30): enqueueVote(), nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote() (+22 more)

### Community 38 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 39 - "room-view.ts"
Cohesion: 0.12
Nodes (24): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+16 more)

### Community 40 - "compute-round-stats.ts"
Cohesion: 0.19
Nodes (15): summaryOf(), computeRoundStats(), diverges(), emptySpecialCounts(), emptySuitDistribution(), idsAt(), labelFor(), meanOf() (+7 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.09
Nodes (25): save(), assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings (+17 more)

### Community 42 - "result.ts"
Cohesion: 0.12
Nodes (21): isRoundStatus(), RoundProps, RoundStatus, AppErrorCode, ERROR_HTTP_STATUS, all(), andThen(), isErr() (+13 more)

### Community 43 - "ok"
Cohesion: 0.09
Nodes (19): FIBONACCI, inviteRecord(), issuedAtFromExpiry(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId(), parseRole(), requireTeamAction() (+11 more)

### Community 44 - "app.ts"
Cohesion: 0.13
Nodes (25): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), dependenciesOf(), devApp, errorResponse() (+17 more)

### Community 45 - "env.ts"
Cohesion: 0.29
Nodes (7): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), serverEnvSchema, env

### Community 46 - "reach"
Cohesion: 0.33
Nodes (10): apply(), branded(), buildItem(), currentTable(), makeRoom(), must(), open(), reach() (+2 more)

### Community 47 - "auth-teams-http.test.ts"
Cohesion: 0.31
Nodes (8): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), CreateTeamRoom

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.18
Nodes (11): ConnectionStatus, installColorScheme(), clearMissingFlags(), takeMissing(), boot(), assertTouchTarget(), boot(), lengthPx() (+3 more)

### Community 49 - "DevFakeAuthProvider"
Cohesion: 0.11
Nodes (8): DevFakeAuthProvider, normalizeEmail(), AuthenticatedIdentity, describeAuthProviderContract(), expectError(), expectIdentity(), MagicLink, VERIFIED_AT_MS

### Community 50 - "RoomEvent"
Cohesion: 0.06
Nodes (30): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RealtimeClient (+22 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.12
Nodes (12): createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets, ErrorReporter, LogEntry, StructuredLogger (+4 more)

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.21
Nodes (17): readRoom(), Persistence, deferred(), describePersistenceContract(), errNotFound(), errResult(), hasProcessed(), HistoryHidesIndividualVotes (+9 more)

### Community 55 - "createPostgresPersistence"
Cohesion: 0.28
Nodes (6): applyPostgresMigrations(), createPostgresPersistence(), poolFor(), postgresMigrationSql(), sqlStatements(), bad

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "missing-flags.ts"
Cohesion: 0.60
Nodes (3): markMissing(), LiveAnnouncerProvider(), useLiveAnnouncer()

### Community 58 - "composition.ts"
Cohesion: 0.14
Nodes (15): AppContainer, authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), ServerEnv (+7 more)

### Community 60 - "main.tsx"
Cohesion: 0.20
Nodes (8): App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerProvider(), createQueryClient(), router

### Community 61 - "exporter.ts"
Cohesion: 0.19
Nodes (10): createCsvJsonExporter(), sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), Exporter, csvLines() (+2 more)

### Community 63 - "i18n-and-theme.test.tsx"
Cohesion: 0.17
Nodes (11): ERROR_KEYS, flattenCatalog(), SHELL_KEYS, AnnounceProbe(), dayOptions, LocaleProbe(), oneDecimal, renderLocale() (+3 more)

### Community 64 - "import-items.ts"
Cohesion: 0.15
Nodes (19): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+11 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.16
Nodes (10): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_LENGTH, charAt() (+2 more)

### Community 67 - "can.test.ts"
Cohesion: 0.16
Nodes (12): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, loadCan() (+4 more)

### Community 68 - "devDependencies"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 72 - "list-history.ts"
Cohesion: 0.27
Nodes (8): ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf(), timeOf()

### Community 73 - "ref_node_path"
Cohesion: 0.11
Nodes (22): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), checkCatalogs() (+14 more)

### Community 74 - "Timer.tsx"
Cohesion: 0.31
Nodes (10): serverTime(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer(), TimerBridge (+2 more)

### Community 75 - "read-source.ts"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 76 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+3 more)

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 83 - "adapter-exporter-csvjson/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.25
Nodes (8): @fibonaipe/domain, dependencies, @fibonaipe/domain@*, exports, name, private, type, version

### Community 88 - "SprintBuilder"
Cohesion: 0.22
Nodes (3): hasSprintOverlap(), SprintBuilder, build()

### Community 90 - "../../tsconfig.base.json"
Cohesion: 0.22
Nodes (8): ../../tsconfig.base.json, compilerOptions, composite, outDir, rootDir, exclude, extends, include

### Community 91 - "adapter-auth-devfake/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 93 - "adapter-exporter-csvjson/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 94 - "adapter-issuetracker-manual/package.json"
Cohesion: 0.20
Nodes (10): @fibonaipe/application@*, @fibonaipe/application, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private (+2 more)

### Community 95 - "adapter-issuetracker-manual/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 96 - "adapter-persistence-postgres/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 97 - "@fibonaipe/application"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 98 - "adapter-persistence-sqlite/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 99 - "adapter-realtime-supabase/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 100 - "adapter-realtime-supabase/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 101 - "adapter-system/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 102 - "adapter-system/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 103 - "application/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 104 - "testing/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 105 - "testing/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 106 - "RateLimiter"
Cohesion: 0.33
Nodes (4): RateLimiter, describeRateLimiterContract(), expectAppError(), RateLimiterContractHarness

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 110 - "loopback-guard.ts"
Cohesion: 0.38
Nodes (6): guardedWindows, HappyDomSettings, HappyDomWindow, installLoopbackGuard(), isTestLoopback(), resolveFetchUrl()

### Community 120 - "domain-runtime-dep/package.json"
Cohesion: 0.50
Nodes (4): dependencies, zod@1.0.0, zod, name

### Community 121 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 123 - "002_r2_identity.sql"
Cohesion: 0.50
Nodes (3): invites, memberships, organizations

## Knowledge Gaps
- **1 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 810 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `planning-table.ts`, `compute-round-stats.test.ts`, `vitest`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `UserId`, `i18n/index.ts`, `auth-teams.ts`, `RoomId`, `dev-fake-auth-provider.ts`, `HistoryEntryBuilder`, `ref_react`, `contract.integration.test.ts`, `room.test.ts`, `Sprint`, `team.ts`, `package.json`, `poker-table-and-projector-ui.test.tsx`, `result.ts`, `ok`, `auth-teams-http.test.ts`, `shell-flow.test.tsx`, `DevFakeAuthProvider`, `RoomEvent`, `StructuredLogger`, `contract.integration.test.ts`, `room-entry-http.test.ts`, `composition.ts`, `exporter.ts`, `i18n-and-theme.test.tsx`, `import-items.ts`, `src/ids.ts`, `can.test.ts`, `ref_node_path`, `read-source.ts`, `SprintBuilder`, `RateLimiter`, `check-bundle-budget.mjs`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `planning-table.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08943089430894309 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `planning-table.ts`, `vitest`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `vitest`, `createAppError`, `Room`, `room-session.ts`, `UserId`, `PlanningTable`, `auth-teams.ts`, `postgres-persistence.ts`, `RoomId`, `dev-fake-auth-provider.ts`, `HistoryEntryBuilder`, `Card`, `UseCaseDependencies`, `contract.integration.test.ts`, `room.test.ts`, `export-room-summary.ts`, `room.ts`, `Sprint`, `rooms.ts`, `team.ts`, `result.ts`, `ok`, `app.ts`, `DevFakeAuthProvider`, `RoomEvent`, `contract.integration.test.ts`, `exporter.ts`, `import-items.ts`, `list-history.ts`, `RateLimiter`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `compute-round-stats.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `planning-table.ts`, `vitest`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `vitest`, `createAppError`, `Room`, `room-session.ts`, `UserId`, `PlanningTable`, `auth-teams.ts`, `postgres-persistence.ts`, `RoomId`, `dev-fake-auth-provider.ts`, `HistoryEntryBuilder`, `Card`, `UseCaseDependencies`, `contract.integration.test.ts`, `room.test.ts`, `export-room-summary.ts`, `room.ts`, `Sprint`, `rooms.ts`, `team.ts`, `result.ts`, `ok`, `app.ts`, `DevFakeAuthProvider`, `RoomEvent`, `contract.integration.test.ts`, `exporter.ts`, `import-items.ts`, `list-history.ts`, `RateLimiter`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.05898021308980213 - nodes in this community are weakly interconnected._