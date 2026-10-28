import { useState } from "react";
import { flushSync } from "react-dom";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useI18n } from "../../client/i18n/index.js";
import { importQueue } from "./commands.js";
import { previewRows } from "./model.js";

export function ImportDialog({ code, onDone }: { readonly code: string; readonly onDone: () => void }) {
  const { t } = useI18n();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = previewRows(raw);
  return (
    <div role="dialog" aria-label={t("planning.import")} aria-modal="true">
      <label>
        {t("planning.paste")}
        <textarea aria-label={t("planning.paste")} value={raw} onChange={(event) => setRaw(event.target.value)} />
      </label>
      {rows.map((row) => (
        <p key={`${row.title}-${row.link ?? ""}`}>
          {row.title}
          {row.error ? ` ${row.error}` : ""}
        </p>
      ))}
      <button
        type="button"
        style={touchTargetStyle}
        aria-busy={busy ? "true" : "false"}
        onClick={() => {
          flushSync(() => setBusy(true));
          void importQueue(code, raw).finally(() => {
            flushSync(() => setBusy(false));
            onDone();
          });
        }}
      >
        {t("planning.confirm")}
      </button>
    </div>
  );
}
