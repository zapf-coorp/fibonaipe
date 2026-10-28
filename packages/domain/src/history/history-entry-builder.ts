import { createAppError, type AppError } from "../shared/app-error.js";
import type { HistoryEntryId, ItemId, RoomId, SprintId, TeamId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";
import { HistoryEntry, type SpecialCounts, type SuitDistribution } from "./history-entry.js";

export class HistoryEntryBuilder {
  private id: HistoryEntryId | undefined;
  private teamId: TeamId | undefined;
  private itemId: ItemId | undefined;
  private roomId: RoomId | undefined;
  private sprintId: SprintId | null = null;
  private title: string | undefined;
  private externalKey: string | null = null;
  private figureTag: string | null = null;
  private roundNumber: number | undefined;
  private mean: number | null | undefined;
  private median: number | null | undefined;
  private modes: readonly number[] | undefined;
  private min: number | null | undefined;
  private max: number | null | undefined;
  private consensus: boolean | undefined;
  private nearConsensus: boolean | undefined;
  private suitDistribution: SuitDistribution | undefined;
  private suitDivergence: boolean | undefined;
  private specialCounts: SpecialCounts | undefined;
  private finalEstimate: string | undefined;
  private finalSuit: string | null = null;
  private estimatedAt: Date | undefined;

  withId(id: HistoryEntryId): this {
    this.id = id;
    return this;
  }

  withTeamId(teamId: TeamId): this {
    this.teamId = teamId;
    return this;
  }

  withItemId(itemId: ItemId): this {
    this.itemId = itemId;
    return this;
  }

  withRoomId(roomId: RoomId): this {
    this.roomId = roomId;
    return this;
  }

  withSprintId(sprintId: SprintId): this {
    this.sprintId = sprintId;
    return this;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withExternalKey(externalKey: string): this {
    this.externalKey = externalKey;
    return this;
  }

  withFigureTag(figureTag: string): this {
    this.figureTag = figureTag;
    return this;
  }

  withRoundNumber(roundNumber: number): this {
    this.roundNumber = roundNumber;
    return this;
  }

  withMean(mean: number | null): this {
    this.mean = mean;
    return this;
  }

  withMedian(median: number | null): this {
    this.median = median;
    return this;
  }

  withModes(modes: readonly number[]): this {
    this.modes = modes;
    return this;
  }

  withMin(min: number | null): this {
    this.min = min;
    return this;
  }

  withMax(max: number | null): this {
    this.max = max;
    return this;
  }

  withConsensus(consensus: boolean): this {
    this.consensus = consensus;
    return this;
  }

  withNearConsensus(nearConsensus: boolean): this {
    this.nearConsensus = nearConsensus;
    return this;
  }

  withSuitDistribution(suitDistribution: SuitDistribution): this {
    this.suitDistribution = suitDistribution;
    return this;
  }

  withSuitDivergence(suitDivergence: boolean): this {
    this.suitDivergence = suitDivergence;
    return this;
  }

  withSpecialCounts(specialCounts: SpecialCounts): this {
    this.specialCounts = specialCounts;
    return this;
  }

  withFinalEstimate(finalEstimate: string): this {
    this.finalEstimate = finalEstimate;
    return this;
  }

  withFinalSuit(finalSuit: string): this {
    this.finalSuit = finalSuit;
    return this;
  }

  withEstimatedAt(estimatedAt: Date): this {
    this.estimatedAt = estimatedAt;
    return this;
  }

  build(): Result<HistoryEntry, AppError> {
    const title = this.title?.trim() ?? "";
    if (
      !this.id ||
      !this.teamId ||
      !this.itemId ||
      !this.roomId ||
      title.length === 0 ||
      this.roundNumber === undefined ||
      this.mean === undefined ||
      this.median === undefined ||
      !this.modes ||
      this.min === undefined ||
      this.max === undefined ||
      this.consensus === undefined ||
      this.nearConsensus === undefined ||
      !this.suitDistribution ||
      this.suitDivergence === undefined ||
      !this.specialCounts ||
      this.finalEstimate === undefined ||
      !this.estimatedAt
    ) {
      return err(createAppError("VALIDATION"));
    }
    return ok(
      HistoryEntry.create({
        id: this.id,
        teamId: this.teamId,
        itemId: this.itemId,
        roomId: this.roomId,
        sprintId: this.sprintId,
        title,
        externalKey: this.externalKey,
        figureTag: this.figureTag,
        roundNumber: this.roundNumber,
        mean: this.mean,
        median: this.median,
        modes: Object.freeze([...this.modes]),
        min: this.min,
        max: this.max,
        consensus: this.consensus,
        nearConsensus: this.nearConsensus,
        suitDistribution: Object.freeze({ ...this.suitDistribution }),
        suitDivergence: this.suitDivergence,
        specialCounts: Object.freeze({ ...this.specialCounts }),
        finalEstimate: this.finalEstimate,
        finalSuit: this.finalSuit,
        estimatedAt: this.estimatedAt,
      }),
    );
  }
}
