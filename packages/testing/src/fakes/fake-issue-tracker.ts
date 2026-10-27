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

export class FakeIssueTracker implements IssueTracker {
  readonly provider = "manual" as const;

  async importItems(input: IssueTrackerImportInput): Promise<Result<ImportedBacklogBatch, AppError>> {
    if (input.kind === "external") return err(createAppError("VALIDATION"));
    const items = input.kind === "text" ? titlesFromText(input.rawText) : itemsFromCsv(input.csvContent, input.delimiter ?? ",");
    if (!items.ok) return items;
    if (items.value.length > MAX_ITEMS_PER_ROOM) return err(createAppError("LIMIT_EXCEEDED"));
    return ok({ items: items.value, warnings: [] });
  }
}

function titlesFromText(rawText: string): Result<ImportedItemCandidate[], AppError> {
  const items: ImportedItemCandidate[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const title = line.trim();
    if (title.length === 0) continue;
    const validated = validateTitle(title);
    if (!validated.ok) return validated;
    items.push({ title });
  }
  return ok(items);
}

function itemsFromCsv(csvContent: string, delimiter: string): Result<ImportedItemCandidate[], AppError> {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) return ok([]);
  const header = splitRow(lines[0] ?? "", delimiter).map((cell) => cell.trim().toLowerCase());
  const hasHeader = header[0] === "title";
  const titleIndex = hasHeader ? header.indexOf("title") : 0;
  const descriptionIndex = hasHeader ? header.indexOf("description") : 1;
  const items: ImportedItemCandidate[] = [];
  for (const line of lines.slice(hasHeader ? 1 : 0)) {
    const cells = splitRow(line, delimiter);
    const title = (cells[titleIndex] ?? "").trim();
    if (title.length === 0) continue;
    const validated = validateTitle(title);
    if (!validated.ok) return validated;
    const description = descriptionIndex >= 0 ? cells[descriptionIndex] : undefined;
    if (description !== undefined && description.length > MAX_ITEM_DESC_LENGTH) {
      return err(createAppError("VALIDATION"));
    }
    items.push(description === undefined ? { title } : { title, description });
  }
  return ok(items);
}

function validateTitle(title: string): Result<true, AppError> {
  if (title.length > MAX_ITEM_TITLE_LENGTH) return err(createAppError("VALIDATION"));
  return ok(true);
}

function splitRow(line: string, delimiter: string): string[] {
  return line.split(delimiter);
}
