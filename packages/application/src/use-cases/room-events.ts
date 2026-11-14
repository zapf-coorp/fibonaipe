import { ItemId, ParticipantId, RoomId, RoundId, type PlanningEvent } from "@fibonaipe/domain";
import type { RoomEvent } from "../projections/events.js";

export function mapPlanning(events: readonly PlanningEvent[], roomId: RoomId, version: number): RoomEvent[] {
  const wired: RoomEvent[] = [];
  for (const event of events) {
    const mapped = mapPlanningEvent(event, roomId, version);
    if (mapped) wired.push(mapped);
  }
  return wired;
}

export function participantJoined(roomId: RoomId, version: number, at: string, participantId: ParticipantId): RoomEvent {
  return { type: "participant.joined", roomId, version, at, payload: { participantId } };
}

export function participantUpdated(roomId: RoomId, version: number, at: string, participantId: ParticipantId): RoomEvent {
  return { type: "participant.updated", roomId, version, at, payload: { participantId } };
}

export function hostTransferred(
  roomId: RoomId,
  version: number,
  at: string,
  fromParticipantId: ParticipantId,
  toParticipantId: ParticipantId,
): RoomEvent {
  return {
    type: "host.transferred",
    roomId,
    version,
    at,
    payload: { fromParticipantId, toParticipantId },
  };
}

export function settingsUpdated(roomId: RoomId, version: number, at: string, name: string): RoomEvent {
  return { type: "room.settings_updated", roomId, version, at, payload: { name } };
}

function mapPlanningEvent(event: PlanningEvent, roomId: RoomId, version: number): RoomEvent | null {
  const at = event.at;
  if (event.type === "vote.changed") {
    const participantId = ParticipantId.create(stringField(event.payload, "participantId") ?? "");
    if (!participantId.ok) return null;
    return {
      type: "vote.changed",
      roomId,
      version,
      at,
      payload: { participantId: participantId.value, hasVoted: event.payload.hasVoted === true },
    };
  }
  if (event.type === "round.revealed") {
    const roundId = RoundId.create(stringField(event.payload, "roundId") ?? "");
    if (!roundId.ok) return null;
    return { type: "round.revealed", roomId, version, at, payload: { roundId: roundId.value } };
  }
  if (event.type === "round.started") {
    const roundId = RoundId.create(stringField(event.payload, "roundId") ?? "");
    const itemId = ItemId.create(stringField(event.payload, "itemId") ?? "");
    if (!roundId.ok || !itemId.ok) return null;
    return { type: "round.started", roomId, version, at, payload: { roundId: roundId.value, itemId: itemId.value } };
  }
  if (event.type === "timer.updated") {
    const endsAt = event.payload.endsAt;
    return {
      type: "timer.updated",
      roomId,
      version,
      at,
      payload: { endsAt: endsAt === null || typeof endsAt === "string" ? endsAt : null },
    };
  }
  if (event.type === "item.queue_updated") {
    const rawIds = stringList(event.payload.itemIds);
    if (rawIds === null) return null;
    const itemIds = [];
    for (const raw of rawIds) {
      const itemId = ItemId.create(raw);
      if (!itemId.ok) return null;
      itemIds.push(itemId.value);
    }
    return { type: "item.queue_updated", roomId, version, at, payload: { itemIds } };
  }
  if (event.type === "item.estimate_finalized") {
    const itemId = ItemId.create(stringField(event.payload, "itemId") ?? "");
    if (!itemId.ok) return null;
    return { type: "item.estimate_finalized", roomId, version, at, payload: { itemId: itemId.value } };
  }
  return null;
}

function stringField(payload: Readonly<Record<string, unknown>>, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    ids.push(entry);
  }
  return ids;
}
