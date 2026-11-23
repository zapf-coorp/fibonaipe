import { useEffect, useState } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { reopenItem, selectItem } from "./commands.js";
import { currentItem, isVotable, itemsOf, type RoomView } from "./model.js";
import styles from "./TaskPicker.module.css";

/** Dropdown to choose which task the room votes on. Voted tasks can be reviewed and reopened. */
export function TaskPicker({ code, view }: { readonly code: string; readonly view: RoomView }) {
  const { t } = useI18n();
  const items = itemsOf(view);
  const current = currentItem(view);
  const [picked, setPicked] = useState(current?.id ?? "");
  useEffect(() => {
    if (current) setPicked(current.id);
  }, [current?.id]);
  const open = items.filter(isVotable);
  const done = items.filter((item) => !isVotable(item));
  const shown = items.find((item) => item.id === picked);
  const busyWithOther = items.some((item) => item.status === "current");
  return (
    <div className={styles.picker}>
      <label className={styles.label}>
        <span>{t("planning.pickTask")}</span>
        <select
          value={picked}
          disabled={items.length === 0}
          onChange={(event) => {
            const item = items.find((row) => row.id === event.target.value);
            if (!item) return;
            setPicked(item.id);
            if (isVotable(item) && item.status !== "current") selectItem(code, item.id);
          }}
        >
          {open.length > 0 ? (
            <optgroup label={t("planning.taskOpen")}>
              {open.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          ) : null}
          {done.length > 0 ? (
            <optgroup label={t("planning.taskDone")}>
              {done.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
      {shown && !isVotable(shown) ? (
        <div className={styles.summary} role="group" aria-label={shown.title}>
          {shown.average !== null ? (
            <span>
              {t("planning.mean")} {shown.average}
            </span>
          ) : null}
          {shown.finalEstimate ? (
            <span>
              {t("planning.taskDecided")} {shown.finalEstimate}
            </span>
          ) : null}
          <button type="button" style={touchTargetStyle} disabled={busyWithOther} onClick={() => reopenItem(code, shown.id)}>
            {t("planning.reopen")}
          </button>
          {busyWithOther ? <small>{t("planning.reopenBlocked")}</small> : null}
        </div>
      ) : null}
    </div>
  );
}
