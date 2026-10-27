import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { ExportArtifact, Exporter, JsonExportInput } from "@fibonaipe/application";

export function createCsvJsonExporter(): Exporter {
  return {
    exportCsv(input): Result<ExportArtifact, AppError> {
      const lines = [input.headers.map((header) => csvCell(header)).join(",")];
      for (const row of input.rows) {
        lines.push(row.map((value) => csvCell(value)).join(","));
      }
      return ok({
        filename: `${input.filenameBase}.csv`,
        mimeType: "text/csv; charset=utf-8",
        content: `\uFEFF${lines.join("\n")}`,
      });
    },
    exportJson(input: JsonExportInput): Result<ExportArtifact, AppError> {
      if (input.schemaVersion !== "1.0") return err(createAppError("VALIDATION"));
      return ok({
        filename: `${input.filenameBase}.json`,
        mimeType: "application/json; charset=utf-8",
        content: JSON.stringify(sortKeys(input.data), null, 2),
      });
    },
  };
}

function csvCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  const guarded = /^[\t\r]*[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => sortKeys(entry));
  if (value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return Object.fromEntries(entries.map(([key, child]) => [key, sortKeys(child)]));
  }
  return value;
}
