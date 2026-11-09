import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import type { HolidayId, TeamId } from "../shared/ids.js";

export interface Holiday { readonly id: HolidayId; readonly teamId: TeamId; readonly date: string; readonly name: string }
export function createHoliday(holiday: Holiday): Result<Holiday, AppError> {
  const date = holiday.date;
  if (!holiday.id || !holiday.teamId || !holiday.name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return err(createAppError("VALIDATION"));
  return ok(Object.freeze({ ...holiday, name: holiday.name.trim() }));
}
