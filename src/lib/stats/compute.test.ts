import { describe, expect, it } from 'vitest';
import { computeDeckStats } from './compute';
import type { CardDetail, DeckCardEntry } from '@/shared/types';

type DetailSlice = Pick<CardDetail, 'types' | 'rarity' | 'attacks' | 'retreat' | 'category'>;

function detail(partial: Partial<DetailSlice> & { id?: string }): DetailSlice {
  return {
    types: partial.types ?? [],
    rarity: partial.rarity ?? null,
    attacks: partial.attacks ?? [],
    retreat: partial.retreat ?? null,
    category: partial.category ?? 'Pokemon',
  };
}

describe('computeDeckStats', () => {
  const cards: DeckCardEntry[] = [
    { cardId: 'fire-mon', quantity: 2 },
    { cardId: 'water-mon', quantity: 3 },
    { cardId: 'trainer', quantity: 4 },
    { cardId: 'no-cost', quantity: 1 },
  ];

  const details = new Map<string, DetailSlice>([
    [
      'fire-mon',
      detail({
        types: ['Fire'],
        rarity: 'Common',
        attacks: [{ name: 'Ember', cost: ['Fire', 'Colorless'], damage: '30', effect: null }],
      }),
    ],
    [
      'water-mon',
      detail({
        types: ['Water'],
        rarity: 'Rare',
        attacks: [{ name: 'Splash', cost: ['Water'], damage: '10', effect: null }],
        retreat: 2,
      }),
    ],
    [
      'trainer',
      detail({
        types: [],
        category: 'Trainer',
        rarity: 'Uncommon',
        attacks: [],
        retreat: null,
      }),
    ],
    [
      'no-cost',
      detail({
        types: ['Colorless'],
        rarity: 'Common',
        attacks: [],
        retreat: null,
      }),
    ],
  ]);

  it('totals cards and unique ids', () => {
    const stats = computeDeckStats(cards, details);
    expect(stats.totalCards).toBe(10);
    expect(stats.uniqueCards).toBe(4);
  });

  it('aggregates types weighted by quantity', () => {
    const stats = computeDeckStats(cards, details);
    const byType = Object.fromEntries(stats.byType.map((b) => [b.key, b.count]));
    expect(byType.Fire).toBe(2);
    expect(byType.Water).toBe(3);
    expect(byType.Trainer).toBe(4);
    expect(byType.Colorless).toBe(1);
  });

  it('rarity buckets sum to total card count', () => {
    const stats = computeDeckStats(cards, details);
    const raritySum = stats.byRarity.reduce((s, b) => s + b.count, 0);
    expect(raritySum).toBe(stats.totalCards);
    expect(Object.fromEntries(stats.byRarity.map((b) => [b.key, b.count]))).toMatchObject({
      Common: 3,
      Rare: 3,
      Uncommon: 4,
    });
  });

  it('uses primary attack cost length, then N/D when unavailable', () => {
    const stats = computeDeckStats(cards, details);
    const byCost = Object.fromEntries(stats.byCost.map((b) => [b.key, b.count]));
    expect(byCost['2']).toBe(2); // fire-mon attack cost length
    expect(byCost['1']).toBe(3); // water-mon attack cost length
    expect(byCost['N/D']).toBe(5); // trainer + no-cost
  });

  it('falls back to retreat when attacks have no cost array usable', () => {
    const retreatOnly = new Map<string, DetailSlice>([
      [
        'x',
        detail({
          types: ['Psychic'],
          rarity: 'Rare',
          attacks: [],
          retreat: 3,
        }),
      ],
    ]);
    const stats = computeDeckStats([{ cardId: 'x', quantity: 2 }], retreatOnly);
    expect(stats.byCost).toEqual([{ key: '3', count: 2 }]);
  });

  it('uses N/D for missing detail entries', () => {
    const stats = computeDeckStats([{ cardId: 'unknown', quantity: 2 }], new Map());
    expect(stats.byType).toEqual([{ key: 'N/D', count: 2 }]);
    expect(stats.byRarity).toEqual([{ key: 'N/D', count: 2 }]);
    expect(stats.byCost).toEqual([{ key: 'N/D', count: 2 }]);
  });
});
