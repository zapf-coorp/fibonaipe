import type { HistoryEntryId, ItemId, RoomId, SprintId, TeamId } from "../shared/ids.js";
import type { SpecialCounts, SuitDistribution } from "../stats/compute-round-stats.js";

export type { SpecialCounts, SuitDistribution };

export interface HistoryEntryProps {
  readonly id: HistoryEntryId;
  readonly teamId: TeamId;
  readonly itemId: ItemId;
  readonly roomId: RoomId;
  readonly sprintId: SprintId | null;
  readonly title: string;
  readonly externalKey: string | null;
  readonly figureTag: string | null;
  readonly roundNumber: number;
  readonly mean: number | null;
  readonly median: number | null;
  readonly modes: readonly number[];
  readonly min: number | null;
  readonly max: number | null;
  readonly consensus: boolean;
  readonly nearConsensus: boolean;
  readonly suitDistribution: SuitDistribution;
  readonly suitDivergence: boolean;
  readonly specialCounts: SpecialCounts;
  readonly finalEstimate: string;
  readonly finalSuit: string | null;
  readonly estimatedAt: Date;
}

export class HistoryEntry {
  readonly id: HistoryEntryId;
  readonly teamId: TeamId;
  readonly itemId: ItemId;
  readonly roomId: RoomId;
  readonly sprintId: SprintId | null;
  readonly title: string;
  readonly externalKey: string | null;
  readonly figureTag: string | null;
  readonly roundNumber: number;
  readonly mean: number | null;
  readonly median: number | null;
  readonly modes: readonly number[];
  readonly min: number | null;
  readonly max: number | null;
  readonly consensus: boolean;
  readonly nearConsensus: boolean;
  readonly suitDistribution: SuitDistribution;
  readonly suitDivergence: boolean;
  readonly specialCounts: SpecialCounts;
  readonly finalEstimate: string;
  readonly finalSuit: string | null;
  readonly estimatedAt: Date;

  private constructor(props: HistoryEntryProps) {
    this.id = props.id;
    this.teamId = props.teamId;
    this.itemId = props.itemId;
    this.roomId = props.roomId;
    this.sprintId = props.sprintId;
    this.title = props.title;
    this.externalKey = props.externalKey;
    this.figureTag = props.figureTag;
    this.roundNumber = props.roundNumber;
    this.mean = props.mean;
    this.median = props.median;
    this.modes = props.modes;
    this.min = props.min;
    this.max = props.max;
    this.consensus = props.consensus;
    this.nearConsensus = props.nearConsensus;
    this.suitDistribution = props.suitDistribution;
    this.suitDivergence = props.suitDivergence;
    this.specialCounts = props.specialCounts;
    this.finalEstimate = props.finalEstimate;
    this.finalSuit = props.finalSuit;
    this.estimatedAt = props.estimatedAt;
    Object.freeze(this);
  }

  static create(props: HistoryEntryProps): HistoryEntry {
    return new HistoryEntry(props);
  }
}
