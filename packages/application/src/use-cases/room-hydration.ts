import { ItemBuilder, Participant, ParticipantId, PlanningTable, Room, ScaleBuilder, createAppError, err, ok, parseSuit, type AppError, type Card, type ItemProps, type ItemStatus, type Result, UserId, type RoundProps, type VoteProps } from "@fibonaipe/domain";
import type { PersistedRoomPlanning, PersistedRoomRecord } from "../ports/persistence.port.js";

export interface LoadedRoom {
  readonly room: Room;
  readonly table: PlanningTable;
}

export function itemPropsOf(item: {
  readonly id: string;
  readonly roomId: string;
  readonly teamId: string | null;
  readonly title: string;
  readonly description: string;
  readonly externalUrl: string | null;
  readonly externalKey: string | null;
  readonly position: number;
  readonly status: ItemStatus;
  readonly figureTag: string | null;
  readonly finalEstimate: Card | null;
  readonly finalSuit: string | null;
}): ItemProps {
  return {
    id: item.id,
    roomId: item.roomId,
    teamId: item.teamId,
    title: item.title,
    description: item.description,
    externalUrl: item.externalUrl,
    externalKey: item.externalKey,
    position: item.position,
    status: item.status,
    figureTag: item.figureTag,
    finalEstimate: item.finalEstimate,
    finalSuit: item.finalSuit,
  };
}

export function freshItem(
  room: Room,
  title: string,
  description: string,
  position: number,
  id: string,
  externalUrl: string | null = null,
): Result<ItemProps, AppError> {
  const built = new ItemBuilder()
    .withId(id)
    .withRoomId(room.id)
    .withTeamId(room.teamId)
    .withTitle(title)
    .withDescription(description)
    .withExternalUrl(externalUrl)
    .withPosition(position)
    .build();
  if (!built.ok) return built;
  return ok(itemPropsOf(built.value));
}

export function hydrate(record: PersistedRoomRecord): Result<LoadedRoom, AppError> {
  const planning = planningOf(record);
  if (planning === null) return err(createAppError("VALIDATION"));
  const scale = ScaleBuilder.fibonacci().withId(planning.scaleId).withName(planning.scaleName).build();
  if (!scale.ok) return scale;
  const hostId = ParticipantId.create(planning.hostParticipantId);
  if (!hostId.ok) return hostId;
  const participants = [];
  for (const stored of planning.participants) {
    const id = ParticipantId.create(stored.id);
    if (!id.ok) return id;
    const userId = stored.userId === null ? null : UserId.create(stored.userId);
    if (userId !== null && !userId.ok) return userId;
    participants.push(
      Participant.create({
        id: id.value,
        roomId: record.id,
        userId: userId === null ? null : userId.value,
        guestSessionId: stored.guestSessionId,
        nickname: stored.nickname,
        role: stored.role,
        mode: stored.mode,
        isFacilitator: stored.isFacilitator,
        joinedAt: stored.joinedAt,
        lastSeenAt: stored.lastSeenAt,
        afk: stored.afk,
      }),
    );
  }
  const room = Room.create({
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind,
    teamId: record.teamId,
    hostParticipantId: hostId.value,
    scale: scale.value,
    settings: planning.settings,
    status: record.status,
    version: record.version,
    lastActivityAt: record.lastActivityAt,
    expiresAt: record.expiresAt,
    participants,
  });
  const votes: VoteProps[] = [];
  for (const stored of planning.votes) {
    const suit = parseSuit(stored.suitKind);
    if (!suit.ok) return suit;
    votes.push({
      roundId: stored.roundId,
      participantId: stored.participantId,
      card: { label: stored.cardLabel, numeric: null, kind: "special" },
      suit: suit.value,
      comment: stored.comment,
    });
  }
  const rounds: RoundProps[] = planning.rounds.map((round) => ({
    id: round.id,
    roomId: round.roomId,
    itemId: round.itemId,
    number: round.number,
    status: round.status,
    timerEndsAt: round.timerEndsAt,
    stats: round.stats,
  }));
  const table = PlanningTable.rehydrate({
    room,
    items: planning.items.map((item) => itemPropsOf(item)),
    rounds,
    votes,
  });
  if (!table.ok) return table;
  return ok({ room, table: table.value });
}

function planningOf(record: PersistedRoomRecord): PersistedRoomPlanning | null {
  return record.planning ?? null;
}

export function toPersisted(room: Room, table: PlanningTable): PersistedRoomRecord {
  const planning: PersistedRoomPlanning = {
    hostParticipantId: room.hostParticipantId,
    scaleId: room.scale.id,
    scaleName: room.scale.name,
    settings: room.settings,
    participants: room.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      guestSessionId: participant.guestSessionId,
      nickname: participant.nickname,
      role: participant.role,
      mode: participant.mode,
      isFacilitator: participant.isFacilitator,
      joinedAt: participant.joinedAt,
      lastSeenAt: participant.lastSeenAt,
      afk: participant.afk,
    })),
    items: table.items.map((item) => itemPropsOf(item)),
    rounds: table.rounds.map((round) => ({
      id: round.id,
      roomId: round.roomId,
      itemId: round.itemId,
      number: round.number,
      status: round.status,
      timerEndsAt: round.timerEndsAt,
      stats: round.stats,
    })),
    votes: table.votes.map((vote) => ({
      roundId: vote.roundId,
      participantId: vote.participantId,
      cardLabel: vote.card.label,
      suitKind: vote.suit.kind,
      comment: vote.comment,
    })),
  };
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    kind: room.kind,
    teamId: room.teamId,
    status: room.status,
    version: room.version,
    items: table.items.map((item) => ({ id: item.id as PersistedRoomRecord["items"][number]["id"], title: item.title })),
    expiresAt: room.expiresAt,
    lastActivityAt: room.lastActivityAt,
    planning,
  };
}
