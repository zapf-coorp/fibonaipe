import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";

const SUITS = ["joker", "clubs", "hearts", "spades", "diamonds"] as const;

const LABELS: Record<(typeof SUITS)[number], TranslationKey> = {
  joker: "planning.joker",
  clubs: "planning.clubs",
  hearts: "planning.hearts",
  spades: "planning.spades",
  diamonds: "planning.diamonds",
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
  const label = t(LABELS[current]);
  return (
    <button
      type="button"
      style={touchTargetStyle}
      aria-label={`${t("planning.suit")} ${label}`}
      onClick={() => {
        const index = SUITS.indexOf(current);
        const next = SUITS[(index + 1) % SUITS.length] ?? "joker";
        onChange(next);
      }}
    >
      {label}
    </button>
  );
}

export function suitKindOrJoker(suit: string): string {
  return SUITS.some((kind) => kind === suit) ? suit : "joker";
}
