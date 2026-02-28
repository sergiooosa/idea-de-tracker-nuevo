import { useState, useMemo, Fragment } from 'react';
import PageHeader from '@/components/PageHeader';
import KPICard from '@/components/KPICard';
import Lead360Drawer from '@/components/Lead360Drawer';
import {
  metricsGlobal,
  metricsByAdvisor,
  advisors,
  getLeadsByAdvisor,
  getAdvisorById,
  getLeadById,
  callsVolumeByDay,
  getCallsByLeadInRange,
  getCallsInRange,
  getMeetingsInRange,
  getMeetingsByLeadInRange,
} from '@/data/mockData';
import type { Lead } from '@/types';
import type { CallPhone, VideoMeeting } from '@/types';
import { ChevronDown, ChevronRight, Target, X, FileText, Sparkles, User, UserCircle, Trophy, Phone, Video } from 'lucide-react';
import { outcomeLlamadaToSpanish, outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';
import { subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import clsx from 'clsx';
import KpiTooltip from '@/components/KpiTooltip';
import DateRangePicker from '@/components/DateRangePicker';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

/** Resumen visual del lead: tarjetas por interacción (solo en Ranking por asesor) */
function ResumenLeadTimeline({
  leadId,
  leadName,
  advisorId,
  dateFrom,
  dateTo,
  expandedResumen,
  setExpandedResumen,
  onClose,
}: {
  leadId: string;
  leadName: string;
  advisorId: string;
  dateFrom: string;
  dateTo: string;
  expandedResumen: { id: string; type: 'call' | 'meeting'; view: 'transcript' | 'ia' } | null;
  setExpandedResumen: (v: typeof expandedResumen) => void;
  onClose: () => void;
}) {
  const calls = getCallsByLeadInRange(leadId, dateFrom, dateTo).filter((c) => c.advisorId === advisorId);
  const meetings = getMeetingsByLeadInRange(leadId, dateFrom, dateTo).filter((m) => m.advisorId === advisorId);
  const items = useMemo(() => {
    const fromCalls = calls.map((c) => ({ ...c, _type: 'call' as const }));
    const fromMeetings = meetings.map((m) => ({ ...m, _type: 'meeting' as const }));
    return [...fromCalls, ...fromMeetings].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
  }, [calls, meetings]);

  return (
    <div className="rounded-lg bg-surface-800 border border-surface-500 overflow-hidden">
      {/* Cabecera clara */}
      <div className="flex justify-between items-center px-3 py-2 bg-surface-700/80 border-b border-surface-500">
        <div>
          <h4 className="text-sm font-semibold text-white">Resumen del lead: {leadName}</h4>
          <p className="text-[10px] text-gray-400 mt-0.5">Últimas interacciones (más reciente primero)</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-surface-600"
        >
          Cerrar
        </button>
      </div>
      <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No hay interacciones en el rango.</p>
        ) : (
          items.map((item, index) => {
            const isCall = item._type === 'call';
            const id = item.id;
            const showTranscript = expandedResumen?.id === id && expandedResumen?.view === 'transcript';
            const showIa = expandedResumen?.id === id && expandedResumen?.view === 'ia';
            const resumen =
              isCall
                ? `${outcomeLlamadaToSpanish((item as CallPhone).outcome)}${(item as CallPhone).duration ? ` · ${(item as CallPhone).duration}s` : ''}`
                : `${(item as VideoMeeting).attended ? 'Asistió' : 'No asistió'} · ${outcomeVideollamadaToSpanish((item as VideoMeeting).outcome)}`;
            const dateStr = format(new Date(item.datetime), 'dd/MM/yyyy');
            const timeStr = format(new Date(item.datetime), 'HH:mm');
            return (
              <div
                key={`${item._type}-${id}`}
                className="rounded-lg border border-surface-500 bg-surface-700/60 overflow-hidden"
              >
                {/* Tarjeta por interacción: icono + fecha + badge + acciones */}
                <div className="flex items-start gap-3 p-2.5">
                  <div
                    className={clsx(
                      'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                      isCall ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-accent-purple/20 text-accent-purple'
                    )}
                  >
                    {isCall ? <Phone className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 gap-y-0.5">
                      <span className="text-xs font-medium text-white">
                        {dateStr} · {timeStr}
                      </span>
                      {index === 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/20 text-accent-cyan">
                          Más reciente
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {isCall ? 'Llamada' : 'Videollamada'} — <span className="text-gray-400">{resumen}</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedResumen(showTranscript ? null : { id, type: item._type, view: 'transcript' })}
                        className={clsx(
                          'text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors',
                          showTranscript
                            ? 'bg-accent-cyan/30 text-accent-cyan'
                            : 'text-accent-cyan hover:bg-accent-cyan/20'
                        )}
                      >
                        <FileText className="w-3 h-3" /> Transcripción
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedResumen(showIa ? null : { id, type: item._type, view: 'ia' })}
                        className={clsx(
                          'text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors',
                          showIa
                            ? 'bg-accent-purple/30 text-accent-purple'
                            : 'text-accent-purple hover:bg-accent-purple/20'
                        )}
                      >
                        <Sparkles className="w-3 h-3" /> Análisis IA
                      </button>
                    </div>
                  </div>
                </div>
                {/* Contenido expandido: transcripción o IA */}
                {(showTranscript || showIa) && (
                  <div className="border-t border-surface-500 px-3 py-2 bg-surface-800/80">
                    <p className="text-[10px] text-gray-500 mb-1">{showTranscript ? 'Transcripción' : 'Análisis IA'}</p>
                    <div className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {showTranscript
                        ? isCall
                          ? (item as CallPhone).notes ?? `Transcripción de la llamada. ${outcomeLlamadaToSpanish((item as CallPhone).outcome)}.`
                          : (item as VideoMeeting).notes ?? `Transcripción. ${(item as VideoMeeting).attended ? 'El lead asistió.' : 'No asistió.'}`
                        : isCall
                          ? (item as CallPhone).summary ?? `Resumen IA: Llamada. Objeciones: ${(item as CallPhone).objections?.join(', ') || 'ninguna'}.`
                          : `Reunión ${(item as VideoMeeting).attended ? 'asistida' : 'no asistida'}. ${outcomeVideollamadaToSpanish((item as VideoMeeting).outcome)}.${(item as VideoMeeting).amountBought ? ` Monto: $${(item as VideoMeeting).amountBought!.toLocaleString('es-CO')}` : ''} ${(item as VideoMeeting).notes ? ` Notas: ${(item as VideoMeeting).notes}` : ''}`}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const defaultDateTo = new Date();
const defaultDateFrom = subDays(defaultDateTo, 7);

export default function ExecutivePanel() {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [lead360, setLead360] = useState<Lead | null>(null);
  const [filterClosers, setFilterClosers] = useState<string>('all');
  const [modalObjeciones, setModalObjeciones] = useState(false);
  const [selectedObjeccion, setSelectedObjeccion] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(format(defaultDateFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultDateTo, 'yyyy-MM-dd'));
  const [expandedResumen, setExpandedResumen] = useState<{ id: string; type: 'call' | 'meeting'; view: 'transcript' | 'ia' } | null>(null);
  const [expandedLeadResumen, setExpandedLeadResumen] = useState<{ leadId: string; leadName: string; advisorId: string } | null>(null);

  const advisorList = useMemo(
    () => (filterClosers === 'closers' ? advisors.filter((a) => a.role === 'closer') : advisors),
    [filterClosers]
  );

  const leadsForAdvisor = useMemo(
    () => (selectedAdvisorId ? getLeadsByAdvisor(selectedAdvisorId) : []),
    [selectedAdvisorId]
  );

  const selectedAdvisor = selectedAdvisorId ? getAdvisorById(selectedAdvisorId) : null;
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string>('');

  // Objeciones solo de videollamadas: conteo por categoría, porcentaje y cantidad de "tipos" (frases distintas)
  const objectionsByCountFromVideollamadas = useMemo(() => {
    const meetingsInRange = getMeetingsInRange(dateFrom, dateTo);
    const countByCategory: Record<string, number> = {};
    const quotesByCategory: Record<string, Set<string>> = {};
    meetingsInRange.forEach((m) => {
      m.objections?.forEach((cat) => {
        const key = cat.toLowerCase().trim();
        countByCategory[key] = (countByCategory[key] ?? 0) + 1;
        if (!quotesByCategory[key]) quotesByCategory[key] = new Set();
        const quote = m.objectionDetails?.find((d) => d.category.toLowerCase().trim() === key)?.quote ?? '—';
        quotesByCategory[key].add(quote);
      });
    });
    const total = Object.values(countByCategory).reduce((s, c) => s + c, 0);
    return Object.entries(countByCategory)
      .map(([name, count]) => ({
        name,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0,
        tipos: quotesByCategory[name]?.size ?? 1,
      }))
      .sort((a, b) => b.count - a.count);
  }, [dateFrom, dateTo]);

  const OBJECTION_PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

  // Detalle de objeciones: solo videollamadas, con cita exacta de lo que dijo el lead
  const objectionDetailList = useMemo(() => {
    if (!selectedObjeccion) return [];
    const key = selectedObjeccion.toLowerCase().trim();
    const meetingsInRange = getMeetingsInRange(dateFrom, dateTo);
    return meetingsInRange
      .filter((m) => m.objections?.some((o) => o.toLowerCase().trim() === key))
      .map((m) => {
        const quote = m.objectionDetails?.find((d) => d.category.toLowerCase().trim() === key)?.quote ?? '—';
        return {
          leadName: getLeadById(m.leadId)?.name ?? m.leadId,
          advisorName: getAdvisorById(m.advisorId)?.name ?? m.advisorId,
          datetime: m.datetime,
          quote,
        };
      })
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  }, [selectedObjeccion, dateFrom, dateTo]);

  // KPIs recalculados por rango de fechas (actividad en ese período)
  const kpisFromRange = useMemo(() => {
    const callsInRange = getCallsInRange(dateFrom, dateTo);
    const meetingsInRange = getMeetingsInRange(dateFrom, dateTo);
    const totalCalls = callsInRange.length;
    const contestadas = callsInRange.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
    const answerRate = totalCalls > 0 ? contestadas / totalCalls : 0;
    const leadIdsWithActivity = new Set([
      ...callsInRange.map((c) => c.leadId),
      ...meetingsInRange.map((m) => m.leadId),
    ]);
    const totalLeads = leadIdsWithActivity.size;
    const leadsCalificados = new Set(callsInRange.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').map((c) => c.leadId)).size;
    const agendadas = meetingsInRange.length;
    const asistidas = meetingsInRange.filter((m) => m.attended).length;
    const canceladas = meetingsInRange.filter((m) => m.canceled).length;
    const efectivas = meetingsInRange.filter((m) => m.attended && m.qualified).length;
    const cerradas = meetingsInRange.filter((m) => m.outcome === 'cerrado').length;
    const tasaCierre = asistidas > 0 ? (cerradas / asistidas) * 100 : 0;
    const revenue = meetingsInRange.reduce((s, m) => s + (m.amountBought ?? 0), 0);
    const cashCollected = meetingsInRange.reduce((s, m) => s + (m.cashCollected ?? 0), 0);
    const avgTicket = efectivas > 0 ? revenue / efectivas : 0;
    const speedAvg = callsInRange.filter((c) => c.speedToLeadSeconds != null).length
      ? callsInRange
          .filter((c) => c.speedToLeadSeconds != null)
          .reduce((s, c) => s + (c.speedToLeadSeconds ?? 0), 0) /
        callsInRange.filter((c) => c.speedToLeadSeconds != null).length
      : metricsGlobal.speedToLeadAvg;
    const avgAttempts = totalCalls > 0
      ? callsInRange.reduce((s, c) => s + c.attemptsCountForLead, 0) / totalCalls
      : metricsGlobal.avgAttempts;
    const attemptsToFirst = callsInRange.filter((c) => c.firstContactAt).length
      ? callsInRange
          .filter((c) => c.attemptsCountForLead >= 1)
          .reduce((s, c) => s + c.attemptsCountForLead, 0) /
        Math.max(1, callsInRange.filter((c) => c.attemptsCountForLead >= 1).length)
      : metricsGlobal.attemptsToFirstContactAvg ?? 1.8;
    const tasaAgendamiento = contestadas > 0 ? (agendadas / contestadas) * 100 : 0;
    const attendanceRate = agendadas > 0 ? asistidas / agendadas : 0;
    return {
      totalLeads: totalLeads || metricsGlobal.totalLeads,
      leadsCalificados,
      callsMade: totalCalls || metricsGlobal.callsMade,
      contestadas,
      answerRate: totalCalls ? answerRate : metricsGlobal.answerRate,
      llamadasPromedioPorLead: totalLeads > 0 ? (totalCalls / totalLeads).toFixed(1) : '0',
      meetingsBooked: agendadas || metricsGlobal.meetingsBooked,
      tasaAgendamientoContestadas: contestadas > 0 ? tasaAgendamiento.toFixed(1) : '0',
      meetingsAttended: asistidas || metricsGlobal.meetingsAttended,
      attendanceRate: agendadas ? attendanceRate : metricsGlobal.attendanceRate,
      meetingsCanceled: canceladas,
      meetingsClosed: cerradas,
      effectiveAppointments: efectivas || metricsGlobal.effectiveAppointments,
      tasaCierre,
      revenue: revenue || metricsGlobal.revenue,
      cashCollected: cashCollected || metricsGlobal.cashCollected,
      avgTicket: avgTicket || metricsGlobal.avgTicket,
      speedToLeadAvg: speedAvg,
      avgAttempts,
      attemptsToFirstContactAvg: attemptsToFirst,
    };
  }, [dateFrom, dateTo]);

  return (
    <>
      <PageHeader
        title="Panel ejecutivo"
        subtitle="Vista ejecutiva · Todo en 1"
      />

      <div className="p-3 md:p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden text-sm">
        {/* Filtro por rango de fechas */}
        <section className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultDateFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultDateTo, 'yyyy-MM-dd')}
          />
        </section>

        {/* A) Top KPIs globales */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Top KPIs globales
          </h2>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
            {/* Leads generados */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-blue kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Leads generados
                <KpiTooltip
                  significado="Contactos creados en GHL. Los calificados son los que determina la IA en la llamada."
                  calculo="Leads = todos los contactos creados en GHL en el rango. Calificados = lo que determina la IA en la llamada telefónica."
                />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-blue break-words">{kpisFromRange.totalLeads}</p>
              <div className="kpi-card-spacer" />
            </div>

            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Leads calificados
                <KpiTooltip
                  significado="Leads que la IA determina como calificados en la llamada (contactos creados en GHL)."
                  calculo="Lo que determina la IA en la llamada telefónica sobre cada lead."
                />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-green break-words">{kpisFromRange.leadsCalificados}</p>
              <div className="kpi-card-spacer" />
            </div>

            {/* Llamadas telefónicas (solo total) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Llamadas telefónicas
                <KpiTooltip significado="Todas las llamadas realizadas en el rango de fechas seleccionado." calculo="Suma de todas las llamadas en el rango." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-cyan break-words">{kpisFromRange.callsMade}</p>
              <div className="kpi-card-spacer" />
            </div>
            {/* Contestadas · Tasa de contestación (misma tarjeta) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Contestadas · Tasa de contestación
                <KpiTooltip significado="Las que contestaron efectivamente y el porcentaje sobre el total." calculo="Contestadas = llamadas que el lead contestó. Tasa = (Contestadas / Total llamadas) × 100." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-cyan break-words">{kpisFromRange.contestadas}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Tasa de contestación: <span className="text-accent-cyan font-semibold">{pct(kpisFromRange.answerRate)}</span></p>
              <div className="kpi-card-spacer" />
            </div>

            {/* Videollamadas agendadas + Tasa de agendamiento (misma tarjeta) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-purple kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Videollamadas agendadas · Tasa de agendamiento
                <KpiTooltip significado="Citas o presentaciones programadas. Vienen de los calendarios usados para citas o presentaciones." calculo="Videollamadas agendadas = eventos de los calendarios (citas/presentaciones) en el rango. Tasa = (Agendadas / Contestadas) × 100." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-purple break-words">{kpisFromRange.meetingsBooked}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Tasa de agendamiento: <span className="text-accent-purple font-semibold">{kpisFromRange.tasaAgendamientoContestadas}%</span></p>
              <div className="kpi-card-spacer" />
            </div>
            {/* Asistencias + % Asistencia (misma tarjeta) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Asistencias · % Asistencia
                <KpiTooltip significado="Reuniones a las que el lead asistió. El dato llega de Fathom." calculo="Asistencias = videollamadas con attended = true; fuente: Fathom. % = (Asistencias / Agendadas) × 100." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-cyan break-words">{kpisFromRange.meetingsAttended}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">% Asistencia: <span className="text-accent-cyan font-semibold">{pct(kpisFromRange.attendanceRate)}</span></p>
              <div className="kpi-card-spacer" />
            </div>
            {/* Canceladas */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-red kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Canceladas
                <KpiTooltip significado="Reuniones canceladas antes de realizarse. Provienen de las canceladas en GHL." calculo="Videollamadas con canceled = true en GHL." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-red break-words">{kpisFromRange.meetingsCanceled}</p>
              <div className="kpi-card-spacer" />
            </div>
            {/* Cerradas + Tasa de cierre (misma tarjeta) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Cerradas · Tasa de cierre
                <KpiTooltip significado="Ventas cerradas en videollamada. Son las que Fathom determina como cerradas (en la videollamada dice «cita cerrada»)." calculo="Videollamadas que Fathom marca como cerradas (cita cerrada). Tasa = (Cerradas / Asistencias) × 100." />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-green break-words">{kpisFromRange.meetingsClosed}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Tasa de cierre: <span className="text-accent-green font-semibold">{kpisFromRange.tasaCierre.toFixed(1)}%</span></p>
              <div className="kpi-card-spacer" />
            </div>

            <KPICard
              label="Ingresos"
              value={fm(kpisFromRange.revenue)}
              color="green"
              className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
              tooltip={{
                significado: 'Lo que se vendió de la propiedad (facturación por ventas).',
                calculo: 'Suma del monto vendido en reuniones cerradas.',
              }}
            />
            <KPICard
              label="Efectivo cobrado"
              value={fm(kpisFromRange.cashCollected)}
              color="green"
              className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
              tooltip={{
                significado: 'Lo que se recolectó (dinero efectivamente cobrado).',
                calculo: 'Suma de efectivo cobrado (cashCollected) de las ventas.',
              }}
            />
            <KPICard
              label="Ticket promedio"
              value={fm(kpisFromRange.avgTicket)}
              color="blue"
              className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
              tooltip={{
                significado: 'Valor promedio por venta. División entre lo que se recolectó y lo que se vendió.',
                calculo: 'Efectivo cobrado total / número de ventas (o lo recolectado sobre lo vendido).',
              }}
            />
            <KPICard
              label="Tiempo al lead"
              value={min(kpisFromRange.speedToLeadAvg)}
              color="purple"
              className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
              tooltip={{
                significado: 'Tiempo que se demoran en contactar al lead (desde que llega hasta el primer contacto).',
                calculo: 'Promedio de (fecha/hora del primer contacto − creación del lead) por lead.',
              }}
            />
            {/* Intentos a contacto */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-amber kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Intentos a contacto
                <KpiTooltip
                  significado="Cuántas llamadas en promedio se hacen para que un lead conteste (hasta el primer contacto)."
                  calculo="Promedio de intentos por lead hasta que el lead contesta por primera vez."
                />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-amber">
                {kpisFromRange.attemptsToFirstContactAvg?.toFixed(1) ?? '-'}
              </p>
              <div className="kpi-card-spacer" />
            </div>
            {/* Intentos promedio (total por lead) */}
            <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-amber kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                Intentos promedio
                <KpiTooltip
                  significado="Intentos promedios que se le han hecho a todos los leads (en total)."
                  calculo="Suma de intentos de llamada por lead / cantidad de leads con al menos una llamada."
                />
              </p>
              <p className="text-base font-bold mt-0.5 text-accent-amber">{kpisFromRange.avgAttempts.toFixed(1)}</p>
              <div className="kpi-card-spacer" />
            </div>
          </div>
        </section>

        {/* Objeciones más comunes (ruedita + lista) + Volumen llamadas */}
        <div className="grid md:grid-cols-2 gap-3">
          <section className="rounded-lg p-3 section-futuristic">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-accent-red" />
              Objeciones más comunes
            </h2>
            <p className="text-[10px] text-gray-500 mb-2">
              Objeciones detectadas por la IA en las videollamadas del período
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2 items-start">
              {/* Ruedita (donut) con porcentajes; tooltip en negro al pasar el cursor */}
              <div className="h-36 sm:h-40 w-full min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                    <Pie
                      data={objectionsByCountFromVideollamadas}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius="58%"
                      outerRadius="78%"
                      paddingAngle={2}
                      isAnimationActive={true}
                    >
                      {objectionsByCountFromVideollamadas.map((_, i) => (
                        <Cell key={i} fill={OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        color: '#0f172a',
                      }}
                      labelStyle={{ color: '#0f172a', fontWeight: 600 }}
                      itemStyle={{ color: '#0f172a' }}
                      formatter={(_, name, props) => {
                        const payload = props?.payload as { count?: number; percent?: number } | undefined;
                        const count = payload?.count ?? 0;
                        const pct = payload?.percent ?? 0;
                        return [
                          `${count}x (${pct}%)`,
                          name ? String(name).charAt(0).toUpperCase() + String(name).slice(1) : '',
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Lista de categorías */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">Haz clic en una categoría para ver los detalles:</p>
                <ul className="space-y-1">
                  {objectionsByCountFromVideollamadas.map((o, i) => (
                    <li key={o.name}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedObjeccion(o.name);
                          setModalObjeciones(true);
                        }}
                        className="w-full flex items-center justify-between gap-2 rounded-md bg-surface-700 px-2.5 py-1.5 text-left hover:bg-surface-600 transition-colors"
                      >
                        <span className="flex items-center gap-2 font-medium text-white capitalize">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length] }}
                          />
                          {o.name}
                        </span>
                        <span className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
                          <span>{o.tipos} {o.tipos === 1 ? 'tipo' : 'tipos'}</span>
                          <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">
                            {o.count}x
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
          <section className="rounded-lg p-3 section-futuristic">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Volumen: llamadas, citas y cierres
            </h2>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={callsVolumeByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: '#22262e', border: '1px solid #2a2f3a', borderRadius: '8px' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend />
                  <Bar dataKey="llamadas" name="Llamadas telefónicas" fill="#4dabf7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="citasPresentaciones" name="Citas / presentaciones" fill="#b24bf3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cierres" name="Cierres" fill="#00e676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* B) Ranking por asesor — Ordenado por rendimiento (llamadas, agendadas, asistidas, facturación); el mejor destacado */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ranking por asesor
            </h2>
            <select
              value={filterClosers}
              onChange={(e) => setFilterClosers(e.target.value)}
              className="rounded-md bg-surface-700 border border-surface-500 px-2 py-1 text-xs text-white"
            >
              <option value="all">Todos</option>
              <option value="closers">Solo cerradores</option>
            </select>
          </div>
          <div className="rounded-lg border border-surface-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-8" />
                    <th className="px-2 py-2 font-medium">Asesor</th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Leads generados <KpiTooltip significado="Contactos creados en GHL. Calificados = lo que determina la IA en la llamada." calculo="Todos los contactos creados en GHL en el rango." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Llamadas <KpiTooltip significado="Todas las llamadas realizadas en el rango seleccionado." calculo="Suma de todas las llamadas en el rango." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Tiempo al lead <KpiTooltip significado="Tiempo que se demoran en contactar al lead." calculo="Promedio de (primer contacto − creación del lead)." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Agendadas <KpiTooltip significado="Citas o presentaciones. Vienen de los calendarios de citas o presentaciones." calculo="Videollamadas de los calendarios usados para citas/presentaciones." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Asistidas <KpiTooltip significado="Reuniones a las que el lead asistió. Dato de Fathom." calculo="Videollamadas con attended = sí; fuente Fathom." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Facturación <KpiTooltip significado="Lo que se vendió de la propiedad." calculo="Suma del monto vendido en reuniones cerradas." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Efectivo cobrado <KpiTooltip significado="Lo que se recolectó." calculo="Suma de efectivo cobrado (cashCollected) de las ventas." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Tasa contacto <KpiTooltip significado="Porcentaje de llamadas que contestaron." calculo="(Llamadas contestadas / Total llamadas) × 100." /></span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center">Tasa agendamiento <KpiTooltip significado="Porcentaje de contestados que agendaron reunión." calculo="(Reuniones agendadas / Llamadas contestadas) × 100." /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {advisorList
                    .filter((a) => metricsByAdvisor[a.id])
                    .slice()
                    .sort((a, b) => {
                      const ma = metricsByAdvisor[a.id]!;
                      const mb = metricsByAdvisor[b.id]!;
                      const score = (m: typeof ma) =>
                        (m.callsMade ?? 0) + (m.meetingsBooked ?? 0) + (m.meetingsAttended ?? 0) + (m.revenue ?? 0) / 1000;
                      return score(mb) - score(ma);
                    })
                    .slice(0, 8)
                    .map((a, rankIndex) => {
                    const m = metricsByAdvisor[a.id]!;
                    const expanded = expandedAdvisorId === a.id;
                    const isBest = rankIndex === 0;
                    const callsEnRango = getCallsInRange(dateFrom, dateTo).filter((c) => c.advisorId === a.id);
                    const meetingsEnRango = getMeetingsInRange(dateFrom, dateTo).filter((mt) => mt.advisorId === a.id);
                    const leadIdsEnRango = new Set([
                      ...callsEnRango.map((c) => c.leadId),
                      ...meetingsEnRango.map((mt) => mt.leadId),
                    ]);
                    const leadsDelAsesor = Array.from(leadIdsEnRango)
                      .map((id) => getLeadById(id))
                      .filter((l): l is Lead => l != null)
                      .sort((x, y) => {
                        const xCalls = getCallsByLeadInRange(x.id, dateFrom, dateTo).filter((c) => c.advisorId === a.id).length;
                        const yCalls = getCallsByLeadInRange(y.id, dateFrom, dateTo).filter((c) => c.advisorId === a.id).length;
                        return yCalls - xCalls;
                      });
                    return (
                      <Fragment key={a.id}>
                        <tr
                          className={clsx(
                            'border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer',
                            isBest && 'bg-accent-green/10'
                          )}
                          onClick={() => {
                            setExpandedAdvisorId(expanded ? '' : a.id);
                            setSelectedAdvisorId(expanded ? '' : a.id);
                          }}
                        >
                          <td className="px-2 py-2">
                            <ChevronDown
                              className={clsx(
                                'w-5 h-5 text-gray-400 transition-transform',
                                expanded && 'rotate-180'
                              )}
                            />
                          </td>
                          <td className="px-2 py-2">
                            {isBest ? (
                              <span className="inline-flex items-center gap-1.5 font-medium text-accent-amber">
                                <Trophy className="w-4 h-4" />
                                {a.name}
                                <span className="text-[10px] uppercase tracking-wide text-accent-amber/90">Mejor</span>
                              </span>
                            ) : (
                              <>
                                <span className="inline-block w-2 h-2 rounded-full bg-accent-green mr-2" />
                                {a.name}
                              </>
                            )}
                          </td>
                          <td className="px-2 py-2 text-white">{m.totalLeads ?? 0}</td>
                          <td className="px-2 py-2 text-accent-cyan">{m.callsMade ?? 0}</td>
                          <td className="px-2 py-2 text-gray-300">
                            {m.speedToLeadAvg != null ? min(m.speedToLeadAvg) : '-'}
                          </td>
                          <td className="px-2 py-2 text-accent-purple">{m.meetingsBooked ?? 0}</td>
                          <td className="px-2 py-2 text-accent-cyan">{m.meetingsAttended ?? 0}</td>
                          <td className="px-2 py-2 text-accent-green">
                            {m.revenue != null ? fm(m.revenue) : '-'}
                          </td>
                          <td className="px-2 py-2 text-accent-green">
                            {m.cashCollected != null ? fm(m.cashCollected) : '-'}
                          </td>
                          <td className="px-2 py-2">{m.contactRate != null ? pct(m.contactRate) : '-'}</td>
                          <td className="px-2 py-2">{m.bookingRate != null ? pct(m.bookingRate) : '-'}</td>
                        </tr>
                        {expanded && (
                          <tr className="bg-surface-800/80">
                            <td colSpan={11} className="p-0">
                              <div className="px-3 py-2 border-t border-surface-500 space-y-2">
                                <div className="text-[10px] text-gray-400 font-medium">
                                  Resumen de leads de {a.name} ({leadsDelAsesor.length})
                                </div>
                                <div className="overflow-x-auto max-h-[280px] overflow-y-auto rounded-md border border-surface-500">
                                  <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-surface-700">
                                      <tr className="text-left text-gray-400">
                                        <th className="px-2 py-1.5 font-medium">Lead</th>
                                        <th className="px-2 py-1.5 font-medium">Fecha creación</th>
                                        <th className="px-2 py-1.5 font-medium">Última actividad con el lead</th>
                                        <th className="px-2 py-1.5 font-medium">Llamadas</th>
                                        <th className="px-2 py-1.5 font-medium">Agendó</th>
                                        <th className="px-2 py-1.5 font-medium">Tuvo reunión</th>
                                        <th className="px-2 py-1.5 font-medium w-28">Ver resumen</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {leadsDelAsesor.map((l) => {
                                        const callsLead = getCallsByLeadInRange(l.id, dateFrom, dateTo).filter((c) => c.advisorId === a.id);
                                        const meetingsLead = getMeetingsByLeadInRange(l.id, dateFrom, dateTo).filter((m) => m.advisorId === a.id);
                                        const lastCall = callsLead[0]?.datetime;
                                        const lastMeeting = meetingsLead[0]?.datetime;
                                        const lastActivity = [lastCall, lastMeeting].filter(Boolean).sort((x, y) => new Date(y!).getTime() - new Date(x!).getTime())[0];
                                        const agendoReunion = meetingsLead.length > 0;
                                        const tuvoReunion = meetingsLead.some((m) => m.attended);
                                        return (
                                          <Fragment key={l.id}>
                                            <tr className="border-t border-surface-500 hover:bg-surface-700/50">
                                              <td className="px-2 py-1.5 text-white">{l.name}</td>
                                              <td className="px-2 py-1.5 text-gray-400">
                                                {l.createdAt ? format(new Date(l.createdAt), 'dd/MM/yy HH:mm') : '-'}
                                              </td>
                                              <td className="px-2 py-1.5 text-gray-400">
                                                {lastActivity ? format(new Date(lastActivity), 'dd/MM/yy HH:mm') : '-'}
                                              </td>
                                              <td className="px-2 py-1.5 text-accent-cyan">{callsLead.length}</td>
                                              <td className="px-2 py-1.5">{agendoReunion ? 'Sí' : 'No'}</td>
                                              <td className="px-2 py-1.5">{tuvoReunion ? 'Sí' : 'No'}</td>
                                              <td className="px-2 py-1.5">
                                                <button
                                                  type="button"
                                                  className="text-accent-cyan text-xs font-medium hover:underline inline-flex items-center gap-1"
                                                  onClick={(e) => { e.stopPropagation(); setExpandedLeadResumen({ leadId: l.id, leadName: l.name, advisorId: a.id }); }}
                                                >
                                                  Ver resumen del lead
                                                </button>
                                              </td>
                                            </tr>
                                          </Fragment>
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
          </div>
        </section>

      </div>

      {/* Modal Ver objeciones */}
      {modalObjeciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setModalObjeciones(false); setSelectedObjeccion(null); }} aria-hidden />
          <div className="relative w-full max-w-lg max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-500 shrink-0" />
                {selectedObjeccion ? `Objeciones de ${selectedObjeccion}` : 'Objeciones más comunes'}
              </h3>
              <div className="flex items-center gap-1">
                {selectedObjeccion && (
                  <button
                    type="button"
                    onClick={() => setSelectedObjeccion(null)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500"
                  >
                    Volver
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setModalObjeciones(false); setSelectedObjeccion(null); }}
                  className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-4">
              {selectedObjeccion ? (
                (() => {
                  if (objectionDetailList.length === 0) {
                    return <p className="text-sm text-gray-400">No hay videollamadas con esta objeción en el rango de fechas.</p>;
                  }
                  const byQuote: Record<string, { count: number; vendedores: Set<string>; leads: Set<string> }> = {};
                  objectionDetailList.forEach((row) => {
                    const q = row.quote || '—';
                    if (!byQuote[q]) byQuote[q] = { count: 0, vendedores: new Set(), leads: new Set() };
                    byQuote[q].count += 1;
                    byQuote[q].vendedores.add(row.advisorName);
                    byQuote[q].leads.add(row.leadName);
                  });
                  const blocks = Object.entries(byQuote);
                  return (
                    <div className="space-y-5">
                      {blocks.map(([quote, { count, vendedores, leads }], idx) => (
                        <div key={idx} className="rounded-lg bg-surface-700/80 p-4 space-y-3">
                          <p className="text-white font-medium">&quot;{quote}&quot;</p>
                          <p className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-accent-red/20 text-accent-red text-sm font-medium">
                              {count}x detectada
                            </span>
                          </p>
                          <p className="flex flex-wrap items-center gap-1.5 text-sm">
                            <UserCircle className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-gray-400">Vendedores:</span>
                            {[...vendedores].map((v) => (
                              <span key={v} className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs">
                                {v}
                              </span>
                            ))}
                          </p>
                          <hr className="border-surface-500" />
                          <p className="text-xs text-gray-400 mb-1.5">Clientes donde apareció:</p>
                          <p className="flex flex-wrap gap-1.5">
                            {[...leads].map((l) => (
                              <span key={l} className="px-2.5 py-1 rounded-full bg-surface-600 text-gray-300 text-xs">
                                {l}
                              </span>
                            ))}
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-3">Haz clic en una categoría para ver la frase exacta, vendedores y clientes (solo videollamadas).</p>
                  <ul className="space-y-2">
                    {objectionsByCountFromVideollamadas.map((o, i) => (
                      <li key={o.name}>
                        <button
                          type="button"
                          onClick={() => setSelectedObjeccion(o.name)}
                          className="w-full flex items-center justify-between rounded-lg bg-surface-700 px-3 py-2 text-left hover:bg-surface-600 transition-colors"
                        >
                          <span className="flex items-center gap-2 font-medium text-white capitalize">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length] }}
                            />
                            {o.name}
                          </span>
                          <span className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{o.tipos} {o.tipos === 1 ? 'tipo' : 'tipos'}</span>
                            <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">{o.count}x</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {expandedLeadResumen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setExpandedLeadResumen(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <ResumenLeadTimeline
              leadId={expandedLeadResumen.leadId}
              leadName={expandedLeadResumen.leadName}
              advisorId={expandedLeadResumen.advisorId}
              dateFrom={dateFrom}
              dateTo={dateTo}
              expandedResumen={expandedResumen}
              setExpandedResumen={setExpandedResumen}
              onClose={() => setExpandedLeadResumen(null)}
            />
          </div>
        </div>
      )}

      {lead360 && <Lead360Drawer lead={lead360} onClose={() => setLead360(null)} />}
    </>
  );
}
