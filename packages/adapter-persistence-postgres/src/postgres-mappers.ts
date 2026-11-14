import { type HistoryEntryId, type InviteId, type ItemId, type RoomCode, type RoomId, type RoundId, type SprintId, type TeamId, type TeamRole, type UserId } from "@fibonaipe/domain";
import type { AggregatedHistoryRecord, PersistedInviteRecord, PersistedMembershipRecord, PersistedRoomRecord, PersistedSprintRecord, PersistedUserRecord } from "@fibonaipe/application";

export interface RoomRow {
  id: string;
  code: string;
  name: string;
  kind: string;
  team_id: string | null;
  status: string;
  version: number | string;
  planning_json: unknown;
  expires_at: Date | string | null;
  last_activity_at: Date | string;
}

export interface ItemRow {
  id: string;
  title: string;
}

export interface HistoryRow {
  id: string;
  room_id: string;
  item_id: string;
  round_id: string;
  dominant_suit: string;
  vote_count: number | string;
  consensus: boolean;
  team_id: string | null;
  detail_json: string | null;
}

export function mapSprint(row: { id: string; team_id: string; name: string; state_json: string | null }): PersistedSprintRecord {
  const state = row.state_json === null ? undefined : JSON.parse(row.state_json, (key: string, value: unknown) =>
    key === "doneAt" && typeof value === "string" ? new Date(value) : value) as PersistedSprintRecord["state"];
  return { id: row.id as SprintId, teamId: row.team_id as TeamId, name: row.name, ...(state === undefined ? {} : { state }) };
}

export interface MembershipRow {
  user_id: string;
  team_id: string;
  role: string;
}

export interface InviteRow {
  id: string;
  team_id: string;
  role: string;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  accepted_by: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  status: string;
  is_super_admin: boolean;
  locale: string;
  theme: string;
}

export function mapMembership(row: MembershipRow): PersistedMembershipRecord {
  return { userId: row.user_id as UserId, teamId: row.team_id as TeamId, role: row.role as TeamRole };
}

export function mapInvite(row: InviteRow): PersistedInviteRecord {
  return {
    id: row.id as InviteId,
    teamId: row.team_id as TeamId,
    role: row.role as TeamRole,
    tokenHash: row.token_hash,
    expiresAt: asDate(row.expires_at),
    revokedAt: row.revoked_at === null ? null : asDate(row.revoked_at),
    acceptedBy: row.accepted_by === null ? null : (row.accepted_by as UserId),
  };
}

export function mapUser(row: UserRow): PersistedUserRecord {
  return {
    id: row.id as UserId,
    email: row.email,
    displayName: row.display_name,
    status: row.status === "suspended" ? "suspended" : "active",
    isSuperAdmin: row.is_super_admin === true,
    locale: row.locale,
    theme: row.theme,
  };
}

export function mapRoom(row: RoomRow, items: readonly ItemRow[]): PersistedRoomRecord {
  const planning = parsePlanningJson(row.planning_json);
  return {
    id: row.id as RoomId,
    code: row.code as RoomCode,
    name: row.name,
    kind: row.kind === "team" ? "team" : "guest",
    teamId: row.team_id === null ? null : (row.team_id as TeamId),
    status: row.status === "closed" ? "closed" : "open",
    version: asNumber(row.version),
    items: items.map((item) => ({ id: item.id as ItemId, title: item.title })),
    expiresAt: row.expires_at === null ? null : asDate(row.expires_at),
    lastActivityAt: asDate(row.last_activity_at),
    ...(planning === undefined ? {} : { planning }),
  };
}

function parsePlanningJson(value: unknown): PersistedRoomRecord["planning"] {
  if (typeof value !== "string" || value.length === 0) return undefined;
  return reviveIsoDates(JSON.parse(value) as unknown) as PersistedRoomRecord["planning"];
}

function reviveIsoDates(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  if (Array.isArray(value)) return value.map((entry) => reviveIsoDates(entry));
  if (typeof value === "object" && value !== null) {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      copy[key] = reviveIsoDates(child);
    }
    return copy;
  }
  return value;
}

export function mapHistory(row: HistoryRow): AggregatedHistoryRecord {
  return applyHistoryDetail(
    {
      id: row.id as HistoryEntryId,
      roomId: row.room_id as RoomId,
      itemId: row.item_id as ItemId,
      roundId: row.round_id as RoundId,
      dominantSuit: row.dominant_suit,
      stats: {
        voteCount: asNumber(row.vote_count),
        consensus: row.consensus,
      },
    },
    row.detail_json,
    row.team_id,
  );
}

const HISTORY_BASE_KEYS = new Set(["id", "roomId", "itemId", "roundId", "dominantSuit", "stats"]);

export function historyDetail(entry: AggregatedHistoryRecord): string | null {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (HISTORY_BASE_KEYS.has(key) || value === undefined) continue;
    extra[key] = value;
  }
  return Object.keys(extra).length === 0 ? null : JSON.stringify(extra);
}

function applyHistoryDetail(base: AggregatedHistoryRecord, detail: string | null, teamId: string | null): AggregatedHistoryRecord {
  const extra = parseHistoryDetail(detail);
  const merged = extra ? { ...base, ...extra } : base;
  if (teamId !== null && merged.teamId === undefined) {
    return { ...merged, teamId: teamId as AggregatedHistoryRecord["teamId"] };
  }
  return merged;
}

function parseHistoryDetail(detail: string | null): Record<string, unknown> | null {
  if (detail === null || detail.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(detail);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (typeof record.estimatedAt === "string") record.estimatedAt = new Date(record.estimatedAt);
  return record;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

export function asNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}
