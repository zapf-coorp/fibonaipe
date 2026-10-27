import { computeRoundStats, createAppError, err, type AppError, type Result } from "@fibonaipe/domain";
import type { ExportArtifact } from "../../ports/exporter.port.js";
import { readLoaded, warn, type LoadedRoom, type UseCaseDependencies } from "../room-session.js";

export interface ExportRoomSummaryInput {
  readonly code: string;
  readonly participantId: string;
  readonly format: "csv" | "json";
}

export class ExportRoomSummary {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ExportRoomSummaryInput): Promise<Result<ExportArtifact, AppError>> {
    const loaded = await readLoaded(this.deps, input.code);
    if (!loaded.ok) {
      warn(this.deps, "ExportRoomSummary", loaded.error);
      return loaded;
    }
    const participant = loaded.value.room.participants.find((seat) => seat.id === input.participantId);
    if (!participant) {
      const error = createAppError("FORBIDDEN");
      warn(this.deps, "ExportRoomSummary", error, loaded.value.room.id);
      return err(error);
    }
    const data = summaryOf(loaded.value);
    if (input.format === "csv") {
      return this.deps.exporter.exportCsv({
        filenameBase: `room-${loaded.value.room.code}`,
        headers: ["title", "status", "finalEstimate", "round", "voteCount", "mean"],
        rows: csvRows(data),
      });
    }
    return this.deps.exporter.exportJson({
      filenameBase: `room-${loaded.value.room.code}`,
      schemaVersion: "1.0",
      data,
    });
  }
}

interface SummaryRound {
  readonly number: number;
  readonly status: string;
  readonly voteCount: number | null;
  readonly mean: number | null;
  readonly median: number | null;
  readonly min: number | null;
  readonly max: number | null;
  readonly consensus: boolean | null;
}

interface SummaryItem {
  readonly title: string;
  readonly status: string;
  readonly finalEstimate: string | null;
  readonly rounds: readonly SummaryRound[];
}

function summaryOf(loaded: LoadedRoom): { items: SummaryItem[] } {
  const items = loaded.table.items.map((item) => {
    const rounds = loaded.table.rounds
      .filter((round) => round.itemId === item.id)
      .map((round) => {
        const votes = loaded.table.votes.filter((vote) => vote.roundId === round.id);
        const stats = round.status === "revealed" ? computeRoundStats(loaded.room.scale, votes) : null;
        return {
          number: round.number,
          status: round.status,
          voteCount: stats ? stats.voteCount : null,
          mean: stats ? stats.mean : null,
          median: stats ? stats.median : null,
          min: stats ? stats.min : null,
          max: stats ? stats.max : null,
          consensus: stats ? stats.consensus : null,
        };
      });
    return {
      title: item.title,
      status: item.status,
      finalEstimate: item.finalEstimate ? item.finalEstimate.label : null,
      rounds,
    };
  });
  return { items };
}

function csvRows(data: { items: readonly SummaryItem[] }): (string | number | null)[][] {
  const rows: (string | number | null)[][] = [];
  for (const item of data.items) {
    if (item.rounds.length === 0) {
      rows.push([item.title, item.status, item.finalEstimate, null, null, null]);
      continue;
    }
    for (const round of item.rounds) {
      rows.push([item.title, item.status, item.finalEstimate, round.number, round.voteCount, round.mean]);
    }
  }
  return rows;
}
