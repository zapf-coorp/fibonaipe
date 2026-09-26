import { describe, expect, it } from 'vitest';
import { isBasicEnergyCard, mapCardToDetail } from './mappers';
import { resolveCardCost } from './client';

describe('isBasicEnergyCard', () => {
  it('identifies English basic Energy by name', () => {
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Fire Energy' })).toBe(true);
  });

  it('identifies pt-BR basic Energy hints', () => {
    expect(isBasicEnergyCard({ category: 'Energia', name: 'Energia de Fogo' })).toBe(true);
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Água', stage: 'Basic' })).toBe(true);
  });

  it('rejects names/stages marked special/unit/prism', () => {
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Special Metal Energy' })).toBe(false);
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Unit Energy FDY' })).toBe(false);
    expect(isBasicEnergyCard({ category: 'Energy', name: 'Prism Energy' })).toBe(false);
  });

  it('rejects non-Energy categories', () => {
    expect(isBasicEnergyCard({ category: 'Pokemon', name: 'Fire Energy' })).toBe(false);
    expect(isBasicEnergyCard({ category: 'Trainer', name: 'Basic Ball' })).toBe(false);
  });
});

describe('resolveCardCost', () => {
  it('prefers primary attack cost length', () => {
    expect(
      resolveCardCost({
        attacks: [{ name: 'Hit', cost: ['F', 'C', 'C'], damage: null, effect: null }],
        retreat: 1,
      }),
    ).toBe(3);
  });

  it('falls back to retreat', () => {
    expect(resolveCardCost({ attacks: [], retreat: 2 })).toBe(2);
  });

  it('returns null when neither is available', () => {
    expect(resolveCardCost({ attacks: [], retreat: null })).toBeNull();
  });
});

describe('mapCardToDetail', () => {
  it('sets isBasicEnergy from mapper heuristics', () => {
    const detail = mapCardToDetail(
      {
        id: 'base1-97',
        name: 'Fire Energy',
        category: 'Energy',
        localId: '97',
      },
      'Energia de Fogo',
    );
    expect(detail.isBasicEnergy).toBe(true);
    expect(detail.category).toBe('Energy');
    expect(detail.displayName).toBe('Energia de Fogo');
  });
});
