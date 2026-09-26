import { useState } from 'react';
import type { CardDetail, Deck } from '@/shared/types';
import {
  parseDeckJson,
  parsePtcgoText,
  serializeDeckJson,
  serializePtcgoText,
} from '@/lib/portability';
import { importNewDeck } from '@/lib/db';
import { resolveCardByNameHint } from '@/lib/api';
import { useUiStore } from '@/shared/hooks/useUiStore';
import { strings } from '@/shared/i18n/pt-BR';
import { Button } from '@/shared/ui/Button';
import styles from './DeckPortabilityPanel.module.css';

type Props = {
  deck: Deck;
  detailsById: Map<string, CardDetail>;
};

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeckPortabilityPanel({ deck, detailsById }: Props) {
  const showToast = useUiStore((s) => s.showToast);
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  async function exportJson() {
    const json = serializeDeckJson(deck, detailsById);
    downloadText(`${deck.name || 'deck'}.json`, json, 'application/json');
    try {
      await navigator.clipboard.writeText(json);
      showToast(strings.portability.copied);
    } catch {
      showToast(strings.portability.download);
    }
  }

  async function exportText() {
    const text = serializePtcgoText(deck, detailsById);
    downloadText(`${deck.name || 'deck'}.txt`, text, 'text/plain');
    try {
      await navigator.clipboard.writeText(text);
      showToast(strings.portability.copied);
    } catch {
      showToast(strings.portability.download);
    }
  }

  async function runImportJson() {
    const parsed = parseDeckJson(importText);
    if (!parsed.ok) {
      showToast(
        parsed.error === 'tooLarge'
          ? strings.portability.tooLarge
          : parsed.error === 'invalidJson'
            ? strings.portability.invalidJson
            : strings.portability.invalidFormat,
      );
      return;
    }
    await importNewDeck(parsed.name, parsed.cards);
    setImportText('');
    showToast(strings.portability.success);
  }

  async function runImportPtcgo() {
    setBusy(true);
    try {
      const parsed = parsePtcgoText(importText);
      if (!parsed.ok) {
        showToast(
          parsed.error === 'tooLarge'
            ? strings.portability.tooLarge
            : strings.portability.invalidFormat,
        );
        return;
      }

      const cards: { cardId: string; quantity: number }[] = [];
      const unresolved: string[] = [];

      for (const line of parsed.lines) {
        const hit = await resolveCardByNameHint({
          name: line.name,
          setCode: line.setCode,
          number: line.number,
        });
        if (!hit) {
          unresolved.push(line.raw);
          continue;
        }
        const existing = cards.find((c) => c.cardId === hit.id);
        if (existing) existing.quantity += line.quantity;
        else cards.push({ cardId: hit.id, quantity: line.quantity });
      }

      if (unresolved.length > 0) {
        showToast(`${strings.portability.unresolved} (${unresolved.length})`);
        return;
      }

      await importNewDeck(deck.name ? `${deck.name} import` : 'Deck importado', cards);
      setImportText('');
      showToast(strings.portability.success);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h2>{strings.portability.title}</h2>
      <div className={styles.row}>
        <Button onClick={() => void exportJson()}>{strings.portability.exportJson}</Button>
        <Button onClick={() => void exportText()}>{strings.portability.exportText}</Button>
      </div>
      <textarea
        className={styles.textarea}
        value={importText}
        onChange={(e) => setImportText(e.target.value)}
        placeholder={strings.portability.paste}
        rows={6}
        aria-label={strings.portability.paste}
      />
      <div className={styles.row}>
        <Button variant="accent" disabled={busy} onClick={() => void runImportJson()}>
          {strings.portability.importJson}
        </Button>
        <Button disabled={busy} onClick={() => void runImportPtcgo()}>
          {strings.portability.importText}
        </Button>
      </div>
    </div>
  );
}
