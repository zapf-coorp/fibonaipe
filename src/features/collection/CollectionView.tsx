import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { Minus, Plus } from 'lucide-react';
import { getCardById } from '@/lib/api';
import { adjustOwned, getOwnedMap, listCollection } from '@/lib/db';
import { computeMissingCards, isDeckComplete } from '@/lib/collection';
import { useActiveDeck } from '@/shared/hooks/useDecks';
import type { CollectionEntry, MissingCard } from '@/shared/types';
import { strings } from '@/shared/i18n/pt-BR';
import { EmptyState } from '@/shared/ui/EmptyState';
import styles from './CollectionView.module.css';

export function CollectionView() {
  const { activeDeck } = useActiveDeck();
  const [owned, setOwned] = useState<CollectionEntry[]>([]);
  const [missing, setMissing] = useState<MissingCard[]>([]);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const sub = liveQuery(async () => {
      const collection = await listCollection();
      if (!activeDeck) {
        return { collection, missing: [] as MissingCard[], complete: false };
      }
      const ids = activeDeck.cards.map((c) => c.cardId);
      const ownedMap = await getOwnedMap(ids);
      const miss = computeMissingCards(activeDeck.cards, ownedMap);
      return {
        collection,
        missing: miss,
        complete: activeDeck.cards.length > 0 && isDeckComplete(activeDeck.cards, ownedMap),
      };
    }).subscribe({
      next: (v) => {
        setOwned(v.collection);
        setMissing(v.missing);
        setComplete(v.complete);
      },
    });
    return () => sub.unsubscribe();
  }, [activeDeck]);

  const cardIds = [
    ...new Set([...owned.map((o) => o.cardId), ...missing.map((m) => m.cardId)]),
  ];

  const detailQueries = useQueries({
    queries: cardIds.map((id) => ({
      queryKey: ['cards', 'detail', id],
      queryFn: () => getCardById(id),
      staleTime: 60_000,
    })),
  });

  const nameById = new Map(
    detailQueries.filter((q) => q.data).map((q) => [q.data!.id, q.data!.displayName] as const),
  );

  return (
    <section className={styles.section}>
      <h1>{strings.collection.title}</h1>

      <div className={styles.panels}>
        <div>
          <h2>{strings.collection.missingTitle}</h2>
          {!activeDeck && <EmptyState title={strings.collection.noActiveDeck} />}
          {activeDeck && complete && <EmptyState title={strings.collection.complete} />}
          {activeDeck && !complete && missing.length === 0 && activeDeck.cards.length === 0 && (
            <EmptyState title={strings.deck.pickOrCreate} />
          )}
          {missing.length > 0 && (
            <ul className={styles.list}>
              {missing.map((row) => (
                <li key={row.cardId} className={styles.row}>
                  <Link to={`/cartas/${encodeURIComponent(row.cardId)}`}>
                    {nameById.get(row.cardId) ?? row.cardId}
                  </Link>
                  <div className={styles.nums}>
                    <span>
                      {strings.collection.required}: {row.required}
                    </span>
                    <span>
                      {strings.collection.owned}: {row.owned}
                    </span>
                    <strong>
                      {strings.collection.missing}: {row.missing}
                    </strong>
                  </div>
                  <div className={styles.qty}>
                    <button
                      type="button"
                      aria-label={strings.collection.decreaseOwned}
                      onClick={() => void adjustOwned(row.cardId, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={strings.collection.increaseOwned}
                      onClick={() => void adjustOwned(row.cardId, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2>{strings.collection.owned}</h2>
          {owned.length === 0 ? (
            <EmptyState title={strings.collection.emptyOwned} />
          ) : (
            <ul className={styles.list}>
              {owned.map((row) => (
                <li key={row.cardId} className={styles.row}>
                  <Link to={`/cartas/${encodeURIComponent(row.cardId)}`}>
                    {nameById.get(row.cardId) ?? row.cardId}
                  </Link>
                  <div className={styles.qty}>
                    <button
                      type="button"
                      aria-label={strings.collection.decreaseOwned}
                      onClick={() => void adjustOwned(row.cardId, -1)}
                    >
                      <Minus size={14} />
                    </button>
                    <strong>{row.ownedCount}</strong>
                    <button
                      type="button"
                      aria-label={strings.collection.increaseOwned}
                      onClick={() => void adjustOwned(row.cardId, 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
