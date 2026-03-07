"use client";

import { useState, useMemo, Fragment } from 'react';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import TagFilter from '@/components/dashboard/TagFilter';
import ModalTranscripcionIA from '@/components/dashboard/modals/ModalTranscripcionIA';
import { useApiData } from '@/hooks/useApiData';
import { format, subDays } from 'date-fns';
import Link from 'next/link';
import { Pencil, User, X } from 'lucide-react';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';
import type { VideollamadasResponse, ApiVideollamada, VideoMeeting } from '@/types';
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
  const [apiMeetingsForModal, setApiMeetingsForModal] = useState<ApiVideollamada[] | null>(null);
  const [editingRecord, setEditingRecord] = useState<{id: number; nombre_lead: string | null; closer: string | null; estado: string | null} | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, loading } = useApiData<VideollamadasResponse>('/api/data/videollamadas', { from: dateFrom, to: dateTo, tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined });
  const rendimientoMetrics = data?.metricasComputadas ?? [];

  const openTranscripcionIA = (meetingsOfLead: VideoMeeting[], apiMeetings?: ApiVideollamada[]) => {
    if (apiMeetings) setApiMeetingsForModal(apiMeetings);
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

  type LeadRow = { leadKey: string; name: string; email: string | null; meetings: ApiVideollamada[] };
  const leadsByAdvisor = useMemo(() => {
    const out: Record<string, LeadRow[]> = {};
    for (const [advisorKey, meetings] of Object.entries(meetingsByAdvisor)) {
      const byLead = new Map<string, LeadRow>();
      for (const r of meetings) {
        const leadKey = r.leadEmail ?? r.leadName ?? String(r.id);
        const existing = byLead.get(leadKey);
        if (existing) {
          existing.meetings.push(r);
        } else {
          byLead.set(leadKey, { leadKey, name: r.leadName ?? '—', email: r.leadEmail ?? null, meetings: [r] });
        }
      }
      out[advisorKey] = [...byLead.values()].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return out;
  }, [meetingsByAdvisor]);

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
      <TagFilter
        tags={[...new Set(data?.registros?.flatMap((r: ApiVideollamada) => (r.tags ?? '').split(',').map(t => t.trim()).filter(Boolean)) ?? [])]}
        selected={selectedTags}
        onChange={setSelectedTags}
      />

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
              <div key={m.id} className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed relative group">
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate">{m.nombre}</p>
                <p className="text-base font-bold mt-0.5 text-accent-green">{m.valor}</p>
                {m.descripcion && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{m.descripcion}</p>}
                <div className="kpi-card-spacer" />
                <Link
                  href={`/system?step=5&edit=${m.id}`}
                  className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-surface-600/80 text-gray-400 hover:text-accent-cyan transition-all"
                  title="Editar métrica"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
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
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads de {advisorKey} (clic en la fila abre reuniones)</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Correo</th>
                                          <th className="px-2 py-2 font-medium">Reuniones realizadas</th>
                                          <th className="px-2 py-2 font-medium">Resultado</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {(leadsByAdvisor[advisorKey] ?? []).map((lead) => {
                                          const last = lead.meetings[lead.meetings.length - 1];
                                          const outcomeLabel = last ? outcomeVideollamadaToSpanish(last.outcome) : '—';
                                          return (
                                            <tr
                                              key={lead.leadKey}
                                              className="border-t border-surface-500 hover:bg-surface-600/50 cursor-pointer"
                                              onClick={() => openTranscripcionIA(lead.meetings.map(apiToVideoMeeting), lead.meetings)}
                                            >
                                              <td className="px-2 py-2 text-white">{lead.name}</td>
                                              <td className="px-2 py-2 text-gray-400">{lead.email ?? '—'}</td>
                                              <td className="px-2 py-2 text-accent-cyan">{lead.meetings.length}</td>
                                              <td className="px-2 py-2 text-gray-300">{outcomeLabel}</td>
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
                    className="w-full text-left px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm flex flex-col gap-0.5"
                  >
                    <span>{format(new Date(meeting.datetime), "dd/MM/yyyy 'a las' HH:mm")}</span>
                    <span className="text-[10px] text-gray-400">{outcomeVideollamadaToSpanish(meeting.outcome)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {modalTranscripcionIA && (
        <ModalTranscripcionIA
          meeting={modalTranscripcionIA}
          onClose={() => { setModalTranscripcionIA(null); setApiMeetingsForModal(null); }}
          onEdit={apiMeetingsForModal ? (meeting) => {
            const api = apiMeetingsForModal.find((r) => String(r.id) === meeting.id);
            if (api) {
              setModalTranscripcionIA(null);
              setApiMeetingsForModal(null);
              setEditingRecord({ id: api.id, nombre_lead: api.leadName, closer: api.closer, estado: api.categoria });
            }
          } : undefined}
        />
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
