import { useState, useMemo, Fragment } from 'react';
import KpiTooltip from '@/components/KpiTooltip';
import { advisors, getLeadById, getMeetingsInRange, getMeetingsByLeadInRange } from '@/data/mockData';
import { format, subDays } from 'date-fns';
import { FileText, Sparkles, ChevronRight, ChevronDown, User } from 'lucide-react';
import type { VideoMeeting } from '@/types';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;

const kpiTooltips = {
  agendadas: {
    significado: 'Total de reuniones por videollamada programadas en el período.',
    calculo: 'Cantidad de eventos de tipo videollamada con fecha en el rango seleccionado.',
  },
  asistidas: {
    significado: 'Reuniones a las que el lead asistió (tasa de asistencia).',
    calculo: 'Videollamadas donde attended = true.',
  },
  canceladas: {
    significado: 'Reuniones que fueron canceladas antes de realizarse.',
    calculo: 'Videollamadas donde canceled = true.',
  },
  efectivas: {
    significado: 'Reuniones realizadas y calificadas como efectivas (lead calificado).',
    calculo: 'Videollamadas con attended = true y qualified = true.',
  },
  revenue: {
    significado: 'Ingresos generados por ventas en videollamadas.',
    calculo: 'Suma de amountBought (monto comprado) en reuniones del período.',
  },
  cashCollected: {
    significado: 'Efectivo cobrado en el período por cierres de videollamada.',
    calculo: 'Suma de cashCollected por reunión.',
  },
  ticket: {
    significado: 'Valor promedio por venta o por reunión efectiva.',
    calculo: 'Ingresos totales / número de reuniones asistidas.',
  },
  roas: {
    significado: 'Retorno de la inversión en publicidad.',
    calculo: 'Ingresos atribuidos / gasto en publicidad (estimado en V1).',
  },
};

type ExpandedMeeting = { meetingId: string; type: 'transcript' | 'ia' };

export default function PerformanceVideollamadas() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedLeadId, setExpandedLeadId] = useState('');
  const [expandedMeeting, setExpandedMeeting] = useState<ExpandedMeeting | null>(null);
  const [expandedAsesorVideollamadas, setExpandedAsesorVideollamadas] = useState<string | null>(null);

  const meetingsInRange = useMemo(
    () => getMeetingsInRange(dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const agg = useMemo(() => {
    const agendadas = meetingsInRange.length;
    const asistidas = meetingsInRange.filter((m) => m.attended).length;
    const canceladas = meetingsInRange.filter((m) => m.canceled).length;
    const efectivas = meetingsInRange.filter((m) => m.attended && m.qualified).length;
    const revenue = meetingsInRange.reduce((s, m) => s + (m.amountBought ?? 0), 0);
    const cashCollected = meetingsInRange.reduce((s, m) => s + (m.cashCollected ?? 0), 0);
    const ticket = asistidas ? Math.round(revenue / asistidas) : 0;
    return {
      agendadas,
      asistidas,
      canceladas,
      efectivas,
      revenue,
      cashCollected,
      ticket,
      roas: 2.4,
    };
  }, [meetingsInRange]);

  const byLead = useMemo(() => {
    const map = new Map<string, { leadId: string; count: number }>();
    meetingsInRange.forEach((m) => {
      const prev = map.get(m.leadId);
      map.set(m.leadId, { leadId: m.leadId, count: (prev?.count ?? 0) + 1 });
    });
    return Array.from(map.entries())
      .map(([leadId, { count }]) => ({ leadId, count }))
      .sort((a, b) => b.count - a.count);
  }, [meetingsInRange]);

  const meetingsByAdvisor = useMemo(() => {
    const map: Record<string, VideoMeeting[]> = {};
    meetingsInRange.forEach((m) => {
      if (!map[m.advisorId]) map[m.advisorId] = [];
      map[m.advisorId].push(m);
    });
    return map;
  }, [meetingsInRange]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className="text-sm text-gray-400">Rango de fechas (actividad):</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-purple overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Agendadas
            <KpiTooltip significado={kpiTooltips.agendadas.significado} calculo={kpiTooltips.agendadas.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-purple">{agg.agendadas}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Asistidas
            <KpiTooltip significado={kpiTooltips.asistidas.significado} calculo={kpiTooltips.asistidas.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-cyan">{agg.asistidas}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-red overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Canceladas
            <KpiTooltip significado={kpiTooltips.canceladas.significado} calculo={kpiTooltips.canceladas.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-red">{agg.canceladas}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Efectivas
            <KpiTooltip significado={kpiTooltips.efectivas.significado} calculo={kpiTooltips.efectivas.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green">{agg.efectivas}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Ingresos
            <KpiTooltip significado={kpiTooltips.revenue.significado} calculo={kpiTooltips.revenue.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green break-words">{fm(agg.revenue)}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Efectivo cobrado
            <KpiTooltip significado={kpiTooltips.cashCollected.significado} calculo={kpiTooltips.cashCollected.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green break-words">{fm(agg.cashCollected)}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-blue overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Ticket promedio
            <KpiTooltip significado={kpiTooltips.ticket.significado} calculo={kpiTooltips.ticket.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-blue break-words">{fm(agg.ticket)}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            ROAS (retorno publicidad)
            <KpiTooltip significado={kpiTooltips.roas.significado} calculo={kpiTooltips.roas.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green">{agg.roas}x</p>
          <div className="mb-3" />
        </div>
      </div>

      {/* Por lead: click en número despliega reuniones con fecha + resumen IA / transcripción aquí mismo */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Videollamadas por lead
        </h3>
        <div className="rounded-xl border border-surface-500 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-4 py-3 font-medium w-8" />
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium"># Videollamadas</th>
              </tr>
            </thead>
            <tbody>
              {byLead.slice(0, 20).map(({ leadId, count }) => {
                const lead = getLeadById(leadId);
                const expanded = expandedLeadId === leadId;
                const meetings = getMeetingsByLeadInRange(leadId, dateFrom, dateTo);
                return (
                  <Fragment key={leadId}>
                    <tr
                      className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                      onClick={() => setExpandedLeadId(expanded ? '' : leadId)}
                    >
                      <td className="px-2 py-2 text-gray-400">
                        <span className="inline-block transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                      </td>
                      <td className="px-4 py-2 text-white">{lead?.name ?? leadId}</td>
                      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setExpandedLeadId(expanded ? '' : leadId)}
                          className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-accent-purple/20 text-accent-purple font-medium hover:bg-accent-purple/30 px-2 py-1"
                        >
                          {count}
                        </button>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-surface-800/90">
                        <td colSpan={3} className="p-0">
                          <div className="px-4 py-3 border-t border-surface-500">
                            <div className="text-xs text-gray-400 mb-2">Reuniones de {lead?.name ?? leadId} — fecha, asistió, compró y resumen</div>
                            <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[320px] overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-surface-700">
                                  <tr className="text-left text-gray-400">
                                    <th className="px-3 py-2 font-medium">Fecha</th>
                                    <th className="px-3 py-2 font-medium">Asistió</th>
                                    <th className="px-3 py-2 font-medium">Compró</th>
                                    <th className="px-3 py-2 font-medium">Qué pasó</th>
                                    <th className="px-3 py-2 font-medium">Resumen IA / Transcripción</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {meetings.map((m) => (
                                    <Fragment key={m.id}>
                                      <tr className="border-t border-surface-500 hover:bg-surface-600/50">
                                        <td className="px-3 py-2 text-gray-300">{format(new Date(m.datetime), 'dd/MM/yy HH:mm')}</td>
                                        <td className="px-3 py-2">{m.attended ? <span className="text-accent-green">Sí</span> : <span className="text-accent-red">No</span>}</td>
                                        <td className="px-3 py-2">{(m.amountBought ?? 0) > 0 ? <span className="text-accent-green">Sí</span> : <span className="text-gray-400">No</span>}</td>
                                        <td className="px-3 py-2 text-gray-300">{outcomeVideollamadaToSpanish(m.outcome)}</td>
                                        <td className="px-3 py-2">
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedMeeting(expandedMeeting?.meetingId === m.id && expandedMeeting?.type === 'transcript' ? null : { meetingId: m.id, type: 'transcript' }); }} className="text-accent-cyan text-xs mr-2 inline-flex items-center gap-1">
                                            <FileText className="w-3.5 h-3.5" /> Ver transcripción
                                          </button>
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedMeeting(expandedMeeting?.meetingId === m.id && expandedMeeting?.type === 'ia' ? null : { meetingId: m.id, type: 'ia' }); }} className="text-accent-purple text-xs inline-flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Ver resumen IA
                                          </button>
                                        </td>
                                      </tr>
                                      {expandedMeeting?.meetingId === m.id && (
                                        <tr className="bg-surface-700/80">
                                          <td colSpan={5} className="px-3 py-2 text-gray-300 text-xs whitespace-pre-wrap border-l-4 border-accent-purple">
                                            {expandedMeeting.type === 'transcript'
                                              ? `[Transcripción] ${format(new Date(m.datetime), 'dd/MM/yyyy HH:mm')}\n\n${m.notes ? `Notas: ${m.notes}` : 'Transcripción de la videollamada. Se presentó la oferta y se resolvieron dudas. El lead ' + (m.attended ? 'asistió' : 'no asistió') + '.'}`
                                              : `[Resumen IA] ${format(new Date(m.datetime), 'dd/MM/yyyy HH:mm')}\n\n${m.notes ? `Resumen: ${m.notes}` : 'Reunión ' + (m.attended ? 'asistida' : 'no asistida') + '. Resultado: ' + outcomeVideollamadaToSpanish(m.outcome) + (m.amountBought ? `. Monto: $${m.amountBought.toLocaleString('es-CO')}` : '.')}`}
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  ))}
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
      </section>

      {/* Por asesor (contacto dueño): no se muestra nada por defecto; desplegar asesor para ver videollamadas + transcripción / IA */}
      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Videollamadas por asesor (contacto dueño)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          En esta sección no se muestra ninguna videollamada por defecto. Despliega el <strong>contacto dueño (asesor)</strong> para ver sus videollamadas en el rango; ahí aparecen Ver transcripción y Ver análisis IA.
        </p>
        <div className="rounded-xl border border-surface-500 overflow-hidden">
          {Object.keys(meetingsByAdvisor).length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">No hay videollamadas en el rango de fechas.</div>
          ) : (
            <ul className="divide-y divide-surface-500">
              {Object.entries(meetingsByAdvisor)
                .map(([aid, advisorMeetings]) => ({
                  advisorId: aid,
                  advisor: advisors.find((a) => a.id === aid),
                  meetings: [...advisorMeetings].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
                }))
                .filter((x) => x.advisor)
                .sort((a, b) => (a.advisor!.name ?? '').localeCompare(b.advisor!.name ?? ''))
                .map(({ advisorId, advisor, meetings: advisorMeetings }) => {
                  const isExpanded = expandedAsesorVideollamadas === advisorId;
                  return (
                    <li key={advisorId} className="bg-surface-800">
                      <button
                        type="button"
                        onClick={() => setExpandedAsesorVideollamadas(isExpanded ? null : advisorId)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-700/50"
                      >
                        <span className="flex items-center gap-2 text-white font-medium">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-accent-purple shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          <User className="w-4 h-4 text-accent-purple" />
                          {advisor!.name}
                        </span>
                        <span className="text-xs text-gray-500">{advisorMeetings.length} videollamada(s)</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-surface-500 overflow-x-auto max-h-[420px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface-700">
                              <tr className="text-left text-gray-400">
                                <th className="px-3 py-2 font-medium">Fecha</th>
                                <th className="px-3 py-2 font-medium">Lead</th>
                                <th className="px-3 py-2 font-medium">Asistió</th>
                                <th className="px-3 py-2 font-medium">Compró</th>
                                <th className="px-3 py-2 font-medium">Resultado</th>
                                <th className="px-3 py-2 font-medium">Ingresos</th>
                                <th className="px-3 py-2 font-medium">Transcripción / Análisis IA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {advisorMeetings.map((m) => (
                                <Fragment key={m.id}>
                                  <tr className="border-t border-surface-500 hover:bg-surface-600/50">
                                    <td className="px-3 py-2 text-gray-300">{format(new Date(m.datetime), 'dd/MM/yy HH:mm')}</td>
                                    <td className="px-3 py-2 text-white">{getLeadById(m.leadId)?.name ?? m.leadId}</td>
                                    <td className="px-3 py-2">{m.attended ? <span className="text-accent-green">Sí</span> : <span className="text-accent-red">No</span>}</td>
                                    <td className="px-3 py-2">{(m.amountBought ?? 0) > 0 ? <span className="text-accent-green">Sí</span> : <span className="text-gray-400">No</span>}</td>
                                    <td className="px-3 py-2 text-gray-400">{outcomeVideollamadaToSpanish(m.outcome)}</td>
                                    <td className="px-3 py-2 text-accent-green">{m.amountBought != null ? fm(m.amountBought) : '-'}</td>
                                    <td className="px-3 py-2">
                                      <button type="button" onClick={() => setExpandedMeeting(expandedMeeting?.meetingId === m.id && expandedMeeting?.type === 'transcript' ? null : { meetingId: m.id, type: 'transcript' })} className="text-accent-cyan text-xs mr-2 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Ver transcripción</button>
                                      <button type="button" onClick={() => setExpandedMeeting(expandedMeeting?.meetingId === m.id && expandedMeeting?.type === 'ia' ? null : { meetingId: m.id, type: 'ia' })} className="text-accent-purple text-xs inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Ver análisis IA</button>
                                    </td>
                                  </tr>
                                  {expandedMeeting?.meetingId === m.id && (
                                    <tr className="bg-surface-700/80">
                                      <td colSpan={7} className="px-3 py-2 text-gray-300 text-xs whitespace-pre-wrap border-l-4 border-accent-purple">
                                        {expandedMeeting.type === 'transcript'
                                          ? `[Transcripción] ${format(new Date(m.datetime), 'dd/MM/yyyy HH:mm')}\n\n${m.notes ? `Notas: ${m.notes}` : 'Transcripción de la videollamada. Se presentó la oferta y se resolvieron dudas. El lead ' + (m.attended ? 'asistió' : 'no asistió') + '.'}`
                                          : `[Análisis IA] ${format(new Date(m.datetime), 'dd/MM/yyyy HH:mm')}\n\n${m.notes ? `Resumen: ${m.notes}` : 'Reunión ' + (m.attended ? 'asistida' : 'no asistida') + '. Resultado: ' + outcomeVideollamadaToSpanish(m.outcome) + (m.amountBought ? `. Monto: $${m.amountBought.toLocaleString('es-CO')}` : '.')}`}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
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
  );
}
