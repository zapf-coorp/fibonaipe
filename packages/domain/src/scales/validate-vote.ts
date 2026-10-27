import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import { AfkCard, DoubtCard, JokerCard, type Card } from "./card.js";
import type { Scale } from "./scale.js";
import { Suit, isKnownSuit } from "./suit.js";

export interface ValidVote {
  readonly card: Card;
  readonly suit: Suit;
}

function resolveCard(scale: Scale, label: string): Card | null {
  if (label === DoubtCard.label) return DoubtCard;
  if (label === JokerCard.label) return JokerCard;
  if (label === AfkCard.label) return AfkCard;
  for (const card of scale.cards) {
    if (card.label === label) return card;
  }
  return null;
}

export function isValidVote(scale: Scale, label: string, suit: Suit | null): Result<ValidVote, AppError> {
  const card = resolveCard(scale, label);
  if (!card) return err(createAppError("VALIDATION"));
  const resolved = suit ?? Suit.joker;
  if (!isKnownSuit(resolved)) return err(createAppError("VALIDATION"));
  return ok({ card, suit: resolved });
}
