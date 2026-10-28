import {
  HistoryEntryBuilder,
  HistoryEntryId,
  ItemId,
  RoomId,
  RoundId,
  TeamId,
  createAppError,
  err,
  ok,
  type AppError,
  type PlanningTable,
  type Result,
  type SuitDistribution,
} from "@fibonaipe/domain";
import type { TransactionRepos } from "../../ports/persistence.port.js";
import type { UseCaseDependencies } from "../room-session.js";

export class RecordAggregatedHistory {
  constructor(private readonly deps: UseCaseDependencies) {}

  async append(
    repos: TransactionRepos,
    table: PlanningTable,
    itemId: string,
    label: string,
    now: Date,
  ): Promise<Result<true, AppError>> {
    const room = table.room;
    if (room.kind !== "team" || room.teamId === null) return ok(true);
    const item = table.items.find((entry) => entry.id === itemId);
    if (!item) return err(createAppError("NOT_FOUND"));
    const teamId = TeamId.create(room.teamId);
    const roomId = RoomId.create(room.id);
    const parsedItemId = ItemId.create(item.id);
    if (!teamId.ok) return teamId;
    if (!roomId.ok) return roomId;
    if (!parsedItemId.ok) return parsedItemId;

    for (const round of table.rounds) {
      if (round.itemId !== item.id || round.status !== "revealed" || round.stats === null) continue;
      const historyId = HistoryEntryId.create(this.deps.ids.newId());
      const roundId = RoundId.create(round.id);
      if (!historyId.ok) return historyId;
      if (!roundId.ok) return roundId;
      const stats = round.stats;
      const built = new HistoryEntryBuilder()
        .withId(historyId.value)
        .withTeamId(teamId.value)
        .withItemId(parsedItemId.value)
        .withRoomId(roomId.value)
        .withTitle(item.title)
        .withRoundNumber(round.number)
        .withMean(stats.mean)
        .withMedian(stats.median)
        .withModes(stats.modes)
        .withMin(stats.min)
        .withMax(stats.max)
        .withConsensus(stats.consensus)
        .withNearConsensus(stats.nearConsensus)
        .withSuitDistribution(stats.suitDistribution)
        .withSuitDivergence(stats.suitDivergence)
        .withSpecialCounts(stats.specialCounts)
        .withFinalEstimate(label)
        .withEstimatedAt(now);
      if (item.externalKey !== null) built.withExternalKey(item.externalKey);
      if (item.figureTag !== null) built.withFigureTag(item.figureTag);
      if (item.finalSuit !== null) built.withFinalSuit(item.finalSuit);
      const entry = built.build();
      if (!entry.ok) return entry;
      const value = entry.value;
      await repos.history.appendAggregated({
        id: value.id,
        roomId: value.roomId,
        itemId: value.itemId,
        roundId: roundId.value,
        dominantSuit: dominantSuit(stats.suitDistribution),
        stats: { voteCount: stats.voteCount, consensus: stats.consensus },
        teamId: value.teamId,
        title: value.title,
        externalKey: value.externalKey,
        figureTag: value.figureTag,
        roundNumber: value.roundNumber,
        mean: value.mean,
        median: value.median,
        modes: value.modes,
        min: value.min,
        max: value.max,
        consensus: value.consensus,
        nearConsensus: value.nearConsensus,
        suitDistribution: value.suitDistribution,
        suitDivergence: value.suitDivergence,
        specialCounts: value.specialCounts,
        finalEstimate: value.finalEstimate,
        finalSuit: value.finalSuit,
        estimatedAt: value.estimatedAt,
        sprintId: value.sprintId,
      });
    }
    return ok(true);
  }
}

function dominantSuit(distribution: SuitDistribution): string {
  let best: keyof SuitDistribution = "clubs";
  let count = distribution.clubs;
  for (const suit of ["hearts", "spades", "diamonds"] as const) {
    const next = distribution[suit];
    if (next > count) {
      best = suit;
      count = next;
    }
  }
  return best;
}
