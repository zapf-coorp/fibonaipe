import { db } from './database';
import type { CollectionEntry } from '@/shared/types';

function nowIso(): string {
  return new Date().toISOString();
}

export async function getOwned(cardId: string): Promise<number> {
  const row = await db.collection.get(cardId);
  return row?.ownedCount ?? 0;
}

export async function setOwned(cardId: string, ownedCount: number): Promise<CollectionEntry> {
  const count = Math.max(0, Math.floor(ownedCount));
  const entry: CollectionEntry = {
    cardId,
    ownedCount: count,
    updatedAt: nowIso(),
  };
  if (count === 0) {
    await db.collection.delete(cardId);
  } else {
    await db.collection.put(entry);
  }
  return entry;
}

export async function adjustOwned(cardId: string, delta: number): Promise<number> {
  const current = await getOwned(cardId);
  const next = Math.max(0, current + delta);
  await setOwned(cardId, next);
  return next;
}

export async function listCollection(): Promise<CollectionEntry[]> {
  return db.collection.orderBy('updatedAt').reverse().toArray();
}

export async function getOwnedMap(cardIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (cardIds.length === 0) return map;
  const rows = await db.collection.bulkGet(cardIds);
  rows.forEach((row, i) => {
    map.set(cardIds[i]!, row?.ownedCount ?? 0);
  });
  return map;
}
