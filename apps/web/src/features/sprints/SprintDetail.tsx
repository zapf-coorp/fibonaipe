import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { CapacityGrid } from "./CapacityGrid.js";
import { HolidayCalendar } from "./HolidayCalendar.js";
import { SprintScope } from "./SprintScope.js";

interface SprintItem { readonly id: string; readonly estimate: number | null; readonly doneAt: string | null }
interface Sprint { readonly id: string; readonly name: string; readonly status: "planned" | "active" | "closed"; readonly committedPoints: number | null; readonly items: readonly SprintItem[]; readonly capacityTotal: number; readonly capacityEntries?: readonly { personId: string; absenceDays: number; focusPct?: number }[] }
interface Report { readonly committed: number; readonly delivered: number; readonly capacityTotal: number }

export function SprintDetail({ teamId, sprintId }: { readonly teamId: string; readonly sprintId: string }) {
  const { t, formatNumber } = useI18n();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const base = `/api/teams/${encodeURIComponent(teamId)}/sprints`;
  const endpoint = `${base}/${encodeURIComponent(sprintId)}`;
  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { credentials: "include" });
      if (!response.ok) throw new Error("load failed");
      const data = await response.json() as { sprint?: Sprint; sprints?: Sprint[] };
      const found = data.sprint ?? data.sprints?.find((item) => item.id === sprintId);
      if (!found) throw new Error("sprint missing");
      setSprint(found);
      if (found.status === "closed") {
        const reportResponse = await fetch(`${endpoint}/report`, { credentials: "include" });
        if (!reportResponse.ok) throw new Error("report failed");
        setReport(await reportResponse.json() as Report);
      } else {
        setReport(null);
      }
      setError(false);
    } catch { setError(true); }
  }, [endpoint, sprintId]);
  useEffect(() => { void load(); }, [load]);
  async function command(action: "activate" | "close") {
    setBusy(true);
    try {
      const response = await fetch(`${endpoint}/${action}`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("command failed");
      setConfirming(false);
      await load();
    } catch { setError(true); } finally { setBusy(false); }
  }
  const delivered = sprint?.items.filter((item) => item.doneAt !== null).reduce((sum, item) => sum + (item.estimate ?? 0), 0) ?? 0;
  return <section aria-labelledby="sprint-detail-title" aria-busy={sprint === null && !error}>
    <nav aria-label={t("sprints.title")}>
      <a href="/teams">{t("sprints.backToTeams")}</a>
      {" · "}
      <a href={`/teams/${encodeURIComponent(teamId)}/sprints`}>{t("sprints.title")}</a>
      {" · "}
      <a href={`/teams/${encodeURIComponent(teamId)}/dashboard`}>{t("forecast.title")}</a>
    </nav>
    {error && <p role="alert">{t("sprints.error")}</p>}
    {!sprint && !error && <p role="status">{t("sprints.loading")}</p>}
    {sprint && <>
      <h1 id="sprint-detail-title">{sprint.name}</h1>
      <p>{t("sprintDetail.capacity", { value: formatNumber(sprint.capacityTotal) })}</p>
      {sprint.status !== "closed" && <CapacityGrid teamId={teamId} sprintId={sprintId} entries={sprint.capacityEntries ?? []} onSaved={() => { void load(); }} />}
      {sprint.status !== "closed" && <HolidayCalendar teamId={teamId} onChanged={() => { void load(); }} />}
      <SprintScope teamId={teamId} sprintId={sprintId} items={sprint.items} status={sprint.status} onChanged={() => { void load(); }} />
      {sprint.status === "planned" && <button disabled={busy} onClick={() => { void command("activate"); }}>{t("sprintDetail.activate")}</button>}
      {sprint.status === "active" && <button disabled={busy} onClick={() => setConfirming(true)}>{t("sprintDetail.close")}</button>}
      {sprint.status === "closed" && <p>{t("sprintDetail.closedNotice")}</p>}
      {report && <><p>{t("sprintDetail.committed", { value: formatNumber(report.committed) })}</p><p>{t("sprintDetail.delivered", { value: formatNumber(report.delivered) })}</p></>}
      {confirming && <div role="dialog" aria-modal="true" aria-labelledby="close-title">
        <h2 id="close-title">{t("sprintDetail.confirmTitle")}</h2>
        <p>{t("sprintDetail.committed", { value: formatNumber(sprint.committedPoints ?? 0) })}</p>
        <p>{t("sprintDetail.delivered", { value: formatNumber(delivered) })}</p>
        <p>{t("sprintClosure.carryOver", { count: sprint.items.filter((item) => item.doneAt === null).length })}</p>
        <ul>{sprint.items.filter((item) => item.doneAt === null).map((item) => <li key={item.id}>{item.id}</li>)}</ul>
        <p>{t("sprintClosure.unestimated", { count: sprint.items.filter((item) => item.estimate === null).length })}</p>
        <ul>{sprint.items.filter((item) => item.estimate === null).map((item) => <li key={item.id}>{item.id}</li>)}</ul>
        <button disabled={busy} onClick={() => { void command("close"); }}>{t("sprintDetail.confirm")}</button>
        <button disabled={busy} onClick={() => setConfirming(false)}>{t("sprintDetail.cancel")}</button>
      </div>}
    </>}
  </section>;
}
