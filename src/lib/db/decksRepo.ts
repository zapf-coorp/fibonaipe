import { db, getActiveDeckId, setActiveDeckId } from './database';
import type { Deck, DeckCardEntry } from '@/shared/types';

function nowIso(): string {
  return new Date().toISOString();
}

export function createDeckId(): string {
  return crypto.randomUUID();
}

export async function listDecks(): Promise<Deck[]> {
  const decks = await db.decks.toArray();
  return decks.sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function getDeck(id: string): Promise<Deck | undefined> {
  return db.decks.get(id);
}

export async function createDeck(name: string): Promise<Deck> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('EMPTY_NAME');
  const stamp = nowIso();
  const deck: Deck = {
    id: createDeckId(),
    name: trimmed,
    cards: [],
    isFavorite: false,
    rating: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.transaction('rw', db.decks, db.settings, async () => {
    await db.decks.add(deck);
    const active = await getActiveDeckId();
    if (!active) await setActiveDeckId(deck.id);
  });
  return deck;
}

export async function renameDeck(id: string, name: string): Promise<Deck> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('EMPTY_NAME');
  const existing = await db.decks.get(id);
  if (!existing) throw new Error('NOT_FOUND');
  const updated: Deck = { ...existing, name: trimmed, updatedAt: nowIso() };
  await db.decks.put(updated);
  return updated;
}

export async function duplicateDeck(id: string, namePrefix: string): Promise<Deck> {
  const existing = await db.decks.get(id);
  if (!existing) throw new Error('NOT_FOUND');
  const stamp = nowIso();
  const copy: Deck = {
    id: createDeckId(),
    name: `${namePrefix} ${existing.name}`.trim(),
    cards: existing.cards.map((c) => ({ ...c })),
    isFavorite: false,
    rating: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.decks.add(copy);
  return copy;
}

export async function deleteDeck(id: string): Promise<void> {
  await db.transaction('rw', db.decks, db.settings, async () => {
    await db.decks.delete(id);
    const active = await getActiveDeckId();
    if (active === id) {
      const next = await db.decks.orderBy('updatedAt').reverse().first();
      await setActiveDeckId(next?.id ?? null);
    }
  });
}

export async function replaceDeckCards(id: string, cards: DeckCardEntry[]): Promise<Deck> {
  const existing = await db.decks.get(id);
  if (!existing) throw new Error('NOT_FOUND');
  const updated: Deck = { ...existing, cards, updatedAt: nowIso() };
  await db.decks.put(updated);
  return updated;
}

export async function updateDeckMeta(
  id: string,
  patch: Partial<Pick<Deck, 'isFavorite' | 'rating' | 'name' | 'cards'>>,
): Promise<Deck> {
  const existing = await db.decks.get(id);
  if (!existing) throw new Error('NOT_FOUND');
  const updated: Deck = { ...existing, ...patch, updatedAt: nowIso() };
  await db.decks.put(updated);
  return updated;
}

export async function importNewDeck(
  name: string,
  cards: DeckCardEntry[],
): Promise<Deck> {
  const stamp = nowIso();
  const deck: Deck = {
    id: createDeckId(),
    name: name.trim() || 'Deck importado',
    cards,
    isFavorite: false,
    rating: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await db.decks.add(deck);
  return deck;
}

export { getActiveDeckId, setActiveDeckId };
