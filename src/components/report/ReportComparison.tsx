// AUT-387 — Bloque 8: Comparativo
// Tabla comparativa de métricas vs período anterior con indicadores de tendencia

import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from 'lucide-react';
import { formatCurrency, formatPct, formatMinutes } from '@/lib/format';
import type { ReportComparisonData, ReportComparacionRow } from '@/types/report';

interface Props {
  data: ReportComparisonData | null;
}

function formatValue(value: number | string, unidad?: ReportComparacionRow['unidad']): string {
  if (typeof value === 'string') return value;
  if (unidad === 'currency') return formatCurrency(value);
  if (unidad === 'pct') return formatPct(value);
  if (unidad === 'minutes') return formatMinutes(value);
  return value.toLocaleString('es');
}

function TendenciaCell({ fila }: { fila: ReportComparacionRow }) {
  const { tendencia, variacionPct, subirEsBueno } = fila;

  if (tendencia === 'igual' || variacionPct === null) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-3.5 h-3.5" />
        <span className="text-xs">Sin cambio</span>
      </div>
    );
  }

  const esPositivo = (tendencia === 'sube') === subirEsBueno;
  const colorClass = esPositivo ? 'text-accent-green' : 'text-accent-red';
  const Icon = tendencia === 'sube' ? ArrowUpRight : ArrowDownRight;
  const sign = tendencia === 'sube' ? '+' : '';

  return (
    <div className={`flex items-center gap-0.5 ${colorClass}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-xs font-semibold">
        {sign}{(variacionPct * 100).toFixed(1)}%
      </span>
    </div>
  );
}

function ImpactoBar({ fila }: { fila: ReportComparacionRow }) {
  const { variacionPct, tendencia, subirEsBueno } = fila;
  if (variacionPct === null) return null;

  const esPositivo = (tendencia === 'sube') === subirEsBueno;
  const absChange = Math.abs(variacionPct * 100);
  // Cap visual bar at 50% change
  const barWidth = Math.min(absChange, 50) * 2; // -> 0-100%
  const barColor = esPositivo ? 'bg-accent-green' : 'bg-accent-red';

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-surface-600 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportComparison({ data }: Props) {
  if (data === null) return null;

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Comparativo de períodos
          </h3>
        </div>
        <div className="text-xs text-gray-500 text-right">
          <span className="text-gray-300">{data.periodoActual}</span>
          <span className="mx-1 text-gray-600">vs</span>
          <span className="text-gray-500">{data.periodoAnterior}</span>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-surface-500/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-700/60 text-left text-gray-400">
              <th className="px-3 py-2.5 font-medium">Métrica</th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap">
                {data.periodoActual}
              </th>
              <th className="px-3 py-2.5 font-medium text-right whitespace-nowrap text-gray-500">
                {data.periodoAnterior}
              </th>
              <th className="px-3 py-2.5 font-medium text-center">Variación</th>
              <th className="px-3 py-2.5 font-medium w-24">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {data.filas.map((fila) => {
              const { tendencia, subirEsBueno, variacionPct } = fila;
              const esPositivo = variacionPct !== null && (tendencia === 'sube') === subirEsBueno;
              const esNegativo = variacionPct !== null && !esPositivo && tendencia !== 'igual';
              const rowBg = esPositivo
                ? 'hover:bg-green-900/10'
                : esNegativo
                ? 'hover:bg-red-900/10'
                : 'hover:bg-surface-700/40';

              return (
                <tr
                  key={fila.label}
                  className={`border-t border-surface-500/40 transition-colors ${rowBg}`}
                >
                  {/* Métrica */}
                  <td className="px-3 py-2.5 text-gray-200 font-medium whitespace-nowrap">
                    {fila.label}
                  </td>

                  {/* Actual */}
                  <td className="px-3 py-2.5 text-right font-semibold text-white whitespace-nowrap">
                    {formatValue(fila.actual, fila.unidad)}
                  </td>

                  {/* Anterior */}
                  <td className="px-3 py-2.5 text-right text-gray-500 whitespace-nowrap">
                    {formatValue(fila.anterior, fila.unidad)}
                  </td>

                  {/* Variación */}
                  <td className="px-3 py-2.5">
                    <div className="flex justify-center">
                      <TendenciaCell fila={fila} />
                    </div>
                  </td>

                  {/* Barra */}
                  <td className="px-3 py-2.5">
                    <ImpactoBar fila={fila} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-accent-green" /> Mejora vs período anterior
        </span>
        <span className="flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3 text-accent-red" /> Baja vs período anterior
        </span>
        <span className="flex items-center gap-1">
          <Minus className="w-3 h-3 text-gray-500" /> Sin cambio significativo
        </span>
      </div>
    </section>
  );
}
