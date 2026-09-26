import type { CardDetail, DeckCardEntry } from '@/shared/types';
import { resolveCardCost } from '@/lib/api';

export type StatBucket = { key: string; count: number };

export type DeckStats = {
  totalCards: number;
  uniqueCards: number;
  byType: StatBucket[];
  byRarity: StatBucket[];
  byCost: StatBucket[];
};

function bump(map: Map<string, number>, key: string, qty: number) {
  map.set(key, (map.get(key) ?? 0) + qty);
}

function toBuckets(map: Map<string, number>): StatBucket[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Aggregates deck composition stats.
 * Cost metric: primary attack cost length, else retreat, else "N/D".
 */
export function computeDeckStats(
  cards: DeckCardEntry[],
  detailsById: Map<string, Pick<CardDetail, 'types' | 'rarity' | 'attacks' | 'retreat' | 'category'>>,
): DeckStats {
  const byType = new Map<string, number>();
  const byRarity = new Map<string, number>();
  const byCost = new Map<string, number>();
  let total = 0;

  for (const entry of cards) {
    total += entry.quantity;
    const detail = detailsById.get(entry.cardId);
    const types = detail?.types?.length ? detail.types : [detail?.category ?? 'N/D'];
    for (const t of types) bump(byType, t || 'N/D', entry.quantity);
    bump(byRarity, detail?.rarity || 'N/D', entry.quantity);
    const cost = detail ? resolveCardCost(detail) : null;
    bump(byCost, cost == null ? 'N/D' : String(cost), entry.quantity);
  }

  return {
    totalCards: total,
    uniqueCards: cards.length,
    byType: toBuckets(byType),
    byRarity: toBuckets(byRarity),
    byCost: [...byCost.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => {
        if (a.key === 'N/D') return 1;
        if (b.key === 'N/D') return -1;
        return Number(a.key) - Number(b.key);
      }),
  };
}
