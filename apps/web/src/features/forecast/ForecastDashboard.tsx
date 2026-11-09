import { useCallback, useEffect, useState } from "react";
import type { ForecastAccuracy, ForecastResult } from "@fibonaipe/domain";
import { useI18n } from "../../client/i18n/index.js";
import { ForecastCard } from "./ForecastCard.js";
import { ForecastChart } from "./ForecastChart.js";

export function ForecastDashboard({ teamId }: { readonly teamId: string }) {
  const { t } = useI18n();
  const [capacity, setCapacity] = useState("15.4");
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);
  const [canExport, setCanExport] = useState(false);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try {
      const base = `/api/teams/${encodeURIComponent(teamId)}/forecast`;
      const [forecastResponse, accuracyResponse] = await Promise.all([
        fetch(`${base}?capacity=${encodeURIComponent(capacity)}`), fetch(`${base}/accuracy`),
      ]);
      if (!forecastResponse.ok || !accuracyResponse.ok) throw new Error("forecast load failed");
      setForecast(await forecastResponse.json() as ForecastResult);
      const result = await accuracyResponse.json() as ForecastAccuracy & { readonly canExport: boolean };
      setAccuracy(result); setCanExport(result.canExport);
    } catch { setError(true); }
  }, [teamId, capacity]);
  useEffect(() => { void load(); }, [load]);
  return <main>
    <h1>{t("forecast.title")}</h1>
    <label>{t("forecast.plannedCapacity")}<input type="number" min="0.1" step="0.1" value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
    <button type="button" onClick={() => { void load(); }}>{t("forecast.refresh")}</button>
    {error && <p role="alert">{t("forecast.loadError")}</p>}
    {forecast && <ForecastCard forecast={forecast} disclaimer={t("forecast.disclaimer")} />}
    {accuracy && <ForecastChart teamId={teamId} series={accuracy.series} meanAbsError={accuracy.meanAbsError} canExport={canExport} />}
  </main>;
}
