# Graph Report - fibonaipe  (2026-11-23)

## Corpus Check
- 355 files · ~148,065 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 18 file(s) not represented in the graph (top: .css 12, (none) 4, .example 1)

## Summary
- 3067 nodes · 9665 edges · 138 communities (104 shown, 34 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c0487596`
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
- create-room.ts
- use-cases.ts
- HistoryEntryBuilder
- team-routes.ts
- composition.ts
- router.tsx
- dev-auth.ts
- PlanningTable
- sprint-routes.ts
- application/src/index.ts
- postgres-persistence.ts
- UserId
- DevFakeAuthProvider
- Sprint
- Table.tsx
- TeamId
- ref_react
- UseCaseDependencies
- react
- AppHeader.tsx
- Room
- dependencies
- UserId
- voting-commands.ts
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
- theme-provider.tsx
- room-events.ts
- main.tsx
- fake-realtime.ts
- i18n-and-theme.test.tsx
- auth-provider.contract.ts
- shell-flow.test.tsx
- i18n/index.ts
- dev-fake-auth-provider.ts
- StructuredLogger
- 001_r1_rooms.sql
- room-entry-http.test.ts
- createAppError
- fake-realtime.ts
- read-source.ts
- issue-tracker.contract.ts
- realtime.contract.ts
- team.ts
- adapter-system/src/index.ts
- exporter.ts
- auth-teams-http.test.ts
- check-i18n.mjs
- import-items.ts
- src/ids.ts
- result.ts
- can.test.ts
- devDependencies
- web/package.json
- adapter-auth-devfake/package.json
- ScaleBuilder
- RoomBuilderChain
- ref_node_fs
- Timer.tsx
- round.ts
- compilerOptions
- adapter-auth-supabase/package.json
- adapter-auth-supabase/tsconfig.json
- missing-flags.ts
- room.test.ts
- adapter-persistence-postgres/package.json
- DatabaseSync
- adapter-exporter-csvjson/package.json
- ItemBuilderChain
- AppErrorBuilder
- supabase-auth-provider.test.ts
- @fibonaipe/domain
- adapter-imports-adapter/bad.ts
- @fibonaipe/adapter-exporter-csvjson@*
- ../../tsconfig.base.json
- adapter-auth-devfake/tsconfig.json
- @fibonaipe/adapter-persistence-sqlite@*
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
- @fibonaipe/adapter-system@*
- dev-auth.ts
- check-bundle-budget.mjs
- @tanstack/react-query
- loopback-guard.ts
- Hash
- domain-runtime-dep/package.json
- scripts
- sw.js
- 002_r2_identity.sql
- css.d.ts
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
1. `AppError` - 300 edges
2. `Result` - 299 edges
3. `ok()` - 270 edges
4. `createAppError()` - 204 edges
5. `err()` - 188 edges
6. `UseCaseDependencies` - 117 edges
7. `vitest` - 91 edges
8. `TeamId` - 90 edges
9. `UserId` - 83 edges
10. `useI18n()` - 73 edges

## Surprising Connections (you probably didn't know these)
- `openDurableRoom()` --calls--> `ListTeams`  [EXTRACTED]
  apps/web/src/server/routes/rooms.ts → packages/application/src/use-cases/teams/list-teams.ts
- `RoomUseCases` --references--> `AddItem`  [EXTRACTED]
  apps/web/src/server/use-cases.ts → packages/application/src/use-cases/items/item-commands.ts
- `RoomUseCases` --references--> `SetCurrentItem`  [EXTRACTED]
  apps/web/src/server/use-cases.ts → packages/application/src/use-cases/items/item-commands.ts
- `RoomUseCases` --references--> `UseCaseDependencies`  [EXTRACTED]
  apps/web/src/server/use-cases.ts → packages/application/src/use-cases/room-session.ts
- `RoomUseCases` --references--> `CreateRoom`  [EXTRACTED]
  apps/web/src/server/use-cases.ts → packages/application/src/use-cases/rooms/create-room.ts

## Import Cycles
- None detected.

## Communities (138 total, 34 thin omitted)

### Community 0 - "compute-round-stats.ts"
Cohesion: 0.06
Nodes (54): PersistedItemSnapshot, ItemStatus, actorOf(), cardByLabel(), cardsByScale, seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND (+46 more)

### Community 1 - "room-session.ts"
Cohesion: 0.08
Nodes (42): hostTransferred(), participantUpdated(), freshItem(), hydrate(), itemPropsOf(), LoadedRoom, planningOf(), toPersisted() (+34 more)

### Community 2 - "CompleteSignIn"
Cohesion: 0.11
Nodes (31): openDurableRoom(), signIn(), append(), BASE, mustId(), row(), signIn(), teamOf() (+23 more)

### Community 3 - "planning-table.test.ts"
Cohesion: 0.03
Nodes (55): EstimateAudit, TableOk, ACTIONS, apply(), asModule(), AuditView, branded(), buildItem() (+47 more)

### Community 4 - "AppError"
Cohesion: 0.06
Nodes (20): RolledBack, createInMemoryRateLimiter(), AuthProvider, CryptoVault, RateLimiter, RateLimitRule, RateLimitStatus, completeIdentity() (+12 more)

### Community 5 - "QueueDrawer.tsx"
Cohesion: 0.19
Nodes (15): TaskLine(), queueSnapshot(), isHttp(), ItemRow, Caret(), CloseIcon(), exportTasks(), MinusIcon() (+7 more)

### Community 6 - "sqlite-persistence.ts"
Cohesion: 0.08
Nodes (49): applyHistoryDetail(), asRecords(), auditFromRow(), HISTORY_BASE_KEYS, historyDetail(), historyFromRow(), idempotencyFromRow(), integer() (+41 more)

### Community 7 - "create-room.ts"
Cohesion: 0.21
Nodes (12): titles(), CREATE_ROOM_RULE, JOIN_ATTEMPT_RULE, CreateRoom, JoinRoom, expectCount(), numericCounts(), openGuest() (+4 more)

### Community 8 - "use-cases.ts"
Cohesion: 0.09
Nodes (23): createRoomUseCases(), RoomUseCases, IssueTrackerImportInput, ActorInput, AddItemInput, CommandResult, DeferItem, ImportItems (+15 more)

### Community 9 - "HistoryEntryBuilder"
Cohesion: 0.06
Nodes (23): EstimateAuditRecord, HistoryRepository, PersistedRoomItem, TransactionRepos, dominantSuit(), RecordAggregatedHistory, HistoryEntryBuilder, HistoryEntry (+15 more)

### Community 10 - "team-routes.ts"
Cohesion: 0.12
Nodes (33): accountUser(), dependenciesOf(), callbackSchema, completeCallback(), emailSchema, loginRedirectUrl(), registerAuthRoutes(), clientIp() (+25 more)

### Community 11 - "composition.ts"
Cohesion: 0.17
Nodes (16): authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), defaults, definedOverrides() (+8 more)

### Community 12 - "router.tsx"
Cohesion: 0.08
Nodes (35): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+27 more)

### Community 13 - "dev-auth.ts"
Cohesion: 0.23
Nodes (14): fail(), jsonWithSession(), loginSchema, okJson(), parseBody(), registerDevAuthRoutes(), superAdminEmails(), accountSessionCookie() (+6 more)

### Community 14 - "PlanningTable"
Cohesion: 0.12
Nodes (10): Item, contextOf(), isOnline(), numericCard(), planningEvent(), PlanningTable, predominantSuit(), seatOf() (+2 more)

### Community 15 - "sprint-routes.ts"
Cohesion: 0.08
Nodes (25): parseBody(), capacitySchema, doneSchema, holidaySchema, registerSprintRoutes(), sprintItemSchema, sprintSchema, ListHistory (+17 more)

### Community 16 - "application/src/index.ts"
Cohesion: 0.04
Nodes (64): applicationPackage, AggregatedRoundStats, IdempotencyRepository, PersistedParticipantSnapshot, PersistedRoomPlanning, PersistedVoteSnapshot, HostTransferredPayload, ItemEstimateFinalizedPayload (+56 more)

### Community 17 - "postgres-persistence.ts"
Cohesion: 0.08
Nodes (35): applyHistoryDetail(), asDate(), asNumber(), HISTORY_BASE_KEYS, historyDetail(), HistoryRow, InviteRow, ItemRow (+27 more)

### Community 18 - "UserId"
Cohesion: 0.08
Nodes (17): UserRepository, Invite, InviteAcceptance, InviteBuilder, InviteState, inviteAt(), must(), NOW (+9 more)

### Community 20 - "Sprint"
Cohesion: 0.10
Nodes (3): submit(), mutate(), Sprint

### Community 21 - "Table.tsx"
Cohesion: 0.11
Nodes (47): SUIT_GLYPH, EstimateDialog(), activeCards(), can(), canRevealNow(), canStartTimerNow(), canVoteNow(), cardLabel() (+39 more)

### Community 22 - "TeamId"
Cohesion: 0.06
Nodes (34): MemoryStore, AggregatedHistoryRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, InviteRepository, MembershipRepository, PersistedInviteRecord (+26 more)

### Community 23 - "ref_react"
Cohesion: 0.11
Nodes (32): CommitTagField(), arm(), beginErrorFlash(), listen(), ChevronIcon(), MembersModal(), addMember(), copyLink() (+24 more)

### Community 25 - "react"
Cohesion: 0.14
Nodes (15): JoinMode, touchTargetStyle, Deck(), SpecialIcon(), SPECIALS, useFaultPulse(), ImportDialog(), previewRows() (+7 more)

### Community 26 - "AppHeader.tsx"
Cohesion: 0.08
Nodes (35): matrixFor(), paintFinder(), QrCode(), AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu() (+27 more)

### Community 27 - "Room"
Cohesion: 0.14
Nodes (7): PlanningTableApi, Participant, domainEvent(), hostGraceElapsed(), isOnline(), JoinOk, Room

### Community 28 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-auth-supabase@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/testing@*, hono@^4.6.14, react-dom@^19.0.0, @tanstack/react-router@^1.92.0 (+5 more)

### Community 29 - "UserId"
Cohesion: 0.08
Nodes (27): participantJoined(), JoinRoomInput, CreateTeamRoomInput, hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableSession(), nullableText() (+19 more)

### Community 30 - "voting-commands.ts"
Cohesion: 0.13
Nodes (10): ActorInput, CommandResult, FinalEstimateInput, NewRoundInput, runVote(), sameCard(), StartTimer, StartTimerInput (+2 more)

### Community 31 - "RoomEvent"
Cohesion: 0.20
Nodes (9): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+1 more)

### Community 32 - "ok"
Cohesion: 0.09
Nodes (18): DeleteAccount, FIBONACCI, inviteRecord(), issuedAtFromExpiry(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId(), parseRole() (+10 more)

### Community 33 - "rooms.ts"
Cohesion: 0.06
Nodes (32): notices, roomNotice(), setRoomNotice(), actorId(), addItemSchema, claimSchema, clientIp(), clientOpId (+24 more)

### Community 34 - "domain/src/index.ts"
Cohesion: 0.04
Nodes (58): computeAccuracy(), ForecastAccuracy, ForecastAccuracyPoint, ForecastAccuracyRecord, ClosedSprintForecastInput, ForecastInsufficient, ForecastOk, ForecastReportBuilder (+50 more)

### Community 35 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+20 more)

### Community 36 - "package.json"
Cohesion: 0.05
Nodes (44): purityBan, devDependencies, eslint@^9.39.1, @eslint/js@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, react-dom@^19.3.1 (+36 more)

### Community 37 - "commands.ts"
Cohesion: 0.09
Nodes (55): nextClientOpId(), showErrorFlash(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote() (+47 more)

### Community 38 - "AuthenticatedIdentity"
Cohesion: 0.11
Nodes (15): createSupabaseAuthProvider(), GoTrueSession, GoTrueUser, identityFrom(), normalizeEmail(), SupabaseAuthOptions, SupabaseAuthProvider, AuthenticatedIdentity (+7 more)

### Community 39 - "room-view.ts"
Cohesion: 0.07
Nodes (29): ACTIONS, actorOf(), averageOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions() (+21 more)

### Community 40 - "record-aggregated-history.test.ts"
Cohesion: 0.12
Nodes (33): RoomView, AuditRow, HistoryRow, means(), seatsOf(), teamRoom(), currentItem(), FORBIDDEN_KEYS (+25 more)

### Community 41 - "poker-table-and-projector-ui.test.tsx"
Cohesion: 0.09
Nodes (25): save(), assertTouchTarget(), base(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings (+17 more)

### Community 42 - "theme-provider.tsx"
Cohesion: 0.18
Nodes (16): useLiveAnnouncer(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+8 more)

### Community 43 - "room-events.ts"
Cohesion: 0.43
Nodes (6): mapPlanning(), mapPlanningEvent(), settingsUpdated(), stringField(), stringList(), PlanningEvent

### Community 44 - "main.tsx"
Cohesion: 0.15
Nodes (11): App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext, LiveAnnouncerContextValue, LiveAnnouncerProvider() (+3 more)

### Community 45 - "fake-realtime.ts"
Cohesion: 0.21
Nodes (4): RealtimeClient, RealtimeConnectionStatus, FakeRealtime, FakeRealtimeClient

### Community 46 - "i18n-and-theme.test.tsx"
Cohesion: 0.17
Nodes (11): ERROR_KEYS, flattenCatalog(), SHELL_KEYS, dayOptions, LocaleProbe(), oneDecimal, renderLocale(), renderTheme() (+3 more)

### Community 48 - "shell-flow.test.tsx"
Cohesion: 0.20
Nodes (9): ConnectionStatus, installColorScheme(), clearMissingFlags(), takeMissing(), boot(), assertTouchTarget(), boot(), lengthPx() (+1 more)

### Community 49 - "i18n/index.ts"
Cohesion: 0.05
Nodes (56): ACTIVE_LOCALE, Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider() (+48 more)

### Community 50 - "dev-fake-auth-provider.ts"
Cohesion: 0.12
Nodes (15): createDevFakeAuthProvider(), DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole (+7 more)

### Community 51 - "StructuredLogger"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "001_r1_rooms.sql"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "room-entry-http.test.ts"
Cohesion: 0.06
Nodes (40): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+32 more)

### Community 54 - "createAppError"
Cohesion: 0.07
Nodes (22): EditFinalEstimateInput, EditFinalEstimateWithAudit, seatOf(), SPECIAL_CARDS, nextSettings(), access(), recalculate(), TeamInput (+14 more)

### Community 55 - "fake-realtime.ts"
Cohesion: 0.19
Nodes (5): RealtimeConnectionState, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, Subscription

### Community 56 - "read-source.ts"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 57 - "issue-tracker.contract.ts"
Cohesion: 0.17
Nodes (11): ExternalEstimateRef, ImportedBacklogBatch, ImportedItemCandidate, ImportRowWarning, IssueTracker, IssueTrackerProvider, UseCaseDependencies, describeIssueTrackerContract() (+3 more)

### Community 58 - "realtime.contract.ts"
Cohesion: 0.18
Nodes (11): RealtimePublisher, describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed() (+3 more)

### Community 59 - "team.ts"
Cohesion: 0.26
Nodes (4): Team, TeamBuilder, TeamProps, OrganizationId

### Community 60 - "adapter-system/src/index.ts"
Cohesion: 0.26
Nodes (6): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets

### Community 61 - "exporter.ts"
Cohesion: 0.14
Nodes (15): sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), CsvExportInput, ExportArtifact, Exporter (+7 more)

### Community 62 - "auth-teams-http.test.ts"
Cohesion: 0.08
Nodes (31): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), testApp() (+23 more)

### Community 63 - "check-i18n.mjs"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 64 - "import-items.ts"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 65 - "src/ids.ts"
Cohesion: 0.16
Nodes (11): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH (+3 more)

### Community 66 - "result.ts"
Cohesion: 0.07
Nodes (25): isHttpUrl(), isItemStatus(), ITEM_STATUSES, ItemBuilder, ItemProps, FIGURE_TAGS, FigureTag, parseFigureTag() (+17 more)

### Community 67 - "can.test.ts"
Cohesion: 0.16
Nodes (12): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, loadCan() (+4 more)

### Community 68 - "devDependencies"
Cohesion: 0.25
Nodes (4): vite@^6.0.6, @vitejs/plugin-react@^4.3.4, vite, @vitejs/plugin-react

### Community 69 - "web/package.json"
Cohesion: 0.21
Nodes (11): devDependencies, @types/node@^26.6.5, @types/react@^19.3.0, @types/react-dom@^19.3.0, name, private, type, version (+3 more)

### Community 70 - "adapter-auth-devfake/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 71 - "ScaleBuilder"
Cohesion: 0.18
Nodes (5): ScaleBuilder, buildNamed(), deck(), fullScale(), scaleWithout()

### Community 73 - "ref_node_fs"
Cohesion: 0.10
Nodes (20): CLIENT_DIR, createProductionFetch(), fileResponse(), isFile(), MIME_TYPES, serveStaticOrSpa(), startProductionServer(), fakeApi (+12 more)

### Community 74 - "Timer.tsx"
Cohesion: 0.29
Nodes (11): serverTime(), timerSeconds(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer() (+3 more)

### Community 75 - "round.ts"
Cohesion: 0.25
Nodes (7): PersistedRoundSnapshot, RoomView, RoundView, isRoundStatus(), RoundProps, RoundStatus, RoundStats

### Community 76 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+4 more)

### Community 77 - "adapter-auth-supabase/package.json"
Cohesion: 0.22
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, @fibonaipe/application, @fibonaipe/domain, name, private (+2 more)

### Community 78 - "adapter-auth-supabase/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

### Community 79 - "missing-flags.ts"
Cohesion: 0.60
Nodes (3): markMissing(), LiveAnnouncerProvider(), useLiveAnnouncer()

### Community 80 - "room.test.ts"
Cohesion: 0.08
Nodes (23): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+15 more)

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

### Community 90 - "../../tsconfig.base.json"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json

### Community 91 - "adapter-auth-devfake/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, composite, outDir, rootDir, exclude, extends, include, ../../tsconfig.base.json (+1 more)

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
Cohesion: 0.27
Nodes (8): ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf(), timeOf()

### Community 107 - "domain/package.json"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 109 - "dev-auth.ts"
Cohesion: 0.13
Nodes (19): app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), AppContainer, devApp, errorResponse() (+11 more)

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

## Knowledge Gaps
- **13 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `C:/Users/htzc/.local/bin/graphify-mcp.exe` (+8 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 900 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `CompleteSignIn` to `compute-round-stats.ts`, `planning-table.test.ts`, `sqlite-persistence.ts`, `create-room.ts`, `HistoryEntryBuilder`, `sprint-routes.ts`, `UserId`, `Table.tsx`, `TeamId`, `RoomEvent`, `domain/src/index.ts`, `package.json`, `AuthenticatedIdentity`, `record-aggregated-history.test.ts`, `poker-table-and-projector-ui.test.tsx`, `i18n-and-theme.test.tsx`, `shell-flow.test.tsx`, `i18n/index.ts`, `dev-fake-auth-provider.ts`, `room-entry-http.test.ts`, `createAppError`, `read-source.ts`, `issue-tracker.contract.ts`, `realtime.contract.ts`, `team.ts`, `adapter-system/src/index.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `src/ids.ts`, `result.ts`, `can.test.ts`, `ref_node_fs`, `room.test.ts`, `supabase-auth-provider.test.ts`, `dev-auth.ts`, `check-bundle-budget.mjs`, `dom-matchers.ts`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _13 weakly-connected nodes found - possible missing edges._
- **Should `compute-round-stats.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06054054054054054 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `AppError` to `compute-round-stats.ts`, `room-session.ts`, `CompleteSignIn`, `planning-table.test.ts`, `sqlite-persistence.ts`, `create-room.ts`, `use-cases.ts`, `HistoryEntryBuilder`, `team-routes.ts`, `dev-auth.ts`, `PlanningTable`, `sprint-routes.ts`, `postgres-persistence.ts`, `UserId`, `DevFakeAuthProvider`, `Sprint`, `TeamId`, `Room`, `UserId`, `RoomEvent`, `ok`, `domain/src/index.ts`, `AuthenticatedIdentity`, `record-aggregated-history.test.ts`, `dev-fake-auth-provider.ts`, `room-entry-http.test.ts`, `createAppError`, `fake-realtime.ts`, `issue-tracker.contract.ts`, `realtime.contract.ts`, `team.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `import-items.ts`, `result.ts`, `ref_node_fs`, `round.ts`, `room.test.ts`, `list-history.ts`, `dev-auth.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `room-session.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0798076923076923 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `AppError` to `compute-round-stats.ts`, `room-session.ts`, `CompleteSignIn`, `planning-table.test.ts`, `sqlite-persistence.ts`, `create-room.ts`, `use-cases.ts`, `HistoryEntryBuilder`, `team-routes.ts`, `dev-auth.ts`, `PlanningTable`, `sprint-routes.ts`, `postgres-persistence.ts`, `UserId`, `DevFakeAuthProvider`, `Sprint`, `TeamId`, `Room`, `UserId`, `RoomEvent`, `ok`, `domain/src/index.ts`, `AuthenticatedIdentity`, `record-aggregated-history.test.ts`, `dev-fake-auth-provider.ts`, `room-entry-http.test.ts`, `createAppError`, `fake-realtime.ts`, `issue-tracker.contract.ts`, `realtime.contract.ts`, `team.ts`, `exporter.ts`, `auth-teams-http.test.ts`, `import-items.ts`, `result.ts`, `ref_node_fs`, `round.ts`, `room.test.ts`, `list-history.ts`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `CompleteSignIn` be split into smaller, more focused modules?**
  _Cohesion score 0.1080389144905274 - nodes in this community are weakly interconnected._