import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { Heart, Minus, Plus, ArrowLeft } from 'lucide-react';
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';
import { getCardById } from '@/lib/api';
import { adjustOwned, getOwned, isCardFavorite, toggleCardFavorite } from '@/lib/db';
import { CatalogApiError } from '@/shared/types';
import { strings } from '@/shared/i18n/pt-BR';
import { CardImage } from '@/shared/ui/CardImage';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useDeckActions } from '@/features/decks/useDeckActions';
import styles from './CardDetailView.module.css';

export function CardDetailView() {
  const { cardId = '' } = useParams();
  const decoded = decodeURIComponent(cardId);
  const { addToActiveDeck } = useDeckActions();
  const [owned, setOwned] = useState(0);
  const [favorite, setFavorite] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cards', 'detail', decoded],
    queryFn: () => getCardById(decoded),
    enabled: Boolean(decoded),
  });

  useEffect(() => {
    if (!decoded) return;
    const sub = liveQuery(async () => ({
      owned: await getOwned(decoded),
      favorite: await isCardFavorite(decoded),
    })).subscribe({
      next: (v) => {
        setOwned(v.owned);
        setFavorite(v.favorite);
      },
    });
    return () => sub.unsubscribe();
  }, [decoded]);

  if (isLoading) {
    return <p className={styles.status}>{strings.card.loading}</p>;
  }

  if (isError || !data) {
    const msg =
      error instanceof CatalogApiError && error.kind === 'notFound'
        ? strings.card.notFound
        : strings.common.error;
    return <EmptyState title={msg} />;
  }

  return (
    <article className={styles.article}>
      <Link to="/buscar" className={styles.back}>
        <ArrowLeft size={18} aria-hidden />
        {strings.card.back}
      </Link>

      <div className={styles.layout}>
        <div className={styles.art}>
          <CardImage
            src={data.imageUrl}
            highSrc={data.imageHighUrl}
            alt={data.displayName}
            priority
            className={styles.image}
          />
        </div>

        <div className={styles.meta}>
          <h1 className={styles.title}>{data.displayName}</h1>
          <dl className={styles.dl}>
            {data.types.length > 0 && (
              <>
                <dt>{strings.card.types}</dt>
                <dd>{data.types.join(', ')}</dd>
              </>
            )}
            {data.rarity && (
              <>
                <dt>{strings.card.rarity}</dt>
                <dd>{data.rarity}</dd>
              </>
            )}
            {(data.setName || data.setId) && (
              <>
                <dt>{strings.card.set}</dt>
                <dd>
                  {data.setName ?? data.setId}
                  {data.localId ? ` · #${data.localId}` : ''}
                </dd>
              </>
            )}
            {data.hp && (
              <>
                <dt>{strings.card.hp}</dt>
                <dd>{data.hp}</dd>
              </>
            )}
            {data.retreat != null && (
              <>
                <dt>{strings.card.retreat}</dt>
                <dd>{data.retreat}</dd>
              </>
            )}
          </dl>

          {data.abilities.length > 0 && (
            <section className={styles.block}>
              <h2>{strings.card.abilities}</h2>
              {data.abilities.map((a) => (
                <div key={a.name} className={styles.ability}>
                  <strong>{a.name}</strong>
                  {a.effect ? <p>{a.effect}</p> : null}
                </div>
              ))}
            </section>
          )}

          {data.attacks.length > 0 && (
            <section className={styles.block}>
              <h2>{strings.card.attacks}</h2>
              {data.attacks.map((a) => (
                <div key={a.name} className={styles.attack}>
                  <div className={styles.attackHead}>
                    <strong>{a.name}</strong>
                    {a.damage ? <span>{a.damage}</span> : null}
                  </div>
                  {a.cost.length > 0 && (
                    <p className={styles.cost}>
                      {strings.card.cost}: {a.cost.join(' · ')}
                    </p>
                  )}
                  {a.effect ? <p>{a.effect}</p> : null}
                </div>
              ))}
            </section>
          )}

          {data.rules.length > 0 && (
            <section className={styles.block}>
              <h2>{strings.card.rules}</h2>
              {data.rules.map((r) => (
                <p key={r}>{r}</p>
              ))}
            </section>
          )}

          <div className={styles.actions}>
            <Button
              variant="accent"
              onClick={() => void addToActiveDeck(data.id, data.isBasicEnergy)}
            >
              <Plus size={18} aria-hidden />
              {strings.card.addToDeck}
            </Button>

            <div className={styles.owned}>
              <span>{strings.card.owned}</span>
              <button
                type="button"
                aria-label={strings.collection.decreaseOwned}
                onClick={() => void adjustOwned(data.id, -1).then(setOwned)}
              >
                <Minus size={16} aria-hidden />
              </button>
              <strong>{owned}</strong>
              <button
                type="button"
                aria-label={strings.collection.increaseOwned}
                onClick={() => void adjustOwned(data.id, 1).then(setOwned)}
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>

            <button
              type="button"
              className={styles.fav}
              aria-label={favorite ? strings.card.unfavorite : strings.card.favorite}
              aria-pressed={favorite}
              onClick={() => void toggleCardFavorite(data.id).then(setFavorite)}
            >
              <Heart size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
