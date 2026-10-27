import type { AppError, Result } from "@fibonaipe/domain";

export interface ExportArtifact {
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string;
}

export interface CsvExportInput {
  readonly filenameBase: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number | boolean | null)[])[];
}

export interface JsonExportInput {
  readonly filenameBase: string;
  readonly schemaVersion: "1.0";
  readonly data: unknown;
}

export interface Exporter {
  exportCsv(input: CsvExportInput): Result<ExportArtifact, AppError>;
  exportJson(input: JsonExportInput): Result<ExportArtifact, AppError>;
}
