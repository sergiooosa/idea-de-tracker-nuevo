"use client";

import { useState, useMemo } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from '@/components/dashboard/PageHeader';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import type { AsesorResponse, AsesorLeadCRM } from '@/types';
import { MessageSquare, Users, FileText, ChevronDown, ChevronUp, Target, User, Phone, X } from 'lucide-react';
import { format, subDays } from 'date-fns';

type CrmCategory = 'primera_llamada' | 'seguimiento' | 'interesados' | 'no_interesados';

const CRM_CATEGORIES: { id: CrmCategory; label: string }[] = [
  { id: 'primera_llamada', label: 'Primera llamada' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'interesados', label: 'Interesados' },
  { id: 'no_interesados', label: 'No interesados' },
];

function CRMCard({ lead }: { lead: AsesorLeadCRM }) {
  const [showNotas, setShowNotas] = useState(false);
  const hasNotas = lead.notasLlamadas.length > 0 || (lead.leadNote?.trim()?.length ?? 0) > 0;
  return (
    <div className="group rounded-lg border border-surface-500/80 bg-surface-700/60 hover:bg-surface-700/80 hover:border-accent-cyan/30 pl-2.5 pr-2 py-1.5 text-xs transition-all duration-200 border-l-[3px] border-l-accent-cyan/50 shadow-sm">
      <div className="font-medium text-white text-[11px] leading-tight truncate" title={lead.name}>{lead.name}</div>
      <div className="flex items-center gap-2 mt-1 text-[10px]">
        <span className="inline-flex items-center gap-0.5 text-accent-cyan font-medium">
          <span className="text-gray-500 font-normal">#</span>{lead.intentosContacto}
        </span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{lead.speedToLead}</span>
      </div>
      <button
        type="button"
        onClick={() => setShowNotas(!showNotas)}
        className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-accent-cyan w-full text-left transition-colors"
      >
        <FileText className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{hasNotas ? 'Ver notas' : 'Sin notas'}</span>
        {hasNotas && (showNotas ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />)}
      </button>
      {showNotas && hasNotas && (
        <div className="mt-1.5 pt-1.5 border-t border-surface-500/60 space-y-1 text-[10px] text-gray-400">
          {lead.leadNote?.trim() && <p className="leading-snug"><span className="text-gray-500">Lead:</span> {lead.leadNote}</p>}
          {lead.notasLlamadas.map((n, i) => (
            <p key={i} className="leading-snug">
              <span className="text-gray-500">{n.date ? format(new Date(n.date), 'dd/MM HH:mm') : ''}:</span> {n.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

export default function AsesorPage() {
  const pathname = usePathname();
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [selectedAdvisorEmail, setSelectedAdvisorEmail] = useState<string>('');

  const { data: metasData } = useApiData<{ meta_llamadas_diarias: number }>('/api/data/metas');
  const metaLlamadasDiarias = metasData?.meta_llamadas_diarias ?? 50;

  const advisorParam = selectedAdvisorEmail || undefined;
  const { data, loading } = useApiData<AsesorResponse>('/api/data/asesor', {
    from: dateFrom,
    to: dateTo,
    advisorEmail: advisorParam,
  });

  const kpis = data?.kpis ?? { leadsAsignados: 0, llamadasRealizadas: 0, llamadasContestadas: 0, reunionesAgendadas: 0, tasaContacto: 0, tasaAgendamiento: 0 };
  const leads = data?.leads ?? [];
  const advisors = data?.advisors ?? [];

  const leadsByCategory = useMemo(() => {
    const map: Record<CrmCategory, AsesorLeadCRM[]> = { primera_llamada: [], seguimiento: [], interesados: [], no_interesados: [] };
    for (const l of leads) map[l.categoria].push(l);
    return map;
  }, [leads]);

  const kpiCompact = "[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3";
  const systemPath = pathname.split("/asesor")[0] + "/system";

  return (
    <>
      <PageHeader
        title="Panel asesor"
        subtitle="Métricas y leads del asesor"
        action={
          <div className="flex items-center gap-2">
            {advisors.length > 1 && (
              <select
                value={selectedAdvisorEmail}
                onChange={(e) => setSelectedAdvisorEmail(e.target.value)}
                className="rounded-lg bg-surface-700 border border-surface-500 px-2 py-1.5 text-xs text-white"
              >
                <option value="">Todos</option>
                {advisors.map((a) => (
                  <option key={a.id} value={a.email ?? a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
        }
      />
      <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Período:</span>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
        </section>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]"><div className="text-gray-400 text-sm animate-pulse">Cargando...</div></div>
        ) : (
          <>
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">KPIs en el período</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
                <KPICard label="Leads asignados" value={kpis.leadsAsignados} color="blue" className={kpiCompact} tooltip={{ significado: 'Leads únicos con actividad.', calculo: 'Distintos mail_lead en el rango.' }} />
                <KPICard label="Llamadas realizadas" value={kpis.llamadasRealizadas} color="cyan" className={kpiCompact} tooltip={{ significado: 'Total de llamadas en el período.', calculo: 'Eventos en log_llamadas.' }} />
                <KPICard label="Llamadas contestadas" value={kpis.llamadasContestadas} color="cyan" className={kpiCompact} tooltip={{ significado: 'Llamadas con respuesta.', calculo: 'Tipo evento efectiva_*.' }} />
                <KPICard label="Reuniones agendadas" value={kpis.reunionesAgendadas} color="purple" className={kpiCompact} tooltip={{ significado: 'Reuniones en el período.', calculo: 'Desde agendas.' }} />
                <KPICard label="Tasa de contacto" value={`${kpis.tasaContacto.toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: '% contestadas.', calculo: '(Contestadas / Total) × 100.' }} />
                <KPICard label="Tasa de agendamiento" value={`${kpis.tasaAgendamiento.toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: '% que agendó.', calculo: '(Reuniones / Contestadas) × 100.' }} />
              </div>
            </section>

            <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-accent-cyan" /> Metas de llamadas
              </h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>Meta diaria: <strong className="text-accent-cyan">{metaLlamadasDiarias}</strong> llamadas.</p>
                <p className="text-[11px] text-gray-500">Para cambiar estas metas: menú lateral → <Link href={systemPath} className="font-semibold text-accent-cyan hover:underline">Configuración del sistema</Link>.</p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Progreso actual</span>
                  <span className={kpis.llamadasRealizadas >= metaLlamadasDiarias ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
                    {kpis.llamadasRealizadas} / {metaLlamadasDiarias}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-surface-600 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, metaLlamadasDiarias > 0 ? (kpis.llamadasRealizadas / metaLlamadasDiarias) * 100 : 0)}%`,
                      backgroundColor: kpis.llamadasRealizadas >= metaLlamadasDiarias ? 'var(--accent-green)' : 'var(--accent-amber)',
                    }}
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent-cyan" /> CRM — Leads por categoría
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {CRM_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="rounded-xl overflow-hidden flex flex-col min-h-[120px] section-futuristic border border-surface-500/80">
                    <div className="bg-surface-700/90 px-2.5 py-1.5 flex items-center justify-between shrink-0">
                      <span className="text-[11px] font-medium text-white">{cat.label}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-[10px] font-medium">
                        {leadsByCategory[cat.id].length}
                      </span>
                    </div>
                    <div className="p-1.5 flex-1 overflow-y-auto max-h-[380px] space-y-1">
                      {leadsByCategory[cat.id].length === 0 ? (
                        <p className="text-[10px] text-gray-500 py-3 text-center">Ninguno</p>
                      ) : (
                        leadsByCategory[cat.id].map((lead) => (
                          <CRMCard key={lead.id} lead={lead} />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {leads.length === 0 && (
                <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs mt-2">
                  No hay leads en el rango seleccionado.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
