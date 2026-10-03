/**
 * Calculates a relative heat score (0.0 to 1.0) based on rank within historical or trace distribution.
 */
export function calculateHeat(durationMs: number, distribution: readonly number[]): number {
  if (distribution.length <= 1) {
    // If only one sample or no distribution, benchmark against typical latency ranges
    if (durationMs < 50) return 0.1;
    if (durationMs < 200) return 0.4;
    if (durationMs < 1000) return 0.7;
    return 0.95;
  }

  const sorted = [...distribution].sort((a, b) => a - b);
  let rank = 0;
  for (const val of sorted) {
    if (durationMs > val) {
      rank++;
    }
  }

  return Math.min(1.0, Math.max(0.0, rank / (sorted.length - 1)));
}

/**
 * Returns color representation for a given heat score.
 */
export function getHeatColor(heat: number, colorBlindSafe = false): string {
  const clamped = Math.max(0, Math.min(heat, 1.0));

  if (colorBlindSafe) {
    // Teal -> Yellow -> Purple
    if (clamped < 0.33) return '#0d9488'; // Teal
    if (clamped < 0.66) return '#eab308'; // Amber
    return '#9333ea'; // Purple
  }

  // Cyan -> Emerald -> Yellow -> Orange -> Crimson Red
  if (clamped < 0.25) return '#38bdf8'; // Sky blue
  if (clamped < 0.5) return '#34d399'; // Emerald
  if (clamped < 0.75) return '#facc15'; // Amber yellow
  if (clamped < 0.9) return '#fb923c'; // Orange
  return '#ef4444'; // Red
}
