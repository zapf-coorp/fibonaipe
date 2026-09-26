import { describe, expect, it } from 'vitest';
import {
  MAX_COPIES,
  addCardToDeck,
  getQuantity,
  removeCardFromDeck,
  totalCards,
} from './mutations';
import type { DeckCardEntry } from '@/shared/types';

describe('deck mutations', () => {
  const empty: DeckCardEntry[] = [];

  it('adds a new card at quantity 1', () => {
    const result = addCardToDeck(empty, 'swsh3-136');
    expect(result).toEqual({
      ok: true,
      cards: [{ cardId: 'swsh3-136', quantity: 1 }],
    });
  });

  it('increments an existing card', () => {
    const cards: DeckCardEntry[] = [{ cardId: 'a', quantity: 2 }];
    const result = addCardToDeck(cards, 'a');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getQuantity(result.cards, 'a')).toBe(3);
      expect(totalCards(result.cards)).toBe(3);
    }
  });

  it(`rejects the ${MAX_COPIES + 1}th copy of a limited card`, () => {
    const cards: DeckCardEntry[] = [{ cardId: 'limited', quantity: MAX_COPIES }];
    const result = addCardToDeck(cards, 'limited');
    expect(result).toEqual({ ok: false, reason: 'copyLimit' });
    expect(cards).toEqual([{ cardId: 'limited', quantity: MAX_COPIES }]);
  });

  it('allows basic Energy beyond max copies', () => {
    const cards: DeckCardEntry[] = [{ cardId: 'energy-fire', quantity: MAX_COPIES }];
    const result = addCardToDeck(cards, 'energy-fire', { isBasicEnergy: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(getQuantity(result.cards, 'energy-fire')).toBe(MAX_COPIES + 1);
    }
  });

  it('supports custom delta when adding', () => {
    const result = addCardToDeck(empty, 'ball', { delta: 3 });
    expect(result).toEqual({
      ok: true,
      cards: [{ cardId: 'ball', quantity: 3 }],
    });
  });

  it('rejects delta that would exceed copy limit', () => {
    const cards: DeckCardEntry[] = [{ cardId: 'ball', quantity: 2 }];
    const result = addCardToDeck(cards, 'ball', { delta: 3 });
    expect(result).toEqual({ ok: false, reason: 'copyLimit' });
  });

  it('decrements quantity by 1', () => {
    const cards: DeckCardEntry[] = [
      { cardId: 'a', quantity: 3 },
      { cardId: 'b', quantity: 1 },
    ];
    const next = removeCardFromDeck(cards, 'a');
    expect(getQuantity(next, 'a')).toBe(2);
    expect(getQuantity(next, 'b')).toBe(1);
  });

  it('removes the line item when quantity reaches zero', () => {
    const cards: DeckCardEntry[] = [
      { cardId: 'a', quantity: 1 },
      { cardId: 'b', quantity: 2 },
    ];
    const next = removeCardFromDeck(cards, 'a');
    expect(next).toEqual([{ cardId: 'b', quantity: 2 }]);
  });

  it('remove on missing card is a no-op filter', () => {
    const cards: DeckCardEntry[] = [{ cardId: 'a', quantity: 2 }];
    const next = removeCardFromDeck(cards, 'missing');
    expect(next).toEqual([{ cardId: 'a', quantity: 2 }]);
  });

  it('totalCards sums quantities', () => {
    expect(totalCards([{ cardId: 'a', quantity: 4 }, { cardId: 'b', quantity: 2 }])).toBe(6);
    expect(totalCards([])).toBe(0);
  });
});
