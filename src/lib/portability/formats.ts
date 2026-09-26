import type { Deck, DeckCardEntry } from '@/shared/types';
import type { CardDetail, CardSummary } from '@/shared/types';

export const EXPORT_FORMAT = 'mypokecards-deck' as const;
export const EXPORT_VERSION = 1;
export const MAX_IMPORT_BYTES = 256 * 1024;

export type ExportCardLine = {
  cardId: string;
  quantity: number;
  name?: string;
  setId?: string | null;
  localId?: string | null;
};

export type DeckExportPayload = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  deck: {
    name: string;
    cards: ExportCardLine[];
  };
};

export type ParseJsonResult =
  | { ok: true; name: string; cards: DeckCardEntry[] }
  | { ok: false; error: 'invalidJson' | 'invalidFormat' | 'tooLarge' };

export type PtcgoLine = {
  quantity: number;
  name: string;
  setCode?: string;
  number?: string;
  raw: string;
};

export function assertImportSize(text: string): boolean {
  return new TextEncoder().encode(text).length <= MAX_IMPORT_BYTES;
}

export function serializeDeckJson(
  deck: Pick<Deck, 'name' | 'cards'>,
  detailsById?: Map<string, Pick<CardSummary, 'displayName' | 'name' | 'setId' | 'localId'>>,
): string {
  const payload: DeckExportPayload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      cards: deck.cards.map((c) => {
        const meta = detailsById?.get(c.cardId);
        return {
          cardId: c.cardId,
          quantity: c.quantity,
          name: meta?.displayName ?? meta?.name,
          setId: meta?.setId ?? null,
          localId: meta?.localId ?? null,
        };
      }),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function parseDeckJson(text: string): ParseJsonResult {
  if (!assertImportSize(text)) return { ok: false, error: 'tooLarge' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }
  if (!data || typeof data !== 'object') return { ok: false, error: 'invalidFormat' };
  const obj = data as Record<string, unknown>;
  if (obj.format !== EXPORT_FORMAT || obj.version !== EXPORT_VERSION) {
    return { ok: false, error: 'invalidFormat' };
  }
  const deck = obj.deck as Record<string, unknown> | undefined;
  if (!deck || typeof deck.name !== 'string' || !Array.isArray(deck.cards)) {
    return { ok: false, error: 'invalidFormat' };
  }
  const cards: DeckCardEntry[] = [];
  for (const row of deck.cards) {
    if (!row || typeof row !== 'object') return { ok: false, error: 'invalidFormat' };
    const r = row as Record<string, unknown>;
    if (typeof r.cardId !== 'string' || typeof r.quantity !== 'number' || r.quantity < 1) {
      return { ok: false, error: 'invalidFormat' };
    }
    cards.push({ cardId: r.cardId, quantity: Math.floor(r.quantity) });
  }
  return { ok: true, name: deck.name, cards };
}

export function serializePtcgoText(
  deck: Pick<Deck, 'name' | 'cards'>,
  detailsById: Map<string, Pick<CardDetail, 'displayName' | 'name' | 'category' | 'setId' | 'localId'>>,
): string {
  const groups: Record<'Pokemon' | 'Trainer' | 'Energy' | 'Other', string[]> = {
    Pokemon: [],
    Trainer: [],
    Energy: [],
    Other: [],
  };

  for (const entry of deck.cards) {
    const meta = detailsById.get(entry.cardId);
    const name = meta?.displayName ?? meta?.name ?? entry.cardId;
    const set = meta?.setId ? meta.setId.toUpperCase() : '';
    const num = meta?.localId ?? '';
    const line = [entry.quantity, name, set, num].filter(Boolean).join(' ');
    const cat = meta?.category ?? 'Unknown';
    if (cat === 'Pokemon') groups.Pokemon.push(line);
    else if (cat === 'Trainer') groups.Trainer.push(line);
    else if (cat === 'Energy') groups.Energy.push(line);
    else groups.Other.push(line);
  }

  const sections: string[] = [`// ${deck.name}`];
  const pushSection = (label: string, lines: string[]) => {
    if (lines.length === 0) return;
    const count = lines.reduce((s, l) => s + Number(l.split(' ')[0] || 0), 0);
    sections.push(`${label} (${count})`);
    sections.push(...lines);
    sections.push('');
  };

  pushSection('Pokémon', groups.Pokemon);
  pushSection('Trainer', groups.Trainer);
  pushSection('Energy', groups.Energy);
  if (groups.Other.length) pushSection('Other', groups.Other);
  return sections.join('\n').trim() + '\n';
}

export function parsePtcgoText(text: string): { ok: true; lines: PtcgoLine[] } | { ok: false; error: 'tooLarge' | 'invalidFormat' } {
  if (!assertImportSize(text)) return { ok: false, error: 'tooLarge' };
  const lines: PtcgoLine[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith('//') || raw.startsWith('#')) continue;
    if (/^(pokémon|pokemon|trainer|energy|other)\b/i.test(raw) && /\(\d+\)/.test(raw)) continue;

    const match = raw.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    const quantity = Number(match[1]);
    const rest = match[2]!.trim();
    const parts = rest.split(/\s+/);
    let setCode: string | undefined;
    let number: string | undefined;
    let name = rest;

    if (parts.length >= 3) {
      const maybeNum = parts[parts.length - 1]!;
      const maybeSet = parts[parts.length - 2]!;
      if (/^\d+[a-zA-Z]?$/.test(maybeNum) && /^[A-Za-z0-9]+$/.test(maybeSet)) {
        number = maybeNum;
        setCode = maybeSet;
        name = parts.slice(0, -2).join(' ');
      }
    }

    if (!name || quantity < 1) continue;
    lines.push({ quantity, name, setCode, number, raw });
  }

  if (lines.length === 0) return { ok: false, error: 'invalidFormat' };
  return { ok: true, lines };
}
