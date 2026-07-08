"use client";

import { ShieldX } from 'lucide-react';
import type { ReportV2Objecion } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Objecion[] | null;
}

export default function SectionObjeciones({ data }: Props) {
  if (!data || data.length === 0) return null;

  const maxFreq = Math.max(...data.map((o) => o.frecuencia), 1);

  return (
    <ReportSection
      icon={ShieldX}
      title="Objeciones"
      helpTitulo="Objeciones Detectadas"
      helpContenido="Objeciones más frecuentes detectadas en las conversaciones (llamadas, chats, video). Incluye la frecuencia y una frase textual representativa extraída por IA de los transcripts."
    >
      <div className="space-y-3">
        {data.map((obj, i) => (
          <div key={obj.objecion} className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-accent-cyan bg-accent-cyan/10 rounded-full w-5 h-5 flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-[#E7EFF8]">{obj.objecion}</span>
              </div>
              <span className="text-xs font-bold text-accent-amber">{obj.frecuencia}×</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#152238] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-accent-amber/60"
                style={{ width: `${(obj.frecuencia / maxFreq) * 100}%` }}
              />
            </div>
            {obj.fraseTextual && (
              <p className="text-xs text-[#5F7288] italic">{obj.fraseTextual}</p>
            )}
          </div>
        ))}
      </div>
    </ReportSection>
  );
}
