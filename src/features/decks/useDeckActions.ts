import { useCallback } from 'react';
import { getCardById } from '@/lib/api';
import { addCardToDeck, removeCardFromDeck } from '@/lib/deck';
import { replaceDeckCards, getActiveDeckId, getDeck } from '@/lib/db';
import { useUiStore } from '@/shared/hooks/useUiStore';
import { strings } from '@/shared/i18n/pt-BR';

export function useDeckActions() {
  const showToast = useUiStore((s) => s.showToast);
  const setDeckSheetOpen = useUiStore((s) => s.setDeckSheetOpen);

  const addToActiveDeck = useCallback(
    async (cardId: string, isBasicEnergyHint?: boolean) => {
      const activeId = await getActiveDeckId();
      if (!activeId) {
        showToast(strings.deck.pickOrCreate);
        setDeckSheetOpen(true);
        return false;
      }
      const deck = await getDeck(activeId);
      if (!deck) {
        showToast(strings.deck.pickOrCreate);
        return false;
      }

      let isBasicEnergy = isBasicEnergyHint ?? false;
      if (isBasicEnergyHint == null) {
        try {
          const detail = await getCardById(cardId);
          isBasicEnergy = detail.isBasicEnergy;
        } catch {
          isBasicEnergy = false;
        }
      }

      const result = addCardToDeck(deck.cards, cardId, { isBasicEnergy });
      if (!result.ok) {
        showToast(strings.deck.copyLimit);
        return false;
      }
      await replaceDeckCards(deck.id, result.cards);
      return true;
    },
    [setDeckSheetOpen, showToast],
  );

  const decreaseInDeck = useCallback(async (deckId: string, cardId: string) => {
    const deck = await getDeck(deckId);
    if (!deck) return;
    const next = removeCardFromDeck(deck.cards, cardId, 1);
    await replaceDeckCards(deckId, next);
  }, []);

  const increaseInDeck = useCallback(
    async (deckId: string, cardId: string, isBasicEnergy = false) => {
      const deck = await getDeck(deckId);
      if (!deck) return false;
      const result = addCardToDeck(deck.cards, cardId, { isBasicEnergy });
      if (!result.ok) {
        showToast(strings.deck.copyLimit);
        return false;
      }
      await replaceDeckCards(deckId, result.cards);
      return true;
    },
    [showToast],
  );

  return { addToActiveDeck, decreaseInDeck, increaseInDeck };
}
