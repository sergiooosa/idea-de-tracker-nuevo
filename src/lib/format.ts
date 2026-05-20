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
 * Format duration in minutes with adaptive units (AUT-306).
 *   < 1 min      → seconds (e.g. "45s")
 *   < 60 min     → minutes (e.g. "12 min")
 *   < 1440 min   → hours (e.g. "3 h")
 *   < 10080 min  → days (e.g. "5 días")
 *   < 43200 min  → weeks (e.g. "2 semanas")
 *   >= 43200 min → months (e.g. "1 mes")
 */
export function formatMinutes(m: number): string {
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${Math.round(m)} min`;
  if (m < 1440) return `${(m / 60).toFixed(1)} h`;
  if (m < 10080) {
    const dias = Math.round(m / 1440);
    return `${dias} ${dias === 1 ? "día" : "días"}`;
  }
  if (m < 43200) {
    const semanas = Math.round(m / 10080);
    return `${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  }
  const meses = Math.round(m / 43200);
  return `${meses} ${meses === 1 ? "mes" : "meses"}`;
}
