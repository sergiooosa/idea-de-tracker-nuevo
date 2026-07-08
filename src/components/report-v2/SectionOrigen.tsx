"use client";

import { UserPlus } from 'lucide-react';
import type { ReportV2Origen } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Origen | null;
}

export default function SectionOrigen({ data }: Props) {
  if (!data) return null;

  const total = data.nuevos + data.reactivados;
  const nuevoPct = total > 0 ? Math.round((data.nuevos / total) * 100) : 0;
  const reactPct = total > 0 ? Math.round((data.reactivados / total) * 100) : 0;

  return (
    <ReportSection
      icon={UserPlus}
      title="Origen: Nuevos vs Reactivados"
      helpTitulo="Origen de Leads"
      helpContenido="Cuántos leads son nuevos (primer contacto) vs reactivados (habían dejado de responder y fueron recontactados). Cada canal muestra su contribución."
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-accent-blue/10 border border-accent-blue/20 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">Nuevos</p>
          <p className="text-2xl font-bold text-accent-blue">{data.nuevos.toLocaleString('es')}</p>
          <p className="text-xs text-[#5F7288]">{nuevoPct}%</p>
        </div>
        <div className="rounded-lg bg-[#A78BFA]/10 border border-[#A78BFA]/20 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">Reactivados</p>
          <p className="text-2xl font-bold text-[#A78BFA]">{data.reactivados.toLocaleString('es')}</p>
          <p className="text-xs text-[#5F7288]">{reactPct}%</p>
        </div>
      </div>

      {data.porCanal.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">Por canal</p>
          <div className="space-y-2">
            {data.porCanal.map((c) => (
              <div key={c.canal} className="flex items-center justify-between text-xs">
                <span className="text-[#8DA2B8]">{c.canal}</span>
                <div className="flex gap-4">
                  <span className="text-accent-blue">{c.nuevos} nuevos</span>
                  <span className="text-[#A78BFA]">{c.reactivados} react.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.narrativaReactivacion && (
        <div className="rounded-lg bg-[#0E1626] border border-[#A78BFA]/20 px-4 py-3">
          <p className="text-xs text-[#8DA2B8] leading-relaxed">{data.narrativaReactivacion}</p>
        </div>
      )}
    </ReportSection>
  );
}
