import { useState } from "react";
import { flushSync } from "react-dom";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { confirmEstimate } from "./commands.js";
import { activeCards } from "./model.js";
import type { RoomView } from "./model.js";

export function EstimateDialog({
  code,
  view,
  onClose,
}: {
  readonly code: string;
  readonly view: RoomView;
  readonly onClose: () => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState("8");
  const cards = [...activeCards(view), "?", "Coringa"];
  return (
    <div role="dialog" aria-label={t("planning.estimate")} aria-modal="true">
      {cards.map((card) => (
        <button key={card} type="button" style={touchTargetStyle} aria-pressed={choice === card} onClick={() => setChoice(card)}>
          {card}
        </button>
      ))}
      <button
        type="button"
        style={touchTargetStyle}
        onClick={() => {
          flushSync(() => {
            confirmEstimate(code, choice);
            onClose();
          });
        }}
      >
        {t("planning.confirm")}
      </button>
    </div>
  );
}
