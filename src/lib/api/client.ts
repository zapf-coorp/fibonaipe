import { CatalogApiError, type CardDetail, type CardSummary } from '@/shared/types';
import { getApiCache, getLocaleName, setApiCache, upsertLocaleName } from '@/lib/db';
import { mapBriefToSummary, mapCardToDetail, type TcgdexBrief, type TcgdexCard } from './mappers';

const BASE_URL = 'https://api.tcgdex.net/v2';
const PRIMARY_LANG = 'pt-br';
const FALLBACK_LANG = 'en';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchJson<T>(path: string, attempt = 0): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`);
  } catch {
    throw new CatalogApiError('network', 'Network request failed');
  }

  if (response.status === 404) {
    throw new CatalogApiError('notFound', 'Resource not found', 404);
  }

  if (response.status === 429 || response.status >= 500) {
    if (attempt < 3) {
      const backoff = 400 * 2 ** attempt;
      await sleep(backoff);
      return fetchJson<T>(path, attempt + 1);
    }
    throw new CatalogApiError(
      response.status === 429 ? 'rateLimit' : 'unknown',
      `Upstream error ${response.status}`,
      response.status,
    );
  }

  if (!response.ok) {
    throw new CatalogApiError('unknown', `Upstream error ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

async function resolveDisplayName(cardId: string, apiName: string, lang: string): Promise<string> {
  if (lang === PRIMARY_LANG && apiName.trim()) {
    await upsertLocaleName(cardId, apiName, 'api');
    return apiName;
  }
  const cached = await getLocaleName(cardId);
  if (cached) return cached;
  return apiName;
}

/**
 * Cost metric for deck-analysis (FR-DA-3):
 * prefer length of primary attack `cost` array; else retreat cost; else N/D.
 */
export function resolveCardCost(card: Pick<CardDetail, 'attacks' | 'retreat'>): number | null {
  const primary = card.attacks[0];
  if (primary && Array.isArray(primary.cost)) return primary.cost.length;
  if (typeof card.retreat === 'number') return card.retreat;
  return null;
}

export async function searchCards(query: string): Promise<CardSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const cacheKey = `search:${PRIMARY_LANG}:${q.toLowerCase()}`;
  const cached = await getApiCache<CardSummary[]>(cacheKey);
  if (cached) return cached;

  let briefs: TcgdexBrief[] = [];
  try {
    briefs = await fetchJson<TcgdexBrief[]>(
      `/${PRIMARY_LANG}/cards?name=${encodeURIComponent(q)}`,
    );
  } catch (err) {
    if (err instanceof CatalogApiError && err.kind === 'network') throw err;
    // fallback search in English
    briefs = await fetchJson<TcgdexBrief[]>(
      `/${FALLBACK_LANG}/cards?name=${encodeURIComponent(q)}`,
    );
  }

  if (!Array.isArray(briefs) || briefs.length === 0) {
    throw new CatalogApiError('empty', 'No cards found');
  }

  const results: CardSummary[] = [];
  for (const brief of briefs.slice(0, 60)) {
    const displayName = await resolveDisplayName(brief.id, brief.name, PRIMARY_LANG);
    results.push(mapBriefToSummary(brief, displayName));
  }

  await setApiCache(cacheKey, results, 10 * 60 * 1000);
  return results;
}

export async function getCardById(cardId: string): Promise<CardDetail> {
  const cacheKey = `detail:${PRIMARY_LANG}:${cardId}`;
  const cached = await getApiCache<CardDetail>(cacheKey);
  if (cached) return cached;

  let card: TcgdexCard | null = null;
  let lang = PRIMARY_LANG;
  try {
    card = await fetchJson<TcgdexCard>(`/${PRIMARY_LANG}/cards/${encodeURIComponent(cardId)}`);
  } catch (err) {
    if (err instanceof CatalogApiError && err.kind === 'notFound') {
      card = await fetchJson<TcgdexCard>(`/${FALLBACK_LANG}/cards/${encodeURIComponent(cardId)}`);
      lang = FALLBACK_LANG;
    } else if (err instanceof CatalogApiError && err.kind === 'network') {
      throw err;
    } else {
      try {
        card = await fetchJson<TcgdexCard>(`/${FALLBACK_LANG}/cards/${encodeURIComponent(cardId)}`);
        lang = FALLBACK_LANG;
      } catch {
        throw err;
      }
    }
  }

  if (!card) throw new CatalogApiError('notFound', 'Card not found');

  const displayName = await resolveDisplayName(card.id, card.name, lang);
  const detail = mapCardToDetail(card, displayName);
  await setApiCache(cacheKey, detail);
  return detail;
}

export async function resolveCardByNameHint(input: {
  name: string;
  setCode?: string;
  number?: string;
}): Promise<CardSummary | null> {
  const results = await searchCards(input.name).catch(() => [] as CardSummary[]);
  if (results.length === 0) return null;

  if (input.setCode && input.number) {
    const exact = results.find(
      (c) =>
        (c.setId?.toLowerCase() === input.setCode!.toLowerCase() ||
          c.id.toLowerCase().startsWith(`${input.setCode!.toLowerCase()}-`)) &&
        (c.localId === input.number || c.id.endsWith(`-${input.number}`)),
    );
    if (exact) return exact;
  }

  const byName = results.find(
    (c) => c.displayName.toLowerCase() === input.name.toLowerCase() ||
      c.name.toLowerCase() === input.name.toLowerCase(),
  );
  return byName ?? results[0] ?? null;
}
