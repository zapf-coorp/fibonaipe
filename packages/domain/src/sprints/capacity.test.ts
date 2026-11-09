import { describe, expect, it } from "vitest";
import { computeCapacity, computeWorkingDays } from "./capacity.js";

describe("sprint capacity", () => {
  it("counts weekdays inclusively and ignores weekend holidays", () => {
    expect(computeWorkingDays("2026-11-02", "2026-11-13", ["2026-11-02", "2026-11-07"])).toEqual({ ok: true, value: 9 });
    expect(computeWorkingDays("2026-12-31", "2027-01-04", [])).toEqual({ ok: true, value: 3 });
  });

  it("calculates capacity and rejects invalid focus", () => {
    expect(computeCapacity([{ absenceDays: 1, focusPct: 80 }, { absenceDays: 0 }], 9)).toEqual({ ok: true, value: 15.4 });
    expect(computeCapacity([{ absenceDays: 20 }], 9)).toEqual({ ok: true, value: 0 });
    expect(computeCapacity([{ absenceDays: 0, focusPct: 120 }], 9).ok).toBe(false);
  });
});
