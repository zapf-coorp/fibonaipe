import type {
  AppError,
  ClientOpId,
  EstimateAuditId,
  HistoryEntryId,
  ItemId,
  ParticipantId,
  Result,
  RoomCode,
  RoomId,
  RoundId,
  SprintId,
  TeamId,
  UserId,
} from "@fibonaipe/domain";

export interface PersistedRoomItem {
  readonly id: ItemId;
  readonly title: string;
}

export interface PersistedRoomRecord {
  readonly id: RoomId;
  readonly code: RoomCode;
  readonly name: string;
  readonly kind: "guest" | "team";
  readonly teamId: TeamId | null;
  readonly status: "open" | "closed";
  readonly version: number;
  readonly items: readonly PersistedRoomItem[];
  readonly expiresAt: Date | null;
  readonly lastActivityAt: Date;
}

export interface IdempotencyRecord {
  readonly actorId: ParticipantId;
  readonly clientOpId: ClientOpId;
  readonly processedAt: Date;
}

export interface AggregatedRoundStats {
  readonly voteCount: number;
  readonly consensus: boolean;
}

export interface AggregatedHistoryRecord {
  readonly id: HistoryEntryId;
  readonly roomId: RoomId;
  readonly itemId: ItemId;
  readonly roundId: RoundId;
  readonly dominantSuit: string;
  readonly stats: AggregatedRoundStats;
}

export interface EstimateAuditRecord {
  readonly id: EstimateAuditId;
  readonly roomId: RoomId;
  readonly itemId: ItemId;
  readonly changedBy: ParticipantId;
  readonly at: Date;
  readonly from: string | null;
  readonly to: string;
}

export interface PersistedTeamRecord {
  readonly id: TeamId;
  readonly name: string;
}

export interface PersistedSprintRecord {
  readonly id: SprintId;
  readonly teamId: TeamId;
  readonly name: string;
}

export interface PersistedUserRecord {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
}

export interface HistoryQuery {
  readonly roomId: RoomId;
  readonly itemId?: ItemId;
}

export interface RoomRepository {
  findById(id: RoomId): Promise<PersistedRoomRecord | null>;
  findByCode(code: RoomCode): Promise<PersistedRoomRecord | null>;
  save(room: PersistedRoomRecord): Promise<void>;
  deleteExpiredAnonymous(before: Date): Promise<number>;
}

export interface IdempotencyRepository {
  hasProcessed(actorId: ParticipantId, clientOpId: ClientOpId, now: Date): Promise<boolean>;
  record(actorId: ParticipantId, clientOpId: ClientOpId, now: Date): Promise<void>;
}

export interface HistoryRepository {
  appendAggregated(entry: AggregatedHistoryRecord): Promise<void>;
  query(filter: HistoryQuery): Promise<readonly AggregatedHistoryRecord[]>;
  findById(id: HistoryEntryId): Promise<AggregatedHistoryRecord | null>;
  saveAudit(audit: EstimateAuditRecord): Promise<void>;
}

export interface TeamRepository {
  findById(id: TeamId): Promise<PersistedTeamRecord | null>;
  save(team: PersistedTeamRecord): Promise<void>;
}

export interface SprintRepository {
  findById(id: SprintId): Promise<PersistedSprintRecord | null>;
  save(sprint: PersistedSprintRecord): Promise<void>;
}

export interface UserRepository {
  findById(id: UserId): Promise<PersistedUserRecord | null>;
  save(user: PersistedUserRecord): Promise<void>;
}

export interface TransactionRepos {
  readonly rooms: RoomRepository;
  readonly idempotency: IdempotencyRepository;
  readonly teams: TeamRepository;
  readonly history: HistoryRepository;
  readonly sprints: SprintRepository;
  readonly users: UserRepository;
}

export interface TransactionOptions {
  readonly lockRoomId?: RoomId;
  readonly isolation?: "read_committed" | "serializable";
}

export interface Persistence {
  transaction<T>(
    options: TransactionOptions,
    work: (repos: TransactionRepos) => Promise<Result<T, AppError>>,
  ): Promise<Result<T, AppError>>;
  ping(): Promise<Result<{ ok: true }, AppError>>;
}
