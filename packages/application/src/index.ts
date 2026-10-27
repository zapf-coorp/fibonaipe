export const applicationPackage = "@fibonaipe/application" as const;

export type { Clock } from "./ports/clock.port.js";
export type { IdGenerator } from "./ports/id-generator.port.js";
export type {
  AggregatedHistoryRecord,
  AggregatedRoundStats,
  EstimateAuditRecord,
  HistoryQuery,
  HistoryRepository,
  IdempotencyRecord,
  IdempotencyRepository,
  Persistence,
  PersistedRoomItem,
  PersistedRoomRecord,
  PersistedSprintRecord,
  PersistedTeamRecord,
  PersistedUserRecord,
  RoomRepository,
  SprintRepository,
  TeamRepository,
  TransactionOptions,
  TransactionRepos,
  UserRepository,
} from "./ports/persistence.port.js";
export type {
  RealtimeClient,
  RealtimeConnectionState,
  RealtimeConnectionStatus,
  RealtimePublisher,
  RealtimeSubscription,
  RealtimeSubscriptionHandlers,
  VersionGapInfo,
} from "./ports/realtime.port.js";
export type { AuthenticatedIdentity, AuthProvider } from "./ports/auth-provider.port.js";
export type {
  ExternalEstimateRef,
  ImportedBacklogBatch,
  ImportedItemCandidate,
  ImportRowWarning,
  IssueTracker,
  IssueTrackerImportInput,
  IssueTrackerProvider,
} from "./ports/issue-tracker.port.js";
export type { CsvExportInput, ExportArtifact, Exporter, JsonExportInput } from "./ports/exporter.port.js";
export type { RateLimiter, RateLimitRule, RateLimitStatus } from "./ports/rate-limiter.port.js";
export type { CryptoVault } from "./ports/crypto-vault.port.js";
export type { ErrorReporter, LogEntry, StructuredLogger } from "./ports/logger.port.js";
export type {
  HostTransferredPayload,
  ItemEstimateFinalizedPayload,
  ItemQueueUpdatedPayload,
  ParticipantDisconnectedPayload,
  ParticipantJoinedPayload,
  ParticipantUpdatedPayload,
  RoomClaimedPayload,
  RoomEvent,
  RoomEventEnvelope,
  RoomSettingsUpdatedPayload,
  RoundRevealedPayload,
  RoundStartedPayload,
  TimerUpdatedPayload,
  VoteChangedPayload,
} from "./projections/events.js";
