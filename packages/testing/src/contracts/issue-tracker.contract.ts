import { describe, expect, it } from "vitest";
import {
  MAX_ITEM_DESC_LENGTH,
  MAX_ITEM_TITLE_LENGTH,
  MAX_ITEMS_PER_ROOM,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type { ImportedBacklogBatch, IssueTracker } from "@fibonaipe/application";

export function describeIssueTrackerContract(name: string, factory: () => IssueTracker): void {
  describe(name, () => {
    it("exposes a known provider", () => {
      expect(["manual", "clickup", "jira"]).toContain(factory().provider);
    });

    it("imports one trimmed text line per item and skips blank lines", async () => {
      const tracker = factory();
      const result = await tracker.importItems({
        kind: "text",
        rawText: "  Alpha  \n\nBeta\n\n=SUM(A1)\n",
      });
      const batch = expectBatch(result);
      expect(batch.warnings).toEqual([]);
      expect(batch.items.map((item) => item.title)).toEqual(["Alpha", "Beta", "=SUM(A1)"]);
      expect(await tracker.importItems({ kind: "text", rawText: "   \n\n" })).toEqual(
        okBatch([]),
      );
    });

    it("imports CSV rows with the requested delimiter", async () => {
      const tracker = factory();
      const comma = expectBatch(
        await tracker.importItems({
          kind: "csv",
          csvContent: "title,description\nHello,World\n",
          delimiter: ",",
        }),
      );
      expect(comma.warnings).toEqual([]);
      expect(comma.items).toEqual([expect.objectContaining({ title: "Hello", description: "World" })]);

      const semicolon = expectBatch(
        await tracker.importItems({
          kind: "csv",
          csvContent: "title;description\nOi;Mundo\n",
          delimiter: ";",
        }),
      );
      expect(semicolon.items).toEqual([expect.objectContaining({ title: "Oi", description: "Mundo" })]);
    });

    it("accepts the room item cap and rejects one more item with LIMIT_EXCEEDED", async () => {
      expect(MAX_ITEMS_PER_ROOM).toBe(500);
      const tracker = factory();
      const atCap = Array.from({ length: MAX_ITEMS_PER_ROOM }, (_, index) => `Item ${index}`).join("\n");
      const accepted = expectBatch(await tracker.importItems({ kind: "text", rawText: atCap }));
      expect(accepted.items).toHaveLength(MAX_ITEMS_PER_ROOM);
      expect(accepted.items[0]?.title).toBe("Item 0");
      expect(accepted.items[MAX_ITEMS_PER_ROOM - 1]?.title).toBe(`Item ${MAX_ITEMS_PER_ROOM - 1}`);

      const overCap = `${atCap}\nItem overflow`;
      expectError(await tracker.importItems({ kind: "text", rawText: overCap }), "LIMIT_EXCEEDED");
    });

    it("rejects an overlong title or description with VALIDATION", async () => {
      expect(MAX_ITEM_TITLE_LENGTH).toBe(200);
      expect(MAX_ITEM_DESC_LENGTH).toBe(2000);
      const tracker = factory();
      const maxTitle = "T".repeat(MAX_ITEM_TITLE_LENGTH);
      const accepted = expectBatch(await tracker.importItems({ kind: "text", rawText: maxTitle }));
      expect(accepted.items).toEqual([expect.objectContaining({ title: maxTitle })]);
      expectError(
        await tracker.importItems({ kind: "text", rawText: `${maxTitle}X` }),
        "VALIDATION",
      );

      const maxDescription = "D".repeat(MAX_ITEM_DESC_LENGTH);
      const described = expectBatch(
        await tracker.importItems({
          kind: "csv",
          csvContent: `title,description\nOk,${maxDescription}\n`,
          delimiter: ",",
        }),
      );
      expect(described.items).toEqual([
        expect.objectContaining({ title: "Ok", description: maxDescription }),
      ]);
      expectError(
        await tracker.importItems({
          kind: "csv",
          csvContent: `title,description\nOk,${maxDescription}X\n`,
          delimiter: ",",
        }),
        "VALIDATION",
      );
    });
  });
}

function expectBatch(result: Result<ImportedBacklogBatch, AppError>): ImportedBacklogBatch {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  expect(Array.isArray(result.value.items)).toBe(true);
  expect(Array.isArray(result.value.warnings)).toBe(true);
  return result.value;
}

function okBatch(titles: readonly string[]): { ok: true; value: ImportedBacklogBatch } {
  return {
    ok: true,
    value: {
      items: titles.map((title) => ({ title })),
      warnings: [],
    },
  };
}

function expectError(result: Result<unknown, AppError>, code: AppError["code"]): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`expected ${code}`);
  expect(result.error.code).toBe(code);
  expect(result.error.messageKey).toBe(`errors.${code}`);
  expect(result.error.params).toBeUndefined();
}
