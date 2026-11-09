import { createAppError, type AppError } from "../shared/app-error.js";
import type { SprintId, TeamId } from "../shared/ids.js";
import { err, ok, type Result } from "../shared/result.js";
import { Sprint, type SprintProps } from "./sprint.js";

export class SprintBuilder {
  private values: { -readonly [K in keyof SprintProps]?: SprintProps[K] } = {};
  withId(value: SprintId): this { this.values.id = value; return this; }
  withTeamId(value: TeamId): this { this.values.teamId = value; return this; }
  withName(value: string): this { this.values.name = value; return this; }
  withStartDate(value: string): this { this.values.startDate = value; return this; }
  withEndDate(value: string): this { this.values.endDate = value; return this; }
  withGoal(value: string | null): this { this.values.goal = value; return this; }
  build(): Result<Sprint, AppError> {
    const { id, teamId, name, startDate, endDate } = this.values;
    const isDate = (value: string | undefined) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (!id || !teamId || !name?.trim() || !isDate(startDate) || !isDate(endDate) || startDate! > endDate!) return err(createAppError("VALIDATION"));
    return ok(Sprint.create({ id, teamId, name: name.trim(), startDate: startDate!, endDate: endDate!, goal: this.values.goal?.trim() || null, status: "planned", committedPoints: null, deliveredPoints: null, frozenMetrics: null, items: [], capacityTotal: 0 }));
  }
}

export function hasSprintOverlap(candidate: Sprint, existing: readonly Sprint[]): boolean {
  return existing.some((sprint) => sprint.teamId === candidate.teamId && sprint.id !== candidate.id && candidate.startDate <= sprint.endDate && sprint.startDate <= candidate.endDate);
}
