import { castVote } from "./commands.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import styles from "./Table.module.css";

const SPECIALS = ["?", "Coringa", "AFK"] as const;

export function Deck({
  code,
  cards,
  selected,
  locked,
  suit,
}: {
  readonly code: string;
  readonly cards: readonly string[];
  readonly selected: string | null;
  readonly locked: boolean;
  readonly suit: string;
}) {
  const { t } = useI18n();
  const labels = [...cards, ...SPECIALS];
  return (
    <div role="group" aria-label={t("planning.deck")} className={styles.deck}>
      {labels.map((card) => (
        <button
          key={card}
          type="button"
          style={touchTargetStyle}
          aria-pressed={selected === card}
          aria-disabled={locked ? "true" : "false"}
          onClick={() => {
            if (locked) return;
            castVote(code, card, suit, "select");
          }}
        >
          {card}
        </button>
      ))}
    </div>
  );
}
