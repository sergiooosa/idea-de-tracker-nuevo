"use client";

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReportV2Comparativo } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Comparativo | null;
}

export default function SectionComparativo({ data }: Props) {
  if (!data || data.rows.length === 0) return null;

  return (
    <ReportSection
      icon={TrendingUp}
      title="Comparativo vs Periodo Anterior"
      helpTitulo="Comparativo"
      helpContenido="Compara las métricas principales del periodo actual contra el periodo anterior. Las flechas verdes indican mejora y las rojas deterioro, según si subir es bueno o malo para cada métrica."
      rightSlot={
        <span className="text-[10px] text-[#5F7288]">
          {data.periodoActual} vs {data.periodoAnterior}
        </span>
      }
    >
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1E2B40]">
              <th className="text-left px-4 py-2.5 text-[#5F7288] font-medium">Métrica</th>
              <th className="text-right px-4 py-2.5 text-[#5F7288] font-medium">Actual</th>
              <th className="text-right px-4 py-2.5 text-[#5F7288] font-medium">Anterior</th>
              <th className="text-right px-4 py-2.5 text-[#5F7288] font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => {
              const isPositiveChange = row.delta > 0;
              const isGood = row.subirEsBueno ? isPositiveChange : !isPositiveChange;
              const deltaAbs = Math.abs(row.delta);
              const color = deltaAbs < 1
                ? 'text-[#5F7288]'
                : isGood
                  ? 'text-accent-green'
                  : 'text-accent-red';
              const Icon = deltaAbs < 1 ? Minus : isPositiveChange ? TrendingUp : TrendingDown;

              return (
                <tr key={row.metric} className="border-b border-[#1E2B40]/40 last:border-0">
                  <td className="px-4 py-2.5 text-[#E7EFF8]">{row.metric}</td>
                  <td className="px-4 py-2.5 text-right text-[#E7EFF8] font-semibold">
                    {typeof row.actual === 'number' ? row.actual.toLocaleString('es') : row.actual}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[#8DA2B8]">
                    {typeof row.anterior === 'number' ? row.anterior.toLocaleString('es') : row.anterior}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${color}`}>
                    <span className="inline-flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {deltaAbs.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}
