export interface ForecastAccuracyRecord { readonly sprintId: string; readonly predicted: number | null; readonly delivered: number | null; readonly endDate?: string }
export interface ForecastAccuracyPoint { readonly sprintId: string; readonly predicted: number; readonly delivered: number; readonly errorPct: number; readonly endDate?: string }
export interface ForecastAccuracy { readonly series: readonly ForecastAccuracyPoint[]; readonly meanAbsError: number | null }
export function computeAccuracy(records: readonly ForecastAccuracyRecord[]): ForecastAccuracy {
  const series = records.filter((record): record is ForecastAccuracyRecord & { predicted: number; delivered: number } => record.predicted !== null && record.delivered !== null && Number.isFinite(record.predicted) && record.predicted > 0 && Number.isFinite(record.delivered)).map((record) => Object.freeze({ sprintId: record.sprintId, predicted: record.predicted, delivered: record.delivered, errorPct: (record.delivered - record.predicted) / record.predicted * 100, ...(record.endDate === undefined ? {} : { endDate: record.endDate }) }));
  return Object.freeze({ series: Object.freeze(series), meanAbsError: series.length ? series.reduce((sum, row) => sum + Math.abs(row.errorPct), 0) / series.length : null });
}
