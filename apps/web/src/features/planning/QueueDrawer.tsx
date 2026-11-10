import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { addQueueItem, addQueueItems, queueSnapshot, removeQueueItem, reorderQueue } from "./commands.js";
import { can, isHttp, type ItemRow, type RoomView } from "./model.js";
import { setRoomError } from "./room-store.js";
import styles from "./QueueDrawer.module.css";

export function QueueDrawer({
  code,
  view,
  items,
  onClose,
}: {
  readonly code: string;
  readonly view: RoomView;
  readonly items: readonly ItemRow[];
  readonly onClose: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        role="dialog"
        aria-label={t("planning.queue")}
        aria-modal="true"
        className={styles.panel}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.head}>
          <strong>{t("planning.queue")}</strong>
          <button type="button" className={styles.iconButton} style={touchTargetStyle} aria-label={t("planning.close")} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p aria-live="polite">{notice}</p>
        <div className={styles.composer}>
          <button
            type="button"
            className={styles.iconButton}
            style={touchTargetStyle}
            aria-label={t("planning.add")}
            onClick={() => {
              const nextTitle = title.trim();
              const nextLink = link.trim();
              if (!nextTitle) return;
              if (nextLink && !isHttp(nextLink)) {
                setRoomError(t("planning.invalidLink"));
                return;
              }
              addQueueItem(code, nextTitle, nextLink);
              setTitle("");
              setLink("");
            }}
          >
            <PlusIcon />
          </button>
          <input aria-label={t("planning.itemTitle")} value={title} placeholder={t("planning.itemTitle")} onChange={(event) => setTitle(event.target.value)} />
          <input aria-label={t("planning.link")} value={link} placeholder={t("planning.link")} onChange={(event) => setLink(event.target.value)} />
        </div>
        <ul aria-label={t("planning.queue")} className={styles.list}>
          {items.map((item, index) => {
            const pending = item.status === "pending";
            return (
              <li key={item.id} aria-label={item.title} className={styles.row}>
                {item.link && isHttp(item.link) ? (
                  <a href={item.link} rel="noopener noreferrer" target="_blank">
                    {item.title}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
                {pending && index > 0 ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    style={touchTargetStyle}
                    aria-label={t("planning.moveUp")}
                    onClick={() => move(code, view, items, index, -1, setNotice, t("planning.moved"))}
                  >
                    <Caret direction="up" />
                  </button>
                ) : null}
                {pending && index < items.length - 1 ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    style={touchTargetStyle}
                    aria-label={t("planning.moveDown")}
                    onClick={() => move(code, view, items, index, 1, setNotice, t("planning.moved"))}
                  >
                    <Caret direction="down" />
                  </button>
                ) : null}
                {pending ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    style={touchTargetStyle}
                    aria-label={t("planning.remove")}
                    onClick={() => removeQueueItem(code, item.id)}
                  >
                    <MinusIcon />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        {can(view, "exportOwnRoomSummary") ? (
        <div className={styles.files}>
          <button type="button" style={touchTargetStyle} onClick={() => exportTasks(items)}>
            {t("planning.exportJson")}
          </button>
          <label style={touchTargetStyle}>
            {t("planning.importJson")}
            <input
              type="file"
              accept="application/json,.json"
              aria-label={t("planning.importJson")}
              aria-busy={busy ? "true" : "false"}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                flushSync(() => setBusy(true));
                void readTasks(file)
                  .then((rows) => {
                    const valid: { title: string; link: string }[] = [];
                    let invalid = false;
                    for (const row of rows) {
                      if (row.link && !isHttp(row.link)) {
                        invalid = true;
                        continue;
                      }
                      valid.push(row);
                    }
                    addQueueItems(code, valid);
                    if (invalid) setRoomError(t("planning.invalidLink"));
                  })
                  .catch(() => setRoomError(t("errors.VALIDATION")))
                  .finally(() => flushSync(() => setBusy(false)));
              }}
            />
          </label>
        </div>
        ) : null}
      </div>
    </div>
  );
}

function exportTasks(items: readonly ItemRow[]): void {
  const body = JSON.stringify(
    items.map((item) => ({ title: item.title, link: item.link })),
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "tarefas.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function readTasks(file: File): Promise<{ title: string; link: string }[]> {
  const parsed: unknown = JSON.parse(await file.text());
  if (!Array.isArray(parsed)) throw new Error("invalid");
  const rows: { title: string; link: string }[] = [];
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const link = typeof record.link === "string" ? record.link.trim() : "";
    if (!title) continue;
    rows.push({ title, link });
  }
  return rows;
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2 v12 M2 8 h12" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 8 h12" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 3 l10 10 M13 3 L3 13" />
    </svg>
  );
}

function Caret({ direction }: { readonly direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      {direction === "up" ? <path d="M3 10 l5-6 5 6" /> : <path d="M3 6 l5 6 5-6" />}
    </svg>
  );
}
