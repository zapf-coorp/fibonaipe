import { describe, expect, it } from "vitest";
import { percentile } from "./percentile.js";

describe("forecast percentiles", () => {
  it("uses linear interpolation on a sorted copy", () => {
    const paces = [1, 1.5, 2, 2.5, 3, 3.5];
    expect(percentile(paces, 0.25)).toBe(1.625);
    expect(percentile(paces, 0.75)).toBe(2.875);
    expect(paces).toEqual([1, 1.5, 2, 2.5, 3, 3.5]);
  });
  it("rejects an invalid percentile", () => {
    expect(() => percentile([1], 1.1)).toThrow(RangeError);
  });
});
