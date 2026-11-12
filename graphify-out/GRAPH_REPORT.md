# Graph Report - fibonaipe  (2026-11-11)

## Corpus Check
- 334 files · ~215,171 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 11, (none) 4, .mmd 1)

## Summary
- 2832 nodes · 8982 edges · 128 communities (101 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0f05b853`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card
- domain/src/index.ts
- vitest
- planning-table.test.ts
- AppError
- TeamId
- sqlite-persistence.ts
- record-aggregated-history.test.ts
- createAppError
- application/src/index.ts
- room-session.ts
- ok
- router.tsx
- i18n/index.ts
- PlanningTable
- auth-teams.ts
- room-commands.ts
- postgres-persistence.ts
- persistence.port.ts
- room.ts
- HistoryEntryBuilder
- Table.tsx
- TeamTaskRepository
- TeamsPage.tsx
- UseCaseDependencies
- QueueDrawer.tsx
- AppHeader.tsx
- planning-table.ts
- web/package.json
- room.test.ts
- SqlitePersistenceStore
- Room
- Sprint
- rooms.ts
- UserRepository
- compilerOptions
- package.json
- commands.ts
- warn
- room-view.ts
- dev-auth.ts
- poker-table-and-projector-ui.test.tsx
- ref_react
- dev-fake-auth-provider.ts
- app.ts
- testing/src/index.ts
- auth-provider.contract.ts
- sprint-commands.ts
- shell-flow.test.tsx
- DevFakeAuthProvider
- RoomEvent
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- RoomId
- team-tasks.ts
- room-entry-http.test.ts
- realtime.contract.ts
- composition.ts
- theme-provider.tsx
- main.tsx
- exporter.ts
- history-entry.test.ts
- i18n-and-theme.test.tsx
- import-items.ts
- src/ids.ts
- SprintRepository
- can.test.ts
- devDependencies
- TeamRepository
- send-magic-link.ts
- fake-realtime.ts
- list-history.ts
- ref_node_fs
- Timer.tsx
- read-source.ts
- compilerOptions
- adapter-system/src/index.ts
- RoomBuilderChain
- env.ts
- scripts
- adapter-persistence-postgres/package.json
- DatabaseSync
- ItemBuilderChain
- AppErrorBuilder
- @fibonaipe/domain
- sprint.ts
- ../../tsconfig.base.json
- adapter-auth-devfake/tsconfig.json
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
- domain/package.json
- SettingsBuilderChain
- loopback-guard.ts
- missing-flags.ts
- HistoryRepository
- RoomRepository
- Hash
- check-bundle-budget.mjs
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- graphify
- harness.ts
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
  packages/adapter-persistence-postgres/package.json → apps/web/package.json

## Import Cycles
- None detected.

## Communities (128 total, 27 thin omitted)

### Community 0 - "Card"
Cohesion: 0.05
Nodes (56): OwnVote, ProjectedItem, ProjectedVote, RoomView, summaryOf(), ReconnectParticipantResult, ItemView, OwnVote (+48 more)

### Community 1 - "domain/src/index.ts"
Cohesion: 0.06
Nodes (44): computeAccuracy(), ForecastAccuracy, ForecastAccuracyRecord, ClosedSprintForecastInput, ForecastInsufficient, ForecastOk, ForecastReportBuilder, ForecastRiskInput (+36 more)

### Community 2 - "vitest"
Cohesion: 0.10
Nodes (28): signIn(), append(), BASE, mustId(), row(), signIn(), teamOf(), signIn() (+20 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.03
Nodes (44): ACTIONS, AuditView, branded(), CARD_LABELS, CODE, Command, COMMANDS, EDGES (+36 more)

### Community 4 - "AppError"
Cohesion: 0.05
Nodes (17): DevAuthProvider, RolledBack, AuthProvider, CryptoVault, apply(), buildItem(), currentTable(), PlanningTable (+9 more)

### Community 5 - "TeamId"
Cohesion: 0.05
Nodes (48): AcceptInviteResult, ChangeMemberRoleInput, CreateInviteResult, TeamMemberSummary, TeamSummary, Invite, InviteAcceptance, InviteBuilder (+40 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.10
Nodes (40): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+32 more)

### Community 7 - "record-aggregated-history.test.ts"
Cohesion: 0.14
Nodes (29): openDurableRoom(), AuditRow, HistoryRow, means(), seatsOf(), teamRoom(), currentItem(), FORBIDDEN_KEYS (+21 more)

### Community 8 - "createAppError"
Cohesion: 0.08
Nodes (23): unavailableAuth(), parseBody(), createInMemoryRateLimiter(), EditFinalEstimateInput, EditFinalEstimateWithAudit, seatOf(), SPECIAL_CARDS, nextSettings() (+15 more)

### Community 9 - "application/src/index.ts"
Cohesion: 0.05
Nodes (52): applicationPackage, ExternalEstimateRef, ImportedBacklogBatch, ImportRowWarning, IssueTrackerProvider, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload (+44 more)

### Community 10 - "room-session.ts"
Cohesion: 0.06
Nodes (58): IssueTrackerImportInput, RecordAggregatedHistory, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput (+50 more)

### Community 11 - "ok"
Cohesion: 0.09
Nodes (23): DeleteAccount, deliver(), finishMutation(), FIBONACCI, AcceptInviteInput, inviteRecord(), issuedAtFromExpiry(), membershipFrom() (+15 more)

### Community 12 - "router.tsx"
Cohesion: 0.08
Nodes (27): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, setConnectionStatus(), TranslationKey, dashboardRoute (+19 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.06
Nodes (43): Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider(), interpolate() (+35 more)

### Community 14 - "PlanningTable"
Cohesion: 0.11
Nodes (10): Item, contextOf(), isOnline(), numericCard(), planningEvent(), PlanningTable, predominantSuit(), seatOf() (+2 more)

### Community 15 - "auth-teams.ts"
Cohesion: 0.06
Nodes (34): callbackSchema, capacitySchema, clientIp(), doneSchema, emailSchema, fail(), holidaySchema, inviteSchema (+26 more)

### Community 16 - "room-commands.ts"
Cohesion: 0.21
Nodes (19): createRoomUseCases(), RoomUseCases, DeferItem, ImportItems, RemoveItem, ReorderItems, SkipItem, ExportRoomSummary (+11 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.06
Nodes (29): applyHistoryDetail(), applyPostgresMigrations(), asDate(), asNumber(), createPostgresPersistence(), createRepos(), findRoom(), findRoomByCode() (+21 more)

### Community 18 - "persistence.port.ts"
Cohesion: 0.09
Nodes (28): MemoryStore, AggregatedHistoryRecord, AggregatedRoundStats, EstimateAuditRecord, HolidayRepository, IdempotencyRecord, IdempotencyRepository, InviteRepository (+20 more)

### Community 19 - "room.ts"
Cohesion: 0.11
Nodes (21): hasControlCharacter(), nicknameKey(), nullableSession(), nullableText(), ParticipantMode, ParticipantProps, RoomBuilder, RoomHostSeed (+13 more)

### Community 20 - "HistoryEntryBuilder"
Cohesion: 0.09
Nodes (7): dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, HistoryEntryId, ItemId, SuitDistribution

### Community 21 - "Table.tsx"
Cohesion: 0.13
Nodes (37): matrixFor(), paintFinder(), QrCode(), useOwnSeat(), EstimateDialog(), activeCards(), can(), currentItem() (+29 more)

### Community 23 - "TeamsPage.tsx"
Cohesion: 0.09
Nodes (32): CommitTagField(), arm(), beginErrorFlash(), listen(), showErrorFlash(), CheckIcon(), ChevronIcon(), CloseIcon() (+24 more)

### Community 25 - "QueueDrawer.tsx"
Cohesion: 0.10
Nodes (30): TaskLine(), createRoom(), FAN, FIBONACCI, HomePage(), Phase, SUITS, AccountTeam (+22 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.09
Nodes (21): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), AppShell() (+13 more)

### Community 27 - "planning-table.ts"
Cohesion: 0.07
Nodes (35): StoredItem, StoredRound, EstimateAudit, isHttpUrl(), isItemStatus(), ITEM_STATUSES, ItemProps, ItemStatus (+27 more)

### Community 28 - "web/package.json"
Cohesion: 0.08
Nodes (32): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/application@* (+24 more)

### Community 29 - "room.test.ts"
Cohesion: 0.12
Nodes (22): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+14 more)

### Community 30 - "SqlitePersistenceStore"
Cohesion: 0.20
Nodes (7): emptyDirty(), historyDetail(), membershipKeyParts(), planningJson(), prepare(), SqlitePersistenceStore, writeRoom()

### Community 31 - "Room"
Cohesion: 0.11
Nodes (14): LinkGuestToAccount, hydrate(), inLockedRoom(), saveRoom(), ClaimRoom, normalizeNickname(), nullableUserId(), Participant (+6 more)

### Community 32 - "Sprint"
Cohesion: 0.09
Nodes (5): submit(), mutate(), cloneItem(), cloneReport(), Sprint

### Community 33 - "rooms.ts"
Cohesion: 0.13
Nodes (23): jsonResponse(), actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail() (+15 more)

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+19 more)

### Community 36 - "package.json"
Cohesion: 0.08
Nodes (30): purityBan, devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, @testing-library/react@^16.3.3 (+22 more)

### Community 37 - "commands.ts"
Cohesion: 0.11
Nodes (44): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), JoinRoomPage(), submitJoin(), ProjectorPage(), RoomPage() (+36 more)

### Community 38 - "warn"
Cohesion: 0.14
Nodes (13): CsvExportInput, ExportArtifact, JsonExportInput, hydrateIn(), LoadedRoom, readLoaded(), warn(), csvRows() (+5 more)

### Community 39 - "room-view.ts"
Cohesion: 0.12
Nodes (24): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+16 more)

### Community 40 - "dev-auth.ts"
Cohesion: 0.18
Nodes (18): accountUser(), dependenciesOf(), fail(), jsonWithSession(), loginSchema, okJson(), parseBody(), registerDevAuthRoutes() (+10 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.10
Nodes (24): assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings, HOST_CARD (+16 more)

### Community 42 - "ref_react"
Cohesion: 0.14
Nodes (11): JoinMode, touchTargetStyle, Deck(), SpecialIcon(), SPECIALS, SUIT_GLYPH, ImportDialog(), previewRows() (+3 more)

### Community 43 - "dev-fake-auth-provider.ts"
Cohesion: 0.12
Nodes (16): createDevFakeAuthProvider(), DEV_AUTH_USERS, DevAuthMethod, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole, GoogleCode (+8 more)

### Community 44 - "app.ts"
Cohesion: 0.19
Nodes (14): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), devApp, errorResponse(), httpStatusFor() (+6 more)

### Community 45 - "testing/src/index.ts"
Cohesion: 0.09
Nodes (24): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), testApp() (+16 more)

### Community 46 - "auth-provider.contract.ts"
Cohesion: 0.28
Nodes (4): AuthProviderContractHarness, describeAuthProviderContract(), expectError(), expectIdentity()

### Community 47 - "sprint-commands.ts"
Cohesion: 0.25
Nodes (12): CreateSprint, ActivateSprint, CloseSprint, GetForecastAccuracy, GetSprintForecast, GetSprintReport, LinkSprintItem, MarkSprintItemDone (+4 more)

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.28
Nodes (8): installColorScheme(), clearMissingFlags(), takeMissing(), boot(), assertTouchTarget(), boot(), lengthPx(), remount()

### Community 49 - "DevFakeAuthProvider"
Cohesion: 0.11
Nodes (7): DevFakeAuthProvider, normalizeEmail(), AuthenticatedIdentity, completeIdentity(), persistSignedInUser(), MagicLink, VERIFIED_AT_MS

### Community 50 - "RoomEvent"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.11
Nodes (25): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), readRoom(), REQUIRED_TABLES, saveUnlocked() (+17 more)

### Community 54 - "RoomId"
Cohesion: 0.42
Nodes (4): HistoryQuery, RoomState, RoomId, FakeRealtime

### Community 55 - "team-tasks.ts"
Cohesion: 0.20
Nodes (6): CreateTeamTask, CreateTeamTaskInput, DeleteTeamTask, httpLink(), ListTeamTasks, TeamTaskSummary

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "realtime.contract.ts"
Cohesion: 0.21
Nodes (10): describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed(), voteChanged() (+2 more)

### Community 58 - "composition.ts"
Cohesion: 0.18
Nodes (15): AppContainer, authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), ServerEnv, devApp() (+7 more)

### Community 59 - "theme-provider.tsx"
Cohesion: 0.18
Nodes (16): useLiveAnnouncer(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+8 more)

### Community 60 - "main.tsx"
Cohesion: 0.14
Nodes (13): @tanstack/react-query@^5.62.8, App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext, LiveAnnouncerContextValue (+5 more)

### Community 61 - "exporter.ts"
Cohesion: 0.18
Nodes (9): createCsvJsonExporter(), sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), csvLines(), describeExporterContract() (+1 more)

### Community 62 - "history-entry.test.ts"
Cohesion: 0.40
Nodes (5): FORBIDDEN_KEYS, forbiddenKeys(), id(), must(), NOW

### Community 63 - "i18n-and-theme.test.tsx"
Cohesion: 0.20
Nodes (10): ERROR_KEYS, flattenCatalog(), SHELL_KEYS, dayOptions, LocaleProbe(), oneDecimal, renderLocale(), renderTheme() (+2 more)

### Community 64 - "import-items.ts"
Cohesion: 0.13
Nodes (20): cellAt(), columnsOf(), createManualIssueTracker(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText() (+12 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.16
Nodes (11): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH (+3 more)

### Community 67 - "can.test.ts"
Cohesion: 0.18
Nodes (11): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, PolicyContext (+3 more)

### Community 68 - "devDependencies"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 70 - "send-magic-link.ts"
Cohesion: 0.36
Nodes (4): RateLimitRule, RateLimitStatus, EMAIL_RULE, IP_RULE

### Community 71 - "fake-realtime.ts"
Cohesion: 0.14
Nodes (8): RealtimeClient, RealtimeConnectionState, RealtimeConnectionStatus, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, FakeRealtimeClient, Subscription

### Community 72 - "list-history.ts"
Cohesion: 0.21
Nodes (10): ExportHistory, ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, ListHistory, listRow(), matches() (+2 more)

### Community 73 - "ref_node_fs"
Cohesion: 0.09
Nodes (24): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), checkCatalogs() (+16 more)

### Community 74 - "Timer.tsx"
Cohesion: 0.31
Nodes (10): serverTime(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer(), TimerBridge (+2 more)

### Community 75 - "read-source.ts"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 76 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+3 more)

### Community 77 - "adapter-system/src/index.ts"
Cohesion: 0.26
Nodes (6): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets

### Community 79 - "env.ts"
Cohesion: 0.29
Nodes (7): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), serverEnvSchema, env

### Community 80 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.12
Nodes (17): @fibonaipe/domain, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type (+9 more)

### Community 88 - "sprint.ts"
Cohesion: 0.12
Nodes (14): SprintId, CapacityEntry, civilDate(), computeCapacity(), computeWorkingDays(), hasSprintOverlap(), SprintBuilder, SprintCapacityEntry (+6 more)

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
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 95 - "adapter-issuetracker-manual/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 96 - "adapter-persistence-postgres/tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 97 - "@fibonaipe/application"
Cohesion: 0.12
Nodes (16): @fibonaipe/application, dependencies, @fibonaipe/application@*, exports, name, private, type, version (+8 more)

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

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 110 - "loopback-guard.ts"
Cohesion: 0.38
Nodes (6): guardedWindows, HappyDomSettings, HappyDomWindow, installLoopbackGuard(), isTestLoopback(), resolveFetchUrl()

### Community 114 - "missing-flags.ts"
Cohesion: 0.60
Nodes (3): markMissing(), LiveAnnouncerProvider(), useLiveAnnouncer()

### Community 120 - "domain-runtime-dep/package.json"
Cohesion: 0.50
Nodes (4): dependencies, zod@1.0.0, zod, name

### Community 121 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 123 - "002_r2_identity.sql"
Cohesion: 0.50
Nodes (3): invites, memberships, organizations

### Community 130 - "harness.ts"
Cohesion: 0.17
Nodes (16): PersistedRoomRecord, StoredParticipant, titles(), limitIp(), participantJoined(), CreateRoom, JoinRoom, expectCount() (+8 more)

## Knowledge Gaps
- **1 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 819 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Card`, `domain/src/index.ts`, `harness.ts`, `planning-table.test.ts`, `TeamId`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `i18n/index.ts`, `room-commands.ts`, `AppHeader.tsx`, `room.test.ts`, `package.json`, `poker-table-and-projector-ui.test.tsx`, `dev-fake-auth-provider.ts`, `testing/src/index.ts`, `auth-provider.contract.ts`, `sprint-commands.ts`, `shell-flow.test.tsx`, `RoomEvent`, `contract.integration.test.ts`, `room-entry-http.test.ts`, `realtime.contract.ts`, `composition.ts`, `exporter.ts`, `history-entry.test.ts`, `i18n-and-theme.test.tsx`, `import-items.ts`, `src/ids.ts`, `can.test.ts`, `ref_node_fs`, `read-source.ts`, `adapter-system/src/index.ts`, `sprint.ts`, `check-bundle-budget.mjs`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.049074074074074076 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `Card`, `domain/src/index.ts`, `vitest`, `harness.ts`, `planning-table.test.ts`, `TeamId`, `sqlite-persistence.ts`, `createAppError`, `application/src/index.ts`, `room-session.ts`, `ok`, `PlanningTable`, `auth-teams.ts`, `room-commands.ts`, `postgres-persistence.ts`, `persistence.port.ts`, `room.ts`, `HistoryEntryBuilder`, `planning-table.ts`, `room.test.ts`, `SqlitePersistenceStore`, `Room`, `Sprint`, `rooms.ts`, `warn`, `dev-auth.ts`, `dev-fake-auth-provider.ts`, `app.ts`, `testing/src/index.ts`, `auth-provider.contract.ts`, `sprint-commands.ts`, `DevFakeAuthProvider`, `RoomEvent`, `contract.integration.test.ts`, `team-tasks.ts`, `realtime.contract.ts`, `exporter.ts`, `history-entry.test.ts`, `import-items.ts`, `send-magic-link.ts`, `fake-realtime.ts`, `list-history.ts`, `sprint.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Should `domain/src/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059227921734531994 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `Card`, `domain/src/index.ts`, `vitest`, `harness.ts`, `planning-table.test.ts`, `TeamId`, `sqlite-persistence.ts`, `createAppError`, `application/src/index.ts`, `room-session.ts`, `ok`, `PlanningTable`, `auth-teams.ts`, `room-commands.ts`, `postgres-persistence.ts`, `persistence.port.ts`, `room.ts`, `HistoryEntryBuilder`, `planning-table.ts`, `room.test.ts`, `SqlitePersistenceStore`, `Room`, `Sprint`, `rooms.ts`, `warn`, `dev-auth.ts`, `dev-fake-auth-provider.ts`, `testing/src/index.ts`, `auth-provider.contract.ts`, `sprint-commands.ts`, `DevFakeAuthProvider`, `RoomEvent`, `contract.integration.test.ts`, `team-tasks.ts`, `realtime.contract.ts`, `exporter.ts`, `history-entry.test.ts`, `import-items.ts`, `send-magic-link.ts`, `fake-realtime.ts`, `list-history.ts`, `sprint.ts`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.0962962962962963 - nodes in this community are weakly interconnected._