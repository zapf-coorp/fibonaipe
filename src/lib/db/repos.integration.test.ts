import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import {
  createDeck,
  deleteDeck,
  duplicateDeck,
  getActiveDeckId,
  getDeck,
  importNewDeck,
  listDecks,
  renameDeck,
  replaceDeckCards,
  setActiveDeckId,
  updateDeckMeta,
} from './decksRepo';
import { adjustOwned, getOwned, getOwnedMap, listCollection, setOwned } from './collectionRepo';
import {
  isCardFavorite,
  listFavoriteCards,
  setCardFavorite,
  toggleCardFavorite,
} from './favoritesRepo';
import { computeMissingCards, isDeckComplete } from '@/lib/collection';
import { addCardToDeck, removeCardFromDeck } from '@/lib/deck';
import { parseDeckJson, serializeDeckJson } from '@/lib/portability';

async function resetDb() {
  await db.delete();
  await db.open();
}

describe('decksRepo lifecycle', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a named deck and sets it active when none exists', async () => {
    const deck = await createDeck('  Aggro Fire  ');
    expect(deck.name).toBe('Aggro Fire');
    expect(deck.cards).toEqual([]);
    expect(deck.isFavorite).toBe(false);
    expect(deck.rating).toBeNull();
    expect(await getActiveDeckId()).toBe(deck.id);
    expect(await listDecks()).toHaveLength(1);
  });

  it('rejects empty names on create and rename', async () => {
    await expect(createDeck('   ')).rejects.toThrow('EMPTY_NAME');
    const deck = await createDeck('Valid');
    await expect(renameDeck(deck.id, '  ')).rejects.toThrow('EMPTY_NAME');
  });

  it('renames an existing deck', async () => {
    const deck = await createDeck('Old');
    const updated = await renameDeck(deck.id, 'New Name');
    expect(updated.name).toBe('New Name');
    expect((await getDeck(deck.id))?.name).toBe('New Name');
  });

  it('duplicates cards but not favorite/rating', async () => {
    const original = await createDeck('Main');
    await replaceDeckCards(original.id, [
      { cardId: 'a', quantity: 4 },
      { cardId: 'b', quantity: 2 },
    ]);
    await updateDeckMeta(original.id, { isFavorite: true, rating: 5 });

    const copy = await duplicateDeck(original.id, 'Cópia de');
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Cópia de Main');
    expect(copy.cards).toEqual([
      { cardId: 'a', quantity: 4 },
      { cardId: 'b', quantity: 2 },
    ]);
    expect(copy.isFavorite).toBe(false);
    expect(copy.rating).toBeNull();

    const stillOriginal = await getDeck(original.id);
    expect(stillOriginal?.isFavorite).toBe(true);
    expect(stillOriginal?.rating).toBe(5);
    expect(await listDecks()).toHaveLength(2);
  });

  it('deletes a deck and reassigns active deck', async () => {
    const first = await createDeck('First');
    const second = await createDeck('Second');
    await setActiveDeckId(first.id);
    await deleteDeck(first.id);
    expect(await getDeck(first.id)).toBeUndefined();
    expect(await getActiveDeckId()).toBe(second.id);
    expect(await listDecks()).toHaveLength(1);
  });

  it('clears active deck id when the last deck is deleted', async () => {
    const only = await createDeck('Only');
    await deleteDeck(only.id);
    expect(await getActiveDeckId()).toBeNull();
    expect(await listDecks()).toEqual([]);
  });
});

describe('deck builder persistence integration', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('persists add/remove mutations via replaceDeckCards', async () => {
    const deck = await createDeck('Builder');
    let cards = deck.cards;

    const add1 = addCardToDeck(cards, 'card-a');
    expect(add1.ok).toBe(true);
    if (!add1.ok) return;
    cards = add1.cards;

    const add2 = addCardToDeck(cards, 'card-a');
    expect(add2.ok).toBe(true);
    if (!add2.ok) return;
    cards = add2.cards;

    await replaceDeckCards(deck.id, cards);
    expect((await getDeck(deck.id))?.cards).toEqual([{ cardId: 'card-a', quantity: 2 }]);

    cards = removeCardFromDeck(cards, 'card-a');
    cards = removeCardFromDeck(cards, 'card-a');
    await replaceDeckCards(deck.id, cards);
    expect((await getDeck(deck.id))?.cards).toEqual([]);
  });

  it('blocks copy-limit adds without writing a bad state', async () => {
    const deck = await createDeck('Limits');
    let cards = [{ cardId: 'limited', quantity: 4 }];
    await replaceDeckCards(deck.id, cards);

    const blocked = addCardToDeck(cards, 'limited');
    expect(blocked.ok).toBe(false);

    const energy = addCardToDeck(cards, 'basic-energy', { isBasicEnergy: true, delta: 8 });
    expect(energy.ok).toBe(true);
    if (!energy.ok) return;
    await replaceDeckCards(deck.id, energy.cards);

    const stored = await getDeck(deck.id);
    expect(stored?.cards).toEqual([
      { cardId: 'limited', quantity: 4 },
      { cardId: 'basic-energy', quantity: 8 },
    ]);
  });
});

describe('collectionRepo + missing cards', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('updates owned quantities and floors negatives to zero', async () => {
    await setOwned('swsh3-136', 3.9);
    expect(await getOwned('swsh3-136')).toBe(3);

    await setOwned('swsh3-136', -5);
    expect(await getOwned('swsh3-136')).toBe(0);
    expect(await listCollection()).toEqual([]);

    const next = await adjustOwned('swsh3-136', 2);
    expect(next).toBe(2);
    expect(await getOwned('swsh3-136')).toBe(2);
  });

  it('computes missing cards from persisted ownership and deck', async () => {
    const deck = await createDeck('Need cards');
    await replaceDeckCards(deck.id, [
      { cardId: 'a', quantity: 3 },
      { cardId: 'b', quantity: 2 },
      { cardId: 'c', quantity: 1 },
    ]);
    await setOwned('a', 2);
    await setOwned('b', 2);

    const stored = await getDeck(deck.id);
    const ownedMap = await getOwnedMap(['a', 'b', 'c']);
    const missing = computeMissingCards(stored!.cards, ownedMap);

    expect(missing).toEqual([
      { cardId: 'a', required: 3, owned: 2, missing: 1 },
      { cardId: 'c', required: 1, owned: 0, missing: 1 },
    ]);
    expect(isDeckComplete(stored!.cards, ownedMap)).toBe(false);

    await setOwned('a', 3);
    await setOwned('c', 1);
    const completeMap = await getOwnedMap(['a', 'b', 'c']);
    expect(isDeckComplete(stored!.cards, completeMap)).toBe(true);
  });
});

describe('favorites and rating persistence', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('toggles card favorites', async () => {
    expect(await isCardFavorite('card-1')).toBe(false);
    expect(await toggleCardFavorite('card-1')).toBe(true);
    expect(await isCardFavorite('card-1')).toBe(true);
    expect(await listFavoriteCards()).toHaveLength(1);

    await setCardFavorite('card-1', false);
    expect(await isCardFavorite('card-1')).toBe(false);
    expect(await listFavoriteCards()).toEqual([]);
  });

  it('persists deck favorite and rating meta', async () => {
    const deck = await createDeck('Rated');
    await updateDeckMeta(deck.id, { isFavorite: true, rating: 4 });
    let stored = await getDeck(deck.id);
    expect(stored?.isFavorite).toBe(true);
    expect(stored?.rating).toBe(4);

    await updateDeckMeta(deck.id, { rating: null, isFavorite: false });
    stored = await getDeck(deck.id);
    expect(stored?.isFavorite).toBe(false);
    expect(stored?.rating).toBeNull();
  });

  it('lists favorited decks first', async () => {
    const a = await createDeck('Alpha');
    const b = await createDeck('Beta');
    await updateDeckMeta(b.id, { isFavorite: true });
    const listed = await listDecks();
    expect(listed.map((d) => d.id)).toEqual([b.id, a.id]);
  });
});

describe('JSON import creates a new unpersonalized deck', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('round-trips through serialize → parse → importNewDeck', async () => {
    const source = await createDeck('Exportable');
    await replaceDeckCards(source.id, [
      { cardId: 'x', quantity: 3 },
      { cardId: 'y', quantity: 1 },
    ]);
    await updateDeckMeta(source.id, { isFavorite: true, rating: 5 });

    const json = serializeDeckJson({
      name: source.name,
      cards: (await getDeck(source.id))!.cards,
    });
    const parsed = parseDeckJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const imported = await importNewDeck(parsed.name, parsed.cards);
    expect(imported.id).not.toBe(source.id);
    expect(imported.name).toBe('Exportable');
    expect(imported.cards).toEqual([
      { cardId: 'x', quantity: 3 },
      { cardId: 'y', quantity: 1 },
    ]);
    expect(imported.isFavorite).toBe(false);
    expect(imported.rating).toBeNull();
    expect(await listDecks()).toHaveLength(2);
  });

  it('does not mutate existing decks when parse fails', async () => {
    await createDeck('Keep me');
    const before = await listDecks();
    expect(parseDeckJson('not-json').ok).toBe(false);
    expect(await listDecks()).toEqual(before);
  });
});
