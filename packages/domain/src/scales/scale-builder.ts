import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import { type Card, type NumericCard } from "./card.js";
import { createScale, type Scale } from "./scale.js";

function numericCard(label: string, numeric: number): NumericCard {
  const card: NumericCard = { label, numeric, kind: "numeric" };
  Object.freeze(card);
  return card;
}

const FIBONACCI_CARDS: readonly NumericCard[] = Object.freeze([
  numericCard("0", 0),
  numericCard("½", 0.5),
  numericCard("1", 1),
  numericCard("2", 2),
  numericCard("3", 3),
  numericCard("5", 5),
  numericCard("8", 8),
  numericCard("13", 13),
  numericCard("21", 21),
  numericCard("34", 34),
  numericCard("55", 55),
  numericCard("89", 89),
]);

const FIBONACCI_LABELS = new Set(FIBONACCI_CARDS.map((card) => card.label));

export class ScaleBuilder {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly cards: readonly Card[],
    private readonly invalid: boolean,
  ) {}

  static fibonacci(): ScaleBuilder {
    return new ScaleBuilder("", "", FIBONACCI_CARDS, false);
  }

  withId(id: string): ScaleBuilder {
    return new ScaleBuilder(id, this.name, this.cards, this.invalid);
  }

  withName(name: string): ScaleBuilder {
    return new ScaleBuilder(this.id, name, this.cards, this.invalid);
  }

  without(...labels: readonly string[]): ScaleBuilder {
    const drop = new Set(labels);
    const cards = this.cards.filter((card) => !drop.has(card.label));
    return new ScaleBuilder(this.id, this.name, cards, this.invalid);
  }

  only(...labels: readonly string[]): ScaleBuilder {
    for (const label of labels) {
      if (!FIBONACCI_LABELS.has(label)) {
        return new ScaleBuilder(this.id, this.name, [], true);
      }
    }
    const requested = new Set(labels);
    const cards = FIBONACCI_CARDS.filter((card) => requested.has(card.label));
    return new ScaleBuilder(this.id, this.name, cards, false);
  }

  build(): Result<Scale, AppError> {
    if (this.invalid || this.cards.length < 2) {
      return err(createAppError("VALIDATION"));
    }
    return ok(createScale(this.id, this.name, this.cards));
  }
}
