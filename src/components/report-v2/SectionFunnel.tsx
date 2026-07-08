"use client";

import { Filter } from 'lucide-react';
import type { ReportV2Funnel } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Funnel | null;
}

const STEP_COLORS = [
  'bg-accent-cyan',
  'bg-accent-blue',
  'bg-[#A78BFA]',
  'bg-accent-amber',
  'bg-accent-green',
  'bg-[#F472B6]',
];

const STEP_TEXT_COLORS = [
  'text-accent-cyan',
  'text-accent-blue',
  'text-[#A78BFA]',
  'text-accent-amber',
  'text-accent-green',
  'text-[#F472B6]',
];

export default function SectionFunnel({ data }: Props) {
  if (!data) return null;

  const maxCount = data.analizados;

  return (
    <ReportSection
      icon={Filter}
      title="Embudo de Conversión"
      helpTitulo="Embudo de Conversión"
      helpContenido="Muestra cómo avanzan los leads desde el primer contacto hasta la propuesta/visita. Cada paso indica cuántos leads llegan a esa etapa y qué porcentaje representan del total."
      rightSlot={
        <span className="text-xs text-[#5F7288]">
          <span className="text-[#E7EFF8] font-semibold">{data.analizados.toLocaleString('es')}</span> leads
        </span>
      }
    >
      <div className="space-y-2">
        {data.steps.map((step, i) => {
          const widthPct = maxCount > 0 ? Math.max((step.count / maxCount) * 100, 8) : 100;
          const barColor = STEP_COLORS[i % STEP_COLORS.length];
          const textColor = STEP_TEXT_COLORS[i % STEP_TEXT_COLORS.length];

          return (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#8DA2B8] truncate">{step.label}</span>
                  <div className="flex items-baseline gap-1.5 shrink-0 ml-2">
                    <span className={`text-sm font-bold ${textColor}`}>
                      {step.count.toLocaleString('es')}
                    </span>
                    <span className="text-[10px] text-[#5F7288]">
                      {Math.round(step.pct * 100)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#0E1626] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
