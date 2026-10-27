import { describe, expect, it } from "vitest";
import type { AppError, Result } from "@fibonaipe/domain";
import type { Exporter } from "@fibonaipe/application";
import { describeExporterContract } from "../../testing/src/contracts/exporter.contract.js";
import { createCsvJsonExporter } from "./exporter.js";

describeExporterContract("csv/json exporter", () => createCsvJsonExporter());

describe("csv/json export safety", () => {
  it("prefixes =1+1 with one single quote in a UTF-8 BOM CSV", () => {
    const exporter = createCsvJsonExporter();
    const formula = expectCsv(exporter, [["=1+1"]]);
    expect(formula.content.charCodeAt(0)).toBe(0xfeff);
    expect(formula.content.slice(1).startsWith("\uFEFF")).toBe(false);
    expect(csvLines(formula.content)).toEqual(["title", "'=1+1"]);
    expect(formula.mimeType.toLowerCase()).toContain("utf-8");

    const command = expectCsv(exporter, [["=cmd|'/c calc'!A0"]]);
    expect(csvLines(command.content)[1]).toBe("'=cmd|'/c calc'!A0");
  });

  it("pretty-prints JSON with the same key order for every insertion order", () => {
    const exporter = createCsvJsonExporter();
    const left = { b: "=1+1", a: { d: 1, c: "São" } };
    const right = { a: { c: "São", d: 1 }, b: "=1+1" };
    const first = expectJson(exporter, left);
    const second = expectJson(exporter, right);
    expect(first.content).toBe(second.content);
    expect(first.content).toBe(stableJson(left));
    expect(first.content).toContain("\n");
    expect(first.content.includes("'=1+1")).toBe(false);
    expect(first.content.indexOf('"a"')).toBeLessThan(first.content.indexOf('"b"'));
    expect(first.content.indexOf('"c"')).toBeLessThan(first.content.indexOf('"d"'));
    expect(JSON.parse(first.content)).toEqual(left);
  });
});

function expectCsv(
  exporter: Exporter,
  rows: readonly (readonly (string | number | boolean | null)[])[],
): { filename: string; mimeType: string; content: string } {
  const result: Result<{ filename: string; mimeType: string; content: string }, AppError> = exporter.exportCsv({
    filenameBase: "round-summary",
    headers: ["title"],
    rows,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function expectJson(exporter: Exporter, data: unknown): { content: string } {
  const result = exporter.exportJson({ filenameBase: "plan", schemaVersion: "1.0", data });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function csvLines(content: string): string[] {
  return content.slice(1).replace(/\r\n/g, "\n").split("\n").filter((line) => line.length > 0);
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item));
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([key, child]) => [key, sortKeys(child)]));
  }
  return value;
}
