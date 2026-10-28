import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { activeCards, showAverage, type RoomView } from "./model.js";

export function SettingsSheet({ view }: { readonly view: RoomView }) {
  const { t } = useI18n();
  return (
    <div role="dialog" aria-label={t("planning.settings")} aria-modal="true">
      <p>{t("planning.whoVotes")}</p>
      <div role="group" aria-label={t("create.cards")}>
        {activeCards(view).map((card) => (
          <label key={card} style={touchTargetStyle}>
            <input type="checkbox" defaultChecked aria-label={card} />
            {card}
          </label>
        ))}
      </div>
      <label style={touchTargetStyle}>
        <input type="checkbox" defaultChecked={showAverage(view)} aria-label={t("create.average")} />
        {t("create.average")}
      </label>
    </div>
  );
}
