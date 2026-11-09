import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";
import styles from "./Table.module.css";

const SUITS = ["joker", "clubs", "hearts", "spades", "diamonds"] as const;

const LABELS: Record<(typeof SUITS)[number], TranslationKey> = {
  joker: "planning.joker",
  clubs: "planning.clubs",
  hearts: "planning.hearts",
  spades: "planning.spades",
  diamonds: "planning.diamonds",
};

const GLYPH: Record<(typeof SUITS)[number], string> = {
  joker: "★",
  clubs: "♣",
  hearts: "♥",
  spades: "♠",
  diamonds: "♦",
};

export function SuitToggle({
  suit,
  onChange,
}: {
  readonly suit: string;
  readonly onChange: (suit: string) => void;
}) {
  const { t } = useI18n();
  const current = SUITS.find((kind) => kind === suit) ?? "joker";
  return (
    <div role="group" aria-label={t("planning.suit")} className={styles.deck}>
      {SUITS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={kind === "joker" ? styles.cardDark : styles.card}
          style={touchTargetStyle}
          aria-label={`${t("planning.suit")} ${t(LABELS[kind])}`}
          aria-pressed={current === kind}
          data-suit={kind}
          onClick={() => onChange(kind)}
        >
          <span className={styles.suitFace} aria-hidden="true">
            {GLYPH[kind]}
          </span>
        </button>
      ))}
    </div>
  );
}

export function suitKindOrJoker(suit: string): string {
  return SUITS.some((kind) => kind === suit) ? suit : "joker";
}
