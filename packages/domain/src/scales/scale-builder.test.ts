import { describe, expect, it } from "vitest";
import { AfkCard, DoubtCard, JokerCard } from "./card.js";
import { FIGURE_TAGS, parseFigureTag } from "./figure-tag.js";
import { ScaleBuilder } from "./scale-builder.js";
import type { Scale } from "./scale.js";
import { Suit, parseSuit } from "./suit.js";
import { isValidVote } from "./validate-vote.js";

const CANONICAL: readonly (readonly [string, number])[] = [
  ["0", 0],
  ["½", 0.5],
  ["1", 1],
  ["2", 2],
  ["3", 3],
  ["5", 5],
  ["8", 8],
  ["13", 13],
  ["21", 21],
  ["34", 34],
  ["55", 55],
  ["89", 89],
];

function buildNamed(adjust: (builder: ScaleBuilder) => ScaleBuilder = (builder) => builder) {
  return adjust(ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci")).build();
}

function deck(adjust?: (builder: ScaleBuilder) => ScaleBuilder): Scale {
  const result = buildNamed(adjust);
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

describe("ScaleBuilder fibonacci", () => {
  it("builds the canonical deck with half as 0.5 and the label ½", () => {
    const scale = deck();

    expect(scale.id).toBe("scale-1");
    expect(scale.name).toBe("Fibonacci");
    expect(scale.cards.map((card) => [card.label, card.numeric, card.kind])).toEqual(
      CANONICAL.map(([label, numeric]) => [label, numeric, "numeric"]),
    );
    expect(new Set(scale.cards.map((card) => card.label)).size).toBe(CANONICAL.length);
    expect(Object.isFrozen(scale)).toBe(true);
    expect(Object.isFrozen(scale.cards)).toBe(true);
    expect(scale.cards.every((card) => Object.isFrozen(card))).toBe(true);
  });

  it("keeps caller id and name when the deck is reduced to two cards", () => {
    const result = ScaleBuilder.fibonacci().withId("room-scale").withName("Sprint deck").only("8", "5").build();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe("room-scale");
    expect(result.value.name).toBe("Sprint deck");
    expect(result.value.cards.map((card) => card.label)).toEqual(["5", "8"]);
    expect(result.value.cards.map((card) => card.numeric)).toEqual([5, 8]);
  });
});

describe("ScaleBuilder without and only", () => {
  it("drops the host's unused Fibonacci cards and validates the remaining subset", () => {
    const scale = deck((builder) => builder.without("0", "½", "34", "55", "89"));

    expect(scale.cards.map((card) => card.label)).toEqual(["1", "2", "3", "5", "8", "13", "21"]);
    expect(scale.indexOf("5")).toBe(3);
    expect(scale.indexOf("0")).toBeNull();

    for (const label of ["0", "½", "34", "55", "89", "4"]) {
      const rejected = isValidVote(scale, label, Suit.spades);
      expect({ label, ok: rejected.ok }).toEqual({ label, ok: false });
      if (!rejected.ok) expect(rejected.error.code).toBe("VALIDATION");
    }

    for (const label of ["1", "2", "3", "5", "8", "13", "21", "?", "Coringa", "AFK"]) {
      expect(isValidVote(scale, label, Suit.hearts).ok).toBe(true);
    }
  });

  it("applies successive without calls to the same deck", () => {
    const scale = deck((builder) => builder.without("0").without("½", "34", "55", "89"));

    expect(scale.cards.map((card) => card.label)).toEqual(["1", "2", "3", "5", "8", "13", "21"]);
  });

  it("ignores unknown without labels and still returns the full numeric deck", () => {
    const scale = deck((builder) => builder.without("nope", "?", "Coringa", "AFK"));

    expect(scale.cards.map((card) => card.label)).toEqual(CANONICAL.map(([label]) => label));
  });

  it("keeps only the requested numeric cards in canonical order", () => {
    const scale = deck((builder) => builder.only("21", "½", "8"));

    expect(scale.cards.map((card) => [card.label, card.numeric])).toEqual([
      ["½", 0.5],
      ["8", 8],
      ["21", 21],
    ]);
  });

  it("returns VALIDATION when only one numeric card remains", () => {
    const onlyOne = ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci").only("13").build();
    const removedDownToOne = ScaleBuilder.fibonacci()
      .withId("scale-1")
      .withName("Fibonacci")
      .without("0", "½", "2", "3", "5", "8", "13", "21", "34", "55", "89")
      .build();
    const none = ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci").only().build();

    for (const result of [onlyOne, removedDownToOne, none]) {
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("VALIDATION");
    }
  });

  it("returns VALIDATION when only selects a label outside the canonical deck", () => {
    const result = ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci").only("5", "4").build();
    const specials = ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci").only("5", "8", "?").build();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION");
    expect(specials.ok).toBe(false);
    if (!specials.ok) expect(specials.error.code).toBe("VALIDATION");
  });
});

describe("indexOf and distance", () => {
  it("measures adjacent Fibonacci labels as distance 1", () => {
    const scale = deck();

    expect(scale.indexOf("0")).toBe(0);
    expect(scale.indexOf("½")).toBe(1);
    expect(scale.indexOf("5")).toBe(5);
    expect(scale.indexOf("8")).toBe(6);
    expect(scale.indexOf("89")).toBe(11);
    expect(scale.distance("5", "8")).toBe(1);
    expect(scale.distance("8", "5")).toBe(1);
    expect(scale.distance("5", "5")).toBe(0);
    expect(scale.distance("5", "13")).toBe(2);
    expect(scale.distance("0", "½")).toBe(1);
  });

  it("uses the active subset and returns null for specials or missing labels", () => {
    const full = deck();
    const withoutEight = deck((builder) => builder.without("8"));

    expect(full.distance("5", "13")).toBe(2);
    expect(withoutEight.distance("5", "13")).toBe(1);
    expect(withoutEight.indexOf("13")).toBe(6);
    for (const label of ["?", "Coringa", "AFK", "4"]) {
      expect(full.indexOf(label)).toBeNull();
      expect(full.distance(label, "5")).toBeNull();
      expect(full.distance("5", label)).toBeNull();
    }
  });
});

describe("suits", () => {
  it("ranks clubs, hearts, spades, diamonds, and joker abstention", () => {
    expect(Suit.clubs).toMatchObject({ kind: "clubs", ordinal: 4, labelKey: "suits.clubs", label: "♣ Alto" });
    expect(Suit.hearts).toMatchObject({ kind: "hearts", ordinal: 3, labelKey: "suits.hearts", label: "♥ Médio" });
    expect(Suit.spades).toMatchObject({ kind: "spades", ordinal: 2, labelKey: "suits.spades", label: "♠ Baixo" });
    expect(Suit.diamonds).toMatchObject({
      kind: "diamonds",
      ordinal: 1,
      labelKey: "suits.diamonds",
      label: "♦ Insignificante",
    });
    expect(Suit.joker).toMatchObject({ kind: "joker", ordinal: null, labelKey: "suits.joker", label: "Coringa" });
    expect(Object.isFrozen(Suit.clubs)).toBe(true);
    expect(Object.isFrozen(Suit.joker)).toBe(true);
  });

  it("parses the five suit kinds and rejects unknown suits", () => {
    const accepted = [
      ["clubs", Suit.clubs],
      ["hearts", Suit.hearts],
      ["spades", Suit.spades],
      ["diamonds", Suit.diamonds],
      ["joker", Suit.joker],
    ] as const;

    for (const [kind, suit] of accepted) {
      const parsed = parseSuit(kind);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.value).toBe(suit);
    }

    for (const value of ["", "red", "♣", "Paus", "4", "Coringa", "jokers"]) {
      const parsed = parseSuit(value);
      expect({ value, ok: parsed.ok }).toEqual({ value, ok: false });
      if (!parsed.ok) expect(parsed.error.code).toBe("VALIDATION");
    }
  });
});

describe("special cards and isValidVote", () => {
  it("keeps ?, Coringa, and AFK off the numeric deck", () => {
    expect(DoubtCard).toMatchObject({ label: "?", numeric: null, kind: "special" });
    expect(JokerCard).toMatchObject({ label: "Coringa", numeric: null, kind: "special" });
    expect(AfkCard).toMatchObject({ label: "AFK", numeric: null, kind: "special" });
    expect(Object.isFrozen(DoubtCard)).toBe(true);
    expect(Object.isFrozen(JokerCard)).toBe(true);
    expect(Object.isFrozen(AfkCard)).toBe(true);
    expect(deck().cards.some((card) => card.kind === "special" || card.numeric === null)).toBe(false);
  });

  it("accepts a scale card and stores a missing suit as joker", () => {
    const scale = deck();
    const stored = isValidVote(scale, "5", null);
    const zero = isValidVote(scale, "0", Suit.diamonds);
    const half = isValidVote(scale, "½", Suit.hearts);

    expect(stored.ok).toBe(true);
    if (stored.ok) {
      expect(stored.value.suit).toBe(Suit.joker);
      expect(stored.value.card).toMatchObject({ label: "5", numeric: 5, kind: "numeric" });
    }
    expect(zero.ok).toBe(true);
    if (zero.ok) expect(zero.value.card).toMatchObject({ label: "0", numeric: 0, kind: "numeric" });
    expect(half.ok).toBe(true);
    if (half.ok) expect(half.value.card).toMatchObject({ label: "½", numeric: 0.5, kind: "numeric" });
  });

  it("accepts the three special cards and rejects an unknown card or suit", () => {
    const scale = deck();
    const doubt = isValidVote(scale, "?", Suit.clubs);
    const joker = isValidVote(scale, "Coringa", Suit.joker);
    const afk = isValidVote(scale, "AFK", null);
    const missing = isValidVote(scale, "4", Suit.spades);
    const impostor = { kind: "stars", ordinal: 9, labelKey: "suits.stars", label: "Stars" } as Suit;
    const unknownSuit = isValidVote(scale, "8", impostor);

    expect(doubt.ok).toBe(true);
    if (doubt.ok) expect(doubt.value.card).toBe(DoubtCard);
    expect(joker.ok).toBe(true);
    if (joker.ok) expect(joker.value.card).toBe(JokerCard);
    expect(afk.ok).toBe(true);
    if (afk.ok) {
      expect(afk.value.card).toBe(AfkCard);
      expect(afk.value.suit).toBe(Suit.joker);
    }
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.code).toBe("VALIDATION");
    expect(unknownSuit.ok).toBe(false);
    if (!unknownSuit.ok) expect(unknownSuit.error.code).toBe("VALIDATION");
  });
});

describe("figure tags", () => {
  it("accepts only the closed set A, K, Q, and J", () => {
    expect(FIGURE_TAGS).toEqual(["A", "K", "Q", "J"]);

    for (const tag of FIGURE_TAGS) {
      const parsed = parseFigureTag(tag);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(parsed.value).toBe(tag);
    }

    for (const tag of ["", "a", "j", "Feature", "Bug", "Tech Debt", "Spike", "10", " A"]) {
      const parsed = parseFigureTag(tag);
      expect({ tag, ok: parsed.ok }).toEqual({ tag, ok: false });
      if (!parsed.ok) expect(parsed.error.code).toBe("VALIDATION");
    }
  });
});
