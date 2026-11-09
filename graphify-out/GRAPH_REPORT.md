# Graph Report - fibonaipe  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2557 nodes · 8104 edges · 123 communities (99 shown, 24 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a53f8d7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 117
- Community 118
- Community 119

## God Nodes (most connected - your core abstractions)
1. `AppError` - 271 edges
2. `Result` - 270 edges
3. `Ok` - 237 edges
4. `createAppError()` - 176 edges
5. `Err` - 166 edges
6. `UseCaseDependencies` - 101 edges
7. `TeamId` - 84 edges
8. `vitest` - 83 edges
9. `UserId` - 73 edges
10. `RoomId` - 67 edges

## Surprising Connections (you probably didn't know these)
- `@fibonaipe/domain@*` --declares--> `@fibonaipe/domain`  [EXTRACTED]
  packages/adapter-exporter-csvjson/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-issuetracker-manual/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-persistence-postgres/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-persistence-sqlite/package.json → apps/web/package.json
- `@fibonaipe/application@*` --declares--> `@fibonaipe/application`  [EXTRACTED]
  packages/adapter-realtime-supabase/package.json → apps/web/package.json

## Import Cycles
- None detected.

## Communities (123 total, 24 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (14): RolledBack, AuthProvider, CryptoVault, PlanningTable, PlanningTableApi, Reach, runCommand(), isOnline() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (49): ImportedBacklogBatch, ImportedItemCandidate, IssueTracker, computeAccuracy(), ForecastAccuracy, ForecastAccuracyPoint, ForecastAccuracyRecord, ClosedSprintForecastInput (+41 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (50): RecordAggregatedHistory, actorOf(), addMilliseconds(), authorize(), beginOp(), codeTails, commitAggregate(), commitPlanning() (+42 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (33): DeleteAccount, FIBONACCI, AcceptInviteResult, inviteRecord(), issuedAtFromExpiry(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (49): ACTIONS, apply(), asModule(), AuditView, branded(), buildItem(), CARD_LABELS, Command (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (36): Catalog, catalogs, I18nContext, I18nContextValue, interpolate(), isSupportedLocale(), LeafKeys, LOCALE_STORAGE_KEY (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.08
Nodes (22): parseBody(), sortKeys(), LinkGuestToAccount, finishMutation(), hydrate(), hydrateIn(), inLockedRoom(), readLoaded() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.08
Nodes (46): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+38 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (35): ConnectionStatusPill(), formatDate(), formatNumber(), I18nProvider(), App(), bootGeneration, bootScope, queryClient (+27 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (49): applicationPackage, ExternalEstimateRef, ImportRowWarning, IssueTrackerProvider, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload (+41 more)

### Community 10 - "Community 10"
Cohesion: 0.08
Nodes (12): submit(), mutate(), CapacityEntry, civilDate(), computeCapacity(), computeWorkingDays(), hasSprintOverlap(), cloneItem() (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (36): matrixFor(), paintFinder(), QrCode(), Deck(), EstimateDialog(), activeCards(), can(), currentItem() (+28 more)

### Community 12 - "Community 12"
Cohesion: 0.06
Nodes (29): applyHistoryDetail(), applyPostgresMigrations(), asDate(), asNumber(), createPostgresPersistence(), createRepos(), findRoom(), findRoomByCode() (+21 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (25): PersistedRoomRecord, currentItem(), StoredParticipant, openRoom(), titles(), viewOf(), CreateRoom, JoinRoom (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (36): createRoomUseCases(), RoomUseCases, IssueTrackerImportInput, teamRoom(), ActorInput, AddItem, AddItemInput, CommandResult (+28 more)

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (15): PersistedRoomItem, dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id() (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (9): cardByLabel(), contextOf(), isOnline(), numericCard(), PlanningTable, predominantSuit(), seatOf(), Round (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.07
Nodes (13): MembershipRepository, SprintRepository, TeamRepository, SeedRow, Team, TeamBuilder, TeamProps, HolidayId (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (31): MemoryStore, AggregatedHistoryRecord, AggregatedRoundStats, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, IdempotencyRepository (+23 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (22): signIn(), append(), BASE, mustId(), row(), signIn(), teamOf(), signIn() (+14 more)

### Community 20 - "Community 20"
Cohesion: 0.07
Nodes (27): ConnectionStatus, STATUS_LABEL, TranslationKey, createRoom(), FAN, FIBONACCI, HomePage(), Phase (+19 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (36): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), ProjectorPage(), RoomPage(), addQueueItem(), castVote() (+28 more)

### Community 22 - "Community 22"
Cohesion: 0.09
Nodes (25): AfkCard, DoubtCard, JokerCard, NumericCard, SpecialCard, FIBONACCI_CARDS, FIBONACCI_LABELS, ScaleBuilder (+17 more)

### Community 24 - "Community 24"
Cohesion: 0.10
Nodes (26): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), readRoom(), REQUIRED_TABLES, saveUnlocked() (+18 more)

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (29): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), AppShell() (+21 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (10): RealtimeClient, RealtimeConnectionState, RealtimeConnectionStatus, RealtimePublisher, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, FakeRealtime (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (26): callbackSchema, capacitySchema, clientIp(), dependenciesOf(), doneSchema, emailSchema, fail(), holidaySchema (+18 more)

### Community 28 - "Community 28"
Cohesion: 0.11
Nodes (17): OwnVote, ProjectedVote, RoomView, Item, ItemView, OwnVote, RoomView, VoteApi (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.10
Nodes (27): dependencies, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/domain@*, @fibonaipe/testing@* (+19 more)

### Community 30 - "Community 30"
Cohesion: 0.09
Nodes (27): react-dom@^19.0.0, devDependencies, eslint@^9.39.1, happy-dom@^21.0.4, react@^19.3.1, react-dom@^19.3.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+19 more)

### Community 31 - "Community 31"
Cohesion: 0.11
Nodes (23): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+15 more)

### Community 32 - "Community 32"
Cohesion: 0.11
Nodes (14): testApp(), testApp(), readUser(), readTeam(), readUser(), DEFAULT_EPOCH_MS, FakeClock, resolveEpoch() (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.09
Nodes (21): EstimateAudit, actorOf(), cardsByScale, PlanningEvent, seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND, TableOk (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.07
Nodes (26): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+18 more)

### Community 35 - "Community 35"
Cohesion: 0.10
Nodes (19): assertTouchTarget(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings, HOST_CARD, installFetch() (+11 more)

### Community 36 - "Community 36"
Cohesion: 0.11
Nodes (20): fast-check@^4.3.0, StoredItem, isHttpUrl(), isItemStatus(), ITEM_STATUSES, ItemProps, ItemStatus, FIGURE_TAGS (+12 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (24): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), isOnline() (+16 more)

### Community 38 - "Community 38"
Cohesion: 0.14
Nodes (8): secrets, ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (21): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+13 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (16): hono@^4.6.14, app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), errorResponse(), httpStatusFor() (+8 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (7): RoomRepository, ParticipantProps, RoomBuilder, RoomState, RoomSettings, RoomCode, RoomId

### Community 42 - "Community 42"
Cohesion: 0.10
Nodes (7): UserRepository, UserBuilder, RejoinInput, Brand, hasControlOrWhitespace(), UserId, StoredUser

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (20): summaryOf(), RoundView, isRoundStatus(), RoundProps, RoundStatus, computeRoundStats(), diverges(), emptySpecialCounts() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (11): CreateSprint, ActivateSprint, CloseSprint, GetForecastAccuracy, GetSprintForecast, GetSprintReport, MarkSprintItemDone, SetSprintCapacity (+3 more)

### Community 45 - "Community 45"
Cohesion: 0.17
Nodes (19): CreateTeamRoomInput, hasControlCharacter(), nicknameKey(), normalizeNickname(), nullableText(), ParticipantMode, RoomHostSeed, DomainEvent (+11 more)

### Community 46 - "Community 46"
Cohesion: 0.14
Nodes (21): actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail(), importSchema (+13 more)

### Community 47 - "Community 47"
Cohesion: 0.16
Nodes (11): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH (+3 more)

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (5): nullableSession(), nullableUserId(), Participant, JoinOk, Room

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (12): createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), unavailableAuth(), createCsvJsonExporter(), createManualIssueTracker(), createSystemClock() (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 52 - "Community 52"
Cohesion: 0.19
Nodes (12): CsvExportInput, ExportArtifact, Exporter, JsonExportInput, LoadedRoom, csvRows(), ExportRoomSummaryInput, SummaryItem (+4 more)

### Community 53 - "Community 53"
Cohesion: 0.14
Nodes (11): AuditRow, HistoryRow, means(), seatsOf(), FORBIDDEN_KEYS, forbiddenKeys(), reveal(), Seat (+3 more)

### Community 54 - "Community 54"
Cohesion: 0.21
Nodes (10): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize() (+2 more)

### Community 55 - "Community 55"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.21
Nodes (10): describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed(), voteChanged() (+2 more)

### Community 57 - "Community 57"
Cohesion: 0.30
Nodes (8): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses()

### Community 58 - "Community 58"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.17
Nodes (5): AppContainer, ServerEnv, Clock, IdGenerator, UseCaseDependencies

### Community 60 - "Community 60"
Cohesion: 0.23
Nodes (6): createInMemoryRateLimiter(), RateLimiter, RateLimitRule, RateLimitStatus, EMAIL_RULE, IP_RULE

### Community 61 - "Community 61"
Cohesion: 0.23
Nodes (6): AuthenticatedIdentity, describeAuthProviderContract(), expectError(), expectIdentity(), MagicLink, VERIFIED_AT_MS

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (11): Action, ACTIONS, Actor, allowed(), cases, Flags, loadCan(), PolicyContext (+3 more)

### Community 63 - "Community 63"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 64 - "Community 64"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+3 more)

### Community 66 - "Community 66"
Cohesion: 0.20
Nodes (10): @fibonaipe/application@*, @fibonaipe/application, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.29
Nodes (9): serverTime(), timerEndsAt(), bridgeKey, formatClock(), phaseOf(), remainingMs(), Timer(), TimerBridge (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 69 - "Community 69"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 70 - "Community 70"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 71 - "Community 71"
Cohesion: 0.25
Nodes (9): ExportHistory, ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf() (+1 more)

### Community 75 - "Community 75"
Cohesion: 0.29
Nodes (7): expectCsv(), expectJson(), sortKeys(), stableJson(), csvLines(), describeExporterContract(), expectCsv()

### Community 76 - "Community 76"
Cohesion: 0.36
Nodes (6): deliver(), participantJoined(), saveRoom(), toPersisted(), CreateTeamRoomResult, defaultRoomSettings()

### Community 77 - "Community 77"
Cohesion: 0.22
Nodes (5): inviteAt(), must(), NOW, missingShell, root

### Community 78 - "Community 78"
Cohesion: 0.25
Nodes (8): @fibonaipe/domain, dependencies, @fibonaipe/domain@*, exports, name, private, type, version

### Community 79 - "Community 79"
Cohesion: 0.22
Nodes (8): ../../tsconfig.base.json, compilerOptions, composite, outDir, rootDir, exclude, extends, include

### Community 80 - "Community 80"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 81 - "Community 81"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 82 - "Community 82"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 83 - "Community 83"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 86 - "Community 86"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 89 - "Community 89"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 91 - "Community 91"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 92 - "Community 92"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 93 - "Community 93"
Cohesion: 0.36
Nodes (6): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), serverEnvSchema

### Community 94 - "Community 94"
Cohesion: 0.43
Nodes (7): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf()

### Community 95 - "Community 95"
Cohesion: 0.25
Nodes (4): DeleteHoliday, ListHolidays, SaveHoliday, TeamInput

### Community 96 - "Community 96"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 99 - "Community 99"
Cohesion: 0.38
Nodes (6): guardedWindows, HappyDomSettings, HappyDomWindow, installLoopbackGuard(), isTestLoopback(), resolveFetchUrl()

### Community 101 - "Community 101"
Cohesion: 0.43
Nodes (3): describeRateLimiterContract(), expectAppError(), RateLimiterContractHarness

### Community 102 - "Community 102"
Cohesion: 0.38
Nodes (3): MembershipBuilder, member(), must()

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): purityBan, @eslint/js@^9.39.1, typescript-eslint@^8.46.4, @eslint/js, typescript-eslint

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (4): dependencies, zod@1.0.0, zod, name

### Community 110 - "Community 110"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (4): save(), base(), item(), permissions()

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Community 13` to `Community 1`, `Community 4`, `Community 5`, `Community 8`, `Community 10`, `Community 14`, `Community 15`, `Community 17`, `Community 19`, `Community 22`, `Community 24`, `Community 30`, `Community 31`, `Community 32`, `Community 35`, `Community 36`, `Community 38`, `Community 39`, `Community 41`, `Community 42`, `Community 44`, `Community 47`, `Community 48`, `Community 50`, `Community 51`, `Community 53`, `Community 54`, `Community 56`, `Community 57`, `Community 61`, `Community 62`, `Community 75`, `Community 77`, `Community 94`, `Community 101`, `Community 102`, `Community 108`, `Community 114`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06493506493506493 - nodes in this community are weakly interconnected._
- **Why does `Result` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 32`, `Community 33`, `Community 36`, `Community 39`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 52`, `Community 55`, `Community 56`, `Community 60`, `Community 61`, `Community 71`, `Community 75`, `Community 76`, `Community 77`, `Community 95`, `Community 101`, `Community 102`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.051251956181533644 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 22`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 32`, `Community 33`, `Community 36`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 48`, `Community 49`, `Community 52`, `Community 55`, `Community 56`, `Community 60`, `Community 61`, `Community 71`, `Community 75`, `Community 76`, `Community 77`, `Community 95`, `Community 101`, `Community 102`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07281772953414745 - nodes in this community are weakly interconnected._