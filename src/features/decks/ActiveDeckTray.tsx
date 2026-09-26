import { useQueries } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Minus, Plus, X } from 'lucide-react';
import { getCardById } from '@/lib/api';
import { totalCards } from '@/lib/deck';
import { useActiveDeck } from '@/shared/hooks/useDecks';
import { useUiStore } from '@/shared/hooks/useUiStore';
import { useDeckActions } from '@/features/decks/useDeckActions';
import { strings } from '@/shared/i18n/pt-BR';
import styles from './ActiveDeckTray.module.css';

export function ActiveDeckTray() {
  const { activeDeck } = useActiveDeck();
  const open = useUiStore((s) => s.deckSheetOpen);
  const setOpen = useUiStore((s) => s.setDeckSheetOpen);
  const { decreaseInDeck, increaseInDeck } = useDeckActions();

  const detailQueries = useQueries({
    queries: (activeDeck?.cards ?? []).slice(0, 40).map((c) => ({
      queryKey: ['cards', 'detail', c.cardId],
      queryFn: () => getCardById(c.cardId),
      staleTime: 60_000,
    })),
  });

  const nameById = new Map(
    detailQueries.filter((q) => q.data).map((q) => [q.data!.id, q.data!] as const),
  );

  const count = activeDeck ? totalCards(activeDeck.cards) : 0;

  return (
    <>
      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen(true)}
        aria-label={strings.deck.openTray}
      >
        <span className={styles.fabLabel}>{activeDeck?.name ?? strings.deck.noActive}</span>
        <span className={styles.fabCount}>{count}</span>
      </button>

      <aside
        className={[styles.tray, open ? styles.open : ''].join(' ')}
        aria-hidden={!open}
        aria-label={strings.deck.trayTitle}
      >
        <header className={styles.trayHeader}>
          <div>
            <p className={styles.eyebrow}>{strings.deck.trayTitle}</p>
            <h2>{activeDeck?.name ?? strings.deck.noActive}</h2>
            <p className={styles.count}>
              {strings.deck.total}: {count}
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label={strings.deck.closeTray}
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </header>

        {!activeDeck && (
          <p className={styles.empty}>
            {strings.deck.pickOrCreate}{' '}
            <Link to="/decks" onClick={() => setOpen(false)}>
              {strings.nav.decks}
            </Link>
          </p>
        )}

        {activeDeck && (
          <ul className={styles.list}>
            {activeDeck.cards.map((entry) => {
              const detail = nameById.get(entry.cardId);
              return (
                <li key={entry.cardId} className={styles.row}>
                  <Link
                    to={`/cartas/${encodeURIComponent(entry.cardId)}`}
                    onClick={() => setOpen(false)}
                  >
                    {detail?.displayName ?? entry.cardId}
                  </Link>
                  <div className={styles.qty}>
                    <button
                      type="button"
                      aria-label={strings.deck.decrease}
                      onClick={() => void decreaseInDeck(activeDeck.id, entry.cardId)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{entry.quantity}</span>
                    <button
                      type="button"
                      aria-label={strings.deck.increase}
                      onClick={() =>
                        void increaseInDeck(activeDeck.id, entry.cardId, detail?.isBasicEnergy)
                      }
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {activeDeck && (
          <Link
            className={styles.openFull}
            to={`/decks/${activeDeck.id}`}
            onClick={() => setOpen(false)}
          >
            {strings.deck.open}
          </Link>
        )}
      </aside>

      {open && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={strings.common.close}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
