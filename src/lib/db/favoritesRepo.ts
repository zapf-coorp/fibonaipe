import { db } from './database';
import type { FavoriteCard } from '@/shared/types';

function nowIso(): string {
  return new Date().toISOString();
}

export async function listFavoriteCards(): Promise<FavoriteCard[]> {
  return db.favoriteCards.orderBy('createdAt').reverse().toArray();
}

export async function isCardFavorite(cardId: string): Promise<boolean> {
  const row = await db.favoriteCards.get(cardId);
  return Boolean(row);
}

export async function setCardFavorite(cardId: string, favorite: boolean): Promise<void> {
  if (favorite) {
    await db.favoriteCards.put({ cardId, createdAt: nowIso() });
  } else {
    await db.favoriteCards.delete(cardId);
  }
}

export async function toggleCardFavorite(cardId: string): Promise<boolean> {
  const current = await isCardFavorite(cardId);
  await setCardFavorite(cardId, !current);
  return !current;
}
