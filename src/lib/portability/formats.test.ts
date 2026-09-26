import { describe, expect, it } from 'vitest';
import {
  EXPORT_FORMAT,
  EXPORT_VERSION,
  MAX_IMPORT_BYTES,
  assertImportSize,
  parseDeckJson,
  parsePtcgoText,
  serializeDeckJson,
  serializePtcgoText,
} from './formats';
import type { CardDetail } from '@/shared/types';

describe('JSON deck portability', () => {
  const deck = {
    name: 'Meu Deck',
    cards: [
      { cardId: 'swsh3-136', quantity: 4 },
      { cardId: 'swsh3-137', quantity: 2 },
    ],
  };

  it('round-trips export → parse with equivalent composition', () => {
    const json = serializeDeckJson(deck);
    const parsed = parseDeckJson(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.name).toBe('Meu Deck');
      expect(parsed.cards).toEqual(deck.cards);
    }
  });

  it('includes format metadata in export', () => {
    const payload = JSON.parse(serializeDeckJson(deck));
    expect(payload.format).toBe(EXPORT_FORMAT);
    expect(payload.version).toBe(EXPORT_VERSION);
    expect(typeof payload.exportedAt).toBe('string');
  });

  it('embeds optional card metadata when provided', () => {
    const details = new Map([
      [
        'swsh3-136',
        {
          displayName: 'Poké Ball',
          name: 'Poké Ball',
          setId: 'swsh3',
          localId: '136',
        },
      ],
    ]);
    const payload = JSON.parse(serializeDeckJson(deck, details));
    expect(payload.deck.cards[0]).toMatchObject({
      cardId: 'swsh3-136',
      quantity: 4,
      name: 'Poké Ball',
      setId: 'swsh3',
      localId: '136',
    });
  });

  it('rejects malformed JSON', () => {
    expect(parseDeckJson('{not-json')).toEqual({ ok: false, error: 'invalidJson' });
  });

  it('rejects unknown format / version', () => {
    expect(
      parseDeckJson(JSON.stringify({ format: 'other', version: 1, deck: { name: 'x', cards: [] } })),
    ).toEqual({ ok: false, error: 'invalidFormat' });
    expect(
      parseDeckJson(
        JSON.stringify({
          format: EXPORT_FORMAT,
          version: 99,
          deck: { name: 'x', cards: [] },
        }),
      ),
    ).toEqual({ ok: false, error: 'invalidFormat' });
  });

  it('rejects invalid card rows', () => {
    const bad = JSON.stringify({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      deck: { name: 'x', cards: [{ cardId: 1, quantity: 2 }] },
    });
    expect(parseDeckJson(bad)).toEqual({ ok: false, error: 'invalidFormat' });
  });

  it('rejects oversized payloads', () => {
    expect(assertImportSize('ok')).toBe(true);
    const huge = 'x'.repeat(MAX_IMPORT_BYTES + 1);
    expect(assertImportSize(huge)).toBe(false);
    expect(parseDeckJson(huge)).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('PTCGO-style portability', () => {
  it('serializes grouped sections with quantities', () => {
    const details = new Map<string, Pick<CardDetail, 'displayName' | 'name' | 'category' | 'setId' | 'localId'>>([
      [
        'p1',
        {
          displayName: 'Furret',
          name: 'Furret',
          category: 'Pokemon',
          setId: 'swsh1',
          localId: '137',
        },
      ],
      [
        't1',
        {
          displayName: 'Poké Ball',
          name: 'Poké Ball',
          category: 'Trainer',
          setId: 'swsh1',
          localId: '168',
        },
      ],
      [
        'e1',
        {
          displayName: 'Fire Energy',
          name: 'Fire Energy',
          category: 'Energy',
          setId: null,
          localId: null,
        },
      ],
    ]);

    const text = serializePtcgoText(
      {
        name: 'Test Deck',
        cards: [
          { cardId: 'p1', quantity: 4 },
          { cardId: 't1', quantity: 4 },
          { cardId: 'e1', quantity: 8 },
        ],
      },
      details,
    );

    expect(text).toContain('// Test Deck');
    expect(text).toContain('Pokémon (4)');
    expect(text).toContain('4 Furret SWSH1 137');
    expect(text).toContain('Trainer (4)');
    expect(text).toContain('4 Poké Ball SWSH1 168');
    expect(text).toContain('Energy (8)');
    expect(text).toContain('8 Fire Energy');
  });

  it('parses Qty Name [set number] lines and skips headers/comments', () => {
    const text = `
// My list
Pokémon (8)
4 Furret SSH 137
4 Sentret SSH 136

Trainer (4)
4 Poké Ball SSH 168

Energy (4)
4 Fire Energy
`.trim();

    const parsed = parsePtcgoText(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.lines).toHaveLength(4);
      expect(parsed.lines[0]).toMatchObject({
        quantity: 4,
        name: 'Furret',
        setCode: 'SSH',
        number: '137',
      });
      expect(parsed.lines[3]).toMatchObject({
        quantity: 4,
        name: 'Fire Energy',
      });
      expect(parsed.lines[3]?.setCode).toBeUndefined();
    }
  });

  it('fails when no card lines are present', () => {
    expect(parsePtcgoText('// empty\nPokémon (0)\n')).toEqual({
      ok: false,
      error: 'invalidFormat',
    });
  });

  it('rejects oversized PTCGO text', () => {
    const huge = `1 Pikachu\n${'x'.repeat(MAX_IMPORT_BYTES)}`;
    expect(parsePtcgoText(huge)).toEqual({ ok: false, error: 'tooLarge' });
  });
});
