import { createAppError, type AppError } from "../shared/app-error.js";
import { MAX_ITEMS_PER_ROOM, MAX_VOTE_COMMENT_LENGTH, ONLINE_WINDOW_SECONDS } from "../shared/constants.js";
import { err, ok, type Result } from "../shared/result.js";
import { can, type PolicyAction, type PolicyActor, type PolicyContext, type TeamRole } from "../policy/can.js";
import { AfkCard, DoubtCard, JokerCard, type Card } from "../scales/card.js";
import type { Scale } from "../scales/scale.js";
import { Suit, parseSuit } from "../scales/suit.js";
import { isValidVote } from "../scales/validate-vote.js";
import { computeRoundStats } from "../stats/compute-round-stats.js";
import type { Participant } from "../room/participant.js";
import type { Room } from "../room/room.js";
import { EstimateAudit } from "./estimate-audit.js";
import { Item, type ItemProps, type ItemStatus } from "./item.js";
import { Round, type RoundProps } from "./round.js";
import { Vote, type VoteProps } from "./vote.js";

export interface PlanningEvent {
  readonly type: string;
  readonly roomId: string;
  readonly version: number;
  readonly at: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface TableOk {
  readonly table: PlanningTable;
  readonly events: readonly PlanningEvent[];
  readonly audit: EstimateAudit | null;
}

const TEAM_ROLES: ReadonlySet<string> = new Set(["teamAdmin", "pm", "po", "dev", "qa", "observer"]);
const SUIT_BY_KIND: Readonly<Record<string, Suit>> = {
  clubs: Suit.clubs,
  hearts: Suit.hearts,
  spades: Suit.spades,
  diamonds: Suit.diamonds,
  joker: Suit.joker,
};
const SPECIAL_BY_LABEL: ReadonlyMap<string, Card> = new Map([
  [DoubtCard.label, DoubtCard],
  [JokerCard.label, JokerCard],
  [AfkCard.label, AfkCard],
]);
const cardsByScale = new WeakMap<Scale, Map<string, Card>>();
const seatsByRoom = new WeakMap<Room, Map<string, Participant>>();

function seatOf(room: Room, participantId: string): Participant | undefined {
  let seats = seatsByRoom.get(room);
  if (!seats) {
    seats = new Map();
    for (const participant of room.participants) seats.set(participant.id, participant);
    seatsByRoom.set(room, seats);
  }
  return seats.get(participantId);
}

function cardByLabel(scale: Scale, label: string): Card | null {
  const special = SPECIAL_BY_LABEL.get(label);
  if (special) return special;
  let index = cardsByScale.get(scale);
  if (!index) {
    index = new Map();
    for (const card of scale.cards) index.set(card.label, card);
    cardsByScale.set(scale, index);
  }
  return index.get(label) ?? null;
}

function isOnline(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() <= ONLINE_WINDOW_SECONDS * 1000;
}

function teamRoleOf(role: string): TeamRole | undefined {
  if (TEAM_ROLES.has(role)) return role as TeamRole;
  return undefined;
}

function actorOf(room: Room, participant: Participant): PolicyActor {
  const seat = {
    isHost: participant.id === room.hostParticipantId,
    isFacilitator: participant.isFacilitator,
    roomMode: participant.mode,
  };
  if (room.kind === "guest") return { kind: "guest", ...seat };
  return { kind: "member", teamRole: teamRoleOf(participant.role), ...seat };
}

function contextOf(room: Room, participantId: string): PolicyContext {
  return {
    roomKind: room.kind,
    actorCreatedRoom: room.kind === "guest" && room.hostParticipantId === participantId,
  };
}

function planningEvent(room: Room, type: string, now: Date, payload: Record<string, unknown>): PlanningEvent {
  return Object.freeze({
    type,
    roomId: room.id,
    version: room.version,
    at: now.toISOString(),
    payload: Object.freeze(payload),
  });
}

function numericCard(scale: Scale, label: string): Card | null {
  for (const card of scale.cards) {
    if (card.label === label && card.kind === "numeric") return card;
  }
  return null;
}

function predominantSuit(votes: readonly Vote[]): string | null {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    if (vote.card.kind !== "numeric" || vote.suit.kind === "joker") continue;
    counts.set(vote.suit.kind, (counts.get(vote.suit.kind) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  let tied = false;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      best = kind;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }
  if (tied || best === null) return null;
  return best;
}

export class PlanningTable {
  readonly room: Room;
  readonly items: readonly Item[];
  readonly rounds: readonly Round[];
  readonly votes: readonly Vote[];

  private constructor(
    room: Room,
    items: readonly Item[],
    rounds: readonly Round[],
    votes: readonly Vote[],
  ) {
    this.room = room;
    this.items = items;
    this.rounds = rounds;
    this.votes = votes;
  }

  static open(room: Room): Result<PlanningTable, AppError> {
    return ok(new PlanningTable(room, Object.freeze([]), Object.freeze([]), Object.freeze([])));
  }

  static rehydrate(input: {
    room: Room;
    items: readonly ItemProps[];
    rounds: readonly RoundProps[];
    votes: readonly VoteProps[];
  }): Result<PlanningTable, AppError> {
    let currentCount = 0;
    const items: Item[] = [];
    const itemIds = new Set<string>();
    for (const view of input.items) {
      if (itemIds.has(view.id)) return err(createAppError("VALIDATION"));
      if (view.status === "current") currentCount += 1;
      itemIds.add(view.id);
      items.push(Item.create(view));
    }
    if (currentCount > 1) return err(createAppError("VALIDATION"));

    const rounds: Round[] = [];
    const roundIds = new Set<string>();
    const votingItems = new Set<string>();
    for (const view of input.rounds) {
      if (roundIds.has(view.id) || !itemIds.has(view.itemId)) return err(createAppError("VALIDATION"));
      if (view.status === "voting" && votingItems.has(view.itemId)) return err(createAppError("VALIDATION"));
      const hydrated = Round.rehydrate(view);
      if (!hydrated.ok) return hydrated;
      if (view.status === "voting") votingItems.add(view.itemId);
      roundIds.add(view.id);
      rounds.push(hydrated.value);
    }

    const votes: Vote[] = [];
    const voteKeys = new Set<string>();
    for (const view of input.votes) {
      if (!roundIds.has(view.roundId)) return err(createAppError("VALIDATION"));
      const key = `${view.roundId}\0${view.participantId}`;
      if (voteKeys.has(key)) return err(createAppError("VALIDATION"));
      const valid = isValidVote(input.room.scale, view.card.label, view.suit);
      if (!valid.ok) return err(createAppError("VALIDATION"));
      voteKeys.add(key);
      votes.push(
        Vote.create({
          roundId: view.roundId,
          participantId: view.participantId,
          card: valid.value.card,
          suit: valid.value.suit,
          comment: view.comment,
        }),
      );
    }

    return ok(
      new PlanningTable(input.room, Object.freeze(items), Object.freeze(rounds), Object.freeze(votes)),
    );
  }

  addItem(input: { actorParticipantId: string; item: ItemProps; now: Date }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "manageQueue");
    if (!allowed.ok) return allowed;
    if (input.item.roomId !== this.room.id) return err(createAppError("VALIDATION"));
    if (input.item.teamId !== null && input.item.teamId !== this.room.teamId) {
      return err(createAppError("VALIDATION"));
    }
    if (input.item.position !== this.items.length) return err(createAppError("VALIDATION"));
    if (input.item.status !== "pending") return err(createAppError("VALIDATION"));
    if (this.items.some((item) => item.id === input.item.id)) return err(createAppError("VALIDATION"));
    if (this.items.length >= MAX_ITEMS_PER_ROOM) return err(createAppError("LIMIT_EXCEEDED"));
    const table = this.spawn({ items: [...this.items, Item.create(input.item)] });
    return this.done(table, [table.queueEvent(input.now)]);
  }

  setCurrent(input: { actorParticipantId: string; itemId: string; roundId: string; now: Date }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "manageQueue");
    if (!allowed.ok) return allowed;
    const item = this.itemById(input.itemId);
    if (!item) return err(createAppError("NOT_FOUND"));
    if (item.status !== "pending" && item.status !== "skipped" && item.status !== "deferred") {
      return err(createAppError("VALIDATION"));
    }
    const voting = this.rounds.find((round) => round.itemId === item.id && round.status === "voting");
    let rounds = this.rounds;
    const events: PlanningEvent[] = [];
    if (!voting) {
      if (this.rounds.some((round) => round.id === input.roundId)) return err(createAppError("VALIDATION"));
      const started = Round.start({
        id: input.roundId,
        roomId: this.room.id,
        itemId: item.id,
        number: this.nextNumber(item.id),
      });
      rounds = [...this.rounds, started];
      events.push(planningEvent(this.room, "round.started", input.now, { roundId: started.id, itemId: started.itemId }));
    }
    const items = this.items.map((entry) => {
      if (entry.id === item.id) return entry.withStatus("current");
      if (entry.status === "current") return entry.withStatus("pending");
      return entry;
    });
    const table = this.spawn({ items, rounds });
    events.unshift(table.queueEvent(input.now));
    return this.done(table, events);
  }

  returnToPending(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError> {
    return this.moveStatus(input, ["skipped", "deferred"], "pending");
  }

  skip(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError> {
    return this.moveStatus(input, ["current"], "skipped");
  }

  defer(input: { actorParticipantId: string; itemId: string; now: Date }): Result<TableOk, AppError> {
    return this.moveStatus(input, ["current"], "deferred");
  }

  reorder(input: { actorParticipantId: string; itemIds: readonly string[]; now: Date }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "manageQueue");
    if (!allowed.ok) return allowed;
    if (input.itemIds.length !== this.items.length) return err(createAppError("VALIDATION"));
    const byId = new Map(this.items.map((item) => [item.id, item]));
    const seen = new Set<string>();
    const items: Item[] = [];
    for (let index = 0; index < input.itemIds.length; index += 1) {
      const id = input.itemIds[index];
      if (id === undefined || seen.has(id)) return err(createAppError("VALIDATION"));
      const item = byId.get(id);
      if (!item) return err(createAppError("VALIDATION"));
      seen.add(id);
      items.push(item.withPosition(index));
    }
    const table = this.spawn({ items });
    return this.done(table, [
      planningEvent(this.room, "item.queue_updated", input.now, { itemIds: [...input.itemIds] }),
    ]);
  }

  castVote(input: {
    participantId: string;
    card: string;
    suit?: string | null;
    comment?: string | null;
    now: Date;
  }): Result<TableOk, AppError> {
    const current = this.currentItem();
    if (!current) return err(createAppError("VALIDATION"));
    const round = this.latestRound(current.id);
    if (!round) return err(createAppError("VALIDATION"));
    if (round.status !== "voting") return err(createAppError("ROUND_NOT_VOTING"));
    const participant = seatOf(this.room, input.participantId);
    if (!participant) return err(createAppError("NOT_FOUND"));
    if (!participant.canVote) return err(createAppError("FORBIDDEN"));
    const suit = input.suit == null ? Suit.joker : SUIT_BY_KIND[input.suit];
    if (!suit) return err(createAppError("VALIDATION"));
    const card = cardByLabel(this.room.scale, input.card);
    if (!card) return err(createAppError("VALIDATION"));
    if (input.comment != null && input.comment.length > MAX_VOTE_COMMENT_LENGTH) {
      return err(createAppError("VALIDATION"));
    }
    const stored = Vote.create({
      roundId: round.id,
      participantId: input.participantId,
      card,
      suit,
      comment: input.comment ?? null,
    });
    let replaced = false;
    const votes: Vote[] = [];
    for (const existing of this.votes) {
      if (existing.roundId === round.id && existing.participantId === input.participantId) {
        votes.push(stored);
        replaced = true;
      } else {
        votes.push(existing);
      }
    }
    if (!replaced) votes.push(stored);
    const table = this.spawn({ votes });
    return this.done(table, [
      planningEvent(this.room, "vote.changed", input.now, { participantId: input.participantId, hasVoted: true }),
    ]);
  }

  retractVote(input: { participantId: string; now: Date }): Result<TableOk, AppError> {
    const round = this.votingTarget();
    if (!round.ok) return round;
    const votes = this.votes.filter(
      (vote) => !(vote.roundId === round.value.id && vote.participantId === input.participantId),
    );
    if (votes.length === this.votes.length) return err(createAppError("NOT_FOUND"));
    const table = this.spawn({ votes });
    return this.done(table, [
      planningEvent(this.room, "vote.changed", input.now, { participantId: input.participantId, hasVoted: false }),
    ]);
  }

  reveal(input: { actorParticipantId: string; now: Date }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "revealRound");
    if (!allowed.ok) return allowed;
    const round = this.currentVotingRound();
    if (!round) return err(createAppError("VALIDATION"));
    const stats = computeRoundStats(this.room.scale, this.votesFor(round.id));
    const rounds = this.rounds.map((entry) => (entry.id === round.id ? entry.reveal(stats) : entry));
    const table = this.spawn({ rounds });
    return this.done(table, [planningEvent(this.room, "round.revealed", input.now, { roundId: round.id })]);
  }

  newRound(input: { actorParticipantId: string; itemId: string; roundId: string; now: Date }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "manageQueue");
    if (!allowed.ok) return allowed;
    const item = this.itemById(input.itemId);
    if (!item) return err(createAppError("NOT_FOUND"));
    if (item.status !== "current" && item.status !== "estimated") return err(createAppError("VALIDATION"));
    const latest = this.latestRound(item.id);
    if (!latest || latest.status !== "revealed") return err(createAppError("VALIDATION"));
    if (this.rounds.some((round) => round.id === input.roundId)) return err(createAppError("VALIDATION"));
    const started = Round.start({
      id: input.roundId,
      roomId: this.room.id,
      itemId: item.id,
      number: this.nextNumber(item.id),
    });
    const items = this.items.map((entry) => (entry.id === item.id ? entry.withStatus("current") : entry));
    const table = this.spawn({ items, rounds: [...this.rounds, started] });
    return this.done(table, [
      table.queueEvent(input.now),
      planningEvent(this.room, "round.started", input.now, { roundId: started.id, itemId: started.itemId }),
    ]);
  }

  setFinalEstimate(input: {
    actorParticipantId: string;
    itemId: string;
    label: string;
    suit?: string | null;
    now: Date;
  }): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "setFinalEstimate");
    if (!allowed.ok) return allowed;
    const item = this.itemById(input.itemId);
    if (!item) return err(createAppError("NOT_FOUND"));
    if (item.status !== "current" && item.status !== "estimated") return err(createAppError("VALIDATION"));
    const latest = this.latestRound(item.id);
    if (!latest || latest.status !== "revealed") return err(createAppError("VALIDATION"));
    const card = numericCard(this.room.scale, input.label);
    if (!card) return err(createAppError("VALIDATION"));
    if (item.finalEstimate?.label === card.label) return this.done(this, []);
    let finalSuit: string | null;
    if (typeof input.suit === "string") {
      const parsed = parseSuit(input.suit);
      if (!parsed.ok) return parsed;
      finalSuit = parsed.value.kind;
    } else {
      finalSuit = predominantSuit(this.votesFor(latest.id));
    }
    const next = item.withEstimate(card, finalSuit);
    const table = this.spawn({
      items: this.items.map((entry) => (entry.id === item.id ? next : entry)),
    });
    const audit = item.finalEstimate
      ? EstimateAudit.record({
          itemId: item.id,
          changedBy: input.actorParticipantId,
          at: input.now,
          from: item.finalEstimate.label,
          to: card.label,
        })
      : null;
    return this.done(table, [planningEvent(this.room, "item.estimate_finalized", input.now, { itemId: item.id })], audit);
  }

  startTimer(input: { actorParticipantId: string; endsAt: Date; now: Date }): Result<TableOk, AppError> {
    return this.setTimer(input.actorParticipantId, input.endsAt, input.now);
  }

  stopTimer(input: { actorParticipantId: string; now: Date }): Result<TableOk, AppError> {
    return this.setTimer(input.actorParticipantId, null, input.now);
  }

  shouldAutoReveal(now: Date): boolean {
    if (!this.room.settings.autoReveal) return false;
    const round = this.currentVotingRound();
    if (!round) return false;
    const votes = this.votesFor(round.id);
    if (votes.length === 0) return false;
    const required = this.room.participants.filter(
      (participant) => participant.mode === "voter" && !participant.afk && isOnline(participant.lastSeenAt, now),
    );
    if (required.length === 0) return false;
    for (const participant of required) {
      if (!votes.some((vote) => vote.participantId === participant.id)) return false;
    }
    return true;
  }

  private moveStatus(
    input: { actorParticipantId: string; itemId: string; now: Date },
    from: readonly ItemStatus[],
    status: ItemStatus,
  ): Result<TableOk, AppError> {
    const allowed = this.authorize(input.actorParticipantId, "manageQueue");
    if (!allowed.ok) return allowed;
    const item = this.itemById(input.itemId);
    if (!item) return err(createAppError("NOT_FOUND"));
    if (!from.includes(item.status)) return err(createAppError("VALIDATION"));
    const table = this.spawn({
      items: this.items.map((entry) => (entry.id === item.id ? entry.withStatus(status) : entry)),
    });
    return this.done(table, [table.queueEvent(input.now)]);
  }

  private setTimer(actorParticipantId: string, endsAt: Date | null, now: Date): Result<TableOk, AppError> {
    const allowed = this.authorize(actorParticipantId, "revealRound");
    if (!allowed.ok) return allowed;
    const round = this.currentVotingRound();
    if (!round) return err(createAppError("VALIDATION"));
    const rounds = this.rounds.map((entry) => (entry.id === round.id ? entry.withTimer(endsAt) : entry));
    const table = this.spawn({ rounds });
    return this.done(table, [
      planningEvent(this.room, "timer.updated", now, { endsAt: endsAt ? endsAt.toISOString() : null }),
    ]);
  }

  private authorize(actorParticipantId: string, action: PolicyAction): Result<Participant, AppError> {
    const participant = seatOf(this.room, actorParticipantId);
    if (!participant) return err(createAppError("NOT_FOUND"));
    if (!can(actorOf(this.room, participant), action, contextOf(this.room, participant.id))) {
      return err(createAppError("FORBIDDEN"));
    }
    return ok(participant);
  }

  private votingTarget(): Result<Round, AppError> {
    const current = this.currentItem();
    if (!current) return err(createAppError("VALIDATION"));
    const latest = this.latestRound(current.id);
    if (!latest) return err(createAppError("VALIDATION"));
    if (latest.status !== "voting") return err(createAppError("ROUND_NOT_VOTING"));
    return ok(latest);
  }

  private currentItem(): Item | undefined {
    return this.items.find((item) => item.status === "current");
  }

  private currentVotingRound(): Round | undefined {
    const current = this.currentItem();
    if (!current) return undefined;
    return this.rounds.find((round) => round.itemId === current.id && round.status === "voting");
  }

  private latestRound(itemId: string): Round | undefined {
    let latest: Round | undefined;
    for (const round of this.rounds) {
      if (round.itemId !== itemId) continue;
      if (!latest || round.number > latest.number) latest = round;
    }
    return latest;
  }

  private nextNumber(itemId: string): number {
    const latest = this.latestRound(itemId);
    return latest ? latest.number + 1 : 1;
  }

  private itemById(id: string): Item | undefined {
    return this.items.find((item) => item.id === id);
  }

  private votesFor(roundId: string): readonly Vote[] {
    return this.votes.filter((vote) => vote.roundId === roundId);
  }

  private queueEvent(now: Date): PlanningEvent {
    return planningEvent(this.room, "item.queue_updated", now, {
      itemIds: this.items.map((item) => item.id),
    });
  }

  private spawn(patch: { items?: readonly Item[]; rounds?: readonly Round[]; votes?: readonly Vote[] }): PlanningTable {
    return new PlanningTable(
      this.room,
      patch.items ?? this.items,
      patch.rounds ?? this.rounds,
      patch.votes ?? this.votes,
    );
  }

  private done(table: PlanningTable, events: readonly PlanningEvent[], audit: EstimateAudit | null = null): Result<TableOk, AppError> {
    return ok({ table, events, audit });
  }
}
