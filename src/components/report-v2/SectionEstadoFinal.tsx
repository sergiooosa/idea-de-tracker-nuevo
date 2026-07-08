"use client";

import { PieChart } from 'lucide-react';
import type { ReportV2EstadoFinal } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2EstadoFinal | null;
}

const ESTADO_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'En conversación': { bg: 'bg-accent-blue/10', text: 'text-accent-blue', bar: 'bg-accent-blue' },
  'Calificados': { bg: 'bg-accent-green/10', text: 'text-accent-green', bar: 'bg-accent-green' },
  'No calificados': { bg: 'bg-accent-amber/10', text: 'text-accent-amber', bar: 'bg-accent-amber' },
  'Contactados sin respuesta': { bg: 'bg-accent-red/10', text: 'text-accent-red', bar: 'bg-accent-red' },
  'Un solo intento': { bg: 'bg-[#F472B6]/10', text: 'text-[#F472B6]', bar: 'bg-[#F472B6]' },
  'Sin actividad': { bg: 'bg-[#5F7288]/10', text: 'text-[#5F7288]', bar: 'bg-[#5F7288]' },
};

const DEFAULT_COLOR = { bg: 'bg-[#A78BFA]/10', text: 'text-[#A78BFA]', bar: 'bg-[#A78BFA]' };

export default function SectionEstadoFinal({ data }: Props) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <ReportSection
      icon={PieChart}
      title="Estado Final de Leads"
      helpTitulo="Estado Final de Leads"
      helpContenido="Distribución de todos los leads según su estado al cierre del periodo. Muestra cuántos están en conversación activa, calificados, sin contacto, etc."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {data.map((item) => {
          const colors = ESTADO_COLORS[item.estado] ?? DEFAULT_COLOR;
          return (
            <div
              key={item.estado}
              className={`rounded-lg ${colors.bg} border border-[#1E2B40] px-4 py-3`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#8DA2B8]">{item.estado}</span>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {item.count.toLocaleString('es')}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#0E1626] overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar}`}
                  style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[10px] text-[#5F7288] mt-1 text-right">
                {Math.round(item.pct * 100)}%
              </p>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
