"use client";

import { MapPin } from 'lucide-react';
import type { ReportV2Demografia } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2Demografia | null;
}

export default function SectionDemografia({ data }: Props) {
  if (!data) return null;

  return (
    <ReportSection
      icon={MapPin}
      title="Demografía"
      helpTitulo="Demografía de Leads"
      helpContenido="Ubicación aproximada derivada de la lada telefónica del lead, motivos de interés detectados por IA, perfil demográfico dominante y presupuesto promedio. Los datos de ubicación son aproximados."
    >
      {data.ubicacion.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
            Ubicación (aprox. por lada) · n = {data.denominador}
          </p>
          <div className="space-y-2">
            {data.ubicacion.map((u) => {
              const pct = data.denominador > 0 ? (u.count / data.denominador) * 100 : 0;
              return (
                <div key={u.zona} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8DA2B8]">
                      {u.zona}
                      <span className="text-[#5F7288] ml-1.5">· {u.canal} · aprox.</span>
                    </span>
                    <span className="text-[#E7EFF8] font-semibold">{u.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#152238] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-cyan/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.motivo.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
            Motivo de interés (IA)
          </p>
          <div className="flex flex-wrap gap-2">
            {data.motivo.map((m) => (
              <span
                key={m.motivo}
                className="rounded-full bg-[#152238] border border-[#1E2B40] px-3 py-1.5 text-xs text-[#8DA2B8]"
              >
                {m.motivo}: <span className="text-[#E7EFF8] font-semibold">{m.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.edadDominante && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">Edad dominante (IA)</p>
            <p className="text-sm font-semibold text-[#E7EFF8]">{data.edadDominante}</p>
          </div>
        )}
        {data.presupuestoProm !== null && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">Presupuesto prom. (IA)</p>
            <p className="text-sm font-semibold text-accent-green">
              ${data.presupuestoProm.toLocaleString('es')}
            </p>
          </div>
        )}
        {data.perfil.length > 0 && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">Perfil (IA)</p>
            <p className="text-xs text-[#8DA2B8] leading-relaxed">{data.perfil.join(', ')}</p>
          </div>
        )}
      </div>
    </ReportSection>
  );
}
