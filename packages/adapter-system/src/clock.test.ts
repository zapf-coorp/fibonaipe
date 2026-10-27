import { describe, expect, it } from "vitest";
import { createSystemClock } from "./clock.js";

describe("system clock", () => {
  it("returns the current Date", () => {
    const before = Date.now();
    const now = createSystemClock().now();
    const after = Date.now();
    expect(now).toBeInstanceOf(Date);
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
  });
});
