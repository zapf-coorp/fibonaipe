import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";

const DAY_MS = 86_400_000;

function civilDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

export function computeWorkingDays(start: string, end: string, holidays: readonly string[]): Result<number, AppError> {
  const from = civilDate(start);
  const to = civilDate(end);
  if (from === null || to === null || from > to || holidays.some((date) => civilDate(date) === null)) return err(createAppError("VALIDATION"));
  const excluded = new Set(holidays);
  let total = 0;
  for (let current = from; current <= to; current += DAY_MS) {
    const date = new Date(current);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6 && !excluded.has(date.toISOString().slice(0, 10))) total++;
  }
  return ok(total);
}

export interface CapacityEntry { readonly absenceDays: number; readonly focusPct?: number }

export function computeCapacity(entries: readonly CapacityEntry[], workingDays: number): Result<number, AppError> {
  if (!Number.isFinite(workingDays) || workingDays < 0) return err(createAppError("VALIDATION"));
  let total = 0;
  for (const entry of entries) {
    const focus = entry.focusPct ?? 100;
    if (!Number.isFinite(entry.absenceDays) || entry.absenceDays < 0 || !Number.isFinite(focus) || focus < 0 || focus > 100) return err(createAppError("VALIDATION"));
    total += Math.max(0, workingDays - entry.absenceDays) * focus / 100;
  }
  return ok(total);
}
