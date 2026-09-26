import { useQueries } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { Minus, Plus, Heart, Star } from 'lucide-react';
import { getCardById } from '@/lib/api';
import { setActiveDeckId, updateDeckMeta } from '@/lib/db';
import { totalCards } from '@/lib/deck';
import { computeDeckStats } from '@/lib/stats';
import { useDeck } from '@/shared/hooks/useDecks';
import { useDeckActions } from '@/features/decks/useDeckActions';
import { DeckPortabilityPanel } from '@/features/portability/DeckPortabilityPanel';
import { strings } from '@/shared/i18n/pt-BR';
import { CardImage } from '@/shared/ui/CardImage';
import { EmptyState } from '@/shared/ui/EmptyState';
import styles from './DeckDetailView.module.css';

export function DeckDetailView() {
  const { deckId } = useParams();
  const { deck, loading } = useDeck(deckId);
  const { decreaseInDeck, increaseInDeck } = useDeckActions();

  const detailQueries = useQueries({
    queries: (deck?.cards ?? []).map((c) => ({
      queryKey: ['cards', 'detail', c.cardId],
      queryFn: () => getCardById(c.cardId),
      staleTime: 60_000,
    })),
  });

  if (loading) return <p className={styles.muted}>{strings.common.loading}</p>;
  if (!deck) return <EmptyState title={strings.common.error} />;

  const detailsMap = new Map(
    detailQueries.filter((q) => q.data).map((q) => [q.data!.id, q.data!] as const),
  );
  const stats = computeDeckStats(deck.cards, detailsMap);
  const count = totalCards(deck.cards);
  const softWarn =
    count !== 60 ? strings.deck.softSizeWarning.replace('{count}', String(count)) : null;

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <Link to="/decks">{strings.nav.decks}</Link>
          </p>
          <h1>{deck.name}</h1>
          <p className={styles.meta}>
            {count} {strings.deck.cards} · {stats.uniqueCards} {strings.deck.unique}
          </p>
          {softWarn ? <p className={styles.warn}>{softWarn}</p> : null}
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label={deck.isFavorite ? strings.deck.unfavorite : strings.deck.favorite}
            onClick={() => void updateDeckMeta(deck.id, { isFavorite: !deck.isFavorite })}
          >
            <Heart size={18} fill={deck.isFavorite ? 'currentColor' : 'none'} />
          </button>
          <div className={styles.stars} role="group" aria-label={strings.deck.rating}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={strings.deck.setRating.replace('{n}', String(n))}
                onClick={() =>
                  void updateDeckMeta(deck.id, { rating: deck.rating === n ? null : n })
                }
              >
                <Star
                  size={16}
                  fill={deck.rating != null && deck.rating >= n ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.selectBtn}
            onClick={() => void setActiveDeckId(deck.id)}
          >
            {strings.deck.select}
          </button>
        </div>
      </header>

      <div className={styles.columns}>
        <div>
          <h2>{strings.deck.composition}</h2>
          {deck.cards.length === 0 ? (
            <EmptyState title={strings.search.emptyQuery} description={strings.deck.pickOrCreate} />
          ) : (
            <ul className={styles.cards}>
              {deck.cards.map((entry) => {
                const detail = detailsMap.get(entry.cardId);
                return (
                  <li key={entry.cardId} className={styles.cardRow}>
                    <Link to={`/cartas/${encodeURIComponent(entry.cardId)}`} className={styles.thumb}>
                      <CardImage
                        src={detail?.imageUrl ?? null}
                        alt={detail?.displayName ?? entry.cardId}
                      />
                    </Link>
                    <div className={styles.cardMeta}>
                      <Link to={`/cartas/${encodeURIComponent(entry.cardId)}`}>
                        {detail?.displayName ?? entry.cardId}
                      </Link>
                      <div className={styles.qty}>
                        <button
                          type="button"
                          aria-label={strings.deck.decrease}
                          onClick={() => void decreaseInDeck(deck.id, entry.cardId)}
                        >
                          <Minus size={16} />
                        </button>
                        <strong>{entry.quantity}</strong>
                        <button
                          type="button"
                          aria-label={strings.deck.increase}
                          onClick={() =>
                            void increaseInDeck(deck.id, entry.cardId, detail?.isBasicEnergy)
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className={styles.aside}>
          <h2>{strings.deck.stats}</h2>
          {stats.totalCards === 0 ? (
            <EmptyState title={strings.analysis.empty} />
          ) : (
            <div className={styles.stats}>
              <p>
                {strings.analysis.total}: <strong>{stats.totalCards}</strong>
              </p>
              <p>
                {strings.analysis.unique}: <strong>{stats.uniqueCards}</strong>
              </p>
              <StatBlock title={strings.analysis.types} buckets={stats.byType} />
              <StatBlock title={strings.analysis.rarity} buckets={stats.byRarity} />
              <StatBlock title={strings.analysis.costCurve} buckets={stats.byCost} />
            </div>
          )}

          <DeckPortabilityPanel deck={deck} detailsById={detailsMap} />
        </aside>
      </div>
    </section>
  );
}

function StatBlock({
  title,
  buckets,
}: {
  title: string;
  buckets: { key: string; count: number }[];
}) {
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className={styles.statBlock}>
      <h3>{title}</h3>
      <ul>
        {buckets.map((b) => (
          <li key={b.key}>
            <span>{b.key === 'N/D' ? strings.analysis.nd : b.key}</span>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
            <strong>{b.count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
