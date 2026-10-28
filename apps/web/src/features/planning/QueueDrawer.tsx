import { useState } from "react";
import { flushSync } from "react-dom";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { addQueueItem, queueSnapshot, reorderQueue } from "./commands.js";
import { isHttp, type ItemRow, type RoomView } from "./model.js";

export function QueueDrawer({
  code,
  view,
  items,
  onImport,
}: {
  readonly code: string;
  readonly view: RoomView;
  readonly items: readonly ItemRow[];
  readonly onImport: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [linkError, setLinkError] = useState("");
  return (
    <div role="dialog" aria-label={t("planning.queue")} aria-modal="true">
      <p aria-live="polite">{notice}</p>
      <ul aria-label={t("planning.queue")}>
        {items.map((item, index) => (
          <li key={item.id} aria-label={item.title}>
            <span>{item.title}</span>
            {item.link && isHttp(item.link) ? (
              <a href={item.link} rel="noopener noreferrer" target="_blank">
                {item.link}
              </a>
            ) : null}
            <button
              type="button"
              style={touchTargetStyle}
              onClick={() => move(code, view, items, index, -1, setNotice, t("planning.moved"))}
            >
              {t("planning.moveUp")}
            </button>
            <button
              type="button"
              style={touchTargetStyle}
              onClick={() => move(code, view, items, index, 1, setNotice, t("planning.moved"))}
            >
              {t("planning.moveDown")}
            </button>
          </li>
        ))}
      </ul>
      <label>
        {t("planning.itemTitle")}
        <input aria-label={t("planning.itemTitle")} value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        {t("planning.link")}
        <input aria-label={t("planning.link")} value={link} onChange={(event) => setLink(event.target.value)} />
      </label>
      {linkError ? <p>{linkError}</p> : null}
      <button
        type="button"
        style={touchTargetStyle}
        onClick={() => {
          if (link.trim() && !isHttp(link.trim())) {
            setLinkError(t("planning.invalidLink"));
            return;
          }
          addQueueItem(code, title.trim(), link.trim());
          setTitle("");
          setLink("");
        }}
      >
        {t("planning.add")}
      </button>
      <button type="button" style={touchTargetStyle} onClick={onImport}>
        {t("planning.import")}
      </button>
    </div>
  );
}

function move(
  code: string,
  view: RoomView,
  items: readonly ItemRow[],
  index: number,
  delta: number,
  setNotice: (notice: string) => void,
  template: string,
): void {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  const next = items.slice();
  const current = next[index];
  const swap = next[target];
  if (!current || !swap) return;
  next[index] = swap;
  next[target] = current;
  const snapshot = queueSnapshot({ ...view, queue: next });
  const position = target + 1;
  flushSync(() => {
    setNotice(template.replace("{title}", current.title).replace("{position}", String(position)));
    reorderQueue(code, snapshot.length > 0 ? snapshot : next.map((item) => ({ ...item })));
  });
}
