import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanSourceForViolations, verifyLicenseText } from "../../../../../tools/check-boundaries.mjs";
import { verifyLicenses } from "../../../../../tools/check-licenses.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../../../");

describe("boundary fixtures", () => {
  it("rejects an adapter import, a cross-adapter import, and Date.now", () => {
    const adapterImport = readFileSync(join(root, "tools/boundary-fixtures/domain-imports-adapter/bad.ts"), "utf8");
    const cross = readFileSync(join(root, "tools/boundary-fixtures/adapter-imports-adapter/bad.ts"), "utf8");
    const impure = readFileSync(join(root, "tools/boundary-fixtures/domain-impure-date/bad.ts"), "utf8");
    expect(scanSourceForViolations(adapterImport, "domain").length).toBeGreaterThan(0);
    expect(scanSourceForViolations(cross, "adapter").length).toBeGreaterThan(0);
    expect(scanSourceForViolations(impure, "domain").some((item) => item.includes("DATE_NOW"))).toBe(true);
  });
});

describe("licenses", () => {
  it("rejects copyleft and native addons in a lockfile snippet", () => {
    const bad = JSON.stringify({
      packages: {
        "node_modules/better-sqlite3": { license: "MIT" },
        "node_modules/some-gpl": { license: "GPL-3.0" },
      },
    });
    expect(verifyLicenses(bad).ok).toBe(false);
    expect(verifyLicenseText(bad).some((item) => item.includes("NATIVE") || item.includes("COPYLEFT"))).toBe(true);
  });
});
