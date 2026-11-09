import { gzipSync } from "node:zlib";
import { expect, it } from "vitest";
import { initialBytes } from "./check-bundle-budget.mjs";

it("counts shared static imports once and excludes deferred chunks", () => {
  const chunk = (fileName: string, imports: string[], isEntry = false) => ({
    type: "chunk", fileName, imports, isEntry, code: fileName, dynamicImports: ["later.js"],
  });
  const files = [chunk("main.js", ["react.js", "router.js"], true),
    chunk("router.js", ["react.js"]), chunk("react.js", []), chunk("later.js", [])];
  expect(initialBytes(files)).toBe(files.slice(0, 3).reduce((total, file) => total + gzipSync(file.code).length, 0));
  expect(() => initialBytes([])).toThrow();
});
