import { describe, expect, it } from 'vitest';
import { isBasicEnergyCard } from '@/lib/api';
import { MAX_COPIES, addCardToDeck } from '@/lib/deck';
import { computeMissingCards } from '@/lib/collection';
import { parseDeckJson, serializeDeckJson } from '@/lib/portability';
import type { DeckCardEntry } from '@/shared/types';

/**
 * Cross-module smoke coverage for the critical domain pipeline
 * (builder rules → missing cards → JSON portability).
 */
describe('domain pipeline', () => {
  it('builds a legal list, computes shortages, and round-trips JSON', () => {
    let cards: DeckCardEntry[] = [];

    for (let i = 0; i < MAX_COPIES; i++) {
      const r = addCardToDeck(cards, 'trainer-ball');
      expect(r.ok).toBe(true);
      if (r.ok) cards = r.cards;
    }
    expect(addCardToDeck(cards, 'trainer-ball').ok).toBe(false);

    const energyId = 'energy-fire';
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Fire Energy' })).toBe(true);
    for (let i = 0; i < 10; i++) {
      const r = addCardToDeck(cards, energyId, { isBasicEnergy: true });
      expect(r.ok).toBe(true);
      if (r.ok) cards = r.cards;
    }

    const missing = computeMissingCards(cards, { 'trainer-ball': 1, [energyId]: 4 });
    expect(missing).toEqual([
      { cardId: 'trainer-ball', required: 4, owned: 1, missing: 3 },
      { cardId: energyId, required: 10, owned: 4, missing: 6 },
    ]);

    const json = serializeDeckJson({ name: 'Pipeline', cards });
    const parsed = parseDeckJson(json);
    expect(parsed).toEqual({
      ok: true,
      name: 'Pipeline',
      cards,
    });
  });
});
