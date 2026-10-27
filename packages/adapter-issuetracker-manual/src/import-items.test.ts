import { describe, expect, it } from "vitest";
import { MAX_ITEMS_PER_ROOM, type AppError, type Result } from "@fibonaipe/domain";
import type { ImportedBacklogBatch, ImportedItemCandidate } from "@fibonaipe/application";
import { describeIssueTrackerContract } from "../../testing/src/contracts/issue-tracker.contract.js";
import { createManualIssueTracker } from "./import-items.js";

const ONE_MB = 1_000_000;

describeIssueTrackerContract("manual issue tracker", () => createManualIssueTracker());

describe("manual import", () => {
  it("keeps one trimmed title per text line, strips list markers and control characters, and keeps formula text", async () => {
    const tracker = createManualIssueTracker();
    const rawText = ["- Alpha", "* Beta", "1. Gamma", "", "  -  Delta  ", "=cmd|'/c calc'!A0", "A\u0001ç\u007fão"].join(
      "\n",
    );
    const batch = expectBatch(await tracker.importItems({ kind: "text", rawText }));
    expect(batch.warnings).toEqual([]);
    expect(batch.items.map((item) => item.title)).toEqual(["Alpha", "Beta", "Gamma", "Delta", "=cmd|'/c calc'!A0", "Ação"]);
  });

  it("imports a BOM semicolon CSV with accents, quotes, and a formula title as data", async () => {
    const tracker = createManualIssueTracker();
    const csvContent = [
      "\uFEFFtítulo;descrição;chave;url",
      '"Ação; principal";Planejar café;RF-31;',
      "=cmd|'/c calc'!A0;São Paulo;;https://example.com/rf-31",
    ].join("\n");
    const batch = expectBatch(await tracker.importItems({ kind: "csv", csvContent }));
    expect(batch.items).toHaveLength(2);
    expect(fields(batch.items[0])).toEqual({
      title: "Ação; principal",
      description: "Planejar café",
      externalKey: "RF-31",
      externalUrl: "",
    });
    expect(fields(batch.items[1])).toEqual({
      title: "=cmd|'/c calc'!A0",
      description: "São Paulo",
      externalKey: "",
      externalUrl: "https://example.com/rf-31",
    });

    const aliases = expectBatch(
      await tracker.importItems({
        kind: "csv",
        csvContent: "titulo;descricao;link;id\nOlá;Texto;https://example.com/a;KEY-2\n",
      }),
    );
    expect(fields(aliases.items[0])).toEqual({
      title: "Olá",
      description: "Texto",
      externalKey: "KEY-2",
      externalUrl: "https://example.com/a",
    });
  });

  it("returns MISSING_TITLE_COLUMN when the header has no title alias", async () => {
    const tracker = createManualIssueTracker();
    const result = await tracker.importItems({
      kind: "csv",
      csvContent: "description,url\nOi,https://example.com/oi\n",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected MISSING_TITLE_COLUMN");
    expect(result.error.code as string).toBe("MISSING_TITLE_COLUMN");
    expect(result.error.messageKey).toBe("errors.MISSING_TITLE_COLUMN");
    expect(result.error.params).toBeUndefined();
  });

  it("returns LIMIT_EXCEEDED above 500 lines or 1_000_000 bytes before title validation", async () => {
    expect(MAX_ITEMS_PER_ROOM).toBe(500);
    const tracker = createManualIssueTracker();
    const overLines = `${"Item\n".repeat(501)}`;
    expectError(await tracker.importItems({ kind: "text", rawText: overLines }), "LIMIT_EXCEEDED");

    const overSize = "x".repeat(ONE_MB + 1);
    expect(new TextEncoder().encode(overSize).byteLength).toBe(ONE_MB + 1);
    expectError(await tracker.importItems({ kind: "text", rawText: overSize }), "LIMIT_EXCEEDED");
  });
});

function fields(item: ImportedItemCandidate | undefined): {
  title: string;
  description: string;
  externalKey: string;
  externalUrl: string;
} {
  if (!item) throw new Error("missing imported item");
  return {
    title: item.title,
    description: item.description ?? "",
    externalKey: item.externalKey ?? "",
    externalUrl: item.externalUrl ?? "",
  };
}

function expectBatch(result: Result<ImportedBacklogBatch, AppError>): ImportedBacklogBatch {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function expectError(result: Result<unknown, AppError>, code: AppError["code"]): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`expected ${code}`);
  expect(result.error.code).toBe(code);
  expect(result.error.messageKey).toBe(`errors.${code}`);
  expect(result.error.params).toBeUndefined();
}
