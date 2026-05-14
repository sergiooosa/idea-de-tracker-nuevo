// Shared metric formatting utilities — use these everywhere to ensure consistency.
// See AUT-118 for rationale.

/**
 * Format a currency value:
 *   >= 1,000,000 → $X.XM
 *   >= 1,000     → $X.Xk
 *   < 1,000      → $X (whole number)
 */
export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

/**
 * Format a large number with k/M suffix (no $ symbol):
 *   >= 1,000,000 → X.XM
 *   >= 1,000     → X.Xk
 *   < 1,000      → X
 */
export function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/**
 * Format a fraction as a percentage (0.15 → "15.0%").
 */
export function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/**
 * Format duration in minutes (< 1 min → seconds).
 */
export function formatMinutes(m: number): string {
  return m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`;
}
