"use client";

import { useState, useMemo, Fragment } from 'react';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import ModalTranscripcionIA from '@/components/dashboard/modals/ModalTranscripcionIA';
import { useApiData } from '@/hooks/useApiData';
import { format, subDays } from 'date-fns';
import { FileText, Pencil, Sparkles, User, X, ExternalLink } from 'lucide-react';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';
import type { VideollamadasResponse, ApiVideollamada, VideoMeeting, MetricaPersonalizadaUI } from '@/types';
import { BarChart3 } from 'lucide-react';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

const kpiTooltips = {
  agendadas: { significado: 'Citas o presentaciones programadas. Vienen de los calendarios usados para citas o presentaciones.', calculo: 'Eventos de videollamada de los calendarios de citas/presentaciones en el rango.' },
  asistidas: { significado: 'Reuniones a las que el lead asistió. El dato llega de Fathom.', calculo: 'Videollamadas con attended = true; fuente: Fathom.' },
  canceladas: { significado: 'Reuniones canceladas antes de realizarse. Provienen de las canceladas en GHL.', calculo: 'Videollamadas con canceled = true en GHL.' },
  efectivas: { significado: 'Ventas cerradas. Las que Fathom determina como cerradas.', calculo: 'Videollamadas que Fathom marca como cerradas.' },
  revenue: { significado: 'Lo que se vendió (ingresos por ventas).', calculo: 'Suma del monto vendido en reuniones cerradas.' },
  cashCollected: { significado: 'Lo que se recolectó (efectivo cobrado por cierres).', calculo: 'Suma de cashCollected por reunión.' },
  ticket: { significado: 'Valor promedio por venta.', calculo: 'Efectivo cobrado total / número de ventas.' },
};

function apiToVideoMeeting(r: ApiVideollamada): VideoMeeting {
  return {
    id: String(r.id),
    leadId: r.leadEmail ?? String(r.id),
    advisorId: r.closer ?? '',
    datetime: r.datetime,
    attended: r.attended,
    qualified: r.qualified,
    booked: true,
    canceled: r.canceled,
    outcome: r.outcome,
    amountBought: r.facturacion,
    cashCollected: r.cashCollected,
    notes: r.resumenIa ?? undefined,
    tags: r.tags ? r.tags.split(',').map((t) => t.trim()) : [],
    recordingUrl: r.linkLlamada ?? undefined,
    source: r.origen ?? undefined,
    objections: r.objeciones.map((o) => o.categoria),
    objectionDetails: r.objeciones.map((o) => ({ category: o.categoria, quote: o.objecion })),
  };
}

export default function PerformanceVideollamadasPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalSelectorMeetings, setModalSelectorMeetings] = useState<VideoMeeting[] | null>(null);
  const [modalTranscripcionIA, setModalTranscripcionIA] = useState<VideoMeeting | null>(null);
  const [editingRecord, setEditingRecord] = useState<{id: number; nombre_lead: string | null; closer: string | null; estado: string | null} | null>(null);

  const { data, loading } = useApiData<VideollamadasResponse>('/api/data/videollamadas', { from: dateFrom, to: dateTo });
  const { data: sysConfig } = useApiData<{ metricas_personalizadas: MetricaPersonalizadaUI[] }>('/api/data/system-config');
  const rendimientoMetrics = (sysConfig?.metricas_personalizadas ?? []).filter(
    (m) => m.ubicacion === 'rendimiento' || m.ubicacion === 'ambos'
  );

  const openTranscripcionIA = (meetingsOfLead: VideoMeeting[]) => {
    if (meetingsOfLead.length === 1) setModalTranscripcionIA(meetingsOfLead[0]);
    else setModalSelectorMeetings(meetingsOfLead);
  };

  const agg = data?.agg ?? { agendadas: 0, asistidas: 0, canceladas: 0, efectivas: 0, noShows: 0, revenue: 0, cashCollected: 0, ticket: 0 };

  const meetingsByAdvisor = useMemo(() => {
    if (!data) return {} as Record<string, ApiVideollamada[]>;
    const map: Record<string, ApiVideollamada[]> = {};
    for (const r of data.registros) {
      const key = r.closer ?? 'Sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [data]);

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 7);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-sm animate-pulse">Cargando datos de videollamadas...</div>
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

      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        {[
          { label: 'Agendadas', value: agg.agendadas, color: 'purple', tip: kpiTooltips.agendadas },
          { label: 'Asistidas', value: agg.asistidas, color: 'cyan', tip: kpiTooltips.asistidas },
          { label: 'Canceladas', value: agg.canceladas, color: 'red', tip: kpiTooltips.canceladas },
          { label: 'Efectivas', value: agg.efectivas, color: 'green', tip: kpiTooltips.efectivas },
          { label: 'Ingresos', value: fm(agg.revenue), color: 'green', tip: kpiTooltips.revenue },
          { label: 'Efectivo cobrado', value: fm(agg.cashCollected), color: 'green', tip: kpiTooltips.cashCollected },
          { label: 'Ticket promedio', value: fm(agg.ticket), color: 'blue', tip: kpiTooltips.ticket },
        ].map(({ label, value, color, tip }) => (
          <div key={label} className={`rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-${color} kpi-card-fixed`}>
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
              {label}
              <KpiTooltip significado={tip.significado} calculo={tip.calculo} />
            </p>
            <p className={`text-base font-bold mt-0.5 text-accent-${color} break-words`}>{value}</p>
            <div className="kpi-card-spacer" />
          </div>
        ))}
      </div>

      {rendimientoMetrics.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-accent-green" />
            Métricas personalizadas
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
            {rendimientoMetrics.map((m) => (
              <div key={m.id} className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate">{m.name}</p>
                <p className="text-base font-bold mt-0.5 text-accent-green">{m.increment}</p>
                {m.description && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{m.description}</p>}
                <div className="kpi-card-spacer" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Videollamadas por asesor
        </h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {Object.keys(meetingsByAdvisor).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">No hay videollamadas en el rango de fechas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">Asesor</th>
                    <th className="px-2 py-2 font-medium">Agendadas</th>
                    <th className="px-2 py-2 font-medium">Asistencias</th>
                    <th className="px-2 py-2 font-medium">% cierre</th>
                    <th className="px-2 py-2 font-medium">Facturación</th>
                    <th className="px-2 py-2 font-medium">Cash collected</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(meetingsByAdvisor)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([advisorKey, advisorMeetings]) => {
                      const isExpanded = expandedAdvisorId === advisorKey;
                      const metrics = data?.advisorMetrics[advisorKey];
                      return (
                        <Fragment key={advisorKey}>
                          <tr
                            className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                            onClick={() => setExpandedAdvisorId(isExpanded ? null : advisorKey)}
                          >
                            <td className="px-1 py-2 text-gray-400">
                              <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-1.5 text-white font-medium">
                                <User className="w-3.5 h-3.5 text-accent-purple" />
                                {advisorKey}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-accent-purple">{metrics?.agendadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.asistencias ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics != null ? pct(metrics.pctCierre) : '—'}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics ? fm(metrics.facturacion) : '—'}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics ? fm(metrics.cashCollected) : '—'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={7} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads y registros de videollamada de {advisorKey}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Correo</th>
                                          <th className="px-2 py-2 font-medium">Asistió</th>
                                          <th className="px-2 py-2 font-medium">Resultado</th>
                                          <th className="px-2 py-2 font-medium">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advisorMeetings.map((m) => {
                                          const allForLead = advisorMeetings.filter((x) => x.leadEmail === m.leadEmail);
                                          return (
                                            <tr key={m.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                              <td className="px-2 py-2 text-gray-300">{format(new Date(m.datetime), 'dd/MM/yy HH:mm')}</td>
                                              <td className="px-2 py-2 text-white">{m.leadName}</td>
                                              <td className="px-2 py-2 text-gray-400">{m.leadEmail ?? '—'}</td>
                                              <td className="px-2 py-2">{m.attended ? <span className="text-accent-green">Sí</span> : <span className="text-accent-red">No</span>}</td>
                                              <td className="px-2 py-2 text-gray-300">{outcomeVideollamadaToSpanish(m.outcome)}</td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex flex-wrap gap-1">
                                                  <button type="button" onClick={() => setEditingRecord({ id: m.id, nombre_lead: m.leadName, closer: m.closer, estado: m.categoria })} className="text-accent-amber text-[10px] inline-flex items-center gap-0.5 mr-1"><Pencil className="w-3 h-3" /> Editar</button>
                                                  <button type="button" onClick={() => openTranscripcionIA(allForLead.map(apiToVideoMeeting))} className="text-accent-cyan text-[10px] inline-flex items-center gap-0.5"><FileText className="w-3 h-3" /> Transcripción</button>
                                                  <button type="button" onClick={() => openTranscripcionIA(allForLead.map(apiToVideoMeeting))} className="text-accent-purple text-[10px] inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> Análisis IA</button>
                                                  {m.linkLlamada ? (
                                                    <a href={m.linkLlamada} target="_blank" rel="noopener noreferrer" className="text-accent-green text-[10px] inline-flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /> Grabación</a>
                                                  ) : (
                                                    <span className="text-gray-500 text-[10px] inline-flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /> Sin grabación</span>
                                                  )}
                                                </div>
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

      {modalSelectorMeetings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalSelectorMeetings(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Seleccione cuál quiere ver</h3>
              <button type="button" onClick={() => setModalSelectorMeetings(null)} className="p-1 rounded text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {modalSelectorMeetings.map((meeting) => (
                <li key={meeting.id}>
                  <button
                    type="button"
                    onClick={() => { setModalTranscripcionIA(meeting); setModalSelectorMeetings(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm"
                  >
                    {format(new Date(meeting.datetime), "dd/MM/yyyy 'a las' HH:mm")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {modalTranscripcionIA && (
        <ModalTranscripcionIA meeting={modalTranscripcionIA} onClose={() => setModalTranscripcionIA(null)} />
      )}
      {editingRecord && (
        <EditRecordSheet
          type="videollamada"
          record={editingRecord}
          advisors={data?.advisors?.map(a => ({ name: a.name, email: a.email })) ?? []}
          onClose={() => setEditingRecord(null)}
          onSaved={() => setEditingRecord(null)}
        />
      )}
    </div>
  );
}
