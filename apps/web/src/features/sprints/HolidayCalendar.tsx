import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";

interface Holiday { readonly id: string; readonly name: string; readonly date: string }
export function HolidayCalendar({ teamId, onChanged }: { readonly teamId: string; readonly onChanged: () => void }) {
  const { t, formatDate } = useI18n();
  const [holidays, setHolidays] = useState<readonly Holiday[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/api/teams/${encodeURIComponent(teamId)}/holidays`;
  const load = useCallback(async () => {
    const response = await fetch(base);
    if (!response.ok) throw new Error("holidays failed");
    const data = await response.json() as { holidays: Holiday[] };
    setHolidays(data.holidays);
  }, [base]);
  useEffect(() => { void load().catch(() => setError(true)); }, [load]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, date }) });
      if (!response.ok) throw new Error("save failed");
      await load(); setName(""); setDate(""); setError(false); onChanged();
    } catch { setError(true); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`${base}/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      await load(); setError(false); onChanged();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section aria-labelledby="holiday-title"><h2 id="holiday-title">{t("holidayCalendar.title")}</h2>
    {error && <p role="alert">{t("sprints.error")}</p>}
    <ul>{holidays.map((holiday) => <li key={holiday.id}><span>{holiday.name}{" — "}{formatDate(`${holiday.date}T00:00:00Z`, { timeZone: "UTC" })}</span>{" "}<button type="button" disabled={busy} onClick={() => { void remove(holiday.id); }}>{t("holidayCalendar.remove", { name: holiday.name })}</button></li>)}</ul>
    <form onSubmit={(event) => { void save(event); }}><label>{t("holidayCalendar.name")}<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>{t("holidayCalendar.date")}<input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></label><button disabled={busy} type="submit">{t("holidayCalendar.add")}</button></form>
  </section>;
}
