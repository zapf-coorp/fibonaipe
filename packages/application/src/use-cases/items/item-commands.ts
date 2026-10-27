import { PlanningTable, createAppError, err, type AppError, type PlanningEvent, type Result } from "@fibonaipe/domain";
import type { IssueTrackerImportInput } from "../../ports/issue-tracker.port.js";
import {
  authorize,
  beginOp,
  commitPlanning,
  finishOp,
  freshItem,
  itemPropsOf,
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

export interface AddItemInput extends ActorInput {
  readonly title: string;
  readonly description?: string;
}

export interface ImportItemsInput extends ActorInput {
  readonly source: IssueTrackerImportInput;
}

export interface ReorderItemsInput extends ActorInput {
  readonly itemIds: readonly string[];
}

export interface ItemTargetInput extends ActorInput {
  readonly itemId: string;
}

export interface CommandResult {
  readonly realtimePending: boolean;
}

export class AddItem {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: AddItemInput): Promise<Result<CommandResult, AppError>> {
    return runItem(this.deps, "AddItem", input, (ctx) => {
      const props = freshItem(
        ctx.loaded.room,
        input.title,
        input.description ?? "",
        ctx.loaded.table.items.length,
        this.deps.ids.newId(),
      );
      if (!props.ok) return props;
      return ctx.loaded.table.addItem({
        actorParticipantId: input.actorParticipantId,
        item: props.value,
        now: ctx.now,
      });
    });
  }
}

export class ImportItems {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ImportItemsInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "ImportItems");
    if (!allowed.ok) return allowed;
    const imported = await this.deps.issueTracker.importItems(input.source);
    if (!imported.ok) return imported;
    return mutate(this.deps, input.code, "ImportItems", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      let table = ctx.loaded.table;
      const events: PlanningEvent[] = [];
      for (const candidate of imported.value.items) {
        const props = freshItem(
          table.room,
          candidate.title,
          candidate.description ?? "",
          table.items.length,
          this.deps.ids.newId(),
        );
        if (!props.ok) return props;
        const added = table.addItem({
          actorParticipantId: input.actorParticipantId,
          item: props.value,
          now: ctx.now,
        });
        if (!added.ok) return added;
        table = added.value.table;
        events.push(...added.value.events);
      }
      if (events.length === 0) {
        const recorded = await finishOp(ctx, input.actorParticipantId, input.clientOpId);
        if (!recorded.ok) return recorded;
        return replay();
      }
      return commitPlanning(ctx, input.actorParticipantId, input.clientOpId, table, events, {});
    });
  }
}

export class ReorderItems {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ReorderItemsInput): Promise<Result<CommandResult, AppError>> {
    return runItem(this.deps, "ReorderItems", input, (ctx) =>
      ctx.loaded.table.reorder({
        actorParticipantId: input.actorParticipantId,
        itemIds: input.itemIds,
        now: ctx.now,
      }),
    );
  }
}

export class SetCurrentItem {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ItemTargetInput): Promise<Result<CommandResult, AppError>> {
    return runItem(this.deps, "SetCurrentItem", input, (ctx) =>
      ctx.loaded.table.setCurrent({
        actorParticipantId: input.actorParticipantId,
        itemId: input.itemId,
        roundId: this.deps.ids.newId(),
        now: ctx.now,
      }),
    );
  }
}

export class SkipItem {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ItemTargetInput): Promise<Result<CommandResult, AppError>> {
    return runItem(this.deps, "SkipItem", input, (ctx) =>
      ctx.loaded.table.skip({ actorParticipantId: input.actorParticipantId, itemId: input.itemId, now: ctx.now }),
    );
  }
}

export class DeferItem {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ItemTargetInput): Promise<Result<CommandResult, AppError>> {
    return runItem(this.deps, "DeferItem", input, (ctx) =>
      ctx.loaded.table.defer({ actorParticipantId: input.actorParticipantId, itemId: input.itemId, now: ctx.now }),
    );
  }
}

export class RemoveItem {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ItemTargetInput): Promise<Result<CommandResult, AppError>> {
    const allowed = await limitParticipant(this.deps, input.actorParticipantId, "RemoveItem");
    if (!allowed.ok) return allowed;
    return mutate(this.deps, input.code, "RemoveItem", async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const allowedSeat = authorize(ctx.loaded.room, input.actorParticipantId, "manageQueue");
      if (!allowedSeat.ok) return allowedSeat;
      const target = ctx.loaded.table.items.find((item) => item.id === input.itemId);
      if (!target) return err(createAppError("NOT_FOUND"));
      if (target.status !== "pending") return err(createAppError("VALIDATION"));
      const removedRounds = new Set(
        ctx.loaded.table.rounds.filter((round) => round.itemId === target.id).map((round) => round.id),
      );
      const rebuilt = PlanningTable.rehydrate({
        room: ctx.loaded.room,
        items: ctx.loaded.table.items
          .filter((item) => item.id !== target.id)
          .map((item, index) => ({ ...itemPropsOf(item), position: index })),
        rounds: ctx.loaded.table.rounds
          .filter((round) => round.itemId !== target.id)
          .map((round) => ({
            id: round.id,
            roomId: round.roomId,
            itemId: round.itemId,
            number: round.number,
            status: round.status,
            timerEndsAt: round.timerEndsAt,
            stats: round.stats,
          })),
        votes: ctx.loaded.table.votes
          .filter((vote) => !removedRounds.has(vote.roundId))
          .map((vote) => ({
            roundId: vote.roundId,
            participantId: vote.participantId,
            card: vote.card,
            suit: vote.suit,
            comment: vote.comment,
          })),
      });
      if (!rebuilt.ok) return rebuilt;
      const queueEvent: PlanningEvent = {
        type: "item.queue_updated",
        roomId: ctx.loaded.room.id,
        version: ctx.loaded.room.version,
        at: ctx.now.toISOString(),
        payload: { itemIds: rebuilt.value.items.map((item) => item.id) },
      };
      return commitPlanning(ctx, input.actorParticipantId, input.clientOpId, rebuilt.value, [queueEvent], {});
    });
  }
}

function runItem(
  deps: UseCaseDependencies,
  useCase: string,
  input: ActorInput,
  change: (ctx: RoomContext) => Result<{ table: PlanningTable; events: readonly PlanningEvent[] }, AppError>,
): Promise<Result<CommandResult, AppError>> {
  return limitParticipant(deps, input.actorParticipantId, useCase).then(async (allowed) => {
    if (!allowed.ok) return allowed;
    return mutate(deps, input.code, useCase, async (ctx) => {
      const op = await beginOp(ctx, input.actorParticipantId, input.clientOpId);
      if (!op.ok) return op;
      if (op.value === "replay") return replay();
      const changed = change(ctx);
      if (!changed.ok) return changed;
      return commitPlanning(ctx, input.actorParticipantId, input.clientOpId, changed.value.table, changed.value.events, {});
    });
  });
}
