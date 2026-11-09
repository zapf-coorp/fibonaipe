import type { ForecastResult } from "@fibonaipe/domain";
import { useI18n } from "../../client/i18n/index.js";

export function ForecastCard({ forecast, disclaimer }: { readonly forecast: ForecastResult; readonly disclaimer: string }) {
  const { t } = useI18n();
  if (disclaimer.trim().length === 0) throw new Error("Forecast disclaimer translation is required");
  return <section aria-labelledby="forecast-title">
    <h2 id="forecast-title">{t("forecast.title")}</h2>
    <p>{disclaimer}</p>
    {forecast.status === "insufficient_data" ? <p role="status">{t("forecast.insufficient", { have: forecast.have, need: forecast.need })}</p> : <>
      <p><strong>{t("forecast.predicted", { value: forecast.predicted.toFixed(1) })}</strong></p>
      <p>{t("forecast.band", { low: forecast.low.toFixed(1), high: forecast.high.toFixed(1) })}</p>
      <p>{t("forecast.medianPace", { value: forecast.medianPace.toFixed(2) })}</p>
      {forecast.highRiskWarning && <p role="status">{t("forecast.risk")}</p>}
    </>}
  </section>;
}
