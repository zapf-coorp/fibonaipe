import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";

export type SuitKind = "clubs" | "hearts" | "spades" | "diamonds" | "joker";

export class Suit {
  readonly kind: SuitKind;
  readonly ordinal: 1 | 2 | 3 | 4 | null;
  readonly labelKey: string;
  readonly label: string;

  private constructor(kind: SuitKind, ordinal: 1 | 2 | 3 | 4 | null, labelKey: string, label: string) {
    this.kind = kind;
    this.ordinal = ordinal;
    this.labelKey = labelKey;
    this.label = label;
    Object.freeze(this);
  }

  static readonly clubs = new Suit("clubs", 4, "suits.clubs", "♣ Alto");
  static readonly hearts = new Suit("hearts", 3, "suits.hearts", "♥ Médio");
  static readonly spades = new Suit("spades", 2, "suits.spades", "♠ Baixo");
  static readonly diamonds = new Suit("diamonds", 1, "suits.diamonds", "♦ Insignificante");
  static readonly joker = new Suit("joker", null, "suits.joker", "Coringa");
}

const SUITS_BY_KIND: Readonly<Record<string, Suit>> = {
  clubs: Suit.clubs,
  hearts: Suit.hearts,
  spades: Suit.spades,
  diamonds: Suit.diamonds,
  joker: Suit.joker,
};

export function parseSuit(value: string): Result<Suit, AppError> {
  const suit = SUITS_BY_KIND[value];
  if (!suit) return err(createAppError("VALIDATION"));
  return ok(suit);
}

export function isKnownSuit(suit: Suit): boolean {
  return (
    suit === Suit.clubs ||
    suit === Suit.hearts ||
    suit === Suit.spades ||
    suit === Suit.diamonds ||
    suit === Suit.joker
  );
}
