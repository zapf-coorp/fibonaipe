import { castVote, retractOwnVote } from "./commands.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import styles from "./Table.module.css";

const SPECIALS = ["?", "Coringa", "AFK"] as const;

const SUIT_GLYPH: Record<string, string> = {
  clubs: "♣",
  hearts: "♥",
  spades: "♠",
  diamonds: "♦",
  joker: "★",
};

export function Deck({
  code,
  cards,
  selected,
  suit,
}: {
  readonly code: string;
  readonly cards: readonly string[];
  readonly selected: string | null;
  readonly suit: string;
}) {
  const { t } = useI18n();
  const labels = [...cards, ...SPECIALS];
  const glyph = SUIT_GLYPH[suit] ?? SUIT_GLYPH.joker;
  return (
    <div role="group" aria-label={t("planning.deck")} className={styles.deck}>
      {labels.map((card) => {
        const special = SPECIALS.some((item) => item === card);
        const face = special ? styles.cardDark : styles.card;
        const name = card === "Coringa" ? t("planning.joker") : card === "AFK" ? t("planning.afk") : card;
        return (
          <button
            key={card}
            type="button"
            className={face}
            style={touchTargetStyle}
            aria-label={special ? name : undefined}
            aria-pressed={selected === card}
            onClick={() => {
              if (selected === card) retractOwnVote(code);
              else castVote(code, card, suit, "select");
            }}
          >
            <span className={styles.pip} aria-hidden="true">
              {glyph}
            </span>
            {special ? <SpecialIcon card={card} /> : <span className={styles.rank}>{card}</span>}
          </button>
        );
      })}
    </div>
  );
}

function SpecialIcon({ card }: { readonly card: string }) {
  if (card === "?") {
    return (
      <svg className={styles.icon} viewBox="0 0 64 64" aria-hidden="true">
        <path
          fill="currentColor"
          d="M28 52h8v8h-8zm4-48c10 0 18 7 18 16 0 7-4 11-9 14-3 2-5 4-5 8h-8c0-7 3-11 8-14 4-2 6-4 6-8 0-4-3-8-8-8s-8 4-8 8h-8c0-9 7-16 16-16z"
        />
      </svg>
    );
  }
  if (card === "Coringa") {
    return (
      <svg className={styles.icon} viewBox="0 0 64 64" aria-hidden="true">
        <path fill="currentColor" d="M32 6 38 22h16l-13 10 5 16-14-9-14 9 5-16L10 22h16z" />
      </svg>
    );
  }
  return (
    <svg className={styles.icon} viewBox="0 0 64 64" aria-hidden="true">
      <path fill="currentColor" d="M8 44 22 16h10L16 44zm22 0 14-28h10L40 44z" />
    </svg>
  );
}
