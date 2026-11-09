import { describe, expect, it } from "vitest";
import { computeEstimationIndicators } from "./estimation-indicators.js";

describe("estimation indicators", () => {
  it("groups rounds per item and measures first-round consensus and divergence", () => {
    const entries = [
      { itemId: "a", roundNumber: 1, consensus: true, min: 5, max: 5, finalEstimate: "5", finalSuit: "clubs", estimateExceeded: false },
      { itemId: "b", roundNumber: 1, consensus: false, min: 1, max: 8, finalEstimate: "8", finalSuit: "hearts", estimateExceeded: true },
      { itemId: "b", roundNumber: 2, consensus: true, min: 5, max: 5, finalEstimate: "5", finalSuit: "hearts", estimateExceeded: true },
    ];
    const result = computeEstimationIndicators(entries, [0, 1, 2, 3, 5, 8, 13]);
    expect(result.firstRoundConsensusRate).toBe(0.5);
    expect(result.frequency).toEqual({ "5": 2 });
    expect(result.highDivergence).toEqual(["b"]);
    expect(result.suitOverrun).toEqual({ clubs: { exceeded: 0, within: 1 }, hearts: { exceeded: 1, within: 0 } });
  });
  it("returns no rate for an empty history", () => {
    expect(computeEstimationIndicators([], [0, 1]).firstRoundConsensusRate).toBeNull();
  });
});
