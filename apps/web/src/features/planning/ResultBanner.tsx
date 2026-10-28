import { seatsOf, showAverage, statsOf, type RoomView, type Seat } from "./model.js";
import { useI18n, type TranslationKey } from "../../client/i18n/index.js";

const SUIT_WORD: Record<string, TranslationKey> = {
  clubs: "planning.high",
  hearts: "planning.medium",
  spades: "planning.low",
  diamonds: "planning.trivial",
};

export function ResultBanner({ view }: { readonly view: RoomView }) {
  const { t } = useI18n();
  const stats = statsOf(view);
  const seats = seatsOf(view);
  const distribution = record(stats?.suitDistribution);
  const extremes = record(stats?.extremes);
  const words = Object.entries(SUIT_WORD)
    .filter(([kind]) => Number(distribution?.[kind] ?? 0) > 0)
    .map(([, key]) => t(key));
  const divergent = stats?.suitDivergence === true;
  return (
    <section role="region" aria-label={t("planning.result")} aria-live="polite">
      {showAverage(view) && typeof stats?.mean === "number" ? (
        <p>
          {t("planning.mean")} {stats.mean}
        </p>
      ) : null}
      {typeof stats?.median === "number" ? (
        <p>
          {t("planning.median")} {stats.median}
        </p>
      ) : null}
      <p>
        {names(extremes?.minIds, seats).join(" ")} {names(extremes?.maxIds, seats).join(" ")}
      </p>
      {words.length > 0 ? <p>{words.join(" ")}</p> : null}
      {divergent ? (
        <p>
          {t("planning.divergence")} {words.join(" ")}
        </p>
      ) : null}
    </section>
  );
}

function names(value: unknown, seats: readonly Seat[]): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((id) => seats.find((seat) => seat.id === id)?.nickname ?? "");
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}
