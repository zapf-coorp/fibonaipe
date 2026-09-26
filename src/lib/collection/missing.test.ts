import { describe, expect, it } from 'vitest';
import { computeMissingCards, isDeckComplete } from './missing';
import type { DeckCardEntry } from '@/shared/types';

describe('computeMissingCards', () => {
  const deck: DeckCardEntry[] = [
    { cardId: 'a', quantity: 3 },
    { cardId: 'b', quantity: 2 },
    { cardId: 'c', quantity: 1 },
  ];

  it('reports shortage when owned < required (Map)', () => {
    const owned = new Map<string, number>([
      ['a', 2],
      ['b', 0],
    ]);
    expect(computeMissingCards(deck, owned)).toEqual([
      { cardId: 'a', required: 3, owned: 2, missing: 1 },
      { cardId: 'b', required: 2, owned: 0, missing: 2 },
      { cardId: 'c', required: 1, owned: 0, missing: 1 },
    ]);
  });

  it('accepts a Record for owned counts', () => {
    const missing = computeMissingCards(deck, { a: 1, b: 2, c: 1 });
    expect(missing).toEqual([{ cardId: 'a', required: 3, owned: 1, missing: 2 }]);
  });

  it('excludes cards where owned >= required', () => {
    const missing = computeMissingCards(deck, { a: 3, b: 5, c: 1 });
    expect(missing).toEqual([]);
  });

  it('treats absent collection entries as owned 0', () => {
    const missing = computeMissingCards([{ cardId: 'x', quantity: 4 }], {});
    expect(missing).toEqual([{ cardId: 'x', required: 4, owned: 0, missing: 4 }]);
  });

  it('returns empty for empty deck', () => {
    expect(computeMissingCards([], { a: 10 })).toEqual([]);
  });
});

describe('isDeckComplete', () => {
  it('is true when nothing is missing', () => {
    expect(
      isDeckComplete(
        [
          { cardId: 'a', quantity: 2 },
          { cardId: 'b', quantity: 1 },
        ],
        { a: 2, b: 1 },
      ),
    ).toBe(true);
  });

  it('is false when any card is short', () => {
    expect(
      isDeckComplete([{ cardId: 'a', quantity: 2 }], { a: 1 }),
    ).toBe(false);
  });

  it('is true for empty deck', () => {
    expect(isDeckComplete([], {})).toBe(true);
  });
});
