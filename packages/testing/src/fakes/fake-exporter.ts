import { ok, type AppError, type Result } from "@fibonaipe/domain";
import type { CsvExportInput, ExportArtifact, Exporter, JsonExportInput } from "@fibonaipe/application";

const FORMULA_PREFIXES = new Set(["=", "+", "-", "@", "\t", "\r"]);

export class FakeExporter implements Exporter {
  exportCsv(input: CsvExportInput): Result<ExportArtifact, AppError> {
    const lines = [input.headers.map((header) => formatCell(header)).join(",")];
    for (const row of input.rows) {
      lines.push(row.map((value) => formatCell(value)).join(","));
    }
    return ok({
      filename: `${input.filenameBase}.csv`,
      mimeType: "text/csv; charset=utf-8",
      content: `\uFEFF${lines.join("\n")}`,
    });
  }

  exportJson(input: JsonExportInput): Result<ExportArtifact, AppError> {
    return ok({
      filename: `${input.filenameBase}.json`,
      mimeType: "application/json; charset=utf-8",
      content: JSON.stringify(input.data),
    });
  }
}

function formatCell(value: string | number | boolean | null): string {
  if (value === null) return "";
  const text = String(value);
  const first = text[0];
  if (first !== undefined && FORMULA_PREFIXES.has(first)) return `'${text}`;
  return text;
}
