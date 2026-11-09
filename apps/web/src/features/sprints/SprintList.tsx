import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";

interface SprintRow { readonly id: string; readonly name: string; readonly status: "planned" | "active" | "closed"; readonly startDate: string; readonly endDate: string }
export function SprintList({ teamId }: { readonly teamId: string }) {
  const { t, formatDate } = useI18n();
  const [rows, setRows] = useState<readonly SprintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [goal, setGoal] = useState("");
  const endpoint = `/api/teams/${encodeURIComponent(teamId)}/sprints`;
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("load failed");
      const data = await response.json() as { sprints: SprintRow[] };
      setRows(data.sprints);
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, startDate, endDate, goal }) });
      if (!response.ok) throw new Error("save failed");
      setName(""); setStartDate(""); setEndDate(""); setGoal("");
      await load();
    } catch { setError(true); } finally { setSaving(false); }
  }
  return <section aria-labelledby="sprints-title">
    <h1 id="sprints-title">{t("sprints.title")}</h1>
    {loading && <p role="status">{t("sprints.loading")}</p>}
    {error && <p role="alert">{t("sprints.error")}</p>}
    {!loading && !error && rows.length === 0 && <p>{t("sprints.empty")}</p>}
    <ul>{rows.map((row) => <li key={row.id}><a href={`/teams/${encodeURIComponent(teamId)}/sprints/${encodeURIComponent(row.id)}`}>{row.name}</a>{" — "}{row.status === "planned" ? t("sprints.planned") : row.status === "active" ? t("sprints.active") : t("sprints.closed")}{" · "}{formatDate(`${row.startDate}T00:00:00Z`, { timeZone: "UTC" })}{" – "}{formatDate(`${row.endDate}T00:00:00Z`, { timeZone: "UTC" })}</li>)}</ul>
    <form onSubmit={(event) => { void submit(event); }}>
      <label>{t("sprints.name")}<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>{t("sprints.start")}<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label>{t("sprints.end")}<input type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <label>{t("sprints.goal")}<input value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
      <button type="submit" disabled={saving}>{t("sprints.create")}</button>
    </form>
  </section>;
}
