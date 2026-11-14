# Graph Report - fibonaipe  (2026-11-13)

## Corpus Check
- 352 files · ~144,274 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .css 11, (none) 4, .example 1)

## Summary
- 2975 nodes · 9491 edges · 145 communities (107 shown, 38 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a13606dc`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card
- room-session.ts
- vitest
- planning-table.test.ts
- AppError
- RoomEvent
- sqlite-persistence.ts
- record-aggregated-history.test.ts
- UserId
- HistoryEntryBuilder
- team-routes.ts
- composition.ts
- router.tsx
- i18n/index.ts
- PlanningTable
- sprint-routes.ts
- application/src/index.ts
- postgres-persistence.ts
- Card
- DevFakeAuthProvider
- SprintBuilder
- Table.tsx
- TeamId
- ref_react
- UseCaseDependencies
- PlanningTable
- AppHeader.tsx
- Room
- dependencies
- room.test.ts
- compute-round-stats.ts
- create-room.ts
- ok
- rooms.ts
- domain/src/index.ts
- compilerOptions
- package.json
- commands.ts
- supabase-auth-provider.ts
- room-view.ts
- QueueDrawer.tsx
- poker-table-and-projector-ui.test.tsx
- compute-forecast.ts
- main.tsx
- ParticipantId
- RoomId
- fake-realtime.ts
- auth-provider.contract.ts
- shell-flow.test.tsx
- ForecastDashboard.tsx
- dev-fake-auth-provider.ts
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- cloneItem
- dev-auth.ts
- room-entry-http.test.ts
- i18n-and-theme.test.tsx
- DevLoginPage.tsx
- theme-provider.tsx
- read-source.ts
- exporter.ts
- auth-teams-http.test.ts
- check-i18n.mjs
- import-items.ts
- src/ids.ts
- ItemBuilder
- can.test.ts
- devDependencies
- web/package.json
- adapter-auth-devfake/package.json
- scripts
- RoomBuilderChain
- ref_node_fs
- Timer.tsx
- main.ts
- compilerOptions
- adapter-auth-supabase/package.json
- adapter-auth-supabase/tsconfig.json
- adapter-system/src/index.ts
- SettingsBuilderChain
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- eslint.config.js
- @fibonaipe/domain
- HistoryRepository
- src/ids.ts
- ../../tsconfig.base.json
- adapter-auth-devfake/tsconfig.json
- RoundStats
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
- list-history.ts
- domain/package.json
- RoomRepository
- app.ts
- check-bundle-budget.mjs
- vitest.config.ts
- engines
- @fibonaipe/adapter-exporter-csvjson@*
- @fibonaipe/adapter-persistence-postgres@*
- UserRepository
- loopback-guard.ts
- Hash
- @fibonaipe/adapter-persistence-sqlite@*
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- missing-flags.ts
- graphify
- tsconfig.json
- 005_team_tasks.sql
- domain-impure-date/bad.ts
- @fibonaipe/adapter-system@*
- @fibonaipe/application@*
- @fibonaipe/domain@*
- @hono/node-server
- react@^19.0.0
- @tanstack/react-query
- zod@^3.24.2

## God Nodes (most connected - your core abstractions)
1. `AppError` - 308 edges
2. `Result` - 307 edges
3. `ok()` - 274 edges
4. `createAppError()` - 209 edges
5. `err()` - 192 edges
6. `UseCaseDependencies` - 116 edges
7. `vitest` - 90 edges
8. `TeamId` - 90 edges
9. `UserId` - 84 edges
10. `useI18n()` - 71 edges

## Surprising Connections (you probably didn't know these)
- `save()` --indirect_call--> `base()`  [INFERRED]
  apps/web/src/features/sprints/HolidayCalendar.tsx → apps/web/test/unit/poker-table-and-projector-ui.test.tsx
- `accountUser()` --calls--> `ok()`  [EXTRACTED]
  apps/web/src/server/account-user.ts → packages/domain/src/shared/result.ts
- `AppContainer` --references--> `AuthProvider`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/auth-provider.port.ts
- `AppContainer` --references--> `Clock`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/clock.port.ts
- `AppContainer` --references--> `Exporter`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/exporter.port.ts

## Import Cycles
- None detected.

## Communities (145 total, 38 thin omitted)

### Community 0 - "Card"
Cohesion: 0.09
Nodes (22): RoomState, AfkCard, DoubtCard, JokerCard, NumericCard, SpecialCard, FIGURE_TAGS, ScaleBuilder (+14 more)

### Community 1 - "room-session.ts"
Cohesion: 0.06
Nodes (54): IssueTrackerImportInput, RecordAggregatedHistory, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput (+46 more)

### Community 2 - "vitest"
Cohesion: 0.09
Nodes (37): PersistedRoomRecord, AuditRow, HistoryRow, means(), seatsOf(), signIn(), append(), BASE (+29 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.04
Nodes (41): ACTIONS, asModule(), AuditView, CARD_LABELS, CODE, Command, COMMANDS, EDGES (+33 more)

### Community 4 - "AppError"
Cohesion: 0.06
Nodes (17): CryptoVault, RateLimitRule, RateLimitStatus, dominantSuit(), completeIdentity(), EMAIL_RULE, IP_RULE, warn() (+9 more)

### Community 5 - "RoomEvent"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.08
Nodes (48): applyHistoryDetail(), asRecords(), auditFromRow(), HISTORY_BASE_KEYS, historyDetail(), historyFromRow(), idempotencyFromRow(), integer() (+40 more)

### Community 7 - "record-aggregated-history.test.ts"
Cohesion: 0.12
Nodes (47): createRoomUseCases(), RoomUseCases, teamRoom(), currentItem(), FORBIDDEN_KEYS, forbiddenKeys(), reveal(), Seat (+39 more)

### Community 8 - "UserId"
Cohesion: 0.05
Nodes (38): EditFinalEstimateInput, seatOf(), SPECIAL_CARDS, AcceptInviteResult, inviteRecord(), issuedAtFromExpiry(), MVP_ORGANIZATION_ID, parseRole() (+30 more)

### Community 9 - "HistoryEntryBuilder"
Cohesion: 0.09
Nodes (14): PersistedRoomItem, HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id(), must() (+6 more)

### Community 10 - "team-routes.ts"
Cohesion: 0.13
Nodes (34): AppContainer, dependenciesOf(), callbackSchema, completeCallback(), emailSchema, loginRedirectUrl(), registerAuthRoutes(), registerAuthTeamRoutes() (+26 more)

### Community 11 - "composition.ts"
Cohesion: 0.09
Nodes (23): authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), devApp, defaults (+15 more)

### Community 12 - "router.tsx"
Cohesion: 0.06
Nodes (51): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+43 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.06
Nodes (38): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+30 more)

### Community 14 - "PlanningTable"
Cohesion: 0.09
Nodes (14): EstimateAudit, Item, actorOf(), cardByLabel(), contextOf(), isOnline(), numericCard(), planningEvent() (+6 more)

### Community 15 - "sprint-routes.ts"
Cohesion: 0.18
Nodes (24): capacitySchema, doneSchema, holidaySchema, registerSprintRoutes(), sprintItemSchema, sprintSchema, ListHistory, CreateSprint (+16 more)

### Community 16 - "application/src/index.ts"
Cohesion: 0.05
Nodes (41): applicationPackage, ExternalEstimateRef, ImportedItemCandidate, ImportRowWarning, IssueTrackerProvider, CompleteGoogleSignInInput, CompleteSignInInput, CompleteSignInResult (+33 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.07
Nodes (36): applyHistoryDetail(), asDate(), asNumber(), HISTORY_BASE_KEYS, historyDetail(), HistoryRow, InviteRow, ItemRow (+28 more)

### Community 18 - "Card"
Cohesion: 0.16
Nodes (13): PersistedItemSnapshot, OwnVote, ProjectedVote, ItemView, OwnVote, RoomView, VoteApi, VoteView (+5 more)

### Community 19 - "DevFakeAuthProvider"
Cohesion: 0.17
Nodes (3): DevFakeAuthProvider, normalizeEmail(), AuthenticatedIdentity

### Community 21 - "Table.tsx"
Cohesion: 0.13
Nodes (38): matrixFor(), paintFinder(), QrCode(), useOwnSeat(), EstimateDialog(), activeCards(), can(), currentItem() (+30 more)

### Community 22 - "TeamId"
Cohesion: 0.06
Nodes (37): MemoryStore, AggregatedHistoryRecord, AggregatedRoundStats, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, IdempotencyRepository (+29 more)

### Community 23 - "ref_react"
Cohesion: 0.10
Nodes (36): CommitTagField(), arm(), beginErrorFlash(), listen(), showErrorFlash(), touchTargetStyle, ImportDialog(), previewRows() (+28 more)

### Community 24 - "UseCaseDependencies"
Cohesion: 0.03
Nodes (4): AuthProvider, EditFinalEstimateWithAudit, DeleteAccount, UseCaseDependencies

### Community 25 - "PlanningTable"
Cohesion: 0.11
Nodes (14): nextSettings(), apply(), branded(), buildItem(), currentTable(), makeRoom(), must(), open() (+6 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.07
Nodes (36): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), AppShell() (+28 more)

### Community 27 - "Room"
Cohesion: 0.10
Nodes (21): hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableSession(), nullableText(), nullableUserId(), Participant, DomainEvent (+13 more)

### Community 28 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-auth-supabase@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/testing@*, hono@^4.6.14, react-dom@^19.0.0, @tanstack/react-router@^1.92.0 (+5 more)

### Community 29 - "room.test.ts"
Cohesion: 0.12
Nodes (22): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+14 more)

### Community 30 - "compute-round-stats.ts"
Cohesion: 0.21
Nodes (14): computeRoundStats(), diverges(), emptySpecialCounts(), emptySuitDistribution(), idsAt(), labelFor(), meanOf(), medianOf() (+6 more)

### Community 31 - "create-room.ts"
Cohesion: 0.11
Nodes (13): openDurableRoom(), participantJoined(), CREATE_ROOM_RULE, deliver(), limitIp(), saveRoom(), expectCount(), numericCounts() (+5 more)

### Community 32 - "ok"
Cohesion: 0.07
Nodes (26): parseBody(), createInMemoryRateLimiter(), persistSignedInUser(), hydrateIn(), inLockedRoom(), FIBONACCI, access(), recalculate() (+18 more)

### Community 33 - "rooms.ts"
Cohesion: 0.10
Nodes (28): actorId(), addItemSchema, claimSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail() (+20 more)

### Community 34 - "domain/src/index.ts"
Cohesion: 0.05
Nodes (80): hydrate(), planningOf(), Team, TeamBuilder, TeamProps, STATUSES, THEMES, User (+72 more)

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+20 more)

### Community 36 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, eslint@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, react-dom@^19.3.1, @testing-library/user-event@^14.6.8, typescript@^5.9.3 (+16 more)

### Community 37 - "commands.ts"
Cohesion: 0.19
Nodes (27): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote(), confirmEstimate() (+19 more)

### Community 38 - "supabase-auth-provider.ts"
Cohesion: 0.16
Nodes (11): GoTrueSession, GoTrueUser, identityFrom(), normalizeEmail(), SupabaseAuthOptions, SupabaseAuthProvider, Call, fakeFetch() (+3 more)

### Community 39 - "room-view.ts"
Cohesion: 0.10
Nodes (28): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+20 more)

### Community 40 - "QueueDrawer.tsx"
Cohesion: 0.18
Nodes (16): TaskLine(), loadTeams(), queueSnapshot(), isHttp(), ItemRow, Caret(), CloseIcon(), exportTasks() (+8 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.10
Nodes (24): assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings, HOST_CARD (+16 more)

### Community 42 - "compute-forecast.ts"
Cohesion: 0.14
Nodes (11): computeAccuracy(), ClosedSprintForecastInput, computeForecast(), ForecastInsufficient, ForecastOk, ForecastReportBuilder, ForecastRiskInput, isCivilDate() (+3 more)

### Community 43 - "main.tsx"
Cohesion: 0.15
Nodes (11): App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext, LiveAnnouncerContextValue, LiveAnnouncerProvider() (+3 more)

### Community 44 - "ParticipantId"
Cohesion: 0.13
Nodes (20): HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload, ParticipantJoinedPayload, ParticipantUpdatedPayload, RoomClaimedPayload, RoomEventEnvelope (+12 more)

### Community 45 - "RoomId"
Cohesion: 0.13
Nodes (15): RealtimeClient, RealtimePublisher, VersionGapInfo, RoomId, describeRealtimeContract(), must(), participant, publish() (+7 more)

### Community 46 - "fake-realtime.ts"
Cohesion: 0.18
Nodes (6): RealtimeConnectionState, RealtimeConnectionStatus, RealtimeSubscription, RealtimeSubscriptionHandlers, FakeRealtimeClient, Subscription

### Community 47 - "auth-provider.contract.ts"
Cohesion: 0.28
Nodes (4): AuthProviderContractHarness, describeAuthProviderContract(), expectError(), expectIdentity()

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.22
Nodes (8): installColorScheme(), clearMissingFlags(), takeMissing(), boot(), assertTouchTarget(), boot(), lengthPx(), remount()

### Community 49 - "ForecastDashboard.tsx"
Cohesion: 0.19
Nodes (11): dashboardRoute, ForecastCard(), download(), ForecastChart(), exportFromServer(), ForecastDashboard(), claim(), ForecastAccuracy (+3 more)

### Community 50 - "dev-fake-auth-provider.ts"
Cohesion: 0.12
Nodes (15): DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole, GoogleCode (+7 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.22
Nodes (6): ErrorReporter, LogEntry, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.10
Nodes (26): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), readRoom(), REQUIRED_TABLES, saveUnlocked() (+18 more)

### Community 55 - "dev-auth.ts"
Cohesion: 0.21
Nodes (16): accountUser(), errorResponse(), fail(), jsonWithSession(), loginSchema, okJson(), parseBody(), registerDevAuthRoutes() (+8 more)

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "i18n-and-theme.test.tsx"
Cohesion: 0.18
Nodes (10): ERROR_KEYS, flattenCatalog(), SHELL_KEYS, dayOptions, LocaleProbe(), oneDecimal, renderLocale(), renderTheme() (+2 more)

### Community 58 - "DevLoginPage.tsx"
Cohesion: 0.18
Nodes (9): DevLoginPage(), DevMethod, DevRole, DevUser, ROLE_KEYS, CallbackParams, LoginPage(), readCallbackParams() (+1 more)

### Community 59 - "theme-provider.tsx"
Cohesion: 0.18
Nodes (16): useLiveAnnouncer(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+8 more)

### Community 60 - "read-source.ts"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 61 - "exporter.ts"
Cohesion: 0.09
Nodes (23): createCsvJsonExporter(), sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), CsvExportInput, ExportArtifact (+15 more)

### Community 62 - "auth-teams-http.test.ts"
Cohesion: 0.07
Nodes (34): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), testApp() (+26 more)

### Community 63 - "check-i18n.mjs"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 64 - "import-items.ts"
Cohesion: 0.12
Nodes (25): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+17 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.24
Nodes (3): charAt(), initialRoomCodeIndexes(), SequentialIdGenerator

### Community 67 - "can.test.ts"
Cohesion: 0.09
Nodes (22): ActorKind, isInstanceAdmin(), isTeamAdmin(), MATRIX, PolicyActor, PolicyContext, PolicyRule, RoomKind (+14 more)

### Community 68 - "devDependencies"
Cohesion: 0.25
Nodes (4): vite@^6.0.6, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 69 - "web/package.json"
Cohesion: 0.21
Nodes (11): devDependencies, @types/node@^26.6.5, @types/react@^19.3.0, @types/react-dom@^19.3.0, name, private, type, version (+3 more)

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 71 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, start (+4 more)

### Community 73 - "ref_node_fs"
Cohesion: 0.30
Nodes (8): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses()

### Community 74 - "Timer.tsx"
Cohesion: 0.31
Nodes (10): serverTime(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer(), TimerBridge (+2 more)

### Community 75 - "main.ts"
Cohesion: 0.29
Nodes (8): CLIENT_DIR, createProductionFetch(), fileResponse(), isFile(), MIME_TYPES, serveStaticOrSpa(), startProductionServer(), fakeApi

### Community 76 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+4 more)

### Community 77 - "adapter-auth-supabase/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 78 - "adapter-auth-supabase/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 79 - "adapter-system/src/index.ts"
Cohesion: 0.18
Nodes (7): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets, StructuredLogger

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.19
Nodes (12): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, @fibonaipe/application, @fibonaipe/domain, name (+4 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 83 - "adapter-exporter-csvjson/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 86 - "eslint.config.js"
Cohesion: 0.33
Nodes (5): purityBan, @eslint/js@^9.39.1, typescript-eslint@^8.46.4, @eslint/js, typescript-eslint

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.25
Nodes (8): dependencies, @fibonaipe/domain@*, exports, @fibonaipe/domain, name, private, type, version

### Community 89 - "src/ids.ts"
Cohesion: 0.33
Nodes (8): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH

### Community 90 - "../../tsconfig.base.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json

### Community 91 - "adapter-auth-devfake/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 92 - "RoundStats"
Cohesion: 0.33
Nodes (4): PersistedRoundSnapshot, RoundApi, RoundView, RoundStats

### Community 93 - "adapter-exporter-csvjson/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 94 - "adapter-issuetracker-manual/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 95 - "adapter-issuetracker-manual/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 96 - "adapter-persistence-postgres/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 97 - "@fibonaipe/application"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 98 - "adapter-persistence-sqlite/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 99 - "adapter-realtime-supabase/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 100 - "adapter-realtime-supabase/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 101 - "adapter-system/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 102 - "adapter-system/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 103 - "application/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 104 - "testing/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 105 - "testing/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 106 - "list-history.ts"
Cohesion: 0.25
Nodes (9): ExportHistory, ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf() (+1 more)

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 109 - "app.ts"
Cohesion: 0.28
Nodes (12): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), httpStatusFor(), HttpErrorBody, httpErrorBody() (+4 more)

### Community 113 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

### Community 117 - "loopback-guard.ts"
Cohesion: 0.38
Nodes (6): guardedWindows, HappyDomSettings, HappyDomWindow, installLoopbackGuard(), isTestLoopback(), resolveFetchUrl()

### Community 120 - "domain-runtime-dep/package.json"
Cohesion: 0.50
Nodes (4): dependencies, zod@1.0.0, zod, name

### Community 121 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, preview, start

### Community 123 - "002_r2_identity.sql"
Cohesion: 0.50
Nodes (3): invites, memberships, organizations

### Community 125 - "missing-flags.ts"
Cohesion: 0.60
Nodes (3): markMissing(), LiveAnnouncerProvider(), useLiveAnnouncer()

## Knowledge Gaps
- **13 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 845 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Card`, `dom-matchers.ts`, `planning-table.test.ts`, `RoomEvent`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `UserId`, `HistoryEntryBuilder`, `composition.ts`, `i18n/index.ts`, `sprint-routes.ts`, `SprintBuilder`, `TeamId`, `room.test.ts`, `create-room.ts`, `ok`, `domain/src/index.ts`, `package.json`, `supabase-auth-provider.ts`, `poker-table-and-projector-ui.test.tsx`, `compute-forecast.ts`, `RoomId`, `auth-provider.contract.ts`, `shell-flow.test.tsx`, `ForecastDashboard.tsx`, `dev-fake-auth-provider.ts`, `contract.integration.test.ts`, `room-entry-http.test.ts`, `i18n-and-theme.test.tsx`, `read-source.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `import-items.ts`, `can.test.ts`, `ref_node_fs`, `main.ts`, `adapter-system/src/index.ts`, `src/ids.ts`, `check-bundle-budget.mjs`, `vitest.config.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _13 weakly-connected nodes found - possible missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.09309309309309309 - nodes in this community are weakly interconnected._
- **Why does `useI18n()` connect `AppHeader.tsx` to `commands.ts`, `QueueDrawer.tsx`, `Timer.tsx`, `router.tsx`, `i18n/index.ts`, `ForecastDashboard.tsx`, `Table.tsx`, `ref_react`, `i18n-and-theme.test.tsx`, `DevLoginPage.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `room-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06227106227106227 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `Card`, `room-session.ts`, `vitest`, `planning-table.test.ts`, `RoomEvent`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `UserId`, `HistoryEntryBuilder`, `team-routes.ts`, `PlanningTable`, `sprint-routes.ts`, `application/src/index.ts`, `postgres-persistence.ts`, `Card`, `DevFakeAuthProvider`, `TeamId`, `PlanningTable`, `Room`, `room.test.ts`, `create-room.ts`, `ok`, `rooms.ts`, `domain/src/index.ts`, `supabase-auth-provider.ts`, `room-view.ts`, `compute-forecast.ts`, `RoomId`, `fake-realtime.ts`, `auth-provider.contract.ts`, `dev-fake-auth-provider.ts`, `contract.integration.test.ts`, `dev-auth.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `import-items.ts`, `RoundStats`, `list-history.ts`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.09233954451345756 - nodes in this community are weakly interconnected._