export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0 || !Number.isFinite(p) || p < 0 || p > 1) throw new RangeError("percentile requires values and p between 0 and 1");
  const sorted = [...values].sort((a, b) => a - b);
  const position = p * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
}
