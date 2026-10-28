import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AggregatedHistoryRecord } from "../../ports/persistence.port.js";
import { requireTeamAction } from "../teams/access.js";
import type { UseCaseDependencies } from "../room-session.js";

export interface HistoryQueryInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly limit: number;
  readonly cursor?: string;
  readonly text?: string;
  readonly from?: Date;
  readonly to?: Date;
  readonly sprintId?: string;
  readonly roomId?: string;
  readonly estimateMin?: number;
  readonly estimateMax?: number;
  readonly suit?: string;
  readonly figureTag?: string;
}

export interface HistoryListRow {
  readonly id: string;
  readonly title: string;
  readonly finalEstimate: string;
  readonly estimatedAt: Date;
}

export interface HistoryListPage {
  readonly rows: readonly HistoryListRow[];
  readonly nextCursor: string | null;
}

export interface ExportHistoryInput extends HistoryQueryInput {
  readonly format: "csv" | "json";
}

export class ListHistory {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: HistoryQueryInput): Promise<Result<HistoryListPage, AppError>> {
    if (input.limit > 100) return err(createAppError("VALIDATION"));
    const access = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "viewDashboard");
    if (!access.ok) return access;
    return this.deps.persistence.transaction({}, async (repos) => {
      const stored = await repos.history.query({ teamId: access.value.teamId });
      const page = pageOf(stored, input);
      return ok({
        rows: page.rows.map(listRow),
        nextCursor: page.nextCursor,
      });
    });
  }
}

export class ExportHistory {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ExportHistoryInput): Promise<Result<{ content: string; filename: string }, AppError>> {
    if (input.limit > 100) return err(createAppError("VALIDATION"));
    const access = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "exportTeamData");
    if (!access.ok) return access;
    const loaded = await this.deps.persistence.transaction({}, async (repos) => {
      const team = await repos.teams.findById(access.value.teamId);
      if (!team) return err(createAppError("NOT_FOUND"));
      const stored = await repos.history.query({ teamId: access.value.teamId });
      return ok({ name: team.name, rows: pageOf(stored, input).rows });
    });
    if (!loaded.ok) return loaded;
    const filenameBase = `${loaded.value.name.trim().toLowerCase()}-${this.deps.clock.now().toISOString().slice(0, 10)}`;
    const rows = loaded.value.rows;
    if (input.format === "csv") {
      const exported = this.deps.exporter.exportCsv({
        filenameBase,
        headers: ["title", "finalEstimate", "estimatedAt", "mean", "roundNumber"],
        rows: rows.map((row) => [
          row.title ?? "",
          row.finalEstimate ?? "",
          row.estimatedAt instanceof Date ? row.estimatedAt.toISOString() : "",
          row.mean ?? null,
          row.roundNumber ?? null,
        ]),
      });
      if (!exported.ok) return exported;
      return ok({ content: exported.value.content, filename: exported.value.filename });
    }
    const exported = this.deps.exporter.exportJson({
      filenameBase,
      schemaVersion: "1.0",
      data: rows.map((row) => ({
        id: row.id,
        title: row.title ?? "",
        finalEstimate: row.finalEstimate ?? "",
        estimatedAt: row.estimatedAt instanceof Date ? row.estimatedAt.toISOString() : null,
        mean: row.mean ?? null,
        roundNumber: row.roundNumber ?? null,
      })),
    });
    if (!exported.ok) return exported;
    return ok({ content: exported.value.content, filename: exported.value.filename });
  }
}

function pageOf(
  records: readonly AggregatedHistoryRecord[],
  input: HistoryQueryInput,
): { rows: readonly AggregatedHistoryRecord[]; nextCursor: string | null } {
  const filtered = records.filter((record) => matches(record, input));
  filtered.sort((left, right) => timeOf(right) - timeOf(left));
  const cursorAt = input.cursor === undefined ? -1 : filtered.findIndex((record) => record.id === input.cursor);
  const start = cursorAt >= 0 ? cursorAt + 1 : 0;
  const rows = filtered.slice(start, start + input.limit);
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === input.limit && last ? last.id : null;
  return { rows, nextCursor };
}

function matches(record: AggregatedHistoryRecord, input: HistoryQueryInput): boolean {
  if (input.text !== undefined && !(record.title ?? "").includes(input.text)) return false;
  const at = timeOf(record);
  if (input.from !== undefined && at < input.from.getTime()) return false;
  if (input.to !== undefined && at > input.to.getTime()) return false;
  if (input.sprintId !== undefined && record.sprintId !== input.sprintId) return false;
  if (input.roomId !== undefined && record.roomId !== input.roomId) return false;
  if (input.estimateMin !== undefined || input.estimateMax !== undefined) {
    const numeric = Number(record.finalEstimate);
    if (!Number.isFinite(numeric)) return false;
    if (input.estimateMin !== undefined && numeric < input.estimateMin) return false;
    if (input.estimateMax !== undefined && numeric > input.estimateMax) return false;
  }
  if (input.suit !== undefined && (record.suit ?? record.dominantSuit) !== input.suit) return false;
  if (input.figureTag !== undefined && record.figureTag !== input.figureTag) return false;
  return true;
}

function timeOf(record: AggregatedHistoryRecord): number {
  if (record.estimatedAt instanceof Date) return record.estimatedAt.getTime();
  if (typeof record.estimatedAt === "string") return Date.parse(record.estimatedAt);
  return 0;
}

function listRow(record: AggregatedHistoryRecord): HistoryListRow {
  return {
    id: record.id,
    title: record.title ?? "",
    finalEstimate: record.finalEstimate ?? "",
    estimatedAt: record.estimatedAt instanceof Date ? record.estimatedAt : new Date(record.estimatedAt ?? 0),
  };
}
