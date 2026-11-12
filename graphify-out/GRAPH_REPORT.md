# Graph Report - fibonaipe  (2026-11-12)

## Corpus Check
- 338 files · ~215,275 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 11, (none) 4, .mmd 1)

## Summary
- 2836 nodes · 9036 edges · 133 communities (106 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `66bc5815`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Card
- compute-forecast.ts
- vitest
- planning-table.test.ts
- AppError
- domain/src/index.ts
- sqlite-persistence.ts
- record-aggregated-history.test.ts
- ok
- application/src/index.ts
- room-session.ts
- UserId
- router.tsx
- i18n/index.ts
- PlanningTable
- auth-teams.ts
- persistence.port.ts
- postgres-persistence.ts
- persistence.port.ts
- RoomBuilder
- HistoryEntryBuilder
- Table.tsx
- Card
- ref_react
- UseCaseDependencies
- QueueDrawer.tsx
- AppHeader.tsx
- planning-table.ts
- web/package.json
- room.test.ts
- PlanningTable
- Room
- Sprint
- rooms.ts
- ref_node_fs
- compilerOptions
- package.json
- commands.ts
- item.ts
- room-view.ts
- compute-round-stats.ts
- poker-table-and-projector-ui.test.tsx
- team.ts
- membership.ts
- app.ts
- testing/src/index.ts
- RoomEvent
- sprint-commands.ts
- shell-flow.test.tsx
- dev-fake-auth-provider.ts
- RoomEvent
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- RoomId
- ref_node_path
- room-entry-http.test.ts
- realtime.contract.ts
- composition.ts
- theme-provider.tsx
- main.tsx
- export-room-summary.ts
- invite.test.ts
- i18n-and-theme.test.tsx
- import-items.ts
- src/ids.ts
- ItemBuilder
- can.ts
- devDependencies
- issue-tracker.contract.ts
- adapter-auth-devfake/package.json
- FakeRealtimeClient
- list-history.ts
- check-i18n.mjs
- Timer.tsx
- read-source.ts
- compilerOptions
- adapter-system/src/index.ts
- RoomBuilderChain
- env.ts
- scripts
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- realtime.port.ts
- @fibonaipe/domain
- TeamId
- UserBuilder
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
- sprints/estimation-indicators.ts
- domain/package.json
- SettingsBuilderChain
- fake-auth-provider.ts
- loopback-guard.ts
- RoomRepository
- Hash
- check-bundle-budget.mjs
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- graphify
- create-room.ts
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
10. `useI18n()` - 67 edges

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

## Communities (133 total, 27 thin omitted)

### Community 0 - "Card"
Cohesion: 0.08
Nodes (24): AfkCard, DoubtCard, JokerCard, NumericCard, SpecialCard, FIGURE_TAGS, FIBONACCI_CARDS, FIBONACCI_LABELS (+16 more)

### Community 1 - "compute-forecast.ts"
Cohesion: 0.14
Nodes (10): ClosedSprintForecastInput, computeForecast(), ForecastInsufficient, ForecastOk, ForecastReportBuilder, ForecastRiskInput, isCivilDate(), rows (+2 more)

### Community 2 - "vitest"
Cohesion: 0.09
Nodes (40): PersistedRoomRecord, AuditRow, HistoryRow, signIn(), append(), BASE, mustId(), row() (+32 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.04
Nodes (41): ACTIONS, asModule(), AuditView, CARD_LABELS, CODE, Command, COMMANDS, EDGES (+33 more)

### Community 4 - "AppError"
Cohesion: 0.06
Nodes (12): CryptoVault, RateLimitRule, RateLimitStatus, EMAIL_RULE, IP_RULE, PlanningTableApi, RoomView, AppError (+4 more)

### Community 5 - "domain/src/index.ts"
Cohesion: 0.06
Nodes (56): computeAccuracy(), ForecastAccuracy, ForecastAccuracyPoint, ForecastAccuracyRecord, STATUSES, THEMES, User, UserProps (+48 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.07
Nodes (47): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+39 more)

### Community 7 - "record-aggregated-history.test.ts"
Cohesion: 0.11
Nodes (47): createRoomUseCases(), RoomUseCases, means(), seatsOf(), teamRoom(), currentItem(), FORBIDDEN_KEYS, forbiddenKeys() (+39 more)

### Community 8 - "ok"
Cohesion: 0.09
Nodes (25): createInMemoryRateLimiter(), completeIdentity(), persistSignedInUser(), hydrate(), hydrateIn(), inLockedRoom(), readLoaded(), warn() (+17 more)

### Community 9 - "application/src/index.ts"
Cohesion: 0.05
Nodes (49): applicationPackage, ExternalEstimateRef, ImportedBacklogBatch, ImportedItemCandidate, ImportRowWarning, IssueTrackerImportInput, IssueTrackerProvider, CompleteSignInInput (+41 more)

### Community 10 - "room-session.ts"
Cohesion: 0.07
Nodes (48): RecordAggregatedHistory, runItem(), actorOf(), addMilliseconds(), authorize(), beginOp(), codeTails, commitAggregate() (+40 more)

### Community 11 - "UserId"
Cohesion: 0.09
Nodes (25): UserRepository, AcceptInviteInput, AcceptInviteResult, inviteRecord(), issuedAtFromExpiry(), MVP_ORGANIZATION_ID, parseRole(), saveMemberships() (+17 more)

### Community 12 - "router.tsx"
Cohesion: 0.06
Nodes (39): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+31 more)

### Community 13 - "i18n/index.ts"
Cohesion: 0.07
Nodes (34): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+26 more)

### Community 14 - "PlanningTable"
Cohesion: 0.12
Nodes (7): Item, cardByLabel(), planningEvent(), PlanningTable, seatOf(), Round, Vote

### Community 15 - "auth-teams.ts"
Cohesion: 0.07
Nodes (33): callbackSchema, capacitySchema, clientIp(), doneSchema, emailSchema, fail(), holidaySchema, inviteSchema (+25 more)

### Community 16 - "persistence.port.ts"
Cohesion: 0.09
Nodes (30): AggregatedRoundStats, EstimateAuditRecord, HistoryQuery, IdempotencyRepository, InviteRepository, PersistedRoomItem, TransactionRepos, HostTransferredPayload (+22 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.06
Nodes (30): applyHistoryDetail(), applyPostgresMigrations(), asDate(), asNumber(), createPostgresPersistence(), createRepos(), findRoom(), findRoomByCode() (+22 more)

### Community 18 - "persistence.port.ts"
Cohesion: 0.10
Nodes (23): MemoryStore, AggregatedHistoryRecord, HolidayRepository, IdempotencyRecord, PersistedInviteRecord, PersistedMembershipRecord, PersistedSprintRecord, PersistedTeamRecord (+15 more)

### Community 20 - "HistoryEntryBuilder"
Cohesion: 0.07
Nodes (13): HistoryRepository, HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id(), must() (+5 more)

### Community 21 - "Table.tsx"
Cohesion: 0.10
Nodes (40): matrixFor(), paintFinder(), QrCode(), EstimateDialog(), activeCards(), can(), currentItem(), DEFAULT_CARDS (+32 more)

### Community 22 - "Card"
Cohesion: 0.12
Nodes (20): OwnVote, ProjectedItem, ProjectedVote, RoomView, StoredItem, StoredRound, ReconnectParticipantResult, ItemView (+12 more)

### Community 23 - "ref_react"
Cohesion: 0.09
Nodes (37): CommitTagField(), TaskLine(), arm(), beginErrorFlash(), listen(), showErrorFlash(), touchTargetStyle, ImportDialog() (+29 more)

### Community 24 - "UseCaseDependencies"
Cohesion: 0.04
Nodes (4): AuthProvider, EditFinalEstimateWithAudit, SendMagicLink, UseCaseDependencies

### Community 25 - "QueueDrawer.tsx"
Cohesion: 0.12
Nodes (28): createRoom(), FAN, FIBONACCI, HomePage(), Phase, SUITS, AccountTeam, AccountUser (+20 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.13
Nodes (22): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), useOwnSeat() (+14 more)

### Community 27 - "planning-table.ts"
Cohesion: 0.11
Nodes (16): EstimateAudit, ItemProps, actorOf(), cardsByScale, contextOf(), isOnline(), numericCard(), predominantSuit() (+8 more)

### Community 28 - "web/package.json"
Cohesion: 0.09
Nodes (29): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/domain@* (+21 more)

### Community 29 - "room.test.ts"
Cohesion: 0.12
Nodes (22): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+14 more)

### Community 30 - "PlanningTable"
Cohesion: 0.18
Nodes (12): apply(), branded(), buildItem(), currentTable(), makeRoom(), must(), open(), PlanningTable (+4 more)

### Community 31 - "Room"
Cohesion: 0.11
Nodes (22): hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableSession(), nullableText(), nullableUserId(), Participant, DomainEvent (+14 more)

### Community 32 - "Sprint"
Cohesion: 0.12
Nodes (5): cloneItem(), cloneReport(), Sprint, SprintProps, SprintReport

### Community 33 - "rooms.ts"
Cohesion: 0.09
Nodes (35): accountUser(), sessionUser(), actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema (+27 more)

### Community 34 - "ref_node_fs"
Cohesion: 0.14
Nodes (4): missingShell, root, here, metaPath

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+19 more)

### Community 36 - "package.json"
Cohesion: 0.07
Nodes (35): react-dom@^19.0.0, purityBan, devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1 (+27 more)

### Community 37 - "commands.ts"
Cohesion: 0.12
Nodes (42): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote(), confirmEstimate() (+34 more)

### Community 38 - "item.ts"
Cohesion: 0.20
Nodes (11): isHttpUrl(), isItemStatus(), ITEM_STATUSES, ItemStatus, parseFigureTag(), MAX_ITEM_DESC_LENGTH, MAX_ITEM_TITLE_LENGTH, itemsFromCsv() (+3 more)

### Community 39 - "room-view.ts"
Cohesion: 0.12
Nodes (24): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+16 more)

### Community 40 - "compute-round-stats.ts"
Cohesion: 0.23
Nodes (13): computeRoundStats(), diverges(), emptySpecialCounts(), emptySuitDistribution(), idsAt(), labelFor(), meanOf(), medianOf() (+5 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.09
Nodes (25): save(), assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings (+17 more)

### Community 42 - "team.ts"
Cohesion: 0.22
Nodes (4): Team, TeamBuilder, TeamProps, OrganizationId

### Community 43 - "membership.ts"
Cohesion: 0.24
Nodes (7): Invite, adminCount(), changeMemberRole(), isTeamRole(), losesOnlyAdmin(), removeMember(), TEAM_ROLES

### Community 44 - "app.ts"
Cohesion: 0.13
Nodes (25): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), dependenciesOf(), devApp, errorResponse() (+17 more)

### Community 45 - "testing/src/index.ts"
Cohesion: 0.09
Nodes (24): AppContainer, errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf() (+16 more)

### Community 46 - "RoomEvent"
Cohesion: 0.24
Nodes (5): ThrowingProvider, RealtimeSubscriptionHandlers, RoomEvent, Committed, Subscription

### Community 47 - "sprint-commands.ts"
Cohesion: 0.21
Nodes (14): CreateSprint, DeleteHoliday, SaveHoliday, ActivateSprint, CloseSprint, GetSprint, GetSprintForecast, GetSprintReport (+6 more)

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.16
Nodes (12): ConnectionStatus, installColorScheme(), clearMissingFlags(), markMissing(), takeMissing(), LiveAnnouncerProvider(), useLiveAnnouncer(), boot() (+4 more)

### Community 49 - "dev-fake-auth-provider.ts"
Cohesion: 0.06
Nodes (21): DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevFakeAuthProvider, DevUserRole (+13 more)

### Community 50 - "RoomEvent"
Cohesion: 0.19
Nodes (7): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, walk(), bad

### Community 51 - "StructuredLogger"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.10
Nodes (25): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), readRoom(), REQUIRED_TABLES, saveUnlocked() (+17 more)

### Community 55 - "ref_node_path"
Cohesion: 0.35
Nodes (8): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses()

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "realtime.contract.ts"
Cohesion: 0.21
Nodes (10): describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed(), voteChanged() (+2 more)

### Community 58 - "composition.ts"
Cohesion: 0.19
Nodes (11): authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), devApp(), Payload (+3 more)

### Community 59 - "theme-provider.tsx"
Cohesion: 0.18
Nodes (16): useLiveAnnouncer(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+8 more)

### Community 60 - "main.tsx"
Cohesion: 0.14
Nodes (13): @tanstack/react-query@^5.62.8, App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext, LiveAnnouncerContextValue (+5 more)

### Community 61 - "export-room-summary.ts"
Cohesion: 0.10
Nodes (21): createCsvJsonExporter(), sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), CsvExportInput, ExportArtifact (+13 more)

### Community 62 - "invite.test.ts"
Cohesion: 0.25
Nodes (6): InviteBuilder, InviteState, inviteAt(), must(), NOW, InviteId

### Community 63 - "i18n-and-theme.test.tsx"
Cohesion: 0.19
Nodes (11): useTheme(), ERROR_KEYS, flattenCatalog(), SHELL_KEYS, dayOptions, LocaleProbe(), oneDecimal, renderLocale() (+3 more)

### Community 64 - "import-items.ts"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.16
Nodes (11): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH (+3 more)

### Community 67 - "can.ts"
Cohesion: 0.08
Nodes (23): ActorKind, isInstanceAdmin(), isTeamAdmin(), MATRIX, PolicyAction, PolicyActor, PolicyContext, PolicyRule (+15 more)

### Community 68 - "devDependencies"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 69 - "issue-tracker.contract.ts"
Cohesion: 0.31
Nodes (5): MAX_ITEMS_PER_ROOM, describeIssueTrackerContract(), expectBatch(), expectError(), okBatch()

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 71 - "FakeRealtimeClient"
Cohesion: 0.29
Nodes (3): RealtimeConnectionState, RealtimeConnectionStatus, FakeRealtimeClient

### Community 72 - "list-history.ts"
Cohesion: 0.25
Nodes (9): ExportHistory, ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf() (+1 more)

### Community 73 - "check-i18n.mjs"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

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
Cohesion: 0.31
Nodes (7): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), ServerEnv, serverEnvSchema

### Community 80 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 83 - "adapter-exporter-csvjson/package.json"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 86 - "realtime.port.ts"
Cohesion: 0.22
Nodes (3): RealtimeClient, RealtimeSubscription, VersionGapInfo

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.25
Nodes (8): @fibonaipe/domain, dependencies, @fibonaipe/domain@*, exports, name, private, type, version

### Community 88 - "TeamId"
Cohesion: 0.08
Nodes (8): MembershipRepository, PersistedTeamTaskRecord, SprintRepository, TeamRepository, TeamTaskRepository, TeamId, SprintBuilder, build()

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
Cohesion: 0.20
Nodes (10): @fibonaipe/application@*, @fibonaipe/application, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private (+2 more)

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

### Community 106 - "sprints/estimation-indicators.ts"
Cohesion: 0.43
Nodes (3): FIBONACCI, computeEstimationIndicators(), EstimationIndicators

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 109 - "fake-auth-provider.ts"
Cohesion: 0.40
Nodes (4): MagicLink, normalizeEmail(), StoredUser, VERIFIED_AT_MS

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

### Community 130 - "create-room.ts"
Cohesion: 0.14
Nodes (18): CREATE_ROOM_RULE, deliver(), finishMutation(), JOIN_ATTEMPT_RULE, limitIp(), participantJoined(), saveRoom(), toPersisted() (+10 more)

## Knowledge Gaps
- **1 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 813 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `Card`, `compute-forecast.ts`, `create-room.ts`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `router.tsx`, `i18n/index.ts`, `HistoryEntryBuilder`, `ref_react`, `AppHeader.tsx`, `room.test.ts`, `ref_node_fs`, `package.json`, `poker-table-and-projector-ui.test.tsx`, `team.ts`, `membership.ts`, `testing/src/index.ts`, `sprint-commands.ts`, `shell-flow.test.tsx`, `dev-fake-auth-provider.ts`, `RoomEvent`, `contract.integration.test.ts`, `ref_node_path`, `room-entry-http.test.ts`, `realtime.contract.ts`, `composition.ts`, `export-room-summary.ts`, `invite.test.ts`, `i18n-and-theme.test.tsx`, `src/ids.ts`, `can.ts`, `issue-tracker.contract.ts`, `read-source.ts`, `adapter-system/src/index.ts`, `TeamId`, `sprints/estimation-indicators.ts`, `dom-matchers.ts`, `check-bundle-budget.mjs`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Card` be split into smaller, more focused modules?**
  _Cohesion score 0.08080808080808081 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `Card`, `compute-forecast.ts`, `vitest`, `create-room.ts`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `ok`, `application/src/index.ts`, `room-session.ts`, `UserId`, `PlanningTable`, `auth-teams.ts`, `persistence.port.ts`, `postgres-persistence.ts`, `persistence.port.ts`, `HistoryEntryBuilder`, `Card`, `planning-table.ts`, `room.test.ts`, `PlanningTable`, `Room`, `Sprint`, `rooms.ts`, `ref_node_fs`, `item.ts`, `team.ts`, `membership.ts`, `app.ts`, `testing/src/index.ts`, `RoomEvent`, `sprint-commands.ts`, `dev-fake-auth-provider.ts`, `RoomEvent`, `contract.integration.test.ts`, `realtime.contract.ts`, `export-room-summary.ts`, `invite.test.ts`, `import-items.ts`, `issue-tracker.contract.ts`, `list-history.ts`, `realtime.port.ts`, `sprints/estimation-indicators.ts`, `fake-auth-provider.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `compute-forecast.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `Card`, `compute-forecast.ts`, `vitest`, `create-room.ts`, `planning-table.test.ts`, `domain/src/index.ts`, `sqlite-persistence.ts`, `record-aggregated-history.test.ts`, `ok`, `application/src/index.ts`, `room-session.ts`, `UserId`, `PlanningTable`, `auth-teams.ts`, `persistence.port.ts`, `postgres-persistence.ts`, `persistence.port.ts`, `HistoryEntryBuilder`, `Card`, `planning-table.ts`, `room.test.ts`, `PlanningTable`, `Room`, `Sprint`, `rooms.ts`, `ref_node_fs`, `item.ts`, `team.ts`, `membership.ts`, `app.ts`, `testing/src/index.ts`, `RoomEvent`, `sprint-commands.ts`, `dev-fake-auth-provider.ts`, `RoomEvent`, `contract.integration.test.ts`, `realtime.contract.ts`, `export-room-summary.ts`, `invite.test.ts`, `import-items.ts`, `issue-tracker.contract.ts`, `list-history.ts`, `realtime.port.ts`, `sprints/estimation-indicators.ts`, `fake-auth-provider.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.08648648648648649 - nodes in this community are weakly interconnected._