import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import type { CardSummary } from '@/shared/types';
import { CardImage } from '@/shared/ui/CardImage';
import { strings } from '@/shared/i18n/pt-BR';
import { useDeckActions } from '@/features/decks/useDeckActions';
import styles from './CardGrid.module.css';

type Props = {
  cards: CardSummary[];
};

export function CardGrid({ cards }: Props) {
  const { addToActiveDeck } = useDeckActions();

  return (
    <ul className={styles.grid}>
      {cards.map((card) => (
        <li key={card.id} className={styles.item}>
          <Link to={`/cartas/${encodeURIComponent(card.id)}`} className={styles.link}>
            <CardImage src={card.imageUrl} alt={card.displayName} className={styles.image} />
            <span className={styles.name}>{card.displayName}</span>
          </Link>
          <button
            type="button"
            className={styles.quickAdd}
            aria-label={`${strings.search.addToDeck}: ${card.displayName}`}
            onClick={(e) => {
              e.preventDefault();
              void addToActiveDeck(card.id, card.isBasicEnergy);
            }}
          >
            <Plus size={18} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
