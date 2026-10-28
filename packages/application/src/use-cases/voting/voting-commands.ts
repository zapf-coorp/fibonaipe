import { type AppError, type PlanningEvent, type Result } from "@fibonaipe/domain";
import { RecordAggregatedHistory } from "../history/record-aggregated-history.js";
import {
  beginOp,
  commitPlanning,
  finishOp,
  limitParticipant,
  mutate,
  replay,
  type RoomContext,
  type UseCaseDependencies,
} from "../room-session.js";

interface ActorInput {
  readonly code: string;
  readonly actorParticipantId: string;
  readonly clientOpId: string;
}

export interface CastVoteInput {
  readonly code: string;
  readonly participantId: string;
  readonly card: string;
  readonly suit?: string | null;
  readonly comment?: string | null;
  readonly clientOpId: string;
}

export interface RetractVoteInput {
  readonly code: string;
  readonly participantId: string;
  readonly clientOpId: string;
}

export interface FinalEstimateInput extends ActorInput {
  readonly itemId: string;
  readonly label: string;
  readonly suit?: string | null;
}

export interface NewRoundInput extends ActorInput {
  readonly itemId: string;
}

export interface StartTimerInput extends ActorInput {
  readonly endsAt: Date;
}

export interface CommandResult {
  readonly realtimePending: boolean;
}

export class CastVote {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CastVoteInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.participantId, "CastVote");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "CastVote", async (ctx) => {
      const op = await beginOp(ctx, input.participantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const roundId = votingRoundId(ctx);
      if (roundId !== null) {
        const existing = ctx.loaded.table.votes.find(
          (vote) => vote.roundId === roundId && vote.participantId === input.participantId,
        );
        if (existing && sameCard(existing, input)) {
          const recorded = await finishOp(ctx, input.participantId, input.clientOpId);
          if (!recorded.ok) return recorded;
          return replay();
        }
      }
      const cast = ctx.loaded.table.castVote({
        participantId: input.participantId,
        card: input.card,
        suit: input.suit,
        comment: input.comment,
        now: ctx.now,
      });
      if (!cast.ok) return cast;
      let table = cast.value.table;
      const events: PlanningEvent[] = [...cast.value.events];
      if (table.shouldAutoReveal(ctx.now)) {
        const revealed = table.reveal({ actorParticipantId: table.room.hostParticipantId, now: ctx.now });
        if (!revealed.ok) return revealed;
        table = revealed.value.table;
        events.push(...revealed.value.events);
      }
      return commitPlanning(ctx, input.participantId, input.clientOpId, table, events, {});
    });
  }
}

export class RetractVote {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: RetractVoteInput): Promise<Result<CommandResult, AppError>> {
    return runVote(this.deps, "RetractVote", input.code, input.participantId, input.clientOpId, (ctx) =>
      ctx.loaded.table.retractVote({ participantId: input.participantId, now: ctx.now }),
    );
  }
}

export class RevealRound {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ActorInput): Promise<Result<CommandResult, AppError>> {
    return runVote(this.deps, "RevealRound", input.code, input.actorParticipantId, input.clientOpId, (ctx) =>
      ctx.loaded.table.reveal({ actorParticipantId: input.actorParticipantId, now: ctx.now }),
    );
  }
}

export class NewRound {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: NewRoundInput): Promise<Result<CommandResult, AppError>> {
    return runVote(this.deps, "NewRound", input.code, input.actorParticipantId, input.clientOpId, (ctx) =>
      ctx.loaded.table.newRound({
        actorParticipantId: input.actorParticipantId,
        itemId: input.itemId,
        roundId: this.deps.ids.newId(),
        now: ctx.now,
      }),
    );
  }
}

export class SetFinalEstimate {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: FinalEstimateInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "SetFinalEstimate");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "SetFinalEstimate", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const changed = ctx.loaded.table.setFinalEstimate({
        actorParticipantId: input.actorParticipantId,
        itemId: input.itemId,
        label: input.label,
        suit: input.suit,
        now: ctx.now,
      });
      if (!changed.ok) return changed;
      if (changed.value.events.length > 0 && changed.value.table.room.kind === "team") {
        const recorded = await new RecordAggregatedHistory(this.deps).append(
          ctx.repos,
          changed.value.table,
          input.itemId,
          input.label,
          ctx.now,
        );
        if (!recorded.ok) return recorded;
      }
      return commitPlanning(ctx, input.actorParticipantId, input.clientOpId, changed.value.table, changed.value.events, {});
    });
  }
}

export class StartTimer {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: StartTimerInput): Promise<Result<CommandResult, AppError>> {
    return runVote(this.deps, "StartTimer", input.code, input.actorParticipantId, input.clientOpId, (ctx) =>
      ctx.loaded.table.startTimer({
        actorParticipantId: input.actorParticipantId,
        endsAt: input.endsAt,
        now: ctx.now,
      }),
    );
  }
}

export class StopTimer {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ActorInput): Promise<Result<CommandResult, AppError>> {
    return runVote(this.deps, "StopTimer", input.code, input.actorParticipantId, input.clientOpId, (ctx) =>
      ctx.loaded.table.stopTimer({ actorParticipantId: input.actorParticipantId, now: ctx.now }),
    );
  }
}

function runVote(
  deps: UseCaseDependencies,
  useCase: string,
  code: string,
  actorId: string,
  clientOpId: string,
  change: (ctx: RoomContext) => Result<{ table: RoomContext["loaded"]["table"]; events: readonly PlanningEvent[] }, AppError>,
): Promise<Result<CommandResult, AppError>> {
  return limitParticipant(deps, actorId, useCase).then(async (allowed) => {
    if (!allowed.ok) return allowed;
    return mutate(deps, code, useCase, async (ctx) => {
      const op = await beginOp(ctx, actorId, clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const changed = change(ctx);
      if (!changed.ok) return changed;
      return commitPlanning(ctx, actorId, clientOpId, changed.value.table, changed.value.events, {});
    });
  });
}

function votingRoundId(ctx: RoomContext): string | null {
  const current = ctx.loaded.table.items.find((item) => item.status === "current");
  if (!current) return null;
  let latest: { readonly id: string; readonly number: number; readonly status: string } | null = null;
  for (const round of ctx.loaded.table.rounds) {
    if (round.itemId !== current.id) continue;
    if (!latest || round.number > latest.number) latest = round;
  }
  if (!latest || latest.status !== "voting") return null;
  return latest.id;
}

function sameCard(
  existing: { readonly card: { readonly label: string }; readonly suit: { readonly kind: string }; readonly comment: string | null },
  input: CastVoteInput,
): boolean {
  const suit = input.suit ?? "joker";
  const comment = input.comment ?? null;
  return existing.card.label === input.card && existing.suit.kind === suit && existing.comment === comment;
}
