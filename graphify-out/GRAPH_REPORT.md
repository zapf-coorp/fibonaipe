# Graph Report - fibonaipe  (2026-11-12)

## Corpus Check
- 332 files · ~138,665 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: .css 11, (none) 4, .example 1)

## Summary
- 2878 nodes · 8929 edges · 138 communities (108 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f705bf20`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card
- room-session.ts
- vitest
- planning-table.test.ts
- AppError
- domain/src/index.ts
- sqlite-persistence.ts
- item-commands.test.ts
- createAppError
- .authorizedOnlineTarget
- heartbeat.ts
- UserId
- router.tsx
- i18n/index.ts
- PlanningTable
- auth-teams.ts
- application/src/index.ts
- postgres-persistence.ts
- persistence.port.ts
- dev-fake-auth-provider.ts
- TeamId
- Table.tsx
- vitest
- ref_react
- UseCaseDependencies
- QueueDrawer.tsx
- AppHeader.tsx
- contract.integration.test.ts
- web/package.json
- room.test.ts
- AuthProvider
- room.ts
- Sprint
- rooms.ts
- planning-table.ts
- compilerOptions
- package.json
- commands.ts
- scripts
- room-view.ts
- sprint-commands.ts
- poker-table-and-projector-ui.test.tsx
- record-aggregated-history.test.ts
- ok
- dev-auth.ts
- env.ts
- RoomEvent
- auth-teams-http.test.ts
- shell-flow.test.tsx
- DevFakeAuthProvider
- fake-realtime.ts
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- compute-forecast.ts
- realtime.contract.ts
- room-entry-http.test.ts
- user.ts
- composition.ts
- theme-provider.tsx
- main.tsx
- exporter.ts
- issue-tracker.contract.ts
- i18n-and-theme.test.tsx
- import-items.ts
- src/ids.ts
- ItemBuilder
- can.test.ts
- devDependencies
- item-commands.ts
- adapter-auth-devfake/package.json
- AuthenticatedIdentity
- list-history.ts
- ref_node_path
- Timer.tsx
- read-source.ts
- compilerOptions
- check-i18n.mjs
- RoomBuilderChain
- adapter-system/src/index.ts
- voting-commands.ts
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- Deck.tsx
- @fibonaipe/domain
- SprintBuilder
- src/ids.ts
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
- testing/src/index.ts
- domain/package.json
- SettingsBuilderChain
- http-error.ts
- loopback-guard.ts
- HistoryRepository
- MembershipRepository
- RoomRepository
- TeamTaskRepository
- UserRepository
- SprintRepository
- Hash
- check-bundle-budget.mjs
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- TeamRepository
- graphify
- tsconfig.json
- 005_team_tasks.sql
- domain-impure-date/bad.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 287 edges
2. `Result` - 286 edges
3. `ok()` - 236 edges
4. `createAppError()` - 192 edges
5. `err()` - 182 edges
6. `UseCaseDependencies` - 115 edges
7. `vitest` - 87 edges
8. `UserId` - 68 edges
9. `useI18n()` - 67 edges
10. `TeamId` - 66 edges

## Surprising Connections (you probably didn't know these)
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-system/package.json → apps/web/package.json
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/adapter-system/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/testing/package.json → apps/web/package.json
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/testing/package.json → apps/web/package.json
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/adapter-auth-devfake/package.json → apps/web/package.json

## Import Cycles
- None detected.

## Communities (138 total, 30 thin omitted)

### Community 0 - "Card"
Cohesion: 0.06
Nodes (52): OwnVote, ProjectedVote, RoomView, ReconnectParticipantResult, OwnVote, RoomView, VoteView, isComment() (+44 more)

### Community 1 - "room-session.ts"
Cohesion: 0.06
Nodes (21): TransactionRepos, actorOf(), addMilliseconds(), authorize(), codeTails, contextOf(), CREATE_ROOM_RULE, deliver() (+13 more)

### Community 2 - "vitest"
Cohesion: 0.10
Nodes (25): signIn(), ExportHistory, append(), BASE, mustId(), row(), signIn(), teamOf() (+17 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.04
Nodes (53): ACTIONS, asModule(), AuditView, branded(), CARD_LABELS, CODE, Command, COMMANDS (+45 more)

### Community 4 - "AppError"
Cohesion: 0.07
Nodes (14): CryptoVault, apply(), buildItem(), currentTable(), PlanningTable, PlanningTableApi, reach(), runCommand() (+6 more)

### Community 5 - "domain/src/index.ts"
Cohesion: 0.06
Nodes (51): isHttpUrl(), isItemStatus(), ITEM_STATUSES, ItemProps, ItemStatus, RoundStatus, FIGURE_TAGS, FigureTag (+43 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.07
Nodes (48): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+40 more)

### Community 7 - "item-commands.test.ts"
Cohesion: 0.18
Nodes (33): createRoomUseCases(), RoomUseCases, teamRoom(), currentItem(), AddItem, DeferItem, ImportItems, RemoveItem (+25 more)

### Community 8 - "createAppError"
Cohesion: 0.10
Nodes (14): createInMemoryRateLimiter(), RateLimitRule, RateLimitStatus, issuedAtFromExpiry(), normalizeUserEmail(), createAppError(), err(), civilDate() (+6 more)

### Community 10 - "heartbeat.ts"
Cohesion: 0.23
Nodes (16): runItem(), beginOp(), commitAggregate(), commitPlanning(), finishOp(), hostTransferred(), limitParticipant(), mutate() (+8 more)

### Community 11 - "UserId"
Cohesion: 0.09
Nodes (17): EditFinalEstimateInput, EditFinalEstimateWithAudit, seatOf(), SPECIAL_CARDS, AcceptInviteResult, ChangeMemberRoleInput, CreateInviteInput, CreateInviteResult (+9 more)

### Community 12 - "router.tsx"
Cohesion: 0.08
Nodes (40): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+32 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.04
Nodes (55): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+47 more)

### Community 14 - "PlanningTable"
Cohesion: 0.10
Nodes (11): Item, cardByLabel(), contextOf(), isOnline(), numericCard(), planningEvent(), PlanningTable, predominantSuit() (+3 more)

### Community 15 - "auth-teams.ts"
Cohesion: 0.09
Nodes (40): callbackSchema, capacitySchema, clientIp(), doneSchema, emailSchema, fail(), holidaySchema, inviteSchema (+32 more)

### Community 16 - "application/src/index.ts"
Cohesion: 0.05
Nodes (50): applicationPackage, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload, ParticipantJoinedPayload, ParticipantUpdatedPayload, RoomClaimedPayload (+42 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.07
Nodes (26): applyHistoryDetail(), asDate(), asNumber(), createRepos(), findRoom(), findRoomByCode(), HISTORY_BASE_KEYS, HistoryRow (+18 more)

### Community 18 - "persistence.port.ts"
Cohesion: 0.06
Nodes (28): MemoryStore, AggregatedHistoryRecord, AggregatedRoundStats, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, IdempotencyRepository (+20 more)

### Community 19 - "dev-fake-auth-provider.ts"
Cohesion: 0.14
Nodes (15): createDevFakeAuthProvider(), DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole (+7 more)

### Community 20 - "TeamId"
Cohesion: 0.05
Nodes (38): dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id(), must() (+30 more)

### Community 21 - "Table.tsx"
Cohesion: 0.14
Nodes (36): matrixFor(), paintFinder(), QrCode(), EstimateDialog(), activeCards(), can(), currentItem(), DEFAULT_CARDS (+28 more)

### Community 22 - "vitest"
Cohesion: 0.18
Nodes (16): PersistedRoomRecord, StoredParticipant, titles(), CreateRoom, CreateRoomInput, expectCount(), numericCounts(), openRoom() (+8 more)

### Community 23 - "ref_react"
Cohesion: 0.09
Nodes (37): CommitTagField(), arm(), beginErrorFlash(), listen(), showErrorFlash(), JoinMode, touchTargetStyle, ImportDialog() (+29 more)

### Community 24 - "UseCaseDependencies"
Cohesion: 0.03
Nodes (3): LinkGuestToAccount, UseCaseDependencies, PurgeExpiredRoomsResult

### Community 25 - "QueueDrawer.tsx"
Cohesion: 0.10
Nodes (30): TaskLine(), CopyIcon(), createRoom(), FAN, FIBONACCI, HomePage(), Phase, SUITS (+22 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.13
Nodes (18): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), useOwnSeat() (+10 more)

### Community 27 - "contract.integration.test.ts"
Cohesion: 0.12
Nodes (13): adapterSources(), errResult(), NATIVE_MODULES, packageManifests(), REQUIRED_TABLES, walkManifests(), walkTs(), applyPostgresMigrations() (+5 more)

### Community 28 - "web/package.json"
Cohesion: 0.08
Nodes (31): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/domain@* (+23 more)

### Community 29 - "room.test.ts"
Cohesion: 0.12
Nodes (22): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+14 more)

### Community 30 - "AuthProvider"
Cohesion: 0.08
Nodes (18): AuthProvider, completeIdentity(), persistSignedInUser(), EMAIL_RULE, IP_RULE, SuspendUser, hydrateIn(), inLockedRoom() (+10 more)

### Community 31 - "room.ts"
Cohesion: 0.08
Nodes (31): hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableSession(), nullableText(), nullableUserId(), Participant, ParticipantMode (+23 more)

### Community 32 - "Sprint"
Cohesion: 0.10
Nodes (4): mutate(), cloneItem(), cloneReport(), Sprint

### Community 33 - "rooms.ts"
Cohesion: 0.13
Nodes (24): jsonResponse(), actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail() (+16 more)

### Community 34 - "planning-table.ts"
Cohesion: 0.09
Nodes (21): EstimateAudit, actorOf(), cardsByScale, PlanningEvent, seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND, TableOk (+13 more)

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+19 more)

### Community 36 - "package.json"
Cohesion: 0.08
Nodes (30): purityBan, devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, @testing-library/user-event@^14.6.8 (+22 more)

### Community 37 - "commands.ts"
Cohesion: 0.22
Nodes (26): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote(), confirmEstimate() (+18 more)

### Community 38 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 39 - "room-view.ts"
Cohesion: 0.12
Nodes (25): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+17 more)

### Community 40 - "sprint-commands.ts"
Cohesion: 0.17
Nodes (14): CreateSprint, access(), DeleteHoliday, ListHolidays, recalculate(), SaveHoliday, TeamInput, ActivateSprint (+6 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.09
Nodes (25): save(), assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings (+17 more)

### Community 42 - "record-aggregated-history.test.ts"
Cohesion: 0.12
Nodes (13): AuditRow, HistoryRow, means(), seatsOf(), FORBIDDEN_KEYS, forbiddenKeys(), reveal(), Seat (+5 more)

### Community 43 - "ok"
Cohesion: 0.11
Nodes (20): DeleteAccount, FIBONACCI, inviteRecord(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId(), parseRole(), requireTeamAction() (+12 more)

### Community 44 - "dev-auth.ts"
Cohesion: 0.17
Nodes (20): accountUser(), dependenciesOf(), fail(), jsonWithSession(), loginSchema, okJson(), parseBody(), registerDevAuthRoutes() (+12 more)

### Community 45 - "env.ts"
Cohesion: 0.29
Nodes (7): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), serverEnvSchema, env

### Community 46 - "RoomEvent"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 47 - "auth-teams-http.test.ts"
Cohesion: 0.43
Nodes (7): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf()

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.15
Nodes (13): installColorScheme(), clearMissingFlags(), markMissing(), takeMissing(), LiveAnnouncerProvider(), useLiveAnnouncer(), boot(), assertTouchTarget() (+5 more)

### Community 49 - "DevFakeAuthProvider"
Cohesion: 0.19
Nodes (3): DevFakeAuthProvider, normalizeEmail(), slug()

### Community 50 - "fake-realtime.ts"
Cohesion: 0.12
Nodes (9): RealtimeClient, RealtimeConnectionState, RealtimeConnectionStatus, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, FakeRealtime, FakeRealtimeClient (+1 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.09
Nodes (20): roomDocument(), roomStillThere(), hasProcessed(), readRoom(), saveUnlocked(), deferred(), describePersistenceContract(), errNotFound() (+12 more)

### Community 54 - "compute-forecast.ts"
Cohesion: 0.15
Nodes (10): ClosedSprintForecastInput, computeForecast(), ForecastInsufficient, ForecastOk, ForecastReportBuilder, ForecastRiskInput, isCivilDate(), rows (+2 more)

### Community 55 - "realtime.contract.ts"
Cohesion: 0.17
Nodes (13): IssueTracker, RealtimePublisher, UseCaseDependencies, describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness (+5 more)

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.18
Nodes (12): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+4 more)

### Community 57 - "user.ts"
Cohesion: 0.12
Nodes (7): STATUSES, THEMES, User, UserBuilder, UserProps, UserStatus, UserTheme

### Community 58 - "composition.ts"
Cohesion: 0.11
Nodes (23): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), AppContainer, authProviderFor(), createAppContainer() (+15 more)

### Community 59 - "theme-provider.tsx"
Cohesion: 0.18
Nodes (15): App(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+7 more)

### Community 60 - "main.tsx"
Cohesion: 0.20
Nodes (8): @tanstack/react-query@^5.62.8, bootGeneration, bootScope, queryClient, rootElement, createQueryClient(), router, @tanstack/react-query

### Community 61 - "exporter.ts"
Cohesion: 0.14
Nodes (14): sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), CsvExportInput, ExportArtifact, Exporter (+6 more)

### Community 62 - "issue-tracker.contract.ts"
Cohesion: 0.19
Nodes (9): ExternalEstimateRef, ImportedBacklogBatch, ImportedItemCandidate, ImportRowWarning, IssueTrackerProvider, describeIssueTrackerContract(), expectBatch(), expectError() (+1 more)

### Community 63 - "i18n-and-theme.test.tsx"
Cohesion: 0.13
Nodes (16): LiveAnnouncerContext, LiveAnnouncerContextValue, LiveAnnouncerProvider(), Politeness, useLiveAnnouncer(), ERROR_KEYS, flattenCatalog(), SHELL_KEYS (+8 more)

### Community 64 - "import-items.ts"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.17
Nodes (4): IdGenerator, charAt(), initialRoomCodeIndexes(), SequentialIdGenerator

### Community 67 - "can.test.ts"
Cohesion: 0.16
Nodes (12): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, loadCan() (+4 more)

### Community 68 - "devDependencies"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 69 - "item-commands.ts"
Cohesion: 0.21
Nodes (12): IssueTrackerImportInput, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput, freshItem() (+4 more)

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.20
Nodes (10): @fibonaipe/application@*, @fibonaipe/application, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private (+2 more)

### Community 71 - "AuthenticatedIdentity"
Cohesion: 0.16
Nodes (5): AuthenticatedIdentity, AuthProviderContractHarness, describeAuthProviderContract(), expectError(), expectIdentity()

### Community 72 - "list-history.ts"
Cohesion: 0.31
Nodes (8): ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf(), timeOf()

### Community 73 - "ref_node_path"
Cohesion: 0.17
Nodes (10): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses() (+2 more)

### Community 74 - "Timer.tsx"
Cohesion: 0.31
Nodes (10): serverTime(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer(), TimerBridge (+2 more)

### Community 75 - "read-source.ts"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 76 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+3 more)

### Community 77 - "check-i18n.mjs"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 79 - "adapter-system/src/index.ts"
Cohesion: 0.26
Nodes (6): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets

### Community 80 - "voting-commands.ts"
Cohesion: 0.21
Nodes (8): RecordAggregatedHistory, ActorInput, CommandResult, FinalEstimateInput, NewRoundInput, StartTimer, StartTimerInput, StopTimer

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 83 - "adapter-exporter-csvjson/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 86 - "Deck.tsx"
Cohesion: 0.20
Nodes (7): Deck(), SpecialIcon(), SPECIALS, SUIT_GLYPH, GLYPH, LABELS, SUITS

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.25
Nodes (8): @fibonaipe/domain, dependencies, @fibonaipe/domain@*, exports, name, private, type, version

### Community 88 - "SprintBuilder"
Cohesion: 0.22
Nodes (3): hasSprintOverlap(), SprintBuilder, build()

### Community 89 - "src/ids.ts"
Cohesion: 0.42
Nodes (7): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_LENGTH

### Community 90 - "../../tsconfig.base.json"
Cohesion: 0.22
Nodes (8): ../../tsconfig.base.json, compilerOptions, composite, outDir, rootDir, exclude, extends, include

### Community 91 - "adapter-auth-devfake/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 92 - "RoomSettingsBuilder"
Cohesion: 0.15
Nodes (6): settingsUpdated(), CommandResult, nextSettings(), ScreenViewer, SnapshotViewer, RoomSettingsBuilder

### Community 93 - "adapter-exporter-csvjson/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 94 - "adapter-issuetracker-manual/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

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

### Community 106 - "testing/src/index.ts"
Cohesion: 0.09
Nodes (19): testApp(), RateLimiter, readUser(), readTeam(), readUser(), describeRateLimiterContract(), expectAppError(), RateLimiterContractHarness (+11 more)

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 109 - "http-error.ts"
Cohesion: 0.57
Nodes (5): errorResponse(), httpStatusFor(), HttpErrorBody, httpErrorBody(), ErrorCode

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
  These have ≤1 connection - possible missing edges. (Counts symbols only; 855 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Card`, `dom-matchers.ts`, `vitest`, `planning-table.test.ts`, `domain/src/index.ts`, `item-commands.test.ts`, `createAppError`, `i18n/index.ts`, `dev-fake-auth-provider.ts`, `TeamId`, `contract.integration.test.ts`, `room.test.ts`, `package.json`, `sprint-commands.ts`, `poker-table-and-projector-ui.test.tsx`, `record-aggregated-history.test.ts`, `RoomEvent`, `auth-teams-http.test.ts`, `shell-flow.test.tsx`, `contract.integration.test.ts`, `compute-forecast.ts`, `realtime.contract.ts`, `room-entry-http.test.ts`, `composition.ts`, `exporter.ts`, `issue-tracker.contract.ts`, `i18n-and-theme.test.tsx`, `can.test.ts`, `AuthenticatedIdentity`, `ref_node_path`, `read-source.ts`, `adapter-system/src/index.ts`, `SprintBuilder`, `src/ids.ts`, `testing/src/index.ts`, `check-bundle-budget.mjs`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.05561105561105561 - nodes in this community are weakly interconnected._
- **Why does `useI18n()` connect `i18n/index.ts` to `Timer.tsx`, `router.tsx`, `Table.tsx`, `Deck.tsx`, `ref_react`, `QueueDrawer.tsx`, `AppHeader.tsx`, `i18n-and-theme.test.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `room-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06097560975609756 - nodes in this community are weakly interconnected._
- **Why does `UseCaseDependencies` connect `UseCaseDependencies` to `room-session.ts`, `vitest`, `item-commands.test.ts`, `heartbeat.ts`, `UserId`, `application/src/index.ts`, `dev-fake-auth-provider.ts`, `TeamId`, `vitest`, `AuthProvider`, `sprint-commands.ts`, `record-aggregated-history.test.ts`, `ok`, `auth-teams-http.test.ts`, `StructuredLogger`, `realtime.contract.ts`, `composition.ts`, `exporter.ts`, `src/ids.ts`, `item-commands.ts`, `list-history.ts`, `voting-commands.ts`, `RoomSettingsBuilder`, `testing/src/index.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.09805735430157261 - nodes in this community are weakly interconnected._