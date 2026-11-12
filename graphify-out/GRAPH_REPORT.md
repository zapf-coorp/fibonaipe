# Graph Report - fibonaipe  (2026-11-11)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2825 nodes · 8966 edges · 139 communities (112 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 130 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `05ffa4ad`
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
- Community 100
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
- Community 112
- Community 113
- Community 114
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132
- Community 133

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

## Communities (139 total, 27 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (56): OwnVote, ProjectedVote, actorOf(), cardsByScale, seatsByRoom, SPECIAL_BY_LABEL, SUIT_BY_KIND, TEAM_ROLES (+48 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (50): computeAccuracy(), ForecastAccuracy, ForecastAccuracyPoint, ForecastAccuracyRecord, ClosedSprintForecastInput, ForecastInsufficient, ForecastOk, ForecastReportBuilder (+42 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (31): IssueTracker, AuditRow, HistoryRow, means(), seatsOf(), readUser(), readTeam(), readUser() (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (44): EstimateAudit, TableOk, ACTIONS, asModule(), AuditView, CARD_LABELS, CODE, Command (+36 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (11): RolledBack, AuthProvider, CryptoVault, PurgeExpiredRoomsResult, PlanningTableApi, RoomView, AppError, Result (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (23): inviteAt(), must(), NOW, adminCount(), losesOnlyAdmin(), TEAM_ROLES, member(), must() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (48): applyHistoryDetail(), asRecords(), auditFromRow(), cloneData(), cloneOptional(), createRepos(), createSqlitePersistence(), DirtySet (+40 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (38): createRoomUseCases(), RoomUseCases, teamRoom(), currentItem(), AddItem, DeferItem, ImportItems, RemoveItem (+30 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (17): unavailableAuth(), parseBody(), access(), recalculate(), TeamInput, computeForecast(), Invite, normalizeUserEmail() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.05
Nodes (50): applicationPackage, IdempotencyRepository, HostTransferredPayload, ItemEstimateFinalizedPayload, ItemQueueUpdatedPayload, ParticipantDisconnectedPayload, ParticipantJoinedPayload, ParticipantUpdatedPayload (+42 more)

### Community 10 - "Community 10"
Cohesion: 0.10
Nodes (36): RecordAggregatedHistory, ActorInput, AddItemInput, CommandResult, ImportItemsInput, ItemTargetInput, ReorderItemsInput, runItem() (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (19): DeleteAccount, FIBONACCI, AcceptInviteInput, issuedAtFromExpiry(), membershipFrom(), MVP_ORGANIZATION_ID, organizationId(), parseRole() (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.07
Nodes (43): enqueueVote(), ensureOnlineFlush(), flushVotes(), queue, QueuedVote, ConnectionPhase, getConnectionStatus(), listeners (+35 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (33): Catalog, catalogs, formatDate(), formatNumber(), I18nContext, I18nContextValue, I18nProvider(), interpolate() (+25 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (11): Item, cardByLabel(), contextOf(), isOnline(), numericCard(), planningEvent(), PlanningTable, predominantSuit() (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.07
Nodes (35): callbackSchema, capacitySchema, clientIp(), doneSchema, emailSchema, fail(), holidaySchema, inviteSchema (+27 more)

### Community 16 - "Community 16"
Cohesion: 0.07
Nodes (34): LinkGuestToAccount, actorOf(), addMilliseconds(), authorize(), codeTails, contextOf(), CREATE_ROOM_RULE, deliver() (+26 more)

### Community 17 - "Community 17"
Cohesion: 0.06
Nodes (28): applyHistoryDetail(), applyPostgresMigrations(), asDate(), asNumber(), createRepos(), findRoom(), findRoomByCode(), HISTORY_BASE_KEYS (+20 more)

### Community 18 - "Community 18"
Cohesion: 0.10
Nodes (31): MemoryStore, AggregatedHistoryRecord, AggregatedRoundStats, EstimateAuditRecord, HistoryQuery, HolidayRepository, IdempotencyRecord, InviteRepository (+23 more)

### Community 19 - "Community 19"
Cohesion: 0.07
Nodes (28): JoinRoomInput, CreateTeamRoomInput, hasControlCharacter(), nicknameKey(), nullableSession(), nullableText(), nullableUserId(), ParticipantMode (+20 more)

### Community 20 - "Community 20"
Cohesion: 0.08
Nodes (14): TransactionRepos, dominantSuit(), HistoryEntryBuilder, HistoryEntry, HistoryEntryProps, FORBIDDEN_KEYS, forbiddenKeys(), id() (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (33): EstimateDialog(), activeCards(), currentItem(), DEFAULT_CARDS, finalEstimate(), isRecord(), ItemRow, itemsOf() (+25 more)

### Community 22 - "Community 22"
Cohesion: 0.07
Nodes (19): MembershipRepository, SprintRepository, TeamRepository, TeamTaskRepository, SeedRow, AcceptInviteResult, inviteRecord(), ChangeMemberRoleInput (+11 more)

### Community 23 - "Community 23"
Cohesion: 0.09
Nodes (32): arm(), beginErrorFlash(), listen(), showErrorFlash(), CheckIcon(), ChevronIcon(), CloseIcon(), MemberRow (+24 more)

### Community 25 - "Community 25"
Cohesion: 0.11
Nodes (30): matrixFor(), paintFinder(), QrCode(), createRoom(), FAN, FIBONACCI, HomePage(), Phase (+22 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (24): AppHeader(), initials(), LOCALE_LABEL, LocaleSelector(), ProfileMenu(), THEME_CHOICES, ThemeToggle(), useOwnSeat() (+16 more)

### Community 27 - "Community 27"
Cohesion: 0.10
Nodes (23): ExternalEstimateRef, ImportedBacklogBatch, ImportedItemCandidate, ImportRowWarning, IssueTrackerImportInput, IssueTrackerProvider, StoredItem, isHttpUrl() (+15 more)

### Community 28 - "Community 28"
Cohesion: 0.09
Nodes (30): dependencies, @fibonaipe/adapter-auth-devfake@*, @fibonaipe/adapter-exporter-csvjson@*, @fibonaipe/adapter-issuetracker-manual@*, @fibonaipe/adapter-persistence-postgres@*, @fibonaipe/adapter-persistence-sqlite@*, @fibonaipe/adapter-system@*, @fibonaipe/application@* (+22 more)

### Community 29 - "Community 29"
Cohesion: 0.09
Nodes (23): assertVoteFree(), at(), branded(), buildRoom(), DomainEvent, EPOCH, findKey(), here (+15 more)

### Community 30 - "Community 30"
Cohesion: 0.11
Nodes (13): apply(), branded(), buildItem(), currentTable(), makeRoom(), must(), open(), PlanningTable (+5 more)

### Community 31 - "Community 31"
Cohesion: 0.17
Nodes (6): normalizeNickname(), Participant, domainEvent(), isOnline(), JoinOk, Room

### Community 32 - "Community 32"
Cohesion: 0.10
Nodes (3): submit(), mutate(), Sprint

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (25): actorId(), addItemSchema, clientIp(), clientOpId, createSchema, estimateSchema, fail(), importSchema (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.09
Nodes (12): UserRepository, MembershipBuilder, STATUSES, THEMES, User, UserBuilder, UserProps, UserStatus (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.07
Nodes (27): compilerOptions, declaration, declarationMap, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, lib, module (+19 more)

### Community 36 - "Community 36"
Cohesion: 0.10
Nodes (26): react-dom@^19.0.0, devDependencies, eslint@^9.39.1, fast-check@^4.3.0, happy-dom@^21.0.4, react@^19.3.1, react-dom@^19.3.1, @testing-library/react@^16.3.3 (+18 more)

### Community 37 - "Community 37"
Cohesion: 0.24
Nodes (24): nextClientOpId(), ErrorMessageKey, errorMessageKeys, messageKeyFor(), addQueueItem(), addQueueItems(), castVote(), confirmEstimate() (+16 more)

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (16): CsvExportInput, ExportArtifact, JsonExportInput, completeIdentity(), persistSignedInUser(), finishMutation(), LoadedRoom, readLoaded() (+8 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (25): ACTIONS, actorOf(), contextOf(), currentItemCache, currentItemOf(), currentRoundOf(), deniedPermissions(), estimatedItemOf() (+17 more)

### Community 40 - "Community 40"
Cohesion: 0.16
Nodes (20): accountUser(), AppContainer, dependenciesOf(), sessionUser(), fail(), jsonWithSession(), loginSchema, okJson() (+12 more)

### Community 41 - "Community 41"
Cohesion: 0.11
Nodes (19): assertTouchTarget(), boot(), closed(), guardLoopback(), HappyDom, HappyDomSettings, HOST_CARD, installFetch() (+11 more)

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (13): JoinMode, JoinRoomPage(), submitJoin(), touchTargetStyle, Deck(), SpecialIcon(), SPECIALS, SUIT_GLYPH (+5 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (14): DEV_AUTH_USERS, DevAuthMethod, DevAuthProvider, DevAuthSignInResult, DevAuthUser, DevFakeAuthOptions, DevUserRole, GoogleCode (+6 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (17): hono@^4.6.14, app, createApp(), crossOriginDenied(), MUTATING, originFromInit(), devApp, errorResponse() (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.14
Nodes (13): errorBody(), guestCookie(), isRecord(), Payload, send(), sessionCookie(), teamIdOf(), testApp() (+5 more)

### Community 46 - "Community 46"
Cohesion: 0.12
Nodes (9): AuthenticatedIdentity, AuthProviderContractHarness, describeAuthProviderContract(), expectError(), expectIdentity(), MagicLink, normalizeEmail(), StoredUser (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.19
Nodes (14): CreateSprint, CreateSprintInput, DeleteHoliday, ActivateSprint, CloseSprint, GetForecastAccuracy, GetSprintForecast, GetSprintReport (+6 more)

### Community 48 - "Community 48"
Cohesion: 0.17
Nodes (11): ConnectionStatus, installColorScheme(), clearMissingFlags(), takeMissing(), boot(), inlineScripts(), runBootstrap(), assertTouchTarget() (+3 more)

### Community 49 - "Community 49"
Cohesion: 0.17
Nodes (4): DevFakeAuthProvider, normalizeEmail(), slug(), harness()

### Community 50 - "Community 50"
Cohesion: 0.16
Nodes (10): createRealtimeClient(), RealtimeClientDeps, RealtimeProviderClient, assertNoCardBeforeReveal(), SECRET_KEYS, ThrowingProvider, walk(), RoomEvent (+2 more)

### Community 51 - "Community 51"
Cohesion: 0.17
Nodes (7): ErrorReporter, LogEntry, StructuredLogger, allowListed(), FakeLogger, FORBIDDEN_LOG_KEYS, StoredLog

### Community 52 - "Community 52"
Cohesion: 0.13
Nodes (18): aggregated_history, estimate_audits, idempotency_keys, items, participants, rooms, rounds, schema_migrations (+10 more)

### Community 53 - "Community 53"
Cohesion: 0.21
Nodes (16): Persistence, deferred(), describePersistenceContract(), errNotFound(), errResult(), hasProcessed(), HistoryHidesIndividualVotes, historyRecord() (+8 more)

### Community 54 - "Community 54"
Cohesion: 0.18
Nodes (8): RealtimePublisher, RealtimeSubscription, RealtimeSubscriptionHandlers, VersionGapInfo, UseCaseDependencies, RoomId, FakeRealtime, Subscription

### Community 55 - "Community 55"
Cohesion: 0.23
Nodes (15): signIn(), append(), BASE, mustId(), row(), signIn(), teamOf(), signIn() (+7 more)

### Community 56 - "Community 56"
Cohesion: 0.16
Nodes (14): CreatedRoom, createRoom(), ErrorPayload, firstItemId(), isRecord(), participantsOf(), readPayload(), requestHeaders() (+6 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (11): RealtimeClient, describeRealtimeContract(), must(), participant, publish(), RealtimeContractHarness, roundId, roundRevealed() (+3 more)

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (11): authProviderFor(), createAppContainer(), persistenceFor(), pollingPublisher(), readDatabaseUrl(), devApp(), Payload, createDevFakeAuthProvider() (+3 more)

### Community 59 - "Community 59"
Cohesion: 0.18
Nodes (16): useLiveAnnouncer(), applyResolvedTheme(), isProjectorRoute(), isThemeMode(), prefersDark(), readStoredMode(), ResolvedTheme, resolveTheme() (+8 more)

### Community 60 - "Community 60"
Cohesion: 0.15
Nodes (11): App(), bootGeneration, bootScope, queryClient, rootElement, LiveAnnouncerContext, LiveAnnouncerContextValue, LiveAnnouncerProvider() (+3 more)

### Community 61 - "Community 61"
Cohesion: 0.21
Nodes (9): sortKeys(), expectCsv(), expectJson(), sortKeys(), stableJson(), Exporter, csvLines(), describeExporterContract() (+1 more)

### Community 62 - "Community 62"
Cohesion: 0.14
Nodes (10): adapterSources(), errResult(), hasProcessed(), NATIVE_MODULES, packageManifests(), readRoom(), REQUIRED_TABLES, saveUnlocked() (+2 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (11): ERROR_KEYS, flattenCatalog(), SHELL_KEYS, dayOptions, LocaleProbe(), oneDecimal, renderLocale(), renderTheme() (+3 more)

### Community 64 - "Community 64"
Cohesion: 0.27
Nodes (14): cellAt(), columnsOf(), CsvColumns, detectDelimiter(), importCsv(), importLimit(), importText(), lineCount() (+6 more)

### Community 65 - "Community 65"
Cohesion: 0.26
Nodes (9): createIdGenerator(), encodeBase32(), newId(), newRoomCode(), newToken(), sha256(), ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH (+1 more)

### Community 66 - "Community 66"
Cohesion: 0.15
Nodes (11): ActorKind, isInstanceAdmin(), isTeamAdmin(), MATRIX, PolicyAction, PolicyActor, PolicyContext, PolicyRule (+3 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (12): Action, ACTIONS, Actor, actor(), allowed(), cases, Flags, loadCan() (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.17
Nodes (9): devDependencies, @types/react@^19.3.0, @types/react-dom@^19.3.0, vite@^6.0.6, @vitejs/plugin-react@^4.3.4, @types/react, @types/react-dom, vite (+1 more)

### Community 69 - "Community 69"
Cohesion: 0.27
Nodes (8): dashboardRoute, ForecastCard(), download(), ForecastChart(), exportFromServer(), ForecastDashboard(), submit(), ForecastResult

### Community 70 - "Community 70"
Cohesion: 0.23
Nodes (6): createInMemoryRateLimiter(), RateLimiter, RateLimitRule, RateLimitStatus, EMAIL_RULE, IP_RULE

### Community 71 - "Community 71"
Cohesion: 0.29
Nodes (3): RealtimeConnectionState, RealtimeConnectionStatus, FakeRealtimeClient

### Community 72 - "Community 72"
Cohesion: 0.23
Nodes (9): ExportHistory, ExportHistoryInput, HistoryListPage, HistoryListRow, HistoryQueryInput, listRow(), matches(), pageOf() (+1 more)

### Community 73 - "Community 73"
Cohesion: 0.27
Nodes (12): checkCatalogs(), checkSources(), flatten(), hardcodedJsx(), loadCatalog(), localeDir, locales, referencedKeys() (+4 more)

### Community 74 - "Community 74"
Cohesion: 0.29
Nodes (11): serverTime(), timerEndsAt(), bridgeKey, formatClock(), installIntervalBridge(), phaseOf(), remainingMs(), Timer() (+3 more)

### Community 75 - "Community 75"
Cohesion: 0.24
Nodes (8): collectCss(), readJson(), readSource(), repoRoot, darkTokens, expectDecl(), lightTokens, normalize()

### Community 76 - "Community 76"
Cohesion: 0.17
Nodes (11): compilerOptions, composite, jsx, lib, outDir, resolveJsonModule, rootDir, types (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.26
Nodes (6): createSystemClock(), createRedactingLogger(), redact(), RedactingLoggerOptions, SECRET_KEYS, secrets

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (8): defaults, definedOverrides(), globalProcessEnv(), loadServerEnv(), readProcessEnv(), ServerEnv, serverEnvSchema, env

### Community 80 - "Community 80"
Cohesion: 0.18
Nodes (11): scripts, build, check:boundaries, check:bundle, check:i18n, check:licenses, lint, test:e2e (+3 more)

### Community 81 - "Community 81"
Cohesion: 0.20
Nodes (10): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, postgres@^3.4.5, exports, name, private, type (+2 more)

### Community 82 - "Community 82"
Cohesion: 0.18
Nodes (3): DatabaseSync, node:sqlite, SqliteStatement

### Community 86 - "Community 86"
Cohesion: 0.36
Nodes (8): root, layerOf(), NATIVE, scanSourceForViolations(), verifyLicenseText(), verifyWorkspaceBoundaries(), walk(), verifyLicenses()

### Community 87 - "Community 87"
Cohesion: 0.22
Nodes (9): @fibonaipe/application, dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type (+1 more)

### Community 88 - "Community 88"
Cohesion: 0.22
Nodes (3): hasSprintOverlap(), SprintBuilder, build()

### Community 89 - "Community 89"
Cohesion: 0.25
Nodes (8): @fibonaipe/domain, dependencies, @fibonaipe/domain@*, exports, name, private, type, version

### Community 90 - "Community 90"
Cohesion: 0.22
Nodes (8): ../../tsconfig.base.json, compilerOptions, composite, outDir, rootDir, exclude, extends, include

### Community 91 - "Community 91"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 92 - "Community 92"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 93 - "Community 93"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 94 - "Community 94"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 95 - "Community 95"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 96 - "Community 96"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 97 - "Community 97"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 98 - "Community 98"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 99 - "Community 99"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 100 - "Community 100"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 101 - "Community 101"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 102 - "Community 102"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 103 - "Community 103"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 104 - "Community 104"
Cohesion: 0.22
Nodes (8): dependencies, @fibonaipe/application@*, @fibonaipe/domain@*, exports, name, private, type, version

### Community 105 - "Community 105"
Cohesion: 0.22
Nodes (8): compilerOptions, composite, outDir, rootDir, exclude, extends, include, references

### Community 106 - "Community 106"
Cohesion: 0.25
Nodes (5): FORBIDDEN_KEYS, forbiddenKeys(), reveal(), Seat, vote()

### Community 107 - "Community 107"
Cohesion: 0.25
Nodes (7): exports, name, private, scripts, build, type, version

### Community 110 - "Community 110"
Cohesion: 0.38
Nodes (6): guardedWindows, HappyDomSettings, HappyDomWindow, installLoopbackGuard(), isTestLoopback(), resolveFetchUrl()

### Community 112 - "Community 112"
Cohesion: 0.29
Nodes (6): RoomView, StoredRound, ReconnectParticipantResult, RoundView, RoundProps, RoundStats

### Community 113 - "Community 113"
Cohesion: 0.33
Nodes (6): save(), base(), humans(), item(), permissions(), seat()

### Community 114 - "Community 114"
Cohesion: 0.60
Nodes (3): markMissing(), LiveAnnouncerProvider(), useLiveAnnouncer()

### Community 115 - "Community 115"
Cohesion: 0.33
Nodes (5): purityBan, @eslint/js@^9.39.1, typescript-eslint@^8.46.4, @eslint/js, typescript-eslint

### Community 120 - "Community 120"
Cohesion: 0.50
Nodes (4): dependencies, zod@1.0.0, zod, name

### Community 121 - "Community 121"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

### Community 123 - "Community 123"
Cohesion: 0.50
Nodes (3): invites, memberships, organizations

### Community 129 - "Community 129"
Cohesion: 0.67
Nodes (3): engines, node, npm

## Knowledge Gaps
- **1 isolated node(s):** `C:/Users/htzc/.local/bin/graphify-mcp.exe`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 815 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `Community 2` to `Community 0`, `Community 1`, `Community 130`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 12`, `Community 13`, `Community 18`, `Community 20`, `Community 23`, `Community 26`, `Community 27`, `Community 29`, `Community 36`, `Community 41`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 50`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 61`, `Community 62`, `Community 63`, `Community 65`, `Community 67`, `Community 69`, `Community 75`, `Community 77`, `Community 86`, `Community 88`, `Community 106`, `Community 119`, `Community 125`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **What connects `C:/Users/htzc/.local/bin/graphify-mcp.exe` to the rest of the system?**
  _1 weakly-connected nodes found - possible missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05980861244019139 - nodes in this community are weakly interconnected._
- **Why does `useI18n()` connect `Community 26` to `Community 69`, `Community 42`, `Community 74`, `Community 12`, `Community 13`, `Community 21`, `Community 23`, `Community 25`, `Community 63`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05010351966873706 - nodes in this community are weakly interconnected._
- **Why does `AppError` connect `Community 4` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 8`, `Community 10`, `Community 11`, `Community 14`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 38`, `Community 40`, `Community 43`, `Community 44`, `Community 46`, `Community 47`, `Community 49`, `Community 50`, `Community 53`, `Community 54`, `Community 55`, `Community 57`, `Community 61`, `Community 62`, `Community 64`, `Community 70`, `Community 72`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08806963645673323 - nodes in this community are weakly interconnected._