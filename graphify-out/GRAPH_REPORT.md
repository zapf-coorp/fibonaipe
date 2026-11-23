# Graph Report - fibonaipe  (2026-11-14)

## Corpus Check
- 352 files · ~144,732 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 11, (none) 4, .example 1)

## Summary
- 2991 nodes · 9541 edges · 143 communities (109 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 137 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d46fd234`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- compute-round-stats.ts
- room-session.ts
- CompleteSignIn
- planning-table.test.ts
- AppError
- QueueDrawer.tsx
- sqlite-persistence.ts
- vitest
- TeamRole
- HistoryEntryBuilder
- team-routes.ts
- composition.ts
- router.tsx
- dev-auth.ts
- PlanningTable
- sprint-routes.ts
- application/src/index.ts
- postgres-persistence.ts
- shared/ids.ts
- DevFakeAuthProvider
- SprintBuilder
- Table.tsx
- TeamId
- ref_react
- UseCaseDependencies
- sqlite-mappers.ts
- useI18n
- Room
- dependencies
- UserId
- contract.integration.test.ts
- RoomEvent
- ok
- rooms.ts
- domain/src/index.ts
- compilerOptions
- package.json
- commands.ts
- AuthenticatedIdentity
- room-view.ts
- record-aggregated-history.test.ts
- poker-table-and-projector-ui.test.tsx
- export-room-summary.ts
- planning-table.ts
- room-session.ts
- fake-realtime.ts
- room-account-http.test.ts
- auth-provider.contract.ts
- i18n-and-theme.test.tsx
- i18n/index.ts
- dev-fake-auth-provider.ts
- StructuredLogger
- 001_r1_rooms.sql
- contract.integration.test.ts
- createAppError
- send-magic-link.ts
- room-entry-http.test.ts
- issue-tracker.contract.ts
- realtime.contract.ts
- sprint.ts
- adapter-system/src/index.ts
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
- web/package.json
- SettingsBuilderChain
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- supabase-auth-provider.test.ts
- @fibonaipe/domain
- edit-final-estimate.test.ts
- user.ts
- ../../tsconfig.base.json
- adapter-auth-devfake/tsconfig.json
- list-history.test.ts
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
- @fibonaipe/adapter-auth-devfake@*
- dev-auth.ts
- check-bundle-budget.mjs
- eslint.config.js
- HistoryRepository
- RoomRepository
- SprintRepository
- UserRepository
- loopback-guard.ts
- Hash
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
- engines
- graphify
- @fibonaipe/adapter-persistence-postgres@*
- tsconfig.json
- 005_team_tasks.sql
- domain-impure-date/bad.ts
- zod@^3.24.2
- @fibonaipe/application@*
- @fibonaipe/domain@*
- @hono/node-server
- react@^19.0.0

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
- `accountUser()` --calls--> `ok()`  [EXTRACTED]
  apps/web/src/server/account-user.ts → packages/domain/src/shared/result.ts
- `AppContainer` --references--> `AuthProvider`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/auth-provider.port.ts
- `AppContainer` --references--> `Clock`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/clock.port.ts
- `AppContainer` --references--> `Exporter`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/exporter.port.ts
- `AppContainer` --references--> `IdGenerator`  [EXTRACTED]
  apps/web/src/server/composition.ts → packages/application/src/ports/id-generator.port.ts

## Import Cycles
- None detected.

## Communities (143 total, 34 thin omitted)

### Community 0 - "compute-round-stats.ts"
Cohesion: 0.05
Nodes (56): OwnVote, ProjectedVote, RoomView, ReconnectParticipantResult, ItemView, OwnVote, VoteApi, VoteView (+48 more)

### Community 1 - "room-session.ts"
Cohesion: 0.08
Nodes (43): IssueTrackerImportInput, RecordAggregatedHistory, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput (+35 more)

### Community 2 - "CompleteSignIn"
Cohesion: 0.12
Nodes (22): signIn(), signIn(), signIn(), CompleteSignIn, complete(), signIn(), signIn(), SuspendUser (+14 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.03
Nodes (56): PersistedRoundSnapshot, ACTIONS, asModule(), AuditView, branded(), CARD_LABELS, CODE, Command (+48 more)

### Community 4 - "AppError"
Cohesion: 0.06
Nodes (23): RolledBack, AuthProvider, CryptoVault, completeIdentity(), persistSignedInUser(), DeleteAccount, EMAIL_RULE, IP_RULE (+15 more)

### Community 5 - "QueueDrawer.tsx"
Cohesion: 0.11
Nodes (27): CopyIcon(), createRoom(), FAN, FIBONACCI, HomePage(), Phase, SUITS, AccountTeam (+19 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.09
Nodes (29): historyDetail(), isRecord(), planningJson(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+21 more)

### Community 7 - "vitest"
Cohesion: 0.14
Nodes (25): IssueTracker, PersistedRoomRecord, StoredParticipant, titles(), viewOf(), participantJoined(), CREATE_ROOM_RULE, JOIN_ATTEMPT_RULE (+17 more)

### Community 8 - "TeamRole"
Cohesion: 0.24
Nodes (8): AcceptInviteResult, ChangeMemberRoleInput, CreateInviteInput, CreateInviteResult, TeamMemberSummary, TeamSummary, Membership, TeamRole

### Community 9 - "HistoryEntryBuilder"
Cohesion: 0.09
Nodes (15): dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id(), must() (+7 more)

### Community 10 - "team-routes.ts"
Cohesion: 0.13
Nodes (30): dependenciesOf(), callbackSchema, completeCallback(), emailSchema, loginRedirectUrl(), registerAuthRoutes(), clientIp(), fail() (+22 more)

### Community 11 - "composition.ts"
Cohesion: 0.12
Nodes (19): authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), defaults, definedOverrides() (+11 more)

### Community 12 - "router.tsx"
Cohesion: 0.08
Nodes (33): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+25 more)

### Community 13 - "dev-auth.ts"
Cohesion: 0.19
Nodes (17): accountUser(), fail(), jsonWithSession(), loginSchema, okJson(), parseBody(), registerDevAuthRoutes(), superAdminEmails() (+9 more)

### Community 14 - "PlanningTable"
Cohesion: 0.10
Nodes (10): Item, contextOf(), isOnline(), numericCard(), planningEvent(), PlanningTable, predominantSuit(), seatOf() (+2 more)

### Community 15 - "sprint-routes.ts"
Cohesion: 0.14
Nodes (30): capacitySchema, doneSchema, holidaySchema, registerSprintRoutes(), sprintItemSchema, sprintSchema, ListHistory, teamOf() (+22 more)

### Community 16 - "application/src/index.ts"
Cohesion: 0.05
Nodes (48): applicationPackage, AggregatedRoundStats, PersistedParticipantSnapshot, PersistedVoteSnapshot, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload (+40 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.10
Nodes (29): applyHistoryDetail(), asDate(), asNumber(), HISTORY_BASE_KEYS, historyDetail(), HistoryRow, InviteRow, ItemRow (+21 more)

### Community 18 - "shared/ids.ts"
Cohesion: 0.06
Nodes (36): Invite, InviteAcceptance, InviteBuilder, InviteState, inviteAt(), must(), NOW, adminCount() (+28 more)

### Community 19 - "DevFakeAuthProvider"
Cohesion: 0.19
Nodes (3): DevFakeAuthProvider, normalizeEmail(), slug()

### Community 21 - "Table.tsx"
Cohesion: 0.09
Nodes (49): matrixFor(), paintFinder(), QrCode(), Deck(), SpecialIcon(), SPECIALS, SUIT_GLYPH, useFaultPulse() (+41 more)

### Community 22 - "TeamId"
Cohesion: 0.08
Nodes (28): MemoryStore, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, IdempotencyRepository, MembershipRepository, PersistedInviteRecord (+20 more)

### Community 23 - "ref_react"
Cohesion: 0.09
Nodes (38): CommitTagField(), TaskLine(), arm(), beginErrorFlash(), listen(), showErrorFlash(), touchTargetStyle, ImportDialog() (+30 more)

### Community 25 - "sqlite-mappers.ts"
Cohesion: 0.21
Nodes (21): applyHistoryDetail(), asRecords(), auditFromRow(), HISTORY_BASE_KEYS, historyFromRow(), idempotencyFromRow(), integer(), inviteFromRow() (+13 more)

### Community 26 - "useI18n"
Cohesion: 0.09
Nodes (27): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), useOwnSeat() (+19 more)

### Community 27 - "Room"
Cohesion: 0.13
Nodes (11): hydrateIn(), inLockedRoom(), saveRoom(), nullableUserId(), Participant, domainEvent(), hostGraceElapsed(), isOnline() (+3 more)

### Community 28 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @fibonaipe/adapter-auth-supabase@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, hono@^4.6.14, @tanstack/react-router@^1.92.0 (+5 more)

### Community 29 - "UserId"
Cohesion: 0.06
Nodes (50): CreateTeamRoomInput, hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableSession(), nullableText(), ParticipantMode, ParticipantProps (+42 more)

### Community 30 - "contract.integration.test.ts"
Cohesion: 0.12
Nodes (13): adapterSources(), errResult(), NATIVE_MODULES, packageManifests(), REQUIRED_TABLES, walkManifests(), walkTs(), applyPostgresMigrations() (+5 more)

### Community 31 - "RoomEvent"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 32 - "ok"
Cohesion: 0.09
Nodes (17): FIBONACCI, inviteRecord(), issuedAtFromExpiry(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId(), parseRole(), requireTeamAction() (+9 more)

### Community 33 - "rooms.ts"
Cohesion: 0.10
Nodes (27): actorId(), addItemSchema, claimSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail() (+19 more)

### Community 34 - "domain/src/index.ts"
Cohesion: 0.06
Nodes (48): PersistedItemSnapshot, computeAccuracy(), ForecastAccuracy, ForecastAccuracyRecord, ClosedSprintForecastInput, computeForecast(), ForecastInsufficient, ForecastOk (+40 more)

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+20 more)

### Community 36 - "package.json"
Cohesion: 0.10
Nodes (24): devDependencies, eslint@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, react-dom@^19.3.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+16 more)

### Community 37 - "commands.ts"
Cohesion: 0.10
Nodes (52): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), t(), ProjectorPage(), addQueueItem(), addQueueItems() (+44 more)

### Community 38 - "AuthenticatedIdentity"
Cohesion: 0.15
Nodes (8): createSupabaseAuthProvider(), GoTrueSession, GoTrueUser, identityFrom(), normalizeEmail(), SupabaseAuthOptions, SupabaseAuthProvider, AuthenticatedIdentity

### Community 39 - "room-view.ts"
Cohesion: 0.12
Nodes (25): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+17 more)

### Community 40 - "record-aggregated-history.test.ts"
Cohesion: 0.15
Nodes (34): createRoomUseCases(), RoomUseCases, teamRoom(), currentItem(), FORBIDDEN_KEYS, forbiddenKeys(), reveal(), Seat (+26 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.09
Nodes (25): save(), assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings (+17 more)

### Community 42 - "export-room-summary.ts"
Cohesion: 0.19
Nodes (11): CsvExportInput, ExportArtifact, JsonExportInput, csvRows(), ExportRoomSummaryInput, SummaryItem, summaryOf(), SummaryRound (+3 more)

### Community 43 - "planning-table.ts"
Cohesion: 0.15
Nodes (13): EstimateAudit, actorOf(), cardByLabel(), cardsByScale, PlanningEvent, seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND (+5 more)

### Community 44 - "room-session.ts"
Cohesion: 0.09
Nodes (21): EditFinalEstimateInput, EditFinalEstimateWithAudit, seatOf(), SPECIAL_CARDS, LoadedRoom, actorOf(), addMilliseconds(), authorize() (+13 more)

### Community 45 - "fake-realtime.ts"
Cohesion: 0.12
Nodes (9): RealtimeClient, RealtimeConnectionState, RealtimeConnectionStatus, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, FakeRealtime, FakeRealtimeClient (+1 more)

### Community 46 - "room-account-http.test.ts"
Cohesion: 0.42
Nodes (9): App, cookiePair(), createGuestRoom(), createTeam(), field(), isRecord(), Payload, send() (+1 more)

### Community 47 - "auth-provider.contract.ts"
Cohesion: 0.28
Nodes (4): AuthProviderContractHarness, describeAuthProviderContract(), expectError(), expectIdentity()

### Community 48 - "i18n-and-theme.test.tsx"
Cohesion: 0.04
Nodes (62): @tanstack/react-query@^5.62.8, ConnectionStatus, App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext (+54 more)

### Community 49 - "i18n/index.ts"
Cohesion: 0.05
Nodes (43): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+35 more)

### Community 50 - "dev-fake-auth-provider.ts"
Cohesion: 0.11
Nodes (17): DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole, GoogleCode (+9 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "contract.integration.test.ts"
Cohesion: 0.18
Nodes (19): hasProcessed(), readRoom(), saveUnlocked(), Persistence, deferred(), describePersistenceContract(), errNotFound(), errResult() (+11 more)

### Community 54 - "createAppError"
Cohesion: 0.06
Nodes (18): submit(), parseBody(), hydrate(), nextSettings(), access(), recalculate(), mutate(), normalizeUserEmail() (+10 more)

### Community 55 - "send-magic-link.ts"
Cohesion: 0.31
Nodes (4): createInMemoryRateLimiter(), RateLimiter, RateLimitRule, RateLimitStatus

### Community 56 - "room-entry-http.test.ts"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "issue-tracker.contract.ts"
Cohesion: 0.19
Nodes (9): ExternalEstimateRef, ImportedBacklogBatch, ImportedItemCandidate, ImportRowWarning, IssueTrackerProvider, describeIssueTrackerContract(), expectBatch(), expectError() (+1 more)

### Community 58 - "realtime.contract.ts"
Cohesion: 0.21
Nodes (10): describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed(), voteChanged() (+2 more)

### Community 59 - "sprint.ts"
Cohesion: 0.26
Nodes (9): CapacityEntry, civilDate(), computeCapacity(), computeWorkingDays(), SprintCapacityEntry, SprintForecastRecord, SprintItem, SprintReport (+1 more)

### Community 60 - "adapter-system/src/index.ts"
Cohesion: 0.26
Nodes (6): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets

### Community 61 - "exporter.ts"
Cohesion: 0.19
Nodes (10): createCsvJsonExporter(), sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), Exporter, csvLines() (+2 more)

### Community 62 - "auth-teams-http.test.ts"
Cohesion: 0.08
Nodes (25): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), testApp() (+17 more)

### Community 63 - "check-i18n.mjs"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 64 - "import-items.ts"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.16
Nodes (10): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_LENGTH, charAt() (+2 more)

### Community 66 - "ItemBuilder"
Cohesion: 0.13
Nodes (6): PersistedRoomPlanning, freshItem(), itemPropsOf(), planningOf(), toPersisted(), ItemBuilder

### Community 67 - "can.test.ts"
Cohesion: 0.16
Nodes (12): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, loadCan() (+4 more)

### Community 68 - "devDependencies"
Cohesion: 0.25
Nodes (4): vite@^6.0.6, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 69 - "web/package.json"
Cohesion: 0.29
Nodes (7): devDependencies, @types/node@^26.6.5, @types/react@^19.3.0, @types/react-dom@^19.3.0, @types/node, @types/react, @types/react-dom

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 71 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, dev, lint (+5 more)

### Community 73 - "ref_node_fs"
Cohesion: 0.18
Nodes (10): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses() (+2 more)

### Community 74 - "Timer.tsx"
Cohesion: 0.29
Nodes (11): serverTime(), timerSeconds(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer() (+3 more)

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

### Community 79 - "web/package.json"
Cohesion: 0.22
Nodes (8): @fibonaipe/testing@*, react-dom@^19.0.0, react-dom, name, private, type, version, @fibonaipe/testing

### Community 81 - "adapter-persistence-postgres/package.json"
Cohesion: 0.19
Nodes (12): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, @fibonaipe/application, @fibonaipe/domain, name (+4 more)

### Community 82 - "DatabaseSync"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 83 - "adapter-exporter-csvjson/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 86 - "supabase-auth-provider.test.ts"
Cohesion: 0.33
Nodes (5): Call, fakeFetch(), GOTRUE_USER, Handler, providerWith()

### Community 87 - "@fibonaipe/domain"
Cohesion: 0.25
Nodes (8): dependencies, @fibonaipe/domain@*, exports, @fibonaipe/domain, name, private, type, version

### Community 88 - "edit-final-estimate.test.ts"
Cohesion: 0.33
Nodes (5): AuditRow, HistoryRow, means(), seatsOf(), readHistory()

### Community 89 - "user.ts"
Cohesion: 0.12
Nodes (7): STATUSES, THEMES, User, UserBuilder, UserProps, UserStatus, UserTheme

### Community 90 - "../../tsconfig.base.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json

### Community 91 - "adapter-auth-devfake/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 92 - "list-history.test.ts"
Cohesion: 0.27
Nodes (7): AggregatedHistoryRecord, append(), BASE, mustId(), row(), SeedRow, RoundId

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

### Community 109 - "dev-auth.ts"
Cohesion: 0.17
Nodes (18): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), AppContainer, devApp, errorResponse() (+10 more)

### Community 112 - "eslint.config.js"
Cohesion: 0.33
Nodes (5): purityBan, @eslint/js@^9.39.1, typescript-eslint@^8.46.4, @eslint/js, typescript-eslint

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

### Community 125 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Knowledge Gaps
- **13 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 850 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `compute-round-stats.ts`, `CompleteSignIn`, `planning-table.test.ts`, `HistoryEntryBuilder`, `composition.ts`, `sprint-routes.ts`, `shared/ids.ts`, `SprintBuilder`, `TeamId`, `ref_react`, `UserId`, `contract.integration.test.ts`, `RoomEvent`, `domain/src/index.ts`, `package.json`, `record-aggregated-history.test.ts`, `poker-table-and-projector-ui.test.tsx`, `room-account-http.test.ts`, `auth-provider.contract.ts`, `i18n-and-theme.test.tsx`, `i18n/index.ts`, `dev-fake-auth-provider.ts`, `contract.integration.test.ts`, `room-entry-http.test.ts`, `issue-tracker.contract.ts`, `realtime.contract.ts`, `sprint.ts`, `adapter-system/src/index.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `src/ids.ts`, `can.test.ts`, `ref_node_fs`, `main.ts`, `supabase-auth-provider.test.ts`, `edit-final-estimate.test.ts`, `list-history.test.ts`, `check-bundle-budget.mjs`, `dom-matchers.ts`?**
  _High betweenness centrality (0.114) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _13 weakly-connected nodes found - possible missing edges._
- **Should `compute-round-stats.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051189400782896716 - nodes in this community are weakly interconnected._
- **Why does `useI18n()` connect `useI18n` to `QueueDrawer.tsx`, `Timer.tsx`, `router.tsx`, `i18n-and-theme.test.tsx`, `i18n/index.ts`, `Table.tsx`, `ref_react`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `room-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08408953418027829 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `compute-round-stats.ts`, `room-session.ts`, `CompleteSignIn`, `planning-table.test.ts`, `sqlite-persistence.ts`, `vitest`, `HistoryEntryBuilder`, `team-routes.ts`, `dev-auth.ts`, `PlanningTable`, `sprint-routes.ts`, `postgres-persistence.ts`, `shared/ids.ts`, `DevFakeAuthProvider`, `TeamId`, `Room`, `UserId`, `contract.integration.test.ts`, `RoomEvent`, `ok`, `rooms.ts`, `domain/src/index.ts`, `AuthenticatedIdentity`, `export-room-summary.ts`, `planning-table.ts`, `room-session.ts`, `fake-realtime.ts`, `auth-provider.contract.ts`, `dev-fake-auth-provider.ts`, `contract.integration.test.ts`, `createAppError`, `send-magic-link.ts`, `issue-tracker.contract.ts`, `realtime.contract.ts`, `sprint.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `import-items.ts`, `ItemBuilder`, `user.ts`, `list-history.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `CompleteSignIn` be split into smaller, more focused modules?**
  _Cohesion score 0.12427409988385599 - nodes in this community are weakly interconnected._