"use client";

import { Repeat } from 'lucide-react';
import type { ReportV2FraseRepetitiva } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2FraseRepetitiva[] | null;
}

export default function SectionFrasesRepetitivas({ data }: Props) {
  if (!data || data.length === 0) return null;

  return (
    <ReportSection
      icon={Repeat}
      title="Frases Repetitivas"
      helpTitulo="Frases Repetitivas"
      helpContenido="Frases que aparecen con frecuencia en las conversaciones de los leads. Cada frase incluye cuántos leads la mencionaron y un insight generado por IA sobre lo que implica."
    >
      <div className="space-y-2">
        {data.map((f) => (
          <div
            key={f.frase}
            className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 px-4 py-3"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-[#E7EFF8] font-medium">{f.frase}</span>
              <span className="text-xs text-accent-blue font-semibold shrink-0 ml-2">
                {f.numLeads} leads
              </span>
            </div>
            {f.insight && (
              <p className="text-xs text-[#5F7288] leading-relaxed">{f.insight}</p>
            )}
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
