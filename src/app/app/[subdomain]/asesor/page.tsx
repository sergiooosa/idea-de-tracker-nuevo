"use client";

import { useState, useMemo } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from '@/components/dashboard/PageHeader';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { useUserFilter } from '@/contexts/UserFilterContext';
import type { AsesorResponse, AsesorLeadCRM } from '@/types';
import { MessageSquare, Users, FileText, ChevronDown, ChevronUp, Target, User, Phone, X, Search, HelpCircle } from 'lucide-react';
import { format, subDays } from 'date-fns';

type CrmCategory = 'primera_llamada' | 'seguimiento' | 'interesados' | 'no_interesados';

const CRM_CATEGORIES: { id: CrmCategory; label: string; description?: string }[] = [
  { id: 'primera_llamada', label: 'Primera llamada', description: 'Llamadas telefónicas en curso (pendientes de respuesta).' },
  { id: 'seguimiento', label: 'Seguimiento', description: 'Han recibido llamadas y aún no han contestado.' },
  { id: 'interesados', label: 'Interesados' },
  { id: 'no_interesados', label: 'No interesados' },
];

function SectionInfo({ text }: { text: string }) {
  return (
    <span className="relative group/info inline-flex ml-1 align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-accent-cyan cursor-help transition-colors" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-60 rounded-lg bg-surface-700 border border-surface-500 shadow-xl px-2.5 py-2 text-[10px] leading-relaxed text-gray-300 opacity-0 group-hover/info:opacity-100 transition-opacity duration-200 whitespace-normal text-left font-normal normal-case tracking-normal">
        {text}
      </span>
    </span>
  );
}

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

function AdvisorCombobox({
  advisors,
  value,
  onChange,
  disabled,
}: {
  advisors: { id: string; name: string; email?: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return advisors;
    const q = search.toLowerCase();
    return advisors.filter((a) =>
      a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q)
    );
  }, [advisors, search]);

  const selectedLabel = value
    ? advisors.find((a) => (a.email ?? a.id) === value)?.name ?? value
    : 'Todos los asesores';

  if (disabled) {
    return (
      <div className="rounded-lg bg-surface-700/60 border border-surface-500/50 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
        {selectedLabel}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-xs text-white hover:border-accent-cyan/50 transition-colors min-w-[180px]"
      >
        <User className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
        <span className="truncate flex-1 text-left">{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-surface-500">
              <div className="flex items-center gap-2 rounded-lg bg-surface-700 px-2 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar asesor..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-surface-700 text-gray-300 transition-colors"
              >
                Todos los asesores
              </button>
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.email ?? a.id); setOpen(false); setSearch(''); }}
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-surface-700 transition-colors ${
                    value === (a.email ?? a.id) ? 'text-accent-cyan bg-accent-cyan/10' : 'text-white'
                  }`}
                >
                  <div className="font-medium">{a.name}</div>
                  {a.email && <div className="text-[10px] text-gray-500">{a.email}</div>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

type ExpandedKpi = 'leadsAsignados' | 'llamadasRealizadas' | 'llamadasContestadas' | 'reunionesAgendadas' | null;

export default function AsesorPage() {
  const pathname = usePathname();
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [expandedKpi, setExpandedKpi] = useState<ExpandedKpi>(null);

  const { canViewAll, session, sessionLoading, asesorSeleccionado, setAsesorSeleccionado, asesores: asesoresContext } = useUserFilter();

  const { data: metasData } = useApiData<{ meta_llamadas_diarias: number }>('/api/data/metas');
  const metaLlamadasDiarias = metasData?.meta_llamadas_diarias ?? 50;

  const apiParams = useMemo(() => {
    const base: Record<string, string> = { from: dateFrom, to: dateTo };
    if (canViewAll) {
      if (asesorSeleccionado) base.advisorEmail = asesorSeleccionado;
      else base.allAdvisors = '1';
    }
    return base;
  }, [dateFrom, dateTo, canViewAll, asesorSeleccionado]);

  const { data, loading } = useApiData<AsesorResponse>('/api/data/asesor', apiParams);

  const kpis = data?.kpis ?? { leadsAsignados: 0, llamadasRealizadas: 0, llamadasContestadas: 0, reunionesAgendadas: 0, tasaContacto: 0, tasaAgendamiento: 0 };
  const leads = data?.leads ?? [];
  const breakdown = data?.breakdown;
  const advisorsList = data?.advisorsList ?? data?.advisors ?? asesoresContext;

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
            {!sessionLoading && advisorsList.length > 0 && (
              <AdvisorCombobox
                advisors={advisorsList}
                value={canViewAll ? asesorSeleccionado : (session?.email ?? '')}
                onChange={setAsesorSeleccionado}
                disabled={!canViewAll}
              />
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
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                KPIs en el período
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase">Beta</span>
                <SectionInfo text="Estos KPIs muestran datos del asesor seleccionado en el período de fechas elegido." />
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
                <KPICard label="Leads asignados" value={kpis.leadsAsignados} color="blue" className={kpiCompact} tooltip={{ significado: 'Leads únicos con actividad en llamadas y videollamadas en el rango seleccionado.', calculo: 'Correos distintos (mail_lead) que aparecen en el log de llamadas del período.' }} onClick={breakdown ? () => setExpandedKpi('leadsAsignados') : undefined} />
                <KPICard label="Llamadas realizadas" value={kpis.llamadasRealizadas} color="cyan" className={kpiCompact} tooltip={{ significado: 'Total de eventos registrados en el log de llamadas durante el período.', calculo: 'Cuenta de todas las filas en log_llamadas dentro del rango de fechas.' }} onClick={breakdown ? () => setExpandedKpi('llamadasRealizadas') : undefined} />
                <KPICard label="Llamadas contestadas" value={kpis.llamadasContestadas} color="cyan" className={kpiCompact} tooltip={{ significado: 'Llamadas con respuesta efectiva del lead.', calculo: 'Eventos cuyo tipo comienza con efectiva_* en log_llamadas.' }} onClick={breakdown ? () => setExpandedKpi('llamadasContestadas') : undefined} />
                <KPICard label="Reuniones agendadas" value={kpis.reunionesAgendadas} color="purple" className={kpiCompact} tooltip={{ significado: 'Citas registradas en el período seleccionado.', calculo: 'Registros en la tabla de agendas dentro del rango de fechas.' }} onClick={breakdown ? () => setExpandedKpi('reunionesAgendadas') : undefined} />
                <KPICard label="Tasa de contacto" value={`${kpis.tasaContacto.toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: 'Porcentaje de llamadas que fueron contestadas respecto al total.', calculo: '(Llamadas contestadas ÷ Total llamadas realizadas) × 100.' }} />
                <KPICard label="Tasa de agendamiento" value={`${kpis.tasaAgendamiento.toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: 'Porcentaje de llamadas contestadas que resultaron en una reunión agendada.', calculo: '(Reuniones agendadas ÷ Llamadas contestadas) × 100.' }} />
                {(kpis.totalChats ?? 0) > 0 && (
                  <>
                    <KPICard label="Chats asignados" value={kpis.totalChats ?? 0} color="cyan" className={kpiCompact} tooltip={{ significado: 'Total de chats asignados al asesor en el período.', calculo: 'Registros en chats_logs dentro del rango de fechas.' }} />
                    <KPICard label="Chats contactados" value={kpis.chatsConRespuesta ?? 0} color="cyan" className={kpiCompact} tooltip={{ significado: 'Chats donde el asesor respondió al menos una vez.', calculo: 'Chats con al menos un mensaje de role "agent".' }} />
                  </>
                )}
              </div>
            </section>

            {expandedKpi && breakdown && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Desglose por canal">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setExpandedKpi(null)} />
                <div className="relative rounded-xl border border-surface-500 bg-surface-800 shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
                    <h3 className="text-sm font-semibold text-white">
                      {expandedKpi === 'leadsAsignados' && 'Desglose: Leads asignados'}
                      {expandedKpi === 'llamadasRealizadas' && 'Desglose: Llamadas realizadas'}
                      {expandedKpi === 'llamadasContestadas' && 'Desglose: Llamadas contestadas'}
                      {expandedKpi === 'reunionesAgendadas' && 'Desglose: Reuniones agendadas'}
                    </h3>
                    <button type="button" onClick={() => setExpandedKpi(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition-colors" aria-label="Cerrar">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-3 text-sm">
                    {expandedKpi === 'leadsAsignados' && (
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex justify-between"><span>Desde log de llamadas</span><strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeLlamadas}</strong></li>
                        <li className="flex justify-between"><span>Desde agendas</span><strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeAgendas}</strong></li>
                        <li className="flex justify-between"><span>Desde registros (CRM)</span><strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeRegistros ?? 0}</strong></li>
                        <li className="border-t border-surface-500 pt-2 mt-2 flex justify-between"><span>Solo llamadas</span><strong>{breakdown.leadsAsignados.soloLlamadas}</strong></li>
                        <li className="flex justify-between"><span>Solo agendas</span><strong>{breakdown.leadsAsignados.soloAgendas}</strong></li>
                        <li className="flex justify-between"><span>Solo registros (CRM)</span><strong>{breakdown.leadsAsignados.soloRegistros ?? 0}</strong></li>
                        <li className="flex justify-between"><span>En llamadas y agendas</span><strong>{breakdown.leadsAsignados.enAmbos}</strong></li>
                      </ul>
                    )}
                    {expandedKpi === 'llamadasRealizadas' && (
                      <div>
                        <p className="text-gray-400 text-xs mb-2">Por tipo de evento:</p>
                        <ul className="space-y-1.5 text-gray-300">
                          {Object.entries(breakdown.llamadasRealizadas.porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                            <li key={tipo} className="flex justify-between"><span className="truncate mr-2">{tipo}</span><strong className="text-accent-cyan shrink-0">{count}</strong></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {expandedKpi === 'llamadasContestadas' && (
                      <p className="text-gray-300">Total de llamadas con respuesta efectiva: <strong className="text-accent-cyan">{breakdown.llamadasContestadas.total}</strong></p>
                    )}
                    {expandedKpi === 'reunionesAgendadas' && (
                      <p className="text-gray-300">Total de reuniones/citas en el período: <strong className="text-accent-cyan">{breakdown.reunionesAgendadas.total}</strong></p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-4">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-accent-cyan" /> Metas de llamadas
                <SectionInfo text="Meta diaria de llamadas establecida en Sistema → Paso 6." />
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
                <SectionInfo text="Primera llamada: llamadas telefónicas en curso. Seguimiento: han recibido llamadas y no han contestado. Interesados/No interesados según estado del lead." />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {CRM_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="rounded-xl overflow-hidden flex flex-col min-h-[120px] section-futuristic border border-surface-500/80">
                    <div className="bg-surface-700/90 px-2.5 py-1.5 flex flex-col gap-0.5 shrink-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-white">{cat.label}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-[10px] font-medium">
                          {leadsByCategory[cat.id].length}
                        </span>
                      </div>
                      {cat.description && <span className="text-[9px] text-gray-500 leading-tight">{cat.description}</span>}
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
