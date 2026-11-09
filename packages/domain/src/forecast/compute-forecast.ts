import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import { median } from "./median.js";
import { percentile } from "./percentile.js";

export interface ClosedSprintForecastInput {
  readonly sprintId: string;
  readonly endDate: string;
  readonly capacityTotal: number;
  readonly deliveredPoints: number;
  readonly clubItems?: number;
  readonly totalItems?: number;
}
export interface ForecastOk {
  readonly status: "ok"; readonly have: number; readonly need: 3; readonly window: readonly string[];
  readonly excluded: readonly string[]; readonly medianPace: number; readonly predicted: number;
  readonly low: number; readonly high: number; readonly highRiskWarning: boolean;
}
export interface ForecastInsufficient {
  readonly status: "insufficient_data"; readonly have: number; readonly need: 3; readonly excluded: readonly string[];
}
export type ForecastResult = ForecastOk | ForecastInsufficient;
export interface ForecastRiskInput { readonly plannedClubItems: number; readonly plannedTotalItems: number; readonly historicalClubItems: number; readonly historicalTotalItems: number }
function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

export function computeForecast(closed: readonly ClosedSprintForecastInput[], plannedCapacity: number, risk?: ForecastRiskInput): ForecastResult {
  if (!Number.isFinite(plannedCapacity) || plannedCapacity <= 0) throw new RangeError("planned capacity must be positive");
  const sorted = [...closed].sort((a, b) => a.endDate.localeCompare(b.endDate));
  const excluded = sorted.filter((s) => !Number.isFinite(s.capacityTotal) || s.capacityTotal <= 0).map((s) => s.sprintId);
  const eligible = sorted.filter((s) => Number.isFinite(s.capacityTotal) && s.capacityTotal > 0);
  if (eligible.length < 3) return Object.freeze({ status: "insufficient_data", have: eligible.length, need: 3, excluded: Object.freeze(excluded) });
  const window = eligible.slice(-Math.min(6, eligible.length));
  const paces = window.map((s) => s.deliveredPoints / s.capacityTotal);
  const medianPace = median(paces);
  const lowPace = paces.length >= 6 ? percentile(paces, 0.25) : Math.min(...paces);
  const highPace = paces.length >= 6 ? percentile(paces, 0.75) : Math.max(...paces);
  const highRiskWarning = risk !== undefined && risk.plannedClubItems >= 2 && risk.plannedTotalItems > 0 && risk.historicalTotalItems > 0 && risk.plannedClubItems / risk.plannedTotalItems > 1.5 * risk.historicalClubItems / risk.historicalTotalItems;
  return Object.freeze({ status: "ok", have: eligible.length, need: 3, window: Object.freeze(window.map((s) => s.sprintId)), excluded: Object.freeze(excluded), medianPace, predicted: plannedCapacity * medianPace, low: plannedCapacity * lowPace, high: plannedCapacity * highPace, highRiskWarning });
}

export class ForecastReportBuilder {
  private closed: readonly ClosedSprintForecastInput[] | undefined;
  private capacity: number | undefined;
  private risk: ForecastRiskInput | undefined;
  withClosedSprints(value: readonly ClosedSprintForecastInput[]): this { this.closed = value; return this; }
  withPlannedCapacity(value: number): this { this.capacity = value; return this; }
  withRisk(value: ForecastRiskInput): this { this.risk = value; return this; }
  build(): Result<ForecastResult, AppError> {
    if (!this.closed || !Number.isFinite(this.capacity) || this.capacity! <= 0 || this.closed.some((s) => !s.sprintId.trim() || !isCivilDate(s.endDate) || !Number.isFinite(s.deliveredPoints) || s.deliveredPoints < 0 || !Number.isFinite(s.capacityTotal) || s.capacityTotal < 0 || (s.clubItems !== undefined && (!Number.isFinite(s.clubItems) || s.clubItems < 0)) || (s.totalItems !== undefined && (!Number.isFinite(s.totalItems) || s.totalItems < 0))) || (this.risk !== undefined && Object.values(this.risk).some((value) => !Number.isFinite(value) || value < 0))) return err(createAppError("VALIDATION"));
    try { return ok(computeForecast(this.closed, this.capacity!, this.risk)); }
    catch { return err(createAppError("VALIDATION")); }
  }
}
