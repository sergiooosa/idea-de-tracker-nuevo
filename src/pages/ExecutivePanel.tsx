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
  objectionsByCount,
  callsVolumeByDay,
  getCallsByLeadInRange,
  getCallsInRange,
  getMeetingsInRange,
} from '@/data/mockData';
import type { Lead } from '@/types';
import type { CallPhone, VideoMeeting } from '@/types';
import { ChevronDown, ChevronRight, Target, X, FileText, Sparkles, User } from 'lucide-react';
import { outcomeLlamadaToSpanish, outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';
import { subDays } from 'date-fns';
import ModalRegistrosLlamadas from '@/components/ModalRegistrosLlamadas';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import clsx from 'clsx';
import KpiTooltip from '@/components/KpiTooltip';
import DateRangeQuick from '@/components/DateRangeQuick';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);


const defaultDateTo = new Date();
const defaultDateFrom = subDays(defaultDateTo, 7);

export default function ExecutivePanel() {
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>('');
  const [lead360, setLead360] = useState<Lead | null>(null);
  const [filterClosers, setFilterClosers] = useState<string>('all');
  const [modalObjeciones, setModalObjeciones] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(defaultDateFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultDateTo, 'yyyy-MM-dd'));
  const [registrosLlamadas, setRegistrosLlamadas] = useState<{ lead: Lead; registros: import('@/types').CallPhone[] } | null>(null);
  const [expandedResumen, setExpandedResumen] = useState<{ id: string; type: 'call' | 'meeting'; view: 'transcript' | 'ia' } | null>(null);

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
      effectiveAppointments: efectivas || metricsGlobal.effectiveAppointments,
      tasaCierre,
      revenue: revenue || metricsGlobal.revenue,
      cashCollected: cashCollected || metricsGlobal.cashCollected,
      avgTicket: avgTicket || metricsGlobal.avgTicket,
      speedToLeadAvg: speedAvg,
      avgAttempts,
      attemptsToFirstContactAvg: attemptsToFirst,
      ROAS: metricsGlobal.ROAS,
    };
  }, [dateFrom, dateTo]);

  // Lista unificada de interacciones (llamadas + videollamadas) en el rango, ordenada por fecha (más reciente primero)
  const interaccionesResumen = useMemo(() => {
    const calls = getCallsInRange(dateFrom, dateTo).map((c) => ({ ...c, _type: 'call' as const }));
    const meetings = getMeetingsInRange(dateFrom, dateTo).map((m) => ({ ...m, _type: 'meeting' as const }));
    const combined = [...calls, ...meetings].sort(
      (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    );
    return combined;
  }, [dateFrom, dateTo]);

  // Agrupar interacciones por asesor (contacto dueño); solo asesores con al menos una interacción en el rango
  const interaccionesPorAsesor = useMemo(() => {
    const map: Record<string, typeof interaccionesResumen> = {};
    interaccionesResumen.forEach((item) => {
      const aid = item.advisorId;
      if (!map[aid]) map[aid] = [];
      map[aid].push(item);
    });
    return map;
  }, [interaccionesResumen]);

  const [expandedAsesorResumen, setExpandedAsesorResumen] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Panel ejecutivo"
        subtitle="Vista ejecutiva · Todo en 1"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Filtro por rango de fechas */}
        <section className="flex flex-wrap items-center gap-3">
          <DateRangeQuick
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          />
        </section>

        {/* A) Top KPIs globales */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Top KPIs globales
          </h2>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
            {/* Leads */}
            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-blue overflow-hidden">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Leads
                <KpiTooltip
                  significado="Cantidad total de contactos o prospectos que han llegado al embudo en el período."
                  calculo="Suma de todos los leads creados/asignados en el rango de fechas seleccionado."
                />
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-0.5 text-accent-blue break-words">{kpisFromRange.totalLeads}</p>
              <div className="mb-3" />
            </div>

            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Leads calificados
                <KpiTooltip
                  significado="Leads que contestaron al menos una llamada telefónica en el período (calificados por contacto)."
                  calculo="Cantidad de leads únicos con al menos una llamada con resultado Contestó o Completada."
                />
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green break-words">{kpisFromRange.leadsCalificados}</p>
              <div className="mb-3" />
            </div>

            {/* Llamadas (bloque con sub-métricas; las notas se ven en la tarjeta de cada contacto / Lead 360) */}
            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden flex flex-col">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Llamadas
                <KpiTooltip
                  significado="Actividad de llamadas telefónicas: total realizadas, cuántas contestaron y tasa de contestación."
                  calculo="Total = suma de llamadas. Contestadas = llamadas con outcome contestado. Tasa = contestadas / total × 100. Promedio por lead = total llamadas / total leads."
                />
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-cyan break-words">{kpisFromRange.callsMade}</p>
              <p className="text-sm text-gray-400 mt-0.5">Contestadas: <span className="text-white font-medium">{kpisFromRange.contestadas}</span></p>
              <p className="text-sm text-gray-400">Tasa contestación: <span className="text-accent-cyan font-medium">{pct(kpisFromRange.answerRate)}</span></p>
              <p className="text-sm text-gray-400">Llamadas promedio/lead: <span className="text-white font-medium">{kpisFromRange.llamadasPromedioPorLead}</span></p>
              <div className="mb-3" />
            </div>

            {/* Videollamadas (bloque con sub-métricas + tasa de cierre) */}
            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-purple overflow-hidden flex flex-col">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Videollamadas agendadas
                <KpiTooltip
                  significado="Reuniones por videollamada: cuántas se agendaron, tasa de agendamiento, cuántas asisten, cancelan, efectivas y tasa de cierre."
                  calculo="Agendadas = citas en el período. Tasa agendamiento = agendadas / llamadas contestadas × 100. Tasa de cierre = reuniones cerradas / reuniones asistidas × 100."
                />
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-purple break-words">{kpisFromRange.meetingsBooked}</p>
              <p className="text-sm text-gray-400 mt-0.5">Tasa agendamiento (contestadas→agenda): <span className="text-accent-purple font-medium">{kpisFromRange.tasaAgendamientoContestadas}%</span></p>
              <p className="text-sm text-gray-400">Asisten: <span className="text-white font-medium">{kpisFromRange.meetingsAttended}</span> ({pct(kpisFromRange.attendanceRate)})</p>
              <p className="text-sm text-gray-400">Cancelan: <span className="text-accent-red font-medium">{kpisFromRange.meetingsCanceled}</span></p>
              <p className="text-sm text-gray-400">Efectivas: <span className="text-accent-green font-medium">{kpisFromRange.effectiveAppointments}</span></p>
              <p className="text-sm text-gray-400">Tasa de cierre: <span className="text-accent-green font-medium">{kpisFromRange.tasaCierre.toFixed(1)}%</span></p>
              <div className="mb-3" />
            </div>

            <KPICard
              label="Ingresos"
              value={fm(kpisFromRange.revenue)}
              color="green"
              tooltip={{
                significado: 'Dinero total facturado o comprometido por ventas en el período.',
                calculo: 'Suma del monto comprado/contratado en reuniones cerradas (amountBought o revenue).',
              }}
            />
            <KPICard
              label="Efectivo cobrado"
              value={fm(kpisFromRange.cashCollected)}
              color="green"
              tooltip={{
                significado: 'Dinero efectivamente cobrado (cash collected) en el período.',
                calculo: 'Suma de los pagos recibidos asociados a cierres o ventas.',
              }}
            />
            <KPICard
              label="Ticket promedio"
              value={fm(kpisFromRange.avgTicket)}
              color="blue"
              tooltip={{
                significado: 'Valor promedio por venta o por reunión efectiva.',
                calculo: 'Ingresos totales / número de ventas o reuniones efectivas.',
              }}
            />
            <KPICard
              label="ROAS (retorno publicidad)"
              value={kpisFromRange.ROAS ? `${kpisFromRange.ROAS}x` : '—'}
              color="green"
              tooltip={{
                significado: 'Retorno de la inversión en publicidad. Cuántas veces se recupera lo invertido.',
                calculo: 'Ingresos atribuidos a canal / gasto en publicidad (en V1 puede ser estimado).',
              }}
            />
            <KPICard
              label="Tiempo al lead"
              value={min(kpisFromRange.speedToLeadAvg)}
              color="purple"
              tooltip={{
                significado: 'Tiempo promedio desde que llega el lead hasta el primer contacto (llamada o chat).',
                calculo: 'Promedio de (datetime del primer contacto − createdAt del lead) por lead.',
              }}
            />
            {/* Intentos a contacto */}
            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-amber overflow-hidden">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Intentos a contacto
                <KpiTooltip
                  significado="Número promedio de intentos de llamada hasta lograr el primer contacto con el lead."
                  calculo="Promedio de intentos por lead hasta que el lead contesta por primera vez (firstContactAt)."
                />
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-0.5 text-accent-amber">
                {kpisFromRange.attemptsToFirstContactAvg?.toFixed(1) ?? '-'}
              </p>
              <div className="mb-3" />
            </div>
            {/* Intentos promedio (total por lead) */}
            <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-amber overflow-hidden">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
                Intentos promedio
                <KpiTooltip
                  significado="Número promedio de llamadas realizadas por lead (en total), sin importar si contestó o no."
                  calculo="Suma de intentos de llamada por lead / cantidad de leads con al menos una llamada."
                />
              </p>
              <p className="text-2xl md:text-3xl font-bold mt-0.5 text-accent-amber">{kpisFromRange.avgAttempts.toFixed(1)}</p>
              <div className="mb-3" />
            </div>
          </div>
        </section>

        {/* Objeciones más comunes + Volumen llamadas */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-xl border border-surface-500 bg-surface-800 p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-red" />
                Objeciones más comunes
              </h2>
              <button
                type="button"
                onClick={() => setModalObjeciones(true)}
                className="text-xs font-medium text-accent-cyan hover:underline"
              >
                Ver objeciones
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Objeciones detectadas por la IA en las llamadas del período
            </p>
            <ul className="space-y-2">
              {objectionsByCount.map((o) => (
                <li
                  key={o.name}
                  className="flex items-center justify-between rounded-lg bg-surface-700 px-3 py-2"
                >
                  <span className="font-medium text-white capitalize">{o.name}</span>
                  <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">
                    {o.count}x
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-xl border border-surface-500 bg-surface-800 p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Volumen: llamadas telefónicas, citas/presentaciones y cierres
            </h2>
            <div className="h-48">
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

        {/* B) Ranking por asesor — Ver despliega leads aquí mismo */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Ranking por asesor
            </h2>
            <select
              value={filterClosers}
              onChange={(e) => setFilterClosers(e.target.value)}
              className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-sm text-white"
            >
              <option value="all">Todos</option>
              <option value="closers">Solo cerradores</option>
            </select>
          </div>
          <div className="rounded-xl border border-surface-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-4 py-3 font-medium w-10" />
                    <th className="px-4 py-3 font-medium">Asesor</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Leads <KpiTooltip significado="Cantidad de leads únicos con actividad en el período." calculo="Leads distintos con al menos una llamada o reunión en el rango." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Llamadas <KpiTooltip significado="Total de llamadas telefónicas realizadas." calculo="Suma de todas las llamadas en el rango de fechas." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Tiempo al lead <KpiTooltip significado="Tiempo promedio desde que llega el lead hasta el primer contacto." calculo="Promedio de (fecha primer contacto − fecha creación del lead)." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Agendadas <KpiTooltip significado="Reuniones o citas agendadas en el período." calculo="Cantidad de videollamadas/reuniones programadas." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Asistidas <KpiTooltip significado="Reuniones a las que el lead asistió." calculo="Reuniones con attended = sí." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Facturación <KpiTooltip significado="Ingresos por ventas cerradas." calculo="Suma del monto vendido (amountBought) en reuniones cerradas." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Efectivo cobrado <KpiTooltip significado="Dinero efectivamente cobrado." calculo="Suma de cashCollected de las ventas." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Tasa contacto <KpiTooltip significado="Porcentaje de llamadas que contestaron." calculo="(Llamadas contestadas / Total llamadas) × 100." /></span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <span className="inline-flex items-center">Tasa agendamiento <KpiTooltip significado="Porcentaje de contestados que agendaron reunión." calculo="(Reuniones agendadas / Llamadas contestadas) × 100." /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {advisorList.filter((a) => metricsByAdvisor[a.id]).slice(0, 8).map((a) => {
                    const m = metricsByAdvisor[a.id]!;
                    const expanded = expandedAdvisorId === a.id;
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
                          className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                          onClick={() => {
                            setExpandedAdvisorId(expanded ? '' : a.id);
                            setSelectedAdvisorId(expanded ? '' : a.id);
                          }}
                        >
                          <td className="px-2 py-3">
                            <ChevronDown
                              className={clsx(
                                'w-5 h-5 text-gray-400 transition-transform',
                                expanded && 'rotate-180'
                              )}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block w-2 h-2 rounded-full bg-accent-green mr-2" />
                            {a.name}
                          </td>
                          <td className="px-4 py-3 text-white">{m.totalLeads ?? 0}</td>
                          <td className="px-4 py-3 text-accent-cyan">{m.callsMade ?? 0}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {m.speedToLeadAvg != null ? min(m.speedToLeadAvg) : '-'}
                          </td>
                          <td className="px-4 py-3 text-accent-purple">{m.meetingsBooked ?? 0}</td>
                          <td className="px-4 py-3 text-accent-cyan">{m.meetingsAttended ?? 0}</td>
                          <td className="px-4 py-3 text-accent-green">
                            {m.revenue != null ? fm(m.revenue) : '-'}
                          </td>
                          <td className="px-4 py-3 text-accent-green">
                            {m.cashCollected != null ? fm(m.cashCollected) : '-'}
                          </td>
                          <td className="px-4 py-3">{m.contactRate != null ? pct(m.contactRate) : '-'}</td>
                          <td className="px-4 py-3">{m.bookingRate != null ? pct(m.bookingRate) : '-'}</td>
                        </tr>
                        {expanded && (
                          <tr className="bg-surface-800/80">
                            <td colSpan={11} className="p-0">
                              <div className="px-4 py-3 border-t border-surface-500">
                                <div className="text-xs text-gray-400 mb-2 font-medium">
                                  Leads de {a.name} ({leadsDelAsesor.length})
                                </div>
                                <div className="overflow-x-auto max-h-[320px] overflow-y-auto rounded-lg border border-surface-500">
                                  <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-surface-700">
                                      <tr className="text-left text-gray-400">
                                        <th className="px-3 py-2 font-medium">Lead</th>
                                        <th className="px-3 py-2 font-medium">Estado</th>
                                        <th className="px-3 py-2 font-medium">Creado</th>
                                        <th className="px-3 py-2 font-medium">Última actividad</th>
                                        <th className="px-3 py-2 font-medium"># Llamadas</th>
                                        <th className="px-3 py-2 font-medium w-20" />
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {leadsDelAsesor.map((l) => {
                                        const registrosLlamadasLead = getCallsByLeadInRange(l.id, dateFrom, dateTo);
                                        return (
                                          <tr
                                            key={l.id}
                                            className="border-t border-surface-500 hover:bg-surface-600/50 cursor-pointer"
                                            onClick={() => setLead360(l)}
                                          >
                                            <td className="px-3 py-2 text-white">{l.name}</td>
                                            <td className="px-3 py-2 text-gray-300 capitalize">{l.status.replace('_', ' ')}</td>
                                            <td className="px-3 py-2 text-gray-400">
                                              {l.createdAt ? format(new Date(l.createdAt), 'dd/MM/yy HH:mm') : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-gray-400">
                                              {l.lastContactAt ? format(new Date(l.lastContactAt), 'dd/MM/yy HH:mm') : '-'}
                                            </td>
                                            <td className="px-3 py-2">
                                              <button
                                                type="button"
                                                className="text-accent-cyan font-medium hover:underline"
                                                onClick={(e) => { e.stopPropagation(); setRegistrosLlamadas({ lead: l, registros: registrosLlamadasLead }); }}
                                              >
                                                {registrosLlamadasLead.length}
                                              </button>
                                            </td>
                                            <td className="px-3 py-2">
                                              <button
                                                type="button"
                                                className="text-accent-cyan text-xs"
                                                onClick={(e) => { e.stopPropagation(); setLead360(l); }}
                                              >
                                                Ver 360
                                              </button>
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
          </div>
        </section>

        {/* Resúmenes de interacciones: no se muestra nada por defecto; desplegar por contacto dueño (asesor) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            Resúmenes de interacciones (llamadas y videollamadas)
            <KpiTooltip
              significado="Interacciones agrupadas por asesor (contacto dueño). Despliega un asesor para ver sus leads y las llamadas/videollamadas, con transcripción y análisis IA."
              calculo="getCallsInRange + getMeetingsInRange por advisorId."
            />
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            En esta sección no se muestra ninguna interacción por defecto. Despliega el <strong>contacto dueño (asesor)</strong> para ver todos sus leads y las interacciones en el rango; ahí aparecen Ver transcripción y Ver análisis IA.
          </p>
          <div className="rounded-xl border border-surface-500 overflow-hidden">
            {Object.keys(interaccionesPorAsesor).length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No hay interacciones en el rango de fechas seleccionado.
              </div>
            ) : (
              <ul className="divide-y divide-surface-500">
                {Object.entries(interaccionesPorAsesor)
                  .map(([advisorId, items]) => ({
                    advisorId,
                    advisor: getAdvisorById(advisorId),
                    items,
                  }))
                  .sort((a, b) => (a.advisor?.name ?? '').localeCompare(b.advisor?.name ?? ''))
                  .map(({ advisorId, advisor, items }) => {
                    const isExpanded = expandedAsesorResumen === advisorId;
                    return (
                      <li key={advisorId} className="bg-surface-800">
                        <button
                          type="button"
                          onClick={() => setExpandedAsesorResumen(isExpanded ? null : advisorId)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-700/50"
                        >
                          <span className="flex items-center gap-2 text-white font-medium">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-accent-cyan shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                            )}
                            <User className="w-4 h-4 text-accent-cyan" />
                            {advisor?.name ?? advisorId}
                          </span>
                          <span className="text-xs text-gray-500">
                            {items.length} interacción(es)
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-surface-500 overflow-x-auto max-h-[480px] overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-surface-700">
                                <tr className="text-left text-gray-400">
                                  <th className="px-3 py-2 font-medium">Fecha</th>
                                  <th className="px-3 py-2 font-medium">Tipo</th>
                                  <th className="px-3 py-2 font-medium">Lead</th>
                                  <th className="px-3 py-2 font-medium">Resumen</th>
                                  <th className="px-3 py-2 font-medium w-48">Transcripción / Análisis IA</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item) => {
                                  const isCall = item._type === 'call';
                                  const id = item.id;
                                  const lead = getLeadById(item.leadId);
                                  const showTranscript = expandedResumen?.id === id && expandedResumen?.view === 'transcript';
                                  const showIa = expandedResumen?.id === id && expandedResumen?.view === 'ia';
                                  const resumen =
                                    isCall
                                      ? `${outcomeLlamadaToSpanish((item as CallPhone).outcome)}${(item as CallPhone).duration ? ` · ${(item as CallPhone).duration}s` : ''}`
                                      : `${(item as VideoMeeting).attended ? 'Asistió' : 'No asistió'} · ${outcomeVideollamadaToSpanish((item as VideoMeeting).outcome)}`;
                                  return (
                                    <Fragment key={`${item._type}-${id}`}>
                                      <tr className="border-t border-surface-500 hover:bg-surface-700/50">
                                        <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                          {format(new Date(item.datetime), 'dd/MM/yy HH:mm')}
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className={isCall ? 'text-accent-cyan' : 'text-accent-purple'}>
                                            {isCall ? 'Llamada' : 'Videollamada'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-white">{lead?.name ?? item.leadId}</td>
                                        <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate" title={resumen}>{resumen}</td>
                                        <td className="px-3 py-2">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedResumen(showTranscript ? null : { id, type: item._type, view: 'transcript' })}
                                            className="text-accent-cyan text-xs mr-2 inline-flex items-center gap-1"
                                          >
                                            <FileText className="w-3.5 h-3.5" /> Ver transcripción
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedResumen(showIa ? null : { id, type: item._type, view: 'ia' })}
                                            className="text-accent-purple text-xs inline-flex items-center gap-1"
                                          >
                                            <Sparkles className="w-3.5 h-3.5" /> Ver análisis IA
                                          </button>
                                        </td>
                                      </tr>
                                      {(showTranscript || showIa) && (
                                        <tr className="bg-surface-700/80">
                                          <td colSpan={5} className="px-3 py-2 align-top">
                                            <div className="text-xs text-gray-300 whitespace-pre-wrap border-l-4 border-accent-cyan pl-2">
                                              {showTranscript
                                                ? (isCall
                                                    ? `[Transcripción] ${format(new Date(item.datetime), 'dd/MM/yyyy HH:mm')}\n\n${(item as CallPhone).notes ?? 'Transcripción de la llamada. El lead ' + outcomeLlamadaToSpanish((item as CallPhone).outcome).toLowerCase() + '.'}`
                                                    : `[Transcripción] ${format(new Date(item.datetime), 'dd/MM/yyyy HH:mm')}\n\n${(item as VideoMeeting).notes ?? 'Transcripción de la videollamada. ' + ((item as VideoMeeting).attended ? 'El lead asistió.' : 'El lead no asistió.')}`)
                                                : (isCall
                                                    ? `[Análisis IA] ${format(new Date(item.datetime), 'dd/MM/yyyy HH:mm')}\n\n${(item as CallPhone).summary ?? 'Resumen: Llamada de calificación. Objeciones: ' + ((item as CallPhone).objections?.join(', ') || 'ninguna') + '.'}`
                                                    : `[Análisis IA] ${format(new Date(item.datetime), 'dd/MM/yyyy HH:mm')}\n\nReunión ${(item as VideoMeeting).attended ? 'asistida' : 'no asistida'}. Resultado: ${outcomeVideollamadaToSpanish((item as VideoMeeting).outcome)}.${(item as VideoMeeting).amountBought ? ` Monto: $${(item as VideoMeeting).amountBought!.toLocaleString('es-CO')}` : ''} ${(item as VideoMeeting).notes ? ` Notas: ${(item as VideoMeeting).notes}` : ''}`)}
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
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {registrosLlamadas && (
        <ModalRegistrosLlamadas
          registros={registrosLlamadas.registros}
          leadName={registrosLlamadas.lead.name}
          onClose={() => setRegistrosLlamadas(null)}
        />
      )}

      {/* Modal Ver objeciones */}
      {modalObjeciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModalObjeciones(false)} aria-hidden />
          <div className="relative w-full max-w-md max-h-[80vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-500">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-red" />
                Objeciones más comunes
              </h3>
              <button
                type="button"
                onClick={() => setModalObjeciones(false)}
                className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <p className="text-xs text-gray-500 mb-3">Objeciones detectadas por la IA en las llamadas del período.</p>
              <ul className="space-y-2">
                {objectionsByCount.map((o) => (
                  <li
                    key={o.name}
                    className="flex items-center justify-between rounded-lg bg-surface-700 px-3 py-2"
                  >
                    <span className="font-medium text-white capitalize">{o.name}</span>
                    <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">
                      {o.count}x
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {lead360 && <Lead360Drawer lead={lead360} onClose={() => setLead360(null)} />}
    </>
  );
}
