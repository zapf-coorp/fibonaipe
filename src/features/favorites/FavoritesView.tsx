import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { Heart } from 'lucide-react';
import { getCardById } from '@/lib/api';
import { listDecks, listFavoriteCards, setCardFavorite, updateDeckMeta } from '@/lib/db';
import type { Deck, FavoriteCard } from '@/shared/types';
import { strings } from '@/shared/i18n/pt-BR';
import { CardImage } from '@/shared/ui/CardImage';
import { EmptyState } from '@/shared/ui/EmptyState';
import { totalCards } from '@/lib/deck';
import styles from './FavoritesView.module.css';

type Tab = 'cards' | 'decks';

export function FavoritesView() {
  const [tab, setTab] = useState<Tab>('cards');
  const [favCards, setFavCards] = useState<FavoriteCard[]>([]);
  const [favDecks, setFavDecks] = useState<Deck[]>([]);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const cards = await listFavoriteCards();
      const decks = (await listDecks()).filter((d) => d.isFavorite);
      return { cards, decks };
    }).subscribe({
      next: (v) => {
        setFavCards(v.cards);
        setFavDecks(v.decks);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  const detailQueries = useQueries({
    queries: favCards.map((c) => ({
      queryKey: ['cards', 'detail', c.cardId],
      queryFn: () => getCardById(c.cardId),
      staleTime: 60_000,
    })),
  });

  const details = new Map(
    detailQueries.filter((q) => q.data).map((q) => [q.data!.id, q.data!] as const),
  );

  return (
    <section className={styles.section}>
      <h1>{strings.favorites.title}</h1>

      <div className={styles.tabs} role="tablist" aria-label={strings.favorites.title}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'cards'}
          className={tab === 'cards' ? styles.active : ''}
          onClick={() => setTab('cards')}
        >
          {strings.favorites.cardsTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'decks'}
          className={tab === 'decks' ? styles.active : ''}
          onClick={() => setTab('decks')}
        >
          {strings.favorites.decksTab}
        </button>
      </div>

      {tab === 'cards' && favCards.length === 0 && (
        <EmptyState title={strings.favorites.emptyCards} />
      )}

      {tab === 'cards' && favCards.length > 0 && (
        <ul className={styles.grid}>
          {favCards.map((fav) => {
            const card = details.get(fav.cardId);
            return (
              <li key={fav.cardId} className={styles.item}>
                <Link to={`/cartas/${encodeURIComponent(fav.cardId)}`}>
                  <CardImage
                    src={card?.imageUrl ?? null}
                    alt={card?.displayName ?? fav.cardId}
                  />
                  <span>{card?.displayName ?? fav.cardId}</span>
                </Link>
                <button
                  type="button"
                  className={styles.unfav}
                  aria-label={strings.card.unfavorite}
                  onClick={() => void setCardFavorite(fav.cardId, false)}
                >
                  <Heart size={16} fill="currentColor" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'decks' && favDecks.length === 0 && (
        <EmptyState title={strings.favorites.emptyDecks} />
      )}

      {tab === 'decks' && favDecks.length > 0 && (
        <ul className={styles.deckList}>
          {favDecks.map((deck) => (
            <li key={deck.id} className={styles.deckRow}>
              <Link to={`/decks/${deck.id}`}>
                <strong>{deck.name}</strong>
                <span>
                  {totalCards(deck.cards)} {strings.deck.cards}
                  {deck.rating != null ? ` · ${deck.rating}★` : ''}
                </span>
              </Link>
              <button
                type="button"
                aria-label={strings.deck.unfavorite}
                onClick={() => void updateDeckMeta(deck.id, { isFavorite: false })}
              >
                <Heart size={16} fill="currentColor" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
