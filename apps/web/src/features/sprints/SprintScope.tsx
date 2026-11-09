import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../client/i18n/index.js";

interface HistoryRow { readonly itemId: string; readonly roomId: string; readonly title: string; readonly finalEstimate: string }
interface Item { readonly id: string; readonly estimate: number | null; readonly doneAt: string | null; readonly addedAfterStart?: boolean }
export function SprintScope({ teamId, sprintId, items, status, onChanged }: { readonly teamId: string; readonly sprintId: string; readonly items: readonly Item[]; readonly status: "planned" | "active" | "closed"; readonly onChanged: () => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<readonly HistoryRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [overruns, setOverruns] = useState<Readonly<Record<string, boolean>>>({});
  const historyUrl = `/api/teams/${encodeURIComponent(teamId)}/history`;
  const base = `/api/teams/${encodeURIComponent(teamId)}/sprints/${encodeURIComponent(sprintId)}/items`;
  const load = useCallback(async (next?: string) => {
    const response = await fetch(next ? `${historyUrl}?cursor=${encodeURIComponent(next)}` : historyUrl, { credentials: "include" });
    if (!response.ok) throw new Error("history failed");
    const data = await response.json() as { rows: HistoryRow[]; nextCursor: string | null };
    setRows((current) => next ? [...current, ...data.rows] : data.rows);
    setCursor(data.nextCursor);
    setError(false);
  }, [historyUrl]);
  useEffect(() => { void load().catch(() => setError(true)).finally(() => setLoading(false)); }, [load]);
  async function command(url: string, method: "POST" | "DELETE", body?: unknown) {
    setBusy(true);
    try {
      const response = await fetch(url, { method, credentials: "include", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!response.ok) throw new Error("scope failed");
      setError(false); onChanged();
    } catch { setError(true); } finally { setBusy(false); }
  }
  const latestByItem = new Map<string, HistoryRow>();
  for (const row of rows) if (!latestByItem.has(row.itemId)) latestByItem.set(row.itemId, row);
  const unique = [...latestByItem.values()];
  const linked = new Set(items.map((item) => item.id));
  const available = unique
    .filter((row) => !linked.has(row.itemId) && isEstimated(row))
    .sort((left, right) => left.title.localeCompare(right.title));
  return <section aria-labelledby="scope-title" aria-busy={loading}>
    <h2 id="scope-title">{t("sprintScope.title")}</h2>
    {loading && <p role="status">{t("sprints.loading")}</p>}
    {error && <p role="alert">{t("sprints.error")}</p>}
    <ul>{items.map((item) => { const name = unique.find((row) => row.itemId === item.id)?.title ?? item.id; return <li key={item.id}>{name}{" · "}{item.estimate ?? "?"}{item.addedAfterStart && <> {t("sprintScope.addedLate")}</>}{item.doneAt && <> {t("sprintScope.completed")}</>}{status !== "closed" && <><button disabled={busy} onClick={() => { void command(`${base}/${encodeURIComponent(item.id)}`, "DELETE"); }}>{t("sprintScope.remove", { name })}</button>{!item.doneAt && <><label><input type="checkbox" checked={overruns[item.id] ?? false} onChange={(event) => setOverruns((current) => ({ ...current, [item.id]: event.target.checked }))} />{t("sprintOverrun.label", { name })}</label><button disabled={busy} onClick={() => { void command(`${base}/${encodeURIComponent(item.id)}/done`, "POST", { estimateExceeded: overruns[item.id] ?? false }); }}>{t("sprintScope.done", { name })}</button></>}</>}</li>; })}</ul>
    {status !== "closed" && <><h3>{t("sprintScope.available")}</h3>{available.length === 0 ? <p>{t("sprintScope.noAvailable")}</p> : <ul>{available.map((row) => <li key={row.itemId}>{row.title}{" · "}{row.finalEstimate}<button disabled={busy} onClick={() => { void command(base, "POST", { itemId: row.itemId, roomId: row.roomId }); }}>{t("sprintScope.add", { name: row.title })}</button></li>)}</ul>}</>}
    {cursor && <button disabled={busy} onClick={() => { void load(cursor).catch(() => setError(true)); }}>{t("sprintScope.loadMore")}</button>}
  </section>;
}

function isEstimated(row: HistoryRow): boolean {
  const value = row.finalEstimate.trim();
  return value.length > 0 && value !== "?" && value !== "Coringa" && value !== "AFK";
}
