export interface IndicatorRound {
  readonly itemId: string;
  readonly roundNumber: number;
  readonly consensus: boolean;
  readonly min: number | null;
  readonly max: number | null;
  readonly finalEstimate: string;
  readonly finalSuit: string | null;
  readonly estimateExceeded?: boolean | null;
}
export interface EstimationIndicators {
  readonly firstRoundConsensusRate: number | null;
  readonly frequency: Readonly<Record<string, number>>;
  readonly highDivergence: readonly string[];
  readonly suitOverrun: Readonly<Record<string, { readonly exceeded: number; readonly within: number }>>;
}

export function computeEstimationIndicators(entries: readonly IndicatorRound[], scale: readonly number[]): EstimationIndicators {
  const byItem = new Map<string, IndicatorRound[]>();
  for (const entry of entries) {
    const rounds = byItem.get(entry.itemId) ?? [];
    rounds.push(entry);
    byItem.set(entry.itemId, rounds);
  }
  let firstRounds = 0;
  let consensuses = 0;
  const frequency: Record<string, number> = {};
  const highDivergence: string[] = [];
  const suitOverrun: Record<string, { exceeded: number; within: number }> = {};
  for (const [itemId, entriesForItem] of byItem) {
    const rounds = [...entriesForItem].sort((a, b) => a.roundNumber - b.roundNumber);
    const first = rounds.find((round) => round.roundNumber === 1);
    const last = rounds[rounds.length - 1];
    if (!last) continue;
    if (first) {
      firstRounds++;
      if (first.consensus) consensuses++;
    }
    const minIndex = first?.min == null ? -1 : scale.indexOf(first.min);
    const maxIndex = first?.max == null ? -1 : scale.indexOf(first.max);
    if ((minIndex >= 0 && maxIndex >= 0 && maxIndex - minIndex >= 3) || last.roundNumber >= 3) highDivergence.push(itemId);
    const value = last.finalEstimate === "½" ? 0.5 : last.finalEstimate.trim() === "" ? NaN : Number(last.finalEstimate);
    if (Number.isFinite(value) && scale.includes(value)) frequency[last.finalEstimate] = (frequency[last.finalEstimate] ?? 0) + 1;
    if (last.finalSuit && typeof last.estimateExceeded === "boolean") {
      const counts = suitOverrun[last.finalSuit] ?? { exceeded: 0, within: 0 };
      if (last.estimateExceeded) counts.exceeded++; else counts.within++;
      suitOverrun[last.finalSuit] = counts;
    }
  }
  return { firstRoundConsensusRate: firstRounds === 0 ? null : consensuses / firstRounds, frequency, highDivergence, suitOverrun };
}
