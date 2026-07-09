"use client";

import { ShieldAlert, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { ReportV2HigieneCRM } from '@/types/report-v2';
import ReportSection from './ReportSection';
import LeadsContactoPanel from './LeadsContactoPanel';

interface Props {
  data: ReportV2HigieneCRM | null;
  from?: string;
  to?: string;
}

export default function SectionHigieneCRM({ data, from, to }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [panelSegmento, setPanelSegmento] = useState<'enLimbo' | 'sinAccion' | null>(null);

  if (!data) return null;

  const canOpenPanel = !!(from && to && data.leadsSinActividad > 0);

  return (
    <>
    <ReportSection
      icon={ShieldAlert}
      title="Higiene CRM"
      helpTitulo="Higiene CRM"
      helpContenido="Leads sin actividad en los últimos 5+ días. Muestra qué asesores tienen más leads abandonados y el detalle de cada lead afectado. Haz clic en el número para ver teléfonos y correos."
    >
      {canOpenPanel ? (
        <button
          type="button"
          onClick={() => setPanelSegmento('enLimbo')}
          className="w-full rounded-lg bg-accent-red/10 border border-accent-red/20 p-4 text-center hover:bg-accent-red/20 transition-colors cursor-pointer"
        >
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">
            Leads sin actividad
          </p>
          <p className="text-3xl font-bold text-accent-red">
            {data.leadsSinActividad}
          </p>
          <p className="text-[10px] text-[#5F7288] mt-1">Clic para ver contactos</p>
        </button>
      ) : (
        <div className="rounded-lg bg-accent-red/10 border border-accent-red/20 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">
            Leads sin actividad
          </p>
          <p className="text-3xl font-bold text-accent-red">
            {data.leadsSinActividad}
          </p>
        </div>
      )}

      {data.porAsesor.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-3">
            Por asesor
          </p>
          <div className="space-y-2">
            {data.porAsesor.map((a) => {
              const pct = data.leadsSinActividad > 0
                ? (a.count / data.leadsSinActividad) * 100
                : 0;
              return (
                <div key={a.nombre} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#8DA2B8]">{a.nombre}</span>
                    <span className="text-accent-red font-semibold">{a.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#152238] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent-red/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.detalle.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-[#5F7288] hover:text-[#8DA2B8] transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
            {expanded ? 'Ocultar' : 'Ver'} detalle ({data.detalle.length} leads)
          </button>
          {expanded && (
            <div className="mt-2 rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E2B40]">
                    <th className="text-left px-3 py-2 text-[#5F7288] font-medium">Lead</th>
                    <th className="text-left px-3 py-2 text-[#5F7288] font-medium">Asesor</th>
                    <th className="text-right px-3 py-2 text-[#5F7288] font-medium">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {data.detalle.map((d) => (
                    <tr key={d.nombre} className="border-b border-[#1E2B40]/40 last:border-0">
                      <td className="px-3 py-2 text-[#E7EFF8]">{d.nombre}</td>
                      <td className="px-3 py-2 text-[#8DA2B8]">{d.asesor ?? '—'}</td>
                      <td className="px-3 py-2 text-right text-accent-red font-semibold">
                        {d.diasSinActividad}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </ReportSection>

    {panelSegmento && from && to && (
      <LeadsContactoPanel
        open
        onClose={() => setPanelSegmento(null)}
        segmento={panelSegmento}
        titulo={panelSegmento === 'enLimbo'
          ? 'Leads sin actividad (> 5 días)'
          : 'Asignados sin ninguna acción'
        }
        from={from}
        to={to}
      />
    )}
    </>
  );
}
