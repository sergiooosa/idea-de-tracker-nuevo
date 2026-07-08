"use client";

import { Lightbulb } from 'lucide-react';
import type { ReportV2Conclusiones } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Conclusiones | null;
}

export default function SectionConclusiones({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <ReportSection
      icon={Lightbulb}
      title="Conclusiones y Acciones Recomendadas"
      helpTitulo="Conclusiones"
      helpContenido="Acciones recomendadas generadas por IA basándose en todo el análisis del reporte: KPIs, conversaciones, ranking de asesores, objeciones y tendencias detectadas."
    >
      <div className="rounded-lg bg-[#0E1626] border border-accent-cyan/20 p-4 space-y-3">
        {data.map((conclusion, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-[#E7EFF8] leading-relaxed">{conclusion}</p>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
