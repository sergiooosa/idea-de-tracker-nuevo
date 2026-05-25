// AUT-387 — Bloque 1: Rendimiento de Anuncios
// Inversión, CPL, top 3 anuncios, tendencia de gasto.

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Megaphone, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency, formatPct } from '@/lib/format';
import type { ReportAdsPerformanceData } from '@/types/report';

interface Props {
  data: ReportAdsPerformanceData | null;
}

// Semáforo CTR: bueno >= 2%, medio >= 1%, rojo < 1%
function ctrColor(ctr: number) {
  if (ctr >= 0.02) return 'text-accent-green';
  if (ctr >= 0.01) return 'text-accent-amber';
  return 'text-accent-red';
}

// Semáforo CPL: sin umbral absoluto — solo mostramos el dato
function cplColor(cpl: number, gastoTotal: number, leads: number) {
  if (leads === 0) return 'text-gray-400';
  const avg = gastoTotal / leads;
  if (cpl <= avg * 0.8) return 'text-accent-green';
  if (cpl <= avg * 1.2) return 'text-accent-amber';
  return 'text-accent-red';
}

export default function ReportAdsPerformance({ data }: Props) {
  if (data === null) return null;

  const totalLeadsAnuncios = data.top3Anuncios.reduce((s, a) => s + a.leads, 0);

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-accent-amber shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Rendimiento de Anuncios · {data.plataformas.join(', ')}
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          Inversión: <span className="text-accent-amber font-semibold">{formatCurrency(data.gastoTotal)}</span>
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { label: 'Gasto total', value: formatCurrency(data.gastoTotal), colorClass: 'text-accent-amber' },
          { label: 'Impresiones', value: data.impresiones.toLocaleString('es'), colorClass: 'text-accent-blue' },
          { label: 'Clicks', value: data.clicks.toLocaleString('es'), colorClass: 'text-accent-cyan' },
          { label: 'CTR', value: formatPct(data.ctr), colorClass: ctrColor(data.ctr) },
          { label: 'CPM', value: formatCurrency(data.cpm), colorClass: 'text-gray-300' },
          { label: 'CPL (costo/lead)', value: formatCurrency(data.cpl), colorClass: 'text-accent-purple' },
        ].map(({ label, value, colorClass }) => (
          <div
            key={label}
            className="rounded-xl bg-surface-700/60 border border-surface-500/40 p-3 text-center"
          >
            <p className="text-[10px] uppercase tracking-tight text-gray-500 mb-1">{label}</p>
            <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Top 3 anuncios */}
      {data.top3Anuncios.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Top anuncios por leads</p>
          <div className="space-y-2">
            {data.top3Anuncios.map((anuncio, i) => {
              const pctLeads = totalLeadsAnuncios > 0 ? anuncio.leads / totalLeadsAnuncios : 0;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
              return (
                <div
                  key={anuncio.nombre}
                  className="rounded-lg bg-surface-700/40 border border-surface-500/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{medal}</span>
                      <span className="text-xs font-medium text-gray-200 truncate">{anuncio.nombre}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
                      <span>
                        CPL: <span className={`font-semibold ${cplColor(anuncio.cpl, data.gastoTotal, anuncio.leads)}`}>
                          {formatCurrency(anuncio.cpl)}
                        </span>
                      </span>
                      <span className="text-gray-500">|</span>
                      <span>
                        Gasto: <span className="font-semibold text-accent-amber">{formatCurrency(anuncio.gasto)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-600 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-cyan/70"
                        style={{ width: `${pctLeads * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-accent-cyan font-semibold shrink-0">
                      {anuncio.leads} leads ({Math.round(pctLeads * 100)}%)
                    </span>
                  </div>
                  {anuncio.ctr !== null && (
                    <p className="text-[10px] text-gray-500 mt-1">
                      CTR: <span className={ctrColor(anuncio.ctr)}>{formatPct(anuncio.ctr)}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tendencia de gasto diario */}
      {data.tendenciaGasto.length > 1 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Tendencia de inversión</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.tendenciaGasto} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#8b9cb5' }} stroke="#1e2a3a" />
                <YAxis tick={{ fontSize: 10, fill: '#8b9cb5' }} stroke="#1e2a3a" tickFormatter={(v: number) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#0d1219', border: '1px solid #1e2a3a', borderRadius: '8px', fontSize: '11px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Gasto']}
                />
                <Area
                  type="monotone"
                  dataKey="gasto"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gastoGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </section>
  );
}
