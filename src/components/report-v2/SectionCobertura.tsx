"use client";

import { Radio } from 'lucide-react';
import type { ReportV2Cobertura } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Cobertura | null;
}

export default function SectionCobertura({ data }: Props) {
  if (!data) return null;

  const maxFranjaResp = Math.max(...data.franjasHorarias.map((f) => f.tasaRespuesta), 0.01);

  return (
    <ReportSection
      icon={Radio}
      title="Cobertura y Respuesta"
      helpTitulo="Cobertura y Respuesta"
      helpContenido="Análisis de cómo se distribuyen los canales por lead (solo llamada, solo chat, ambos), a qué intento de contacto responden, y en qué franjas horarias hay mejor tasa de respuesta."
    >
      {/* Canales por lead */}
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
          Canales por lead
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.canalesPorLead.map((c) => (
            <div key={c.label} className="rounded-lg bg-[#152238] border border-[#1E2B40] p-3 text-center">
              <p className="text-[10px] text-[#5F7288] mb-1">{c.label}</p>
              <p className="text-lg font-bold text-accent-cyan">{c.count}</p>
              <p className="text-[10px] text-[#5F7288]">{Math.round(c.pct * 100)}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* A qué intento contesta */}
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
          ¿A qué intento contesta?
        </p>
        <div className="space-y-2">
          {data.aQueIntentoContesta.map((item) => (
            <div key={item.intento} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#8DA2B8]">{item.intento}</span>
                <span className="text-[#E7EFF8] font-semibold">
                  {item.count} <span className="text-[#5F7288] font-normal">({Math.round(item.pct * 100)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#152238] overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-blue"
                  style={{ width: `${item.pct * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Franjas horarias */}
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
          Tasa de respuesta por franja horaria
        </p>
        <div className="space-y-2">
          {data.franjasHorarias.map((f) => {
            const pct = Math.round(f.tasaRespuesta * 100);
            const barWidth = (f.tasaRespuesta / maxFranjaResp) * 100;
            const color = f.tasaRespuesta >= 0.7
              ? 'bg-accent-green'
              : f.tasaRespuesta >= 0.5
                ? 'bg-accent-amber'
                : 'bg-accent-red';
            return (
              <div key={f.franja} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8DA2B8]">{f.franja}</span>
                  <span className="text-[#E7EFF8] font-semibold">
                    {pct}%
                    <span className="text-[#5F7288] font-normal ml-1.5">de {f.total} llamadas</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#152238] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ReportSection>
  );
}
