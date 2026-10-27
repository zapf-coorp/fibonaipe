import type { Card } from "../scales/card.js";
import { AfkCard, DoubtCard, JokerCard } from "../scales/card.js";
import type { Scale } from "../scales/scale.js";
import { Suit } from "../scales/suit.js";

export interface RoundVote {
  readonly participantId: string;
  readonly card: Card;
  readonly suit: Suit;
}

export interface SpecialCounts {
  readonly "?": number;
  readonly Coringa: number;
  readonly AFK: number;
}

export interface SuitDistribution {
  readonly clubs: number;
  readonly hearts: number;
  readonly spades: number;
  readonly diamonds: number;
}

export interface RoundExtremes {
  readonly minIds: readonly string[];
  readonly maxIds: readonly string[];
}

export interface RoundStats {
  readonly voteCount: number;
  readonly mean: number | null;
  readonly median: number | null;
  readonly modes: readonly number[];
  readonly min: number | null;
  readonly max: number | null;
  readonly consensus: boolean;
  readonly nearConsensus: boolean;
  readonly extremes: RoundExtremes;
  readonly specialCounts: SpecialCounts;
  readonly suitDistribution: SuitDistribution;
  readonly suitDivergence: boolean;
}

interface NumericVote {
  readonly participantId: string;
  readonly value: number;
  readonly label: string;
  readonly suit: Suit;
}

interface TalliedVotes {
  readonly numeric: NumericVote[];
  readonly specialCounts: SpecialCounts;
  readonly suitDistribution: SuitDistribution;
  readonly ordinals: number[];
}

function emptySpecialCounts(): { "?": number; Coringa: number; AFK: number } {
  return { "?": 0, Coringa: 0, AFK: 0 };
}

function emptySuitDistribution(): { clubs: number; hearts: number; spades: number; diamonds: number } {
  return { clubs: 0, hearts: 0, spades: 0, diamonds: 0 };
}

function tally(votes: readonly RoundVote[]): TalliedVotes {
  const numeric: NumericVote[] = [];
  const specialCounts = emptySpecialCounts();
  const suitDistribution = emptySuitDistribution();
  const ordinals: number[] = [];

  for (const vote of votes) {
    if (vote.card.kind === "special") {
      if (vote.card === DoubtCard) specialCounts["?"] += 1;
      else if (vote.card === JokerCard) specialCounts.Coringa += 1;
      else if (vote.card === AfkCard) specialCounts.AFK += 1;
      continue;
    }
    numeric.push({
      participantId: vote.participantId,
      value: vote.card.numeric,
      label: vote.card.label,
      suit: vote.suit,
    });
    if (vote.suit === Suit.clubs) {
      suitDistribution.clubs += 1;
      ordinals.push(4);
    } else if (vote.suit === Suit.hearts) {
      suitDistribution.hearts += 1;
      ordinals.push(3);
    } else if (vote.suit === Suit.spades) {
      suitDistribution.spades += 1;
      ordinals.push(2);
    } else if (vote.suit === Suit.diamonds) {
      suitDistribution.diamonds += 1;
      ordinals.push(1);
    }
  }

  return { numeric, specialCounts, suitDistribution, ordinals };
}

function meanOf(values: readonly number[]): number {
  let sum = 0;
  for (const value of values) sum += value;
  return sum / values.length;
}

function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] as number;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1] as number;
  return (lower + upper) / 2;
}

function modesOf(values: readonly number[]): number[] {
  const counts = new Map<number, number>();
  let highest = 0;
  for (const value of values) {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    if (next > highest) highest = next;
  }
  if (highest <= 1) return [];
  const found: number[] = [];
  for (const [value, count] of counts) {
    if (count === highest) found.push(value);
  }
  found.sort((left, right) => left - right);
  return found;
}

function idsAt(votes: readonly NumericVote[], value: number): string[] {
  const ids: string[] = [];
  for (const vote of votes) {
    if (vote.value === value) ids.push(vote.participantId);
  }
  ids.sort();
  return ids;
}

function labelFor(votes: readonly NumericVote[], value: number): string {
  let label = "";
  for (const vote of votes) {
    if (vote.value === value) label = vote.label;
  }
  return label;
}

function diverges(ordinals: readonly number[]): boolean {
  if (ordinals.length < 2) return false;
  let minOrdinal = ordinals[0] as number;
  let maxOrdinal = minOrdinal;
  for (const ordinal of ordinals) {
    if (ordinal < minOrdinal) minOrdinal = ordinal;
    if (ordinal > maxOrdinal) maxOrdinal = ordinal;
  }
  return maxOrdinal - minOrdinal >= 2;
}

function nearConsensus(scale: Scale, votes: readonly NumericVote[], min: number, max: number, consensus: boolean): boolean {
  if (consensus || votes.length < 2) return false;
  const gap = scale.distance(labelFor(votes, min), labelFor(votes, max));
  return gap !== null && gap <= 1;
}

export function computeRoundStats(scale: Scale, votes: readonly RoundVote[]): RoundStats {
  const tallied = tally(votes);
  const suitDivergence = diverges(tallied.ordinals);
  if (tallied.numeric.length === 0) {
    return {
      voteCount: 0,
      mean: null,
      median: null,
      modes: [],
      min: null,
      max: null,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: tallied.specialCounts,
      suitDistribution: tallied.suitDistribution,
      suitDivergence,
    };
  }

  const values = tallied.numeric.map((vote) => vote.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const consensus = values.length >= 2 && min === max;
  const extremes =
    min === max
      ? { minIds: [], maxIds: [] }
      : { minIds: idsAt(tallied.numeric, min), maxIds: idsAt(tallied.numeric, max) };

  return {
    voteCount: values.length,
    mean: meanOf(values),
    median: medianOf(values),
    modes: modesOf(values),
    min,
    max,
    consensus,
    nearConsensus: nearConsensus(scale, tallied.numeric, min, max, consensus),
    extremes,
    specialCounts: tallied.specialCounts,
    suitDistribution: tallied.suitDistribution,
    suitDivergence,
  };
}
