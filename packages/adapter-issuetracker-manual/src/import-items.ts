import {
  MAX_ITEM_DESC_LENGTH,
  MAX_ITEM_TITLE_LENGTH,
  MAX_ITEMS_PER_ROOM,
  createAppError,
  err,
  ok,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type {
  ImportedBacklogBatch,
  ImportedItemCandidate,
  IssueTracker,
  IssueTrackerImportInput,
} from "@fibonaipe/application";

const MAX_IMPORT_BYTES = 1_000_000;

interface CsvColumns {
  readonly title: number;
  readonly description: number | null;
  readonly key: number | null;
  readonly url: number | null;
}

export function createManualIssueTracker(): IssueTracker {
  return {
    provider: "manual",
    async importItems(input: IssueTrackerImportInput): Promise<Result<ImportedBacklogBatch, AppError>> {
      if (input.kind === "external") return err(createAppError("VALIDATION"));
      const content = input.kind === "text" ? input.rawText : input.csvContent;
      const limited = importLimit(content);
      if (limited) return err(limited);
      if (input.kind === "text") return importText(content);
      return importCsv(content, input.delimiter);
    },
  };
}

function importLimit(content: string): AppError | null {
  if (new TextEncoder().encode(content).byteLength > MAX_IMPORT_BYTES) return createAppError("LIMIT_EXCEEDED");
  if (lineCount(content) > MAX_ITEMS_PER_ROOM) return createAppError("LIMIT_EXCEEDED");
  return null;
}

function importText(content: string): Result<ImportedBacklogBatch, AppError> {
  const items: ImportedItemCandidate[] = [];
  for (const line of linesOf(content)) {
    const title = stripListMarker(stripControls(line).trim()).trim();
    if (title.length === 0) continue;
    if (title.length > MAX_ITEM_TITLE_LENGTH) return err(createAppError("VALIDATION"));
    items.push({ title });
  }
  return ok({ items, warnings: [] });
}

function importCsv(content: string, delimiter: string | undefined): Result<ImportedBacklogBatch, AppError> {
  const rows = parseCsv(content.replace(/^\uFEFF/, ""), delimiter ?? detectDelimiter(content));
  const header = rows[0];
  if (!header) return missingTitleColumn();
  const columns = columnsOf(header);
  if (!columns) return missingTitleColumn();
  const items: ImportedItemCandidate[] = [];
  for (const row of rows.slice(1)) {
    if (row.every((cell) => stripControls(cell).trim().length === 0)) continue;
    const title = cellAt(row, columns.title);
    if (title.length === 0 || title.length > MAX_ITEM_TITLE_LENGTH) return err(createAppError("VALIDATION"));
    const description = columns.description === null ? undefined : cellAt(row, columns.description);
    if (description !== undefined && description.length > MAX_ITEM_DESC_LENGTH) return err(createAppError("VALIDATION"));
    const externalKey = columns.key === null ? undefined : cellAt(row, columns.key);
    const externalUrl = columns.url === null ? undefined : cellAt(row, columns.url);
    const item: ImportedItemCandidate = {
      title,
      ...(description ? { description } : {}),
      ...(externalKey ? { externalKey } : {}),
      ...(externalUrl ? { externalUrl } : {}),
    };
    items.push(item);
  }
  return ok({ items, warnings: [] });
}

function missingTitleColumn(): Result<never, AppError> {
  return err({
    code: "MISSING_TITLE_COLUMN",
    messageKey: "errors.MISSING_TITLE_COLUMN",
  } as unknown as AppError);
}

function columnsOf(headers: readonly string[]): CsvColumns | null {
  let title: number | null = null;
  let description: number | null = null;
  let key: number | null = null;
  let url: number | null = null;
  headers.forEach((header, index) => {
    const name = normalizeHeader(header);
    if (title === null && (name === "title" || name === "titulo")) title = index;
    else if (description === null && (name === "description" || name === "descricao")) description = index;
    else if (key === null && (name === "key" || name === "id" || name === "chave")) key = index;
    else if (url === null && (name === "url" || name === "link")) url = index;
  });
  if (title === null) return null;
  return { title, description, key, url };
}

function cellAt(row: readonly string[], index: number): string {
  return stripControls(row[index] ?? "").trim();
}

function normalizeHeader(value: string): string {
  return stripControls(value)
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function lineCount(content: string): number {
  return linesOf(content).length;
}

function linesOf(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const body = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  if (body.length === 0) return [];
  return body.split("\n");
}

function stripControls(value: string): string {
  let output = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 31 || code === 127) continue;
    output += char;
  }
  return output;
}

function stripListMarker(value: string): string {
  return value.replace(/^(?:-|\*|1\.)\s*/, "");
}

function detectDelimiter(content: string): "," | ";" {
  const text = content.replace(/^\uFEFF/, "");
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === undefined) break;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') index += 1;
        else quoted = false;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === "\n" || char === "\r") break;
    if (char === ",") commas += 1;
    if (char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === undefined) break;
    if (quoted) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
