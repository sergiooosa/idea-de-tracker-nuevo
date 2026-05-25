// AUT-388 — Componente reutilizable: tarjeta individual de asesor
// Usado en Bloque 2 (Llamadas), Bloque 3 (Chats) y Bloque 4 (Videollamadas)

import { TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdvisorChannel = 'llamadas' | 'chats' | 'videollamadas';
export type AdvisorTrend = 'sube' | 'baja' | 'igual';
export type AdvisorSemaforo = 'verde' | 'amarillo' | 'rojo';

export interface AdvisorMetric {
  label: string;
  value: string | number;
  /** Tailwind text-color class, e.g. 'text-accent-cyan' */
  colorClass?: string;
  /** Optional secondary line below the value */
  sublabel?: string;
}

export interface AdvisorCardProps {
  nombre: string;
  channel: AdvisorChannel;
  /** 0-indexed rank. 0 = 🥇 best advisor badge, 1 = 🥈, 2 = 🥉 */
  rank?: number;
  /** Composite score 0-100. Derived semaforo if no explicit override. */
  score?: number;
  /** Trend direction vs previous period */
  trend?: AdvisorTrend;
  /** Fractional change (0.12 = +12%). Shown next to the trend arrow. */
  trendPct?: number | null;
  /** Whether "sube" is a positive signal for the primary metric (default true) */
  trendSubirEsBueno?: boolean;
  /** Explicit traffic-light. If omitted and score is provided, derived automatically. */
  semaforo?: AdvisorSemaforo;
  /** Up to 4 channel-specific metrics displayed in a grid */
  metrics?: AdvisorMetric[];
  /** Extra block-specific content (speed-to-lead row, category bars, cita progress) */
  footer?: React.ReactNode;
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEDAL: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

const SEMAFORO: Record<AdvisorSemaforo, { dot: string; text: string; label: string }> = {
  verde:    { dot: 'bg-accent-green', text: 'text-accent-green', label: 'Alto' },
  amarillo: { dot: 'bg-accent-amber', text: 'text-accent-amber', label: 'Medio' },
  rojo:     { dot: 'bg-accent-red',   text: 'text-accent-red',   label: 'Bajo' },
};

function scoreToSemaforo(score: number): AdvisorSemaforo {
  if (score >= 70) return 'verde';
  if (score >= 40) return 'amarillo';
  return 'rojo';
}

function metricsGridCols(count: number): string {
  if (count <= 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-4';
}

// ── Trend indicator ───────────────────────────────────────────────────────────

function TrendBadge({
  trend,
  trendPct,
  subirEsBueno,
}: {
  trend: AdvisorTrend;
  trendPct?: number | null;
  subirEsBueno: boolean;
}) {
  if (trend === 'igual') {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-500">
        <Minus className="w-3 h-3" />
        Sin cambio
      </span>
    );
  }

  const isPositive = (trend === 'sube') === subirEsBueno;
  const colorClass = isPositive ? 'text-accent-green' : 'text-accent-red';
  const Icon = trend === 'sube' ? TrendingUp : TrendingDown;
  const sign = trend === 'sube' ? '+' : '−';
  const pctLabel =
    trendPct !== null && trendPct !== undefined
      ? `${sign}${Math.round(Math.abs(trendPct) * 100)}%`
      : '';

  return (
    <span className={clsx('inline-flex items-center gap-0.5 text-[10px] font-medium', colorClass)}>
      <Icon className="w-3 h-3" />
      {pctLabel}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdvisorCard({
  nombre,
  channel: _channel,
  rank,
  score,
  trend,
  trendPct,
  trendSubirEsBueno = true,
  semaforo: semaforoOverride,
  metrics = [],
  footer,
  className,
}: AdvisorCardProps) {
  const medal = rank !== undefined ? MEDAL[rank] : undefined;
  const isBest = rank === 0;

  // Semaforo: explicit prop > derived from score > not shown
  const semaforo = semaforoOverride ?? (score !== undefined ? scoreToSemaforo(score) : undefined);
  const semaforoConfig = semaforo ? SEMAFORO[semaforo] : undefined;

  return (
    <div
      className={clsx(
        'rounded-xl bg-surface-700/60 border border-surface-500/40 p-4 space-y-3 relative overflow-hidden',
        className,
      )}
    >
      {/* Gold accent stripe on best advisor */}
      {isBest && (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent-amber/30 via-accent-amber to-accent-amber/30"
        />
      )}

      {/* ── Header: name + semáforo badge ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {medal && <span className="text-base shrink-0">{medal}</span>}
          <span className="text-sm font-semibold text-white truncate">{nombre}</span>
          {isBest && (
            <Star
              className="w-3 h-3 text-accent-amber shrink-0 fill-accent-amber"
              aria-hidden="true"
            />
          )}
        </div>

        {semaforoConfig && (
          <div
            className={clsx(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0',
              semaforoConfig.text,
              'bg-surface-600 border border-surface-500',
            )}
          >
            <div className={clsx('w-1.5 h-1.5 rounded-full shrink-0', semaforoConfig.dot)} />
            {semaforoConfig.label}
            {score !== undefined && (
              <span className="text-gray-500 ml-0.5">· {score}/100</span>
            )}
          </div>
        )}
      </div>

      {/* ── "Mejor asesor" badge — only for rank 0 ────────────────────── */}
      {isBest && (
        <div className="flex items-center gap-1.5 rounded-lg bg-accent-amber/10 border border-accent-amber/30 px-2.5 py-1">
          <Star className="w-3 h-3 text-accent-amber fill-accent-amber shrink-0" />
          <span className="text-[10px] font-semibold text-accent-amber">Mejor asesor del periodo</span>
        </div>
      )}

      {/* ── Metrics grid ──────────────────────────────────────────────── */}
      {metrics.length > 0 && (
        <div className={clsx('grid gap-2', metricsGridCols(metrics.length))}>
          {metrics.map((m, idx) => (
            <div key={idx} className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-tight">{m.label}</p>
              <p className={clsx('text-lg font-bold', m.colorClass ?? 'text-white')}>
                {m.value}
              </p>
              {m.sublabel && (
                <p className="text-[10px] text-gray-500">{m.sublabel}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Trend vs previous period ───────────────────────────────────── */}
      {trend && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>vs periodo anterior:</span>
          <TrendBadge
            trend={trend}
            trendPct={trendPct}
            subirEsBueno={trendSubirEsBueno}
          />
        </div>
      )}

      {/* ── Footer: block-specific content ────────────────────────────── */}
      {footer}
    </div>
  );
}
