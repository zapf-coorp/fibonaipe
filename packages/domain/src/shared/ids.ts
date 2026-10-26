import { createAppError, type AppError } from "./app-error.js";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "./constants.js";
import { err, ok, type Result } from "./result.js";

export type Brand<K, TBrand extends string> = K & { readonly __brand: TBrand };

export type RoomId = Brand<string, "RoomId">;
export type RoomCode = Brand<string, "RoomCode">;
export type ParticipantId = Brand<string, "ParticipantId">;
export type UserId = Brand<string, "UserId">;
export type TeamId = Brand<string, "TeamId">;
export type OrganizationId = Brand<string, "OrganizationId">;
export type InviteId = Brand<string, "InviteId">;
export type ItemId = Brand<string, "ItemId">;
export type RoundId = Brand<string, "RoundId">;
export type SprintId = Brand<string, "SprintId">;
export type HolidayId = Brand<string, "HolidayId">;
export type HistoryEntryId = Brand<string, "HistoryEntryId">;
export type EstimateAuditId = Brand<string, "EstimateAuditId">;
export type ClientOpId = Brand<string, "ClientOpId">;

function hasControlOrWhitespace(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 32 || code === 127) return true;
  }
  return false;
}

export function createEntityId<B extends string>(
  raw: string,
  brand: B,
  fieldName?: string,
): Result<Brand<string, B>, AppError> {
  if (typeof raw !== "string" || raw.length < 1 || raw.length > 64 || hasControlOrWhitespace(raw)) {
    return err(createAppError("VALIDATION", "errors.id.invalid", { field: fieldName ?? brand }));
  }
  return ok(raw as Brand<string, B>);
}

function entityFactory<B extends string>(brand: B) {
  return {
    create(raw: string): Result<Brand<string, B>, AppError> {
      return createEntityId(raw, brand, brand);
    },
  };
}

export const RoomId = entityFactory("RoomId");
export const ParticipantId = entityFactory("ParticipantId");
export const UserId = entityFactory("UserId");
export const TeamId = entityFactory("TeamId");
export const OrganizationId = entityFactory("OrganizationId");
export const InviteId = entityFactory("InviteId");
export const ItemId = entityFactory("ItemId");
export const RoundId = entityFactory("RoundId");
export const SprintId = entityFactory("SprintId");
export const HolidayId = entityFactory("HolidayId");
export const HistoryEntryId = entityFactory("HistoryEntryId");
export const EstimateAuditId = entityFactory("EstimateAuditId");
export const ClientOpId = entityFactory("ClientOpId");

export const RoomCode = {
  create(raw: string): Result<RoomCode, AppError> {
    const normalized = raw.trim().toUpperCase();
    if (normalized.length !== ROOM_CODE_LENGTH) {
      return err(createAppError("VALIDATION", "errors.room_code.invalid"));
    }
    for (const char of normalized) {
      if (!ROOM_CODE_ALPHABET.includes(char)) {
        return err(createAppError("VALIDATION", "errors.room_code.invalid"));
      }
    }
    return ok(normalized as RoomCode);
  },
};
