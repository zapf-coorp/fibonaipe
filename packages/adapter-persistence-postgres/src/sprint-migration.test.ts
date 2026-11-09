import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("sprint migration", () => {
  it("restricts access to the new sprint tables", () => {
    const sql = readFileSync(new URL("../migrations/004_r3_sprints.sql", import.meta.url), "utf8");
    for (const table of ["capacity_entries", "holidays", "sprint_items", "forecast_records"]) {
      expect(sql.toLowerCase()).toContain(`alter table ${table} enable row level security`);
    }
  });
  it("does not split a comment into invalid SQL during migration execution", () => {
    const sql = readFileSync(new URL("../migrations/004_r3_sprints.sql", import.meta.url), "utf8");
    expect(sql.split(/\r?\n/).filter((line) => line.trimStart().startsWith("--"))).not.toEqual(expect.arrayContaining([expect.stringContaining(";")]));
  });
  it("does not treat completed items in closed sprints as active allocations", () => {
    const sql = readFileSync(new URL("../migrations/004_r3_sprints.sql", import.meta.url), "utf8");
    expect(sql).not.toMatch(/create\s+unique\s+index[^;]+where\s+carried_over\s*=\s*false/i);
  });
});
