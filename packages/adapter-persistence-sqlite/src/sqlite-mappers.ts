import { type TeamId, type TeamRole, type UserId } from "@fibonaipe/domain";
import type { AggregatedHistoryRecord, EstimateAuditRecord, IdempotencyRecord, PersistedInviteRecord, PersistedMembershipRecord, PersistedRoomItem, PersistedRoomRecord, PersistedSprintRecord, PersistedTeamRecord, PersistedUserRecord } from "@fibonaipe/application";

export function roomFromRow(row: Record<string, unknown>): PersistedRoomRecord {
  return {
    id: text(row, "id") as PersistedRoomRecord["id"],
    code: text(row, "code") as PersistedRoomRecord["code"],
    name: text(row, "name"),
    kind: kindOf(text(row, "kind")),
    teamId: row.team_id === null ? null : (text(row, "team_id") as PersistedRoomRecord["teamId"]),
    status: statusOf(text(row, "status")),
    version: integer(row, "version"),
    items: itemsOf(text(row, "items_json")),
    expiresAt: row.expires_at === null ? null : new Date(text(row, "expires_at")),
    lastActivityAt: new Date(text(row, "last_activity_at")),
    ...planningOf(row.planning_json),
  };
}

export function idempotencyFromRow(row: Record<string, unknown>): IdempotencyRecord {
  return {
    actorId: text(row, "actor_id") as IdempotencyRecord["actorId"],
    clientOpId: text(row, "client_op_id") as IdempotencyRecord["clientOpId"],
    processedAt: new Date(text(row, "processed_at")),
  };
}

export function historyFromRow(row: Record<string, unknown>): AggregatedHistoryRecord {
  return applyHistoryDetail(
    {
      id: text(row, "id") as AggregatedHistoryRecord["id"],
      roomId: text(row, "room_id") as AggregatedHistoryRecord["roomId"],
      itemId: text(row, "item_id") as AggregatedHistoryRecord["itemId"],
      roundId: text(row, "round_id") as AggregatedHistoryRecord["roundId"],
      dominantSuit: text(row, "dominant_suit"),
      stats: { voteCount: integer(row, "vote_count"), consensus: integer(row, "consensus") === 1 },
    },
    row.detail_json,
    row.team_id,
  );
}

export function auditFromRow(row: Record<string, unknown>): EstimateAuditRecord {
  return {
    id: text(row, "id") as EstimateAuditRecord["id"],
    roomId: text(row, "room_id") as EstimateAuditRecord["roomId"],
    itemId: text(row, "item_id") as EstimateAuditRecord["itemId"],
    changedBy: text(row, "changed_by") as EstimateAuditRecord["changedBy"],
    at: new Date(text(row, "at")),
    from: row.from_label === null ? null : text(row, "from_label"),
    to: text(row, "to_label"),
  };
}

export function teamFromRow(row: Record<string, unknown>): PersistedTeamRecord {
  return {
    id: text(row, "id") as PersistedTeamRecord["id"],
    name: text(row, "name"),
    organizationId: text(row, "organization_id") as PersistedTeamRecord["organizationId"],
  };
}

export function sprintFromRow(row: Record<string, unknown>): PersistedSprintRecord {
  return {
    id: text(row, "id") as PersistedSprintRecord["id"],
    teamId: text(row, "team_id") as PersistedSprintRecord["teamId"],
    name: text(row, "name"),
    ...(typeof row.state_json === "string" ? { state: reviveDates(JSON.parse(row.state_json) as unknown) as NonNullable<PersistedSprintRecord["state"]> } : {}),
  };
}

export function userFromRow(row: Record<string, unknown>): PersistedUserRecord {
  const status = text(row, "status");
  return {
    id: text(row, "id") as PersistedUserRecord["id"],
    email: text(row, "email"),
    displayName: text(row, "display_name"),
    status: status === "suspended" ? "suspended" : "active",
    isSuperAdmin: integer(row, "is_super_admin") === 1,
    locale: text(row, "locale"),
    theme: text(row, "theme"),
  };
}

export function membershipFromRow(row: Record<string, unknown>): PersistedMembershipRecord {
  return {
    userId: text(row, "user_id") as UserId,
    teamId: text(row, "team_id") as TeamId,
    role: text(row, "role") as TeamRole,
  };
}

export function inviteFromRow(row: Record<string, unknown>): PersistedInviteRecord {
  return {
    id: text(row, "id") as PersistedInviteRecord["id"],
    teamId: text(row, "team_id") as TeamId,
    role: text(row, "role") as TeamRole,
    tokenHash: text(row, "token_hash"),
    expiresAt: new Date(text(row, "expires_at")),
    revokedAt: row.revoked_at === null ? null : new Date(text(row, "revoked_at")),
    acceptedBy: row.accepted_by === null ? null : (text(row, "accepted_by") as UserId),
  };
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

function applyHistoryDetail(base: AggregatedHistoryRecord, detail: unknown, teamId: unknown): AggregatedHistoryRecord {
  const extra = parseHistoryDetail(detail);
  const merged = extra ? { ...base, ...extra } : base;
  if (typeof teamId === "string" && merged.teamId === undefined) {
    return { ...merged, teamId: teamId as AggregatedHistoryRecord["teamId"] };
  }
  return merged;
}

function parseHistoryDetail(detail: unknown): Record<string, unknown> | null {
  if (typeof detail !== "string" || detail.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(detail);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (typeof parsed.estimatedAt === "string") parsed.estimatedAt = new Date(parsed.estimatedAt);
  return parsed;
}

export function planningJson(room: PersistedRoomRecord): string | null {
  return room.planning === undefined ? null : JSON.stringify(room.planning);
}

function planningOf(value: unknown): { planning: PersistedRoomRecord["planning"] } | Record<string, never> {
  if (typeof value !== "string" || value.length === 0) return {};
  return { planning: reviveDates(JSON.parse(value) as unknown) as PersistedRoomRecord["planning"] };
}

function reviveDates(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return new Date(value);
  if (Array.isArray(value)) return value.map((entry) => reviveDates(entry));
  if (!isRecord(value)) return value;
  const copy: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) copy[key] = reviveDates(child);
  return copy;
}

function itemsOf(json: string): PersistedRoomItem[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("sqlite room items are malformed");
  return parsed.map((item) => {
    if (!isRecord(item)) throw new Error("sqlite room item is malformed");
    return { id: text(item, "id") as PersistedRoomItem["id"], title: text(item, "title") };
  });
}

function kindOf(value: string): PersistedRoomRecord["kind"] {
  if (value === "guest" || value === "team") return value;
  throw new Error("sqlite room kind is malformed");
}

function statusOf(value: string): PersistedRoomRecord["status"] {
  if (value === "open" || value === "closed") return value;
  throw new Error("sqlite room status is malformed");
}

export function asRecords(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => {
    if (!isRecord(row)) throw new Error("sqlite row is malformed");
    return row;
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`sqlite column ${key} is malformed`);
  return value;
}

export function integer(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`sqlite column ${key} is malformed`);
  return value;
}
