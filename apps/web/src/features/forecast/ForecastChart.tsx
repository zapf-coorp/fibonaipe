import { useMemo, useState } from "react";
import type { ForecastAccuracyPoint } from "@fibonaipe/domain";
import { useI18n } from "../../client/i18n/index.js";

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

export function ForecastChart({ teamId, series, meanAbsError, canExport }: { readonly teamId: string; readonly series: readonly ForecastAccuracyPoint[]; readonly meanAbsError: number | null; readonly canExport: boolean }) {
  const { t } = useI18n();
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const filtered = useMemo(() => series.filter((row) => (!from || !row.endDate || row.endDate >= from) && (!to || !row.endDate || row.endDate <= to)), [series, from, to]);
  const max = Math.max(1, ...filtered.flatMap((row) => [row.predicted, row.delivered]));
  const step = filtered.length === 0 ? 100 : 760 / filtered.length;
  const svg = <svg viewBox="0 0 800 240" role="img" aria-label={t("forecast.chartLabel")}>
    {filtered.map((row, index) => { const x = 20 + index * step; const predictedHeight = row.predicted / max * 200; const deliveredHeight = row.delivered / max * 200; return <g key={row.sprintId}>
      <rect x={x} y={220 - predictedHeight} width={step * 0.35} height={predictedHeight} fill="currentColor" opacity="0.45" />
      <rect x={x + step * 0.4} y={220 - deliveredHeight} width={step * 0.35} height={deliveredHeight} fill="currentColor" />
      <text x={x} y="238" fontSize="10">{row.sprintId.slice(0, 7)}</text>
    </g>; })}
  </svg>;
  async function exportFromServer(format: "csv" | "json") {
    const params = new URLSearchParams({ format });
    if (from) params.set("from", from); if (to) params.set("to", to);
    const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/forecast/export?${params}`);
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = `forecast.${format}`; link.click(); URL.revokeObjectURL(url);
  }
  return <section aria-labelledby="accuracy-title">
    <h2 id="accuracy-title">{t("forecast.accuracy")}</h2>
    {meanAbsError === null && <p>{t("forecast.noAccuracy")}</p>}
    {meanAbsError !== null && <p>{t("forecast.meanAbsError", { value: meanAbsError.toFixed(2) })}</p>}
    <label>{t("forecast.from")}<input aria-label={t("forecast.from")} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
    <label>{t("forecast.to")}<input aria-label={t("forecast.to")} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
    {filtered.length === 0 ? <p>{t("forecast.noAccuracy")}</p> : <>
      {svg}
      <table><caption>{t("forecast.accuracy")}</caption><thead><tr><th>{t("forecast.sprint")}</th><th>{t("forecast.predictedHeader")}</th><th>{t("forecast.deliveredHeader")}</th><th>{t("forecast.errorHeader")}</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.sprintId}><th scope="row">{row.sprintId}</th><td>{row.predicted}</td><td>{row.delivered}</td><td>{row.errorPct.toFixed(2)}%</td></tr>)}</tbody></table>
      {canExport ? <div aria-label={t("forecast.exports")}>
        <button type="button" onClick={() => { void exportFromServer("csv"); }}>{t("forecast.csv")}</button>
        <button type="button" onClick={() => { void exportFromServer("json"); }}>{t("forecast.json")}</button>
        <button type="button" onClick={() => download("forecast.svg", "image/svg+xml", new XMLSerializer().serializeToString(document.querySelector("svg[aria-label]")!))}>{t("forecast.svg")}</button>
      </div> : <p role="status">{t("forecast.exportForbidden")}</p>}
    </>}
  </section>;
}
