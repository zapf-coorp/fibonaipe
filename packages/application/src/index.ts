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
  PersistedInviteRecord,
  PersistedMembershipRecord,
  PersistedRoomItem,
  PersistedRoomRecord,
  PersistedSprintRecord,
  PersistedTeamRecord,
  PersistedUserRecord,
  RoomRepository,
  SprintRepository,
  TeamRepository,
  InviteRepository,
  MembershipRepository,
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
export type { UseCaseDependencies } from "./use-cases/room-session.js";
export { CreateRoom, type CreateRoomInput, type CreateRoomResult } from "./use-cases/rooms/create-room.js";
export { JoinRoom, type JoinRoomInput, type JoinRoomResult } from "./use-cases/rooms/join-room.js";
export {
  ReconnectParticipant,
  type ReconnectParticipantInput,
  type ReconnectParticipantResult,
} from "./use-cases/rooms/reconnect-participant.js";
export { Heartbeat, type HeartbeatInput, type HeartbeatResult } from "./use-cases/rooms/heartbeat.js";
export { PurgeExpiredRooms, type PurgeExpiredRoomsResult } from "./use-cases/rooms/purge-expired-rooms.js";
export { ExportRoomSummary, type ExportRoomSummaryInput } from "./use-cases/rooms/export-room-summary.js";
export {
  CloseRoom,
  GetRoomSnapshot,
  TransferHost,
  UpdateRoomSettings,
  type GetRoomSnapshotInput,
  type GetRoomSnapshotResult,
  type RoomActorInput,
  type TransferHostInput,
  type UpdateRoomSettingsInput,
} from "./use-cases/rooms/room-commands.js";
export {
  AddItem,
  DeferItem,
  ImportItems,
  RemoveItem,
  ReorderItems,
  SetCurrentItem,
  SkipItem,
  type AddItemInput,
  type ImportItemsInput,
  type ItemTargetInput,
  type ReorderItemsInput,
} from "./use-cases/items/item-commands.js";
export {
  CastVote,
  NewRound,
  RetractVote,
  RevealRound,
  SetFinalEstimate,
  type CastVoteInput,
  type FinalEstimateInput,
  type NewRoundInput,
  type RetractVoteInput,
} from "./use-cases/voting/voting-commands.js";
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
export { CompleteSignIn, type CompleteSignInInput, type CompleteSignInResult } from "./use-cases/identity/complete-sign-in.js";
export { DeleteAccount, type DeleteAccountInput } from "./use-cases/identity/delete-account.js";
export { LinkGuestToAccount, type LinkGuestToAccountInput, type LinkGuestToAccountResult } from "./use-cases/identity/link-guest-to-account.js";
export { SendMagicLink, type SendMagicLinkInput } from "./use-cases/identity/send-magic-link.js";
export { SuspendUser, type SuspendUserInput } from "./use-cases/identity/suspend-user.js";
export { AcceptInvite, type AcceptInviteInput, type AcceptInviteResult } from "./use-cases/teams/accept-invite.js";
export { ChangeMemberRole, type ChangeMemberRoleInput } from "./use-cases/teams/change-member-role.js";
export { ClaimRoom, type ClaimRoomInput, type ClaimRoomResult } from "./use-cases/teams/claim-room.js";
export { CreateInvite, type CreateInviteInput, type CreateInviteResult } from "./use-cases/teams/create-invite.js";
export { CreateTeam, type CreateTeamInput, type CreateTeamResult } from "./use-cases/teams/create-team.js";
export { CreateTeamRoom, type CreateTeamRoomInput, type CreateTeamRoomResult } from "./use-cases/teams/create-team-room.js";
export { RemoveMember, type RemoveMemberInput } from "./use-cases/teams/remove-member.js";
