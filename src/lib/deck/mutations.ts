import type { DeckCardEntry } from '@/shared/types';

export const MAX_COPIES = 4;

export type DeckMutationResult =
  | { ok: true; cards: DeckCardEntry[] }
  | { ok: false; reason: 'copyLimit' };

export function totalCards(cards: DeckCardEntry[]): number {
  return cards.reduce((sum, c) => sum + c.quantity, 0);
}

export function getQuantity(cards: DeckCardEntry[], cardId: string): number {
  return cards.find((c) => c.cardId === cardId)?.quantity ?? 0;
}

export function addCardToDeck(
  cards: DeckCardEntry[],
  cardId: string,
  options: { isBasicEnergy?: boolean; delta?: number } = {},
): DeckMutationResult {
  const delta = options.delta ?? 1;
  const current = getQuantity(cards, cardId);
  const nextQty = current + delta;
  if (!options.isBasicEnergy && nextQty > MAX_COPIES) {
    return { ok: false, reason: 'copyLimit' };
  }
  if (current === 0) {
    return { ok: true, cards: [...cards, { cardId, quantity: nextQty }] };
  }
  return {
    ok: true,
    cards: cards.map((c) => (c.cardId === cardId ? { ...c, quantity: nextQty } : c)),
  };
}

export function removeCardFromDeck(
  cards: DeckCardEntry[],
  cardId: string,
  delta = 1,
): DeckCardEntry[] {
  const current = getQuantity(cards, cardId);
  const nextQty = current - delta;
  if (nextQty <= 0) {
    return cards.filter((c) => c.cardId !== cardId);
  }
  return cards.map((c) => (c.cardId === cardId ? { ...c, quantity: nextQty } : c));
}
