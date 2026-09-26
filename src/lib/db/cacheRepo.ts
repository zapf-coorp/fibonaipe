import { db } from './database';
import type { ApiCacheEntry, LocaleCacheEntry } from '@/shared/types';

function nowIso(): string {
  return new Date().toISOString();
}

export async function getLocaleName(cardId: string): Promise<string | null> {
  const row = await db.localeCache.get(cardId);
  return row?.displayNamePtBr ?? null;
}

export async function upsertLocaleName(
  cardId: string,
  displayNamePtBr: string,
  source: LocaleCacheEntry['source'] = 'api',
): Promise<void> {
  if (!displayNamePtBr.trim()) return;
  await db.localeCache.put({
    cardId,
    displayNamePtBr: displayNamePtBr.trim(),
    source,
    updatedAt: nowIso(),
  });
}

export async function getApiCache<T>(cacheKey: string): Promise<T | null> {
  const row = await db.apiCache.get(cacheKey);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await db.apiCache.delete(cacheKey);
    return null;
  }
  return row.payload as T;
}

export async function setApiCache(
  cacheKey: string,
  payload: unknown,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<void> {
  const fetchedAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  const entry: ApiCacheEntry = { cacheKey, payload, fetchedAt, expiresAt };
  await db.apiCache.put(entry);
}
