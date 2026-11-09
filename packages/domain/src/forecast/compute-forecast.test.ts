import { describe, expect, it } from "vitest";
import { ForecastReportBuilder, computeForecast } from "./compute-forecast.js";
import { computeAccuracy } from "./accuracy.js";

const rows = [
  { sprintId: "a", endDate: "2026-01-01", capacityTotal: 10, deliveredPoints: 20 },
  { sprintId: "b", endDate: "2026-02-01", capacityTotal: 12, deliveredPoints: 27 },
  { sprintId: "c", endDate: "2026-03-01", capacityTotal: 14, deliveredPoints: 21 },
];

describe("forecast engine", () => {
  it("uses median pace and min/max band for three eligible sprints", () => {
    expect(computeForecast(rows, 15.4)).toMatchObject({ status: "ok", predicted: 30.8, low: 23.1, high: 34.65, medianPace: 2 });
  });
  it("reports insufficient data and excludes zero-capacity sprints", () => {
    expect(computeForecast([...rows.slice(0, 2), { sprintId: "zero", endDate: "2026-03-01", capacityTotal: 0, deliveredPoints: 3 }], 10)).toMatchObject({ status: "insufficient_data", have: 2, need: 3, excluded: ["zero"] });
  });
  it("uses interpolated quartiles for six points and contains the prediction", () => {
    const values = [1, 1.5, 2, 2.5, 3, 3.5].map((pace, i) => ({ sprintId: String(i), endDate: `2026-0${i + 1}-01`, capacityTotal: 1, deliveredPoints: pace }));
    const result = computeForecast(values, 12);
    expect(result).toMatchObject({ status: "ok", low: 19.5, high: 34.5, medianPace: 2.25 });
    if (result.status === "ok") expect(result.low).toBeLessThanOrEqual(result.predicted);
  });
  it("keeps the median prediction inside the forecast band", () => {
    for (const capacity of [0.5, 9, 15.4, 100]) {
      const result = computeForecast(rows, capacity);
      expect(result.status).toBe("ok");
      if (result.status === "ok") expect(result.low <= result.predicted && result.predicted <= result.high).toBe(true);
    }
  });
  it("validates through the report builder and rejects zero planned capacity", () => {
    expect(new ForecastReportBuilder().withClosedSprints(rows).withPlannedCapacity(0).build()).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
  it("flags a planned sprint with a disproportionate number of clubs items", () => {
    const forecast = computeForecast(rows, 10, { plannedClubItems: 2, plannedTotalItems: 4, historicalClubItems: 1, historicalTotalItems: 6 });
    expect(forecast).toMatchObject({ status: "ok", highRiskWarning: true });
  });
  it("computes absolute accuracy and excludes insufficient records", () => {
    expect(computeAccuracy([{ sprintId: "a", predicted: 30.8, delivered: 28 }, { sprintId: "b", predicted: null, delivered: 20 }]).meanAbsError).toBeCloseTo(9.09, 2);
  });
});
