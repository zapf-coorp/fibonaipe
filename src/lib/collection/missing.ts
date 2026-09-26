import type { DeckCardEntry, MissingCard } from '@/shared/types';

export function computeMissingCards(
  deckCards: DeckCardEntry[],
  ownedByCardId: Map<string, number> | Record<string, number>,
): MissingCard[] {
  const getOwned = (id: string): number => {
    if (ownedByCardId instanceof Map) return ownedByCardId.get(id) ?? 0;
    return ownedByCardId[id] ?? 0;
  };

  return deckCards
    .map((entry) => {
      const owned = getOwned(entry.cardId);
      const missing = Math.max(0, entry.quantity - owned);
      return {
        cardId: entry.cardId,
        required: entry.quantity,
        owned,
        missing,
      };
    })
    .filter((row) => row.missing > 0);
}

export function isDeckComplete(
  deckCards: DeckCardEntry[],
  ownedByCardId: Map<string, number> | Record<string, number>,
): boolean {
  return computeMissingCards(deckCards, ownedByCardId).length === 0;
}
