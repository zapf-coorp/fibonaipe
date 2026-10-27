import { describe, expect, it } from "vitest";
import type { AppError, Result } from "@fibonaipe/domain";
import type { Exporter } from "@fibonaipe/application";

export function describeExporterContract(name: string, factory: () => Exporter): void {
  describe(name, () => {
    it("starts CSV with a UTF-8 BOM and prefixes formula-injection cells", () => {
      const exporter = factory();
      const cases: readonly (readonly [string | number | boolean, string])[] = [
        ["=SUM(A1)", "'=SUM(A1)"],
        ["+1", "'+1"],
        ["-1", "'-1"],
        ["@cmd", "'@cmd"],
        ["\t=1", "'\t=1"],
        ["safe", "safe"],
        [" -1", " -1"],
        [8, "8"],
        [0, "0"],
        [-5, "'-5"],
        [true, "true"],
        [false, "false"],
      ];

      for (const [value, cell] of cases) {
        const artifact = expectCsv(exporter, [[value]]);
        expect(csvLines(artifact.content)[1]).toBe(cell);
      }

      const carriageReturn = expectCsv(exporter, [["\r=1"]]);
      expect(carriageReturn.content.startsWith("\uFEFF")).toBe(true);
      expect(carriageReturn.content.includes("'\r=1")).toBe(true);
      expect(carriageReturn.filename).toBe("round-summary.csv");
      expect(carriageReturn.mimeType.toLowerCase()).toContain("text/csv");
      expect(carriageReturn.mimeType.toLowerCase()).toContain("utf-8");
    });

    it("escapes every dangerous cell in a row and serializes null as an empty field", () => {
      const exporter = factory();
      const artifact = expectCsv(exporter, [
        ["=SUM(A1)", "+cmd", "-5", "@x", "ok", null, "tail"],
      ], ["title", "plus", "minus", "at", "plain", "empty", "tail"]);
      expect(csvLines(artifact.content)).toEqual([
        "title,plus,minus,at,plain,empty,tail",
        "'=SUM(A1),'+cmd,'-5,'@x,ok,,tail",
      ]);
    });

    it("exports JSON as the given data without CSV escaping", () => {
      const exporter = factory();
      const data = { formula: "=SUM(A1)", title: "Plan", count: 2, ok: true, empty: null };
      const result = exporter.exportJson({ filenameBase: "plan", schemaVersion: "1.0", data });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.messageKey);
      expect(result.value.filename).toBe("plan.json");
      expect(result.value.mimeType.toLowerCase()).toContain("application/json");
      expect(JSON.parse(result.value.content)).toEqual(data);
      expect(result.value.content.includes("'=SUM(A1)")).toBe(false);
    });
  });
}

function expectCsv(
  exporter: Exporter,
  rows: readonly (readonly (string | number | boolean | null)[])[],
  headers: readonly string[] = ["title"],
): { filename: string; mimeType: string; content: string } {
  const result: Result<{ filename: string; mimeType: string; content: string }, AppError> = exporter.exportCsv({
    filenameBase: "round-summary",
    headers,
    rows,
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  expect(result.value.content.startsWith("\uFEFF")).toBe(true);
  expect(result.value.content.slice(1).startsWith("\uFEFF")).toBe(false);
  expect(result.value.filename).toBe("round-summary.csv");
  return result.value;
}

function csvLines(content: string): string[] {
  return content.slice(1).replace(/\r\n/g, "\n").split("\n").filter((line) => line.length > 0);
}
