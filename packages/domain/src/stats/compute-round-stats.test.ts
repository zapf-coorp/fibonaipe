import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { AfkCard, DoubtCard, JokerCard, type Card } from "../scales/card.js";
import { ScaleBuilder } from "../scales/scale-builder.js";
import type { Scale } from "../scales/scale.js";
import { Suit } from "../scales/suit.js";
import { computeRoundStats } from "./compute-round-stats.js";

const QUIET_SPECIALS = { "?": 0, Coringa: 0, AFK: 0 };
const QUIET_SUITS = { clubs: 0, hearts: 0, spades: 0, diamonds: 0 };

type VoteRow = {
  readonly id: string;
  readonly label: string;
  readonly suit: Suit;
};

function fullScale(): Scale {
  const result = ScaleBuilder.fibonacci().withId("fibonacci").withName("Fibonacci").build();
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

function scaleWithout(labels: readonly string[]): Scale {
  const result = ScaleBuilder.fibonacci().withId("fibonacci").withName("Fibonacci").without(...labels).build();
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

function cardFor(scale: Scale, label: string): Card {
  if (label === "?") return DoubtCard;
  if (label === "Coringa") return JokerCard;
  if (label === "AFK") return AfkCard;
  const found = scale.cards.find((card) => card.label === label);
  if (!found) throw new Error(`missing card ${label}`);
  return found;
}

function votes(scale: Scale, rows: readonly VoteRow[]) {
  return rows.map((row) => ({
    participantId: row.id,
    card: cardFor(scale, row.label),
    suit: row.suit,
  }));
}

function numbered(labels: readonly string[], suit: Suit = Suit.joker): VoteRow[] {
  return labels.map((label, index) => ({ id: `p${index}`, label, suit }));
}

describe("computeRoundStats numeric votes", () => {
  it("summarizes [3, 5, 5, 8] without rounding", () => {
    const scale = fullScale();
    const rows = numbered(["3", "5", "5", "8"]);
    const cast = votes(scale, rows);

    expect(computeRoundStats(scale, cast)).toEqual({
      voteCount: 4,
      mean: 5.25,
      median: 5,
      modes: [5],
      min: 3,
      max: 8,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: ["p0"], maxIds: ["p3"] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
    expect(cast.map((vote) => vote.participantId)).toEqual(["p0", "p1", "p2", "p3"]);
  });

  it("marks [5, 5, 5] as consensus and not near-consensus", () => {
    const scale = fullScale();

    expect(computeRoundStats(scale, votes(scale, numbered(["5", "5", "5"])))).toEqual({
      voteCount: 3,
      mean: 5,
      median: 5,
      modes: [5],
      min: 5,
      max: 5,
      consensus: true,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("marks adjacent [3, 5] as near-consensus and averages the two central values", () => {
    const scale = fullScale();

    expect(computeRoundStats(scale, votes(scale, numbered(["3", "5"])))).toEqual({
      voteCount: 2,
      mean: 4,
      median: 4,
      modes: [],
      min: 3,
      max: 5,
      consensus: false,
      nearConsensus: true,
      extremes: { minIds: ["p0"], maxIds: ["p1"] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("leaves modes empty when every numeric value appears once and averages an even split", () => {
    const scale = fullScale();

    expect(computeRoundStats(scale, votes(scale, numbered(["1", "2", "3", "5"])))).toEqual({
      voteCount: 4,
      mean: 2.75,
      median: 2.5,
      modes: [],
      min: 1,
      max: 5,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: ["p0"], maxIds: ["p3"] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("sorts tied modes and extreme participant ids", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "c", label: "5", suit: Suit.joker },
      { id: "a", label: "5", suit: Suit.joker },
      { id: "d", label: "8", suit: Suit.joker },
      { id: "b", label: "8", suit: Suit.joker },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toEqual({
      voteCount: 4,
      mean: 6.5,
      median: 6.5,
      modes: [5, 8],
      min: 5,
      max: 8,
      consensus: false,
      nearConsensus: true,
      extremes: { minIds: ["a", "c"], maxIds: ["b", "d"] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("counts 0 and ½ as numeric values", () => {
    const scale = fullScale();

    expect(computeRoundStats(scale, votes(scale, numbered(["0", "0", "5"])))).toMatchObject({
      voteCount: 3,
      mean: 5 / 3,
      median: 0,
      modes: [0],
      min: 0,
      max: 5,
      consensus: false,
      nearConsensus: false,
    });
    expect(computeRoundStats(scale, votes(scale, numbered(["½", "1"])))).toMatchObject({
      voteCount: 2,
      mean: 0.75,
      median: 0.75,
      modes: [],
      min: 0.5,
      max: 1,
      consensus: false,
      nearConsensus: true,
    });
    expect(computeRoundStats(scale, votes(scale, numbered(["½", "½"])))).toMatchObject({
      voteCount: 2,
      mean: 0.5,
      median: 0.5,
      modes: [0.5],
      min: 0.5,
      max: 0.5,
      consensus: true,
      nearConsensus: false,
    });
  });

  it("measures near-consensus on the active scale", () => {
    const full = fullScale();
    const withoutEight = scaleWithout(["8"]);
    const rows = numbered(["5", "13"]);

    expect(computeRoundStats(full, votes(full, rows))).toMatchObject({
      voteCount: 2,
      mean: 9,
      median: 9,
      modes: [],
      min: 5,
      max: 13,
      consensus: false,
      nearConsensus: false,
    });
    expect(computeRoundStats(withoutEight, votes(withoutEight, rows))).toMatchObject({
      voteCount: 2,
      mean: 9,
      median: 9,
      min: 5,
      max: 13,
      consensus: false,
      nearConsensus: true,
    });
  });

  it("returns null numeric fields for an empty vote list", () => {
    expect(computeRoundStats(fullScale(), [])).toEqual({
      voteCount: 0,
      mean: null,
      median: null,
      modes: [],
      min: null,
      max: null,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });
});

describe("computeRoundStats special cards", () => {
  it("counts one ? and one Coringa card beside a single numeric vote", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "n", label: "5", suit: Suit.joker },
      { id: "q", label: "?", suit: Suit.clubs },
      { id: "c", label: "Coringa", suit: Suit.spades },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toEqual({
      voteCount: 1,
      mean: 5,
      median: 5,
      modes: [],
      min: 5,
      max: 5,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: { "?": 1, Coringa: 1, AFK: 0 },
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("keeps AFK out of the mean, median, and suit distribution", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "low", label: "3", suit: Suit.diamonds },
      { id: "high", label: "5", suit: Suit.diamonds },
      { id: "away", label: "AFK", suit: Suit.clubs },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toEqual({
      voteCount: 2,
      mean: 4,
      median: 4,
      modes: [],
      min: 3,
      max: 5,
      consensus: false,
      nearConsensus: true,
      extremes: { minIds: ["low"], maxIds: ["high"] },
      specialCounts: { "?": 0, Coringa: 0, AFK: 1 },
      suitDistribution: { clubs: 0, hearts: 0, spades: 0, diamonds: 2 },
      suitDivergence: false,
    });
  });

  it("returns null numeric fields when every vote is special", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "q", label: "?", suit: Suit.hearts },
      { id: "c", label: "Coringa", suit: Suit.clubs },
      { id: "away", label: "AFK", suit: Suit.spades },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toEqual({
      voteCount: 0,
      mean: null,
      median: null,
      modes: [],
      min: null,
      max: null,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: { "?": 1, Coringa: 1, AFK: 1 },
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });
});

describe("computeRoundStats suit divergence", () => {
  it("flags clubs against spades while the points still match", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "alto", label: "5", suit: Suit.clubs },
      { id: "baixo", label: "5", suit: Suit.spades },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toEqual({
      voteCount: 2,
      mean: 5,
      median: 5,
      modes: [5],
      min: 5,
      max: 5,
      consensus: true,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: { clubs: 1, hearts: 0, spades: 1, diamonds: 0 },
      suitDivergence: true,
    });
  });

  it("does not flag a one-step gap between hearts and clubs", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "copas", label: "5", suit: Suit.hearts },
      { id: "paus", label: "5", suit: Suit.clubs },
    ];

    expect(computeRoundStats(scale, votes(scale, rows))).toMatchObject({
      consensus: true,
      suitDivergence: false,
      suitDistribution: { clubs: 1, hearts: 1, spades: 0, diamonds: 0 },
    });
  });

  it("ignores suit joker when measuring the ordinal gap", () => {
    const scale = fullScale();
    const onlyJokerBesideClubs: VoteRow[] = [
      { id: "alto", label: "5", suit: Suit.clubs },
      { id: "abstain", label: "5", suit: Suit.joker },
    ];
    const jokerDoesNotWidenGapOne: VoteRow[] = [
      { id: "alto", label: "5", suit: Suit.clubs },
      { id: "meio", label: "5", suit: Suit.hearts },
      { id: "abstain", label: "5", suit: Suit.joker },
    ];
    const jokerDoesNotHideGapTwo: VoteRow[] = [
      { id: "alto", label: "5", suit: Suit.clubs },
      { id: "baixo", label: "5", suit: Suit.spades },
      { id: "abstain", label: "5", suit: Suit.joker },
    ];

    expect(computeRoundStats(scale, votes(scale, onlyJokerBesideClubs))).toMatchObject({
      voteCount: 2,
      consensus: true,
      suitDivergence: false,
      suitDistribution: { clubs: 1, hearts: 0, spades: 0, diamonds: 0 },
    });
    expect(computeRoundStats(scale, votes(scale, jokerDoesNotWidenGapOne))).toMatchObject({
      voteCount: 3,
      consensus: true,
      suitDivergence: false,
      suitDistribution: { clubs: 1, hearts: 1, spades: 0, diamonds: 0 },
    });
    expect(computeRoundStats(scale, votes(scale, jokerDoesNotHideGapTwo))).toMatchObject({
      voteCount: 3,
      consensus: true,
      suitDivergence: true,
      suitDistribution: { clubs: 1, hearts: 0, spades: 1, diamonds: 0 },
    });
  });
});

describe("computeRoundStats purity", () => {
  it("is unchanged when the same votes are reordered", () => {
    const scale = fullScale();
    const rows: VoteRow[] = [
      { id: "p0", label: "3", suit: Suit.diamonds },
      { id: "p1", label: "5", suit: Suit.hearts },
      { id: "p2", label: "5", suit: Suit.clubs },
      { id: "p3", label: "8", suit: Suit.spades },
      { id: "p4", label: "?", suit: Suit.joker },
    ];
    const shuffled: VoteRow[] = [rows[2], rows[4], rows[0], rows[3], rows[1]].filter(
      (row): row is VoteRow => row !== undefined,
    );
    const labelsBefore = scale.cards.map((card) => card.label);

    expect(computeRoundStats(scale, votes(scale, shuffled))).toEqual(computeRoundStats(scale, votes(scale, rows)));
    expect(scale.cards.map((card) => card.label)).toEqual(labelsBefore);
  });

  it("does not mutate an earlier round when a later round is summarized", () => {
    const scale = fullScale();
    const early = computeRoundStats(scale, votes(scale, numbered(["5"])));

    computeRoundStats(
      scale,
      votes(scale, [
        { id: "p0", label: "13", suit: Suit.clubs },
        { id: "p1", label: "1", suit: Suit.diamonds },
      ]),
    );

    expect(early).toEqual({
      voteCount: 1,
      mean: 5,
      median: 5,
      modes: [],
      min: 5,
      max: 5,
      consensus: false,
      nearConsensus: false,
      extremes: { minIds: [], maxIds: [] },
      specialCounts: QUIET_SPECIALS,
      suitDistribution: QUIET_SUITS,
      suitDivergence: false,
    });
  });

  it("keeps min <= median <= max, min <= mean <= max, and reverse-order equality", () => {
    const scale = fullScale();
    const labels = ["0", "½", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "Coringa", "AFK"] as const;

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            participantId: fc.integer({ min: 0, max: 999 }).map((value) => `p${value}`),
            label: fc.constantFrom(...labels),
            suit: fc.constantFrom(Suit.clubs, Suit.hearts, Suit.spades, Suit.diamonds, Suit.joker),
          }),
          { maxLength: 12 },
        ),
        (rows) => {
          const cast = rows.map((row) => ({
            participantId: row.participantId,
            card: cardFor(scale, row.label),
            suit: row.suit,
          }));
          const forward = computeRoundStats(scale, cast);
          const backward = computeRoundStats(scale, [...cast].reverse());
          if (JSON.stringify(forward) !== JSON.stringify(backward)) return false;
          if (forward.voteCount === 0) {
            return forward.mean === null && forward.median === null && forward.min === null && forward.max === null;
          }
          const { min, max, mean, median } = forward;
          if (min === null || max === null || mean === null || median === null) return false;
          return min <= median && median <= max && min <= mean && mean <= max;
        },
      ),
      { numRuns: 100 },
    );
  });
});
