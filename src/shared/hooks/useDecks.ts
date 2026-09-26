import { useCallback, useEffect, useState } from 'react';
import {
  getActiveDeckId,
  getDeck,
  listDecks,
  setActiveDeckId as persistActiveDeckId,
} from '@/lib/db';
import type { Deck } from '@/shared/types';
import { liveQuery } from 'dexie';
import { db } from '@/lib/db/database';

export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = liveQuery(() => listDecks()).subscribe({
      next: (value) => {
        setDecks(value);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
    return () => sub.unsubscribe();
  }, []);

  return { decks, loading };
}

export function useActiveDeck() {
  const [activeDeckId, setActiveDeckIdState] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const id = await getActiveDeckId();
      const deck = id ? ((await getDeck(id)) ?? null) : null;
      return { id, deck };
    }).subscribe({
      next: ({ id, deck }) => {
        setActiveDeckIdState(id);
        setActiveDeck(deck);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const setActive = useCallback(async (id: string | null) => {
    await persistActiveDeckId(id);
  }, []);

  return { activeDeckId, activeDeck, setActive };
}

export function useDeck(deckId: string | undefined) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deckId) {
      setDeck(null);
      setLoading(false);
      return;
    }
    const sub = liveQuery(() => db.decks.get(deckId)).subscribe({
      next: (value) => {
        setDeck(value ?? null);
        setLoading(false);
      },
      error: () => setLoading(false),
    });
    return () => sub.unsubscribe();
  }, [deckId]);

  return { deck, loading };
}
