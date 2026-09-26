import { useState } from 'react';
import { Link } from 'react-router';
import { Copy, Heart, Pencil, Star, Trash2 } from 'lucide-react';
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  renameDeck,
  setActiveDeckId,
  updateDeckMeta,
} from '@/lib/db';
import { totalCards } from '@/lib/deck';
import { useActiveDeck, useDecks } from '@/shared/hooks/useDecks';
import { strings } from '@/shared/i18n/pt-BR';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import styles from './DeckList.module.css';

export function DeckList() {
  const { decks, loading } = useDecks();
  const { activeDeckId } = useActiveDeck();
  const [name, setName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const deck = await createDeck(name);
    setName('');
    await setActiveDeckId(deck.id);
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h1>{strings.deck.title}</h1>
      </header>

      <form className={styles.create} onSubmit={(e) => void handleCreate(e)}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={strings.deck.createPrompt}
          aria-label={strings.deck.createPrompt}
          required
        />
        <Button type="submit" variant="accent">
          {strings.deck.create}
        </Button>
      </form>

      {loading && <p className={styles.muted}>{strings.common.loading}</p>}

      {!loading && decks.length === 0 && <EmptyState title={strings.deck.empty} />}

      <ul className={styles.list}>
        {decks.map((deck) => {
          const count = totalCards(deck.cards);
          const isActive = deck.id === activeDeckId;
          return (
            <li key={deck.id} className={[styles.row, isActive ? styles.active : ''].join(' ')}>
              <div className={styles.main}>
                {renamingId === deck.id ? (
                  <form
                    className={styles.renameForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void renameDeck(deck.id, renameValue).then(() => setRenamingId(null));
                    }}
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      aria-label={strings.deck.rename}
                    />
                    <Button type="submit" variant="accent">
                      {strings.common.save}
                    </Button>
                  </form>
                ) : (
                  <>
                    <Link to={`/decks/${deck.id}`} className={styles.name}>
                      {deck.isFavorite ? <Heart size={14} fill="currentColor" aria-hidden /> : null}
                      {deck.name}
                    </Link>
                    <p className={styles.meta}>
                      {count} {strings.deck.cards}
                      {deck.rating != null ? ` · ${deck.rating}★` : ` · ${strings.deck.unrated}`}
                      {isActive ? ` · ${strings.deck.active}` : ''}
                    </p>
                  </>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
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
                      className={deck.rating != null && deck.rating >= n ? styles.starOn : ''}
                      onClick={() =>
                        void updateDeckMeta(deck.id, {
                          rating: deck.rating === n ? null : n,
                        })
                      }
                    >
                      <Star size={14} fill={deck.rating != null && deck.rating >= n ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={strings.deck.select}
                  disabled={isActive}
                  onClick={() => void setActiveDeckId(deck.id)}
                >
                  {strings.deck.select}
                </button>
                <button
                  type="button"
                  aria-label={strings.deck.rename}
                  onClick={() => {
                    setRenamingId(deck.id);
                    setRenameValue(deck.name);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={strings.deck.duplicate}
                  onClick={() => void duplicateDeck(deck.id, strings.deck.duplicatePrefix)}
                >
                  <Copy size={16} />
                </button>
                <button
                  type="button"
                  aria-label={strings.deck.delete}
                  onClick={() => {
                    if (window.confirm(strings.deck.deleteConfirm)) {
                      void deleteDeck(deck.id);
                    }
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
