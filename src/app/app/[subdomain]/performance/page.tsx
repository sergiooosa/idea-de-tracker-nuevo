"use client";

import { useState, useMemo, useEffect, Fragment } from 'react';
import { useT } from '@/contexts/LocaleContext';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import TagFilter from '@/components/dashboard/TagFilter';
import ModalTranscripcionIA from '@/components/dashboard/modals/ModalTranscripcionIA';
import { useApiData } from '@/hooks/useApiData';
import { format, subDays, formatDistanceToNow, isAfter, subDays as subDaysDate } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Pencil, Search, User, X, Plus, RefreshCw } from 'lucide-react';
import NuevoRegistroModal from '@/components/dashboard/NuevoRegistroModal';
import { matchesLeadSearch } from '@/lib/performance-search';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';
import type { VideollamadasResponse, ApiVideollamada, VideoMeeting, VideollamadasAdvisorMetrics } from '@/types';
import { BarChart3 } from 'lucide-react';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';
import { formatCurrency } from '@/lib/format';

const fm = formatCurrency;
const pct = (n: number) => `${n.toFixed(1)}%`;

const kpiTooltips = {
  agendadas: { significado: 'Citas o presentaciones programadas. Vienen de los calendarios usados para citas o presentaciones.', calculo: 'Eventos de videollamada de los calendarios de citas/presentaciones en el rango.' },
  asistidas: { significado: 'Reuniones a las que el lead asistió. El dato llega de Fathom.', calculo: 'Videollamadas con attended = true; fuente: Fathom.' },
  canceladas: { significado: 'Reuniones canceladas antes de realizarse. Provienen de las canceladas en GHL.', calculo: 'Videollamadas con canceled = true en GHL.' },
  efectivas: { significado: 'Ventas cerradas. Las que Fathom determina como cerradas.', calculo: 'Videollamadas que Fathom marca como cerradas.' },
  noShows: { significado: 'Leads que no se presentaron a la cita agendada.', calculo: 'Registros con categoría no_show en el período seleccionado.' },
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
    transcript: r.transcripcionFathom ?? undefined,
    tags: r.tags ? r.tags.split(',').map((t) => t.trim()) : [],
    recordingUrl: r.linkLlamada ?? undefined,
    source: r.origen ?? undefined,
    objections: r.objeciones.map((o) => o.categoria),
    objectionDetails: r.objeciones.map((o) => ({ category: o.categoria, quote: o.objecion })),
  };
}

export default function PerformanceVideollamadasPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalSelectorMeetings, setModalSelectorMeetings] = useState<VideoMeeting[] | null>(null);
  const [modalTranscripcionIA, setModalTranscripcionIA] = useState<VideoMeeting | null>(null);
  const [apiMeetingsForModal, setApiMeetingsForModal] = useState<ApiVideollamada[] | null>(null);
  const [editingRecord, setEditingRecord] = useState<{id: number; nombre_lead: string | null; closer: string | null; estado: string | null; facturacion?: number | null; cash_collected?: number | null} | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todas' | 'cerradas' | 'no_cerradas' | 'no_calificadas'>('todas');

  const { data, loading, refetch } = useApiData<VideollamadasResponse>('/api/data/videollamadas', { from: dateFrom, to: dateTo, tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined });
  const rendimientoMetrics = data?.metricasComputadas ?? [];

  const openTranscripcionIA = (meetingsOfLead: VideoMeeting[], apiMeetings?: ApiVideollamada[]) => {
    if (apiMeetings) setApiMeetingsForModal(apiMeetings);
    if (meetingsOfLead.length === 1) setModalTranscripcionIA(meetingsOfLead[0]);
    else setModalSelectorMeetings(meetingsOfLead);
  };

  const agg = data?.agg ?? { agendadas: 0, asistidas: 0, canceladas: 0, efectivas: 0, noShows: 0, revenue: 0, cashCollected: 0, ticket: 0 };

  const isCerrada = (r: ApiVideollamada) =>
    r.outcome === 'cerrada' || r.outcome === 'cerrado' || r.outcome === 'closed';

  const registrosFiltrados = useMemo(() => {
    if (!data?.registros) return [];
    let records = data.registros;
    // Search filter
    const q = leadSearch.trim();
    if (q) {
      records = records.filter((r) =>
        matchesLeadSearch(q, [
          r.leadName,
          r.leadEmail,
          r.idcliente,
          r.ghl_contact_id,
          r.tags,
          r.origen,
          String(r.id),
          r.closer,
          r.resumenIa,
        ]),
      );
    }
    // Status filter (applies to list view only — KPI totals are server-side and unaffected)
    if (statusFilter === 'cerradas') records = records.filter(isCerrada);
    else if (statusFilter === 'no_cerradas') records = records.filter((r) => r.attended && !isCerrada(r));
    else if (statusFilter === 'no_calificadas') records = records.filter((r) => r.attended && !r.qualified);
    return records;
  }, [data?.registros, leadSearch, statusFilter]);

  const meetingsByAdvisor = useMemo(() => {
    const map: Record<string, ApiVideollamada[]> = {};
    for (const r of registrosFiltrados) {
      // Usar closerCanonicalKey para que la clave coincida con advisorMetrics del servidor
      const key = r.closerCanonicalKey ?? r.closer ?? 'Sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [registrosFiltrados]);

  function metricsFromMeetings(ms: ApiVideollamada[]): VideollamadasAdvisorMetrics {
    const asist = ms.filter((r) => r.attended).length;
    const efect = ms.filter((r) => r.attended && r.qualified).length;
    const fact = ms.reduce((s, r) => s + r.facturacion, 0);
    const cash = ms.reduce((s, r) => s + r.cashCollected, 0);
    return {
      advisorName: ms[0]?.closer ?? '',
      agendadas: ms.length,
      asistencias: asist,
      pctCierre: asist > 0 ? (efect / asist) * 100 : 0,
      facturacion: fact,
      cashCollected: cash,
    };
  }

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

  useEffect(() => {
    const q = leadSearch.trim();
    if (!q) return;
    const keys = Object.keys(meetingsByAdvisor);
    if (keys.length === 1) setExpandedAdvisorId(keys[0]);
  }, [leadSearch, meetingsByAdvisor]);

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
        <button
          type="button"
          onClick={() => setShowNuevoModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-xs font-semibold hover:bg-accent-cyan/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva entrada
        </button>
        <span className="text-xs text-gray-400">Rango de fechas (actividad):</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="search"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Buscar: nombre, email, ID contacto, tags, resumen…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-700 border border-surface-500 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-purple"
            aria-label="Buscar en videollamadas"
          />
        </div>
      </div>
      {leadSearch.trim() && (
        <p className="text-[10px] text-gray-500">
          Mostrando {registrosFiltrados.length} de {data?.registros?.length ?? 0} reuniones
          {registrosFiltrados.length === 0 ? ' — prueba otro término' : ''}
        </p>
      )}
      <TagFilter
        tags={[...new Set(data?.registros?.flatMap((r: ApiVideollamada) => (r.tags ?? '').split(',').map(t => t.trim()).filter(Boolean)) ?? [])]}
        selected={selectedTags}
        onChange={setSelectedTags}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Filtrar lista:</span>
        {([
          { id: 'todas', label: 'Todas' },
          { id: 'cerradas', label: 'Cerradas' },
          { id: 'no_cerradas', label: 'No cerradas' },
          { id: 'no_calificadas', label: 'No calificadas' },
        ] as const).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setStatusFilter(opt.id)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
              statusFilter === opt.id
                ? 'bg-accent-purple/20 border-accent-purple/50 text-accent-purple'
                : 'bg-surface-700 border-surface-500 text-gray-400 hover:border-accent-purple/30 hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {statusFilter !== 'todas' && (
          <span className="text-[10px] text-gray-500">
            — {registrosFiltrados.length} reunión{registrosFiltrados.length !== 1 ? 'es' : ''} · los KPIs de arriba no cambian
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        {[
          { label: t.performance.videollamadas.kpis.agendadas, value: agg.agendadas, color: 'purple', tip: kpiTooltips.agendadas },
          { label: t.performance.videollamadas.kpis.asistidas, value: agg.asistidas, color: 'cyan', tip: kpiTooltips.asistidas },
          { label: t.performance.videollamadas.kpis.canceladas, value: agg.canceladas, color: 'red', tip: kpiTooltips.canceladas },
          { label: t.performance.videollamadas.kpis.noShows, value: agg.noShows, color: 'amber', tip: kpiTooltips.noShows },
          { label: t.performance.videollamadas.kpis.ingresos, value: fm(agg.revenue), color: 'green', tip: kpiTooltips.revenue },
          { label: t.performance.videollamadas.kpis.efectivoCobrado, value: fm(agg.cashCollected), color: 'green', tip: kpiTooltips.cashCollected },
          { label: t.performance.videollamadas.kpis.ticketPromedio, value: fm(agg.ticket), color: 'blue', tip: kpiTooltips.ticket },
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
          {t.performance.videollamadas.titulo}
        </h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {(data?.registros?.length ?? 0) === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">{t.performance.videollamadas.noData}</div>
          ) : leadSearch.trim() && registrosFiltrados.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">Ninguna reunión coincide con «{leadSearch.trim()}».</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">{t.performance.videollamadas.closer}</th>
                    <th className="px-2 py-2 font-medium">{t.performance.videollamadas.reunion}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.asistidas}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.tasaCierre}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.ingresos}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.efectivoCobrado}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(meetingsByAdvisor)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([advisorKey, advisorMeetings]) => {
                      const isExpanded = expandedAdvisorId === advisorKey;
                      const metrics = leadSearch.trim()
                        ? metricsFromMeetings(advisorMeetings)
                        : data?.advisorMetrics[advisorKey];
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
                                {metrics?.advisorName ?? advisorMeetings[0]?.closer ?? advisorKey}
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
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads de {metrics?.advisorName ?? advisorMeetings[0]?.closer ?? advisorKey} (clic en la fila abre reuniones)</div>
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
                                          const reingestDate = last?.fathomReingestAt ? new Date(last.fathomReingestAt) : null;
                                          const showReingestBadge = reingestDate !== null && isAfter(reingestDate, subDaysDate(new Date(), 7));
                                          return (
                                            <tr
                                              key={lead.leadKey}
                                              className="border-t border-surface-500 hover:bg-surface-600/50 cursor-pointer"
                                              onClick={() => openTranscripcionIA(lead.meetings.map(apiToVideoMeeting), lead.meetings)}
                                            >
                                              <td className="px-2 py-2 text-white">
                                                <div className="flex flex-col gap-0.5">
                                                  <span>{lead.name}</span>
                                                  {(lead.meetings[0]?.idcliente || lead.meetings[0]?.ghl_contact_id) && (
                                                    <span className="text-[10px] text-gray-500">
                                                      {lead.meetings[0]?.ghl_contact_id && <>GHL: {lead.meetings[0].ghl_contact_id}</>}
                                                      {lead.meetings[0]?.idcliente && lead.meetings[0]?.ghl_contact_id && ' · '}
                                                      {lead.meetings[0]?.idcliente && <>ID: {lead.meetings[0].idcliente}</>}
                                                    </span>
                                                  )}
                                                </div>
                                              </td>
                                              <td className="px-2 py-2 text-gray-400">{lead.email ?? '—'}</td>
                                              <td className="px-2 py-2 text-accent-cyan">{lead.meetings.length}</td>
                                              <td className="px-2 py-2 text-gray-300">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span>{outcomeLabel}</span>
                                                  {showReingestBadge && reingestDate && (
                                                    <span className="relative group/reingest" onClick={(e) => e.stopPropagation()}>
                                                      <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-1.5 py-0.5 rounded-md cursor-help select-none">
                                                        <RefreshCw className="w-3 h-3" />
                                                        Actualizado
                                                      </span>
                                                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-lg p-3 hidden group-hover/reingest:block z-20 shadow-xl pointer-events-none">
                                                        <p className="font-medium text-white mb-1">
                                                          Fathom actualizó este registro{' '}
                                                          {formatDistanceToNow(reingestDate, { addSuffix: true, locale: es })}
                                                        </p>
                                                        {last.categoriaPrevia && (
                                                          <p className="text-gray-400 mb-0.5">
                                                            Categoría anterior: <span className="text-gray-200">{last.categoriaPrevia}</span>
                                                          </p>
                                                        )}
                                                        <p className="text-gray-400 mb-2">
                                                          Categoría actual: <span className="text-gray-200">{last.categoria}</span>
                                                        </p>
                                                        <p className="text-gray-500 leading-snug">
                                                          Fathom envió una corrección automática al confirmar la asistencia de este lead.
                                                        </p>
                                                      </div>
                                                    </span>
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
              setEditingRecord({ id: api.id, nombre_lead: api.leadName, closer: api.closer, estado: api.categoria, facturacion: api.facturacion, cash_collected: api.cashCollected });
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
          onSaved={() => { setEditingRecord(null); refetch(); }}
        />
      )}
      <NuevoRegistroModal
        open={showNuevoModal}
        onClose={() => setShowNuevoModal(false)}
        onSuccess={() => refetch()}
        tipo="videollamada"
      />
    </div>
  );
}
