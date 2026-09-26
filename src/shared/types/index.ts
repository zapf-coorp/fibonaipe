export type ThemeMode = 'light' | 'dark';

export type DeckCardEntry = {
  cardId: string;
  quantity: number;
};

export type Deck = {
  id: string;
  name: string;
  cards: DeckCardEntry[];
  isFavorite: boolean;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CollectionEntry = {
  cardId: string;
  ownedCount: number;
  updatedAt: string;
};

export type FavoriteCard = {
  cardId: string;
  createdAt: string;
};

export type LocaleCacheEntry = {
  cardId: string;
  displayNamePtBr: string;
  source: 'api' | 'manual';
  updatedAt: string;
};

export type ApiCacheEntry = {
  cacheKey: string;
  payload: unknown;
  fetchedAt: string;
  expiresAt: string;
};

export type CardCategory = 'Pokemon' | 'Trainer' | 'Energy' | 'Unknown';

export type CardSummary = {
  id: string;
  name: string;
  displayName: string;
  imageUrl: string | null;
  imageHighUrl: string | null;
  types: string[];
  rarity: string | null;
  setId: string | null;
  setName: string | null;
  localId: string | null;
  category: CardCategory;
  isBasicEnergy: boolean;
};

export type CardAttack = {
  name: string;
  cost: string[];
  damage: string | null;
  effect: string | null;
};

export type CardAbility = {
  name: string;
  type: string | null;
  effect: string | null;
};

export type CardDetail = CardSummary & {
  hp: string | null;
  stage: string | null;
  retreat: number | null;
  attacks: CardAttack[];
  abilities: CardAbility[];
  rules: string[];
  evolveFrom: string | null;
  illustrator: string | null;
  regulationMark: string | null;
};

export type MissingCard = {
  cardId: string;
  required: number;
  owned: number;
  missing: number;
};

export type ApiErrorKind = 'network' | 'rateLimit' | 'empty' | 'notFound' | 'unknown';

export class CatalogApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'CatalogApiError';
    this.kind = kind;
    this.status = status;
  }
}
