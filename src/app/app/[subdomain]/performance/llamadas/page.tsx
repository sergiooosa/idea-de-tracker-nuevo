"use client";

import { useState, useMemo, Fragment } from 'react';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { format, subDays } from 'date-fns';
import { FileText, Sparkles, User, X } from 'lucide-react';
import type { LlamadasResponse, ApiLlamadaLog, CallPhone } from '@/types';

const minFmt = (m: number | null) => {
  if (m == null) return '—';
  return m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`;
};
const pct = (n: number) => `${n.toFixed(1)}%`;

function apiToCallPhone(r: ApiLlamadaLog): CallPhone {
  return {
    id: String(r.id),
    leadId: r.leadEmail ?? String(r.id),
    advisorId: r.closerMail ?? '',
    datetime: r.datetime,
    duration: 0,
    outcome: r.outcome === 'answered' ? 'answered' : r.outcome === 'pending' ? 'busy' : 'no_answer',
    attemptsCountForLead: 1,
    notes: r.transcripcion ?? undefined,
    summary: r.iaDescripcion ?? undefined,
    tags: [],
    speedToLeadSeconds: r.speedToLeadMinutes != null ? r.speedToLeadMinutes * 60 : undefined,
  };
}

export default function PerformanceLlamadasPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalSelectorCalls, setModalSelectorCalls] = useState<ApiLlamadaLog[] | null>(null);
  const [modalCall, setModalCall] = useState<ApiLlamadaLog | null>(null);

  const { data, loading } = useApiData<LlamadasResponse>('/api/data/llamadas', { from: dateFrom, to: dateTo });

  const openTranscripcionIA = (callsOfLead: ApiLlamadaLog[]) => {
    if (callsOfLead.length === 1) setModalCall(callsOfLead[0]);
    else setModalSelectorCalls(callsOfLead);
  };

  const callsByAdvisor = useMemo(() => {
    if (!data) return {} as Record<string, ApiLlamadaLog[]>;
    const map: Record<string, ApiLlamadaLog[]> = {};
    for (const r of data.registros) {
      const key = r.closerMail ?? r.closerName ?? 'Sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [data]);

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 7);
  const agg = data?.agg ?? { totalLeads: 0, totalCalls: 0, answered: 0, speedAvg: 0, attemptsAvg: 0, firstContactAttempts: 0, answerRate: 0 };
  const kpiCompact = "[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-sm animate-pulse">Cargando datos de llamadas...</div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-0">
        <span className="text-xs text-gray-400">Rango de fechas (actividad):</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
      </div>
      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        <KPICard label="Leads (llamadas)" value={agg.totalLeads} color="blue" className={kpiCompact} tooltip={{ significado: 'Leads únicos con al menos una llamada.', calculo: 'Distintos mail_lead en el rango.' }} />
        <KPICard label="Llamadas totales" value={agg.totalCalls} color="cyan" className={kpiCompact} tooltip={{ significado: 'Todas las llamadas en el rango.', calculo: 'Suma de eventos.' }} />
        <KPICard label="Tiempo al lead (prom.)" value={minFmt(agg.speedAvg)} color="purple" className={kpiCompact} tooltip={{ significado: 'Tiempo promedio en contactar al lead.', calculo: 'Promedio de speed_to_lead.' }} />
        <KPICard label="Intentos promedio" value={agg.attemptsAvg.toFixed(1)} color="amber" className={kpiCompact} tooltip={{ significado: 'Intentos promedios por lead.', calculo: 'Total llamadas / leads únicos.' }} />
        <KPICard label="Intentos a primer contacto" value={agg.firstContactAttempts.toFixed(1)} color="purple" className={kpiCompact} tooltip={{ significado: 'Llamadas hasta que el lead contesta.', calculo: 'Promedio de intentos por lead.' }} />
        <KPICard label="Tasa de contestación" value={pct(agg.answerRate * 100)} color="green" className={kpiCompact} tooltip={{ significado: '% de llamadas contestadas.', calculo: '(Contestadas / Total) × 100.' }} />
      </div>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Llamadas por asesor</h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {Object.keys(callsByAdvisor).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">No hay llamadas en el rango de fechas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">Asesor</th>
                    <th className="px-2 py-2 font-medium">Llamadas</th>
                    <th className="px-2 py-2 font-medium">Contestadas</th>
                    <th className="px-2 py-2 font-medium">% contestación</th>
                    <th className="px-2 py-2 font-medium">Tiempo al lead</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(callsByAdvisor)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([advisorKey, advisorCalls]) => {
                      const isExpanded = expandedAdvisorId === advisorKey;
                      const metrics = data?.advisorMetrics[advisorKey];
                      return (
                        <Fragment key={advisorKey}>
                          <tr className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer" onClick={() => setExpandedAdvisorId(isExpanded ? null : advisorKey)}>
                            <td className="px-1 py-2 text-gray-400">
                              <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-1.5 text-white font-medium">
                                <User className="w-3.5 h-3.5 text-accent-cyan" />
                                {metrics?.advisorName ?? advisorKey}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.llamadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics?.contestadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics != null ? pct(metrics.pctContestacion) : '—'}</td>
                            <td className="px-2 py-2 text-gray-300">{minFmt(metrics?.tiempoAlLead ?? null)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={6} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Registros de {metrics?.advisorName ?? advisorKey}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Teléfono</th>
                                          <th className="px-2 py-2 font-medium">Contestó</th>
                                          <th className="px-2 py-2 font-medium">Speed to lead</th>
                                          <th className="px-2 py-2 font-medium">Tipo evento</th>
                                          <th className="px-2 py-2 font-medium">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advisorCalls.map((c) => {
                                          const allForLead = advisorCalls.filter((x) => x.leadEmail === c.leadEmail);
                                          return (
                                            <tr key={c.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                              <td className="px-2 py-2 text-gray-300">{format(new Date(c.datetime), 'dd/MM/yy HH:mm')}</td>
                                              <td className="px-2 py-2 text-white">{c.leadName ?? '—'}</td>
                                              <td className="px-2 py-2 text-gray-400">{c.phone ?? '—'}</td>
                                              <td className="px-2 py-2">{c.outcome === 'answered' ? <span className="text-accent-green">Sí</span> : <span className="text-accent-red">No</span>}</td>
                                              <td className="px-2 py-2 text-gray-400">{minFmt(c.speedToLeadMinutes)}</td>
                                              <td className="px-2 py-2 text-gray-300">{c.tipoEvento}</td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => openTranscripcionIA(allForLead)} className="text-accent-cyan text-[10px] inline-flex items-center gap-0.5"><FileText className="w-3 h-3" /> Transcripción</button>
                                                <button type="button" onClick={() => openTranscripcionIA(allForLead)} className="text-accent-purple text-[10px] inline-flex items-center gap-0.5 ml-1"><Sparkles className="w-3 h-3" /> Análisis IA</button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modalSelectorCalls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalSelectorCalls(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Seleccione cuál quiere ver</h3>
              <button type="button" onClick={() => setModalSelectorCalls(null)} className="p-1 rounded text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {modalSelectorCalls.map((call) => (
                <li key={call.id}>
                  <button type="button" onClick={() => { setModalCall(call); setModalSelectorCalls(null); }} className="w-full text-left px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm">
                    {format(new Date(call.datetime), "dd/MM/yyyy 'a las' HH:mm")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {modalCall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalCall(null)} aria-hidden />
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl bg-surface-800 border border-accent-cyan/30 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0 bg-surface-700/50">
              <h3 className="font-semibold text-white">{format(new Date(modalCall.datetime), "dd/MM/yyyy 'a las' HH:mm")} · {modalCall.tipoEvento}</h3>
              <button type="button" onClick={() => setModalCall(null)} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {modalCall.transcripcion && (
                <div>
                  <h4 className="text-xs font-semibold text-accent-cyan mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Transcripción</h4>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface-700/50 rounded-lg p-3">{modalCall.transcripcion}</div>
                </div>
              )}
              {modalCall.iaDescripcion && (
                <div>
                  <h4 className="text-xs font-semibold text-accent-purple mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Análisis IA</h4>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface-700/50 rounded-lg p-3">{modalCall.iaDescripcion}</div>
                </div>
              )}
              {!modalCall.transcripcion && !modalCall.iaDescripcion && (
                <p className="text-gray-500 text-sm">No hay transcripción ni análisis IA disponible para este evento.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
