import { createAppError, type AppError } from "../shared/app-error.js";
import { err, ok, type Result } from "../shared/result.js";
import type { SprintId, TeamId } from "../shared/ids.js";
import { computeCapacity, computeWorkingDays, type CapacityEntry } from "./capacity.js";

export type SprintStatus = "planned" | "active" | "closed";
export interface SprintItem {
  readonly id: string;
  readonly estimate: number | null;
  readonly doneAt: Date | null;
  readonly addedAfterStart: boolean;
  readonly carriedOver: boolean;
  readonly estimateExceeded?: boolean;
  readonly finalSuit?: string | null;
}
export interface SprintForecastRecord {
  readonly status: "ok" | "insufficient_data";
  readonly predicted: number | null;
  readonly low: number | null;
  readonly high: number | null;
  readonly medianPace: number | null;
  readonly delivered: number | null;
  readonly errorPct: number | null;
}
export interface SprintProps {
  readonly id: SprintId; readonly teamId: TeamId; readonly name: string;
  readonly startDate: string; readonly endDate: string; readonly goal: string | null;
  readonly status: SprintStatus; readonly committedPoints: number | null;
  readonly deliveredPoints: number | null; readonly frozenMetrics: SprintReport | null;
  readonly items: readonly SprintItem[]; readonly capacityTotal: number;
  readonly capacityEntries?: readonly SprintCapacityEntry[];
  readonly forecastRecord?: SprintForecastRecord | null;
}
export interface SprintCapacityEntry extends CapacityEntry { readonly personId: string }
export interface SprintReport {
  readonly committed: number; readonly delivered: number; readonly addedAfterStart: readonly SprintItem[];
  readonly carryOver: readonly SprintItem[]; readonly unestimated: readonly string[];
  readonly capacityTotal: number; readonly pace: number | null;
}
function cloneItem(item: SprintItem): SprintItem {
  return Object.freeze({ ...item, doneAt: item.doneAt === null ? null : new Date(item.doneAt.getTime()) });
}
function cloneReport(report: SprintReport): SprintReport {
  return Object.freeze({ ...report, addedAfterStart: Object.freeze(report.addedAfterStart.map(cloneItem)), carryOver: Object.freeze(report.carryOver.map(cloneItem)), unestimated: Object.freeze([...report.unestimated]) });
}
export class Sprint {
  private constructor(private readonly state: SprintProps) { Object.freeze(this); }
  static create(props: SprintProps): Sprint { return new Sprint(Object.freeze({ ...props, items: Object.freeze(props.items.map(cloneItem)), capacityEntries: Object.freeze((props.capacityEntries ?? []).map((entry) => Object.freeze({ ...entry }))), frozenMetrics: props.frozenMetrics === null ? null : cloneReport(props.frozenMetrics) })); }
  get props(): SprintProps { return Object.freeze({ ...this.state, items: Object.freeze(this.state.items.map(cloneItem)), frozenMetrics: this.state.frozenMetrics === null ? null : cloneReport(this.state.frozenMetrics) }); }
  get id() { return this.props.id; } get teamId() { return this.props.teamId; }
  get name() { return this.props.name; } get startDate() { return this.props.startDate; } get endDate() { return this.props.endDate; }
  get status() { return this.props.status; } get items() { return this.props.items; }
  get committedPoints() { return this.props.committedPoints; } get deliveredPoints() { return this.props.deliveredPoints; }
  get frozenMetrics() { return this.props.frozenMetrics; }
  get forecastRecord() { return this.props.forecastRecord ?? null; }
  activate(now: Date): Result<Sprint, AppError> {
    if (this.status !== "planned") return err(createAppError("FORBIDDEN"));
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return err(createAppError("VALIDATION"));
    const committed = this.items.reduce((sum, item) => sum + (item.estimate ?? 0), 0);
    return ok(this.copy({ status: "active", committedPoints: committed }));
  }
  linkItem(item: Omit<SprintItem, "addedAfterStart" | "carriedOver">, alreadyLinked = false): Result<Sprint, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (!item.id.trim() || alreadyLinked || this.items.some((entry) => entry.id === item.id)) return err(createAppError("VALIDATION"));
    if (item.doneAt !== null && (!(item.doneAt instanceof Date) || !Number.isFinite(item.doneAt.getTime()))) return err(createAppError("VALIDATION"));
    if (item.estimate !== null && (!Number.isFinite(item.estimate) || item.estimate < 0)) return err(createAppError("VALIDATION"));
    return ok(this.copy({ items: [...this.items, Object.freeze({ ...item, addedAfterStart: this.status === "active", carriedOver: false })] }));
  }
  markDone(itemId: string, doneAt: Date, estimateExceeded?: boolean): Result<Sprint, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (!(doneAt instanceof Date) || !Number.isFinite(doneAt.getTime())) return err(createAppError("VALIDATION"));
    if (!this.items.some((item) => item.id === itemId)) return err(createAppError("NOT_FOUND"));
    return ok(this.copy({ items: this.items.map((item) => item.id === itemId ? Object.freeze({ ...item, doneAt, estimateExceeded }) : item) }));
  }
  unlinkItem(itemId: string): Result<Sprint, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (!this.items.some((item) => item.id === itemId)) return err(createAppError("NOT_FOUND"));
    return ok(this.copy({ items: this.items.filter((item) => item.id !== itemId) }));
  }
  setCapacity(capacityTotal: number): Result<Sprint, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (!Number.isFinite(capacityTotal) || capacityTotal < 0) return err(createAppError("VALIDATION"));
    return ok(this.copy({ capacityTotal, capacityEntries: [] }));
  }
  setCapacityEntries(entries: readonly SprintCapacityEntry[], holidays: readonly string[]): Result<Sprint, AppError> {
    if (this.status === "closed") return err(createAppError("FORBIDDEN"));
    if (entries.some((entry) => !entry.personId.trim()) || new Set(entries.map((entry) => entry.personId)).size !== entries.length) return err(createAppError("VALIDATION"));
    const days = computeWorkingDays(this.startDate, this.endDate, holidays);
    if (!days.ok) return days;
    const capacity = computeCapacity(entries, days.value);
    if (!capacity.ok) return capacity;
    return ok(this.copy({ capacityTotal: capacity.value, capacityEntries: entries }));
  }
  close(now: Date): Result<{ sprint: Sprint; report: SprintReport }, AppError> {
    if (this.status !== "active") return err(createAppError("FORBIDDEN"));
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return err(createAppError("VALIDATION"));
    const carryOver = this.items.filter((item) => item.doneAt === null).map((item) => Object.freeze({ ...item, carriedOver: true }));
    const completed = this.items.filter((item) => item.doneAt !== null);
    const report: SprintReport = Object.freeze({ committed: this.committedPoints ?? 0, delivered: completed.reduce((sum, item) => sum + (item.estimate ?? 0), 0), addedAfterStart: Object.freeze(this.items.filter((item) => item.addedAfterStart)), carryOver: Object.freeze(carryOver), unestimated: Object.freeze(this.items.filter((item) => item.estimate === null).map((item) => item.id)), capacityTotal: this.props.capacityTotal, pace: this.props.capacityTotal > 0 ? completed.reduce((sum, item) => sum + (item.estimate ?? 0), 0) / this.props.capacityTotal : null });
    const prediction = this.forecastRecord?.predicted;
    const forecastRecord = this.forecastRecord === null ? null : Object.freeze({ ...this.forecastRecord, delivered: report.delivered, errorPct: prediction !== null && prediction !== undefined && prediction > 0 ? (report.delivered - prediction) / prediction * 100 : null });
    const sprint = this.copy({ status: "closed", deliveredPoints: report.delivered, frozenMetrics: report, forecastRecord, items: this.items.map((item) => item.doneAt === null ? Object.freeze({ ...item, carriedOver: true }) : item) });
    return ok({ sprint, report });
  }
  private copy(patch: Partial<SprintProps>): Sprint { return Sprint.create({ ...this.props, ...patch }); }
}
