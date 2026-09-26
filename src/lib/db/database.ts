import Dexie, { type EntityTable } from 'dexie';
import type {
  ApiCacheEntry,
  CollectionEntry,
  Deck,
  FavoriteCard,
  LocaleCacheEntry,
  ThemeMode,
} from '@/shared/types';

export type SettingsRow = {
  key: string;
  value: string | null;
};

export class MyPokeCardsDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>;
  collection!: EntityTable<CollectionEntry, 'cardId'>;
  favoriteCards!: EntityTable<FavoriteCard, 'cardId'>;
  settings!: EntityTable<SettingsRow, 'key'>;
  localeCache!: EntityTable<LocaleCacheEntry, 'cardId'>;
  apiCache!: EntityTable<ApiCacheEntry, 'cacheKey'>;

  constructor() {
    super('mypokecards');
    this.version(1).stores({
      decks: 'id, name, isFavorite, updatedAt',
      collection: 'cardId, updatedAt',
      favoriteCards: 'cardId, createdAt',
      settings: 'key',
      localeCache: 'cardId, updatedAt',
      apiCache: 'cacheKey, expiresAt',
    });
  }
}

export const db = new MyPokeCardsDB();

export const THEME_STORAGE_KEY = 'mypokecards.theme';
export const SETTINGS_THEME = 'theme';
export const SETTINGS_ACTIVE_DECK = 'activeDeckId';

export async function ensureDbReady(): Promise<void> {
  await db.open();
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.settings.get(key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getTheme(): Promise<ThemeMode | null> {
  const value = await getSetting(SETTINGS_THEME);
  if (value === 'light' || value === 'dark') return value;
  return null;
}

export async function setTheme(theme: ThemeMode): Promise<void> {
  await setSetting(SETTINGS_THEME, theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export async function getActiveDeckId(): Promise<string | null> {
  return getSetting(SETTINGS_ACTIVE_DECK);
}

export async function setActiveDeckId(id: string | null): Promise<void> {
  await setSetting(SETTINGS_ACTIVE_DECK, id);
}
