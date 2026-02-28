import { useState, useMemo, Fragment } from 'react';
import KpiTooltip from '@/components/KpiTooltip';
import DateRangePicker from '@/components/DateRangePicker';
import ModalTranscripcionIA from '@/components/ModalTranscripcionIA';
import { advisors, getLeadById, getMeetingsInRange } from '@/data/mockData';
import { format, subDays } from 'date-fns';
import { FileText, Sparkles, ChevronDown, User, Trash2, Pencil, ExternalLink, X } from 'lucide-react';
import type { VideoMeeting } from '@/types';
import { outcomeVideollamadaToSpanish } from '@/utils/outcomeLabels';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pct = (n: number) => `${n.toFixed(1)}%`;

const kpiTooltips = {
  agendadas: {
    significado: 'Citas o presentaciones programadas. Vienen de los calendarios usados para citas o presentaciones.',
    calculo: 'Eventos de videollamada de los calendarios de citas/presentaciones en el rango.',
  },
  asistidas: {
    significado: 'Reuniones a las que el lead asistió. El dato llega de Fathom.',
    calculo: 'Videollamadas con attended = true; fuente: Fathom.',
  },
  canceladas: {
    significado: 'Reuniones canceladas antes de realizarse. Provienen de las canceladas en GHL.',
    calculo: 'Videollamadas con canceled = true en GHL.',
  },
  efectivas: {
    significado: 'Ventas cerradas. Las que Fathom determina como cerradas (en la videollamada dice «cita cerrada»).',
    calculo: 'Videollamadas que Fathom marca como cerradas (cita cerrada).',
  },
  revenue: {
    significado: 'Lo que se vendió de la propiedad (ingresos por ventas).',
    calculo: 'Suma del monto vendido en reuniones cerradas.',
  },
  cashCollected: {
    significado: 'Lo que se recolectó (efectivo cobrado por cierres).',
    calculo: 'Suma de cashCollected por reunión.',
  },
  ticket: {
    significado: 'Valor promedio por venta. División entre lo que se recolectó y lo que se vendió.',
    calculo: 'Efectivo cobrado total / número de ventas.',
  },
};

export default function PerformanceVideollamadas() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [modalSelectorMeetings, setModalSelectorMeetings] = useState<VideoMeeting[] | null>(null);
  const [modalTranscripcionIA, setModalTranscripcionIA] = useState<VideoMeeting | null>(null);

  const openTranscripcionIA = (meetingsOfLead: VideoMeeting[]) => {
    if (meetingsOfLead.length === 1) setModalTranscripcionIA(meetingsOfLead[0]);
    else setModalSelectorMeetings(meetingsOfLead);
  };

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
    };
  }, [meetingsInRange]);

  const meetingsByAdvisor = useMemo(() => {
    const map: Record<string, VideoMeeting[]> = {};
    meetingsInRange.forEach((m) => {
      if (!map[m.advisorId]) map[m.advisorId] = [];
      map[m.advisorId].push(m);
    });
    return map;
  }, [meetingsInRange]);

  const advisorMetrics = useMemo(() => {
    const acc: Record<string, { agendadas: number; asistencias: number; pctCierre: number; facturacion: number; cashCollected: number }> = {};
    Object.entries(meetingsByAdvisor).forEach(([aid, meetings]) => {
      const asistencias = meetings.filter((m) => m.attended).length;
      const cerradas = meetings.filter((m) => m.outcome === 'cerrado' || m.qualified).length;
      acc[aid] = {
        agendadas: meetings.length,
        asistencias,
        pctCierre: asistencias > 0 ? (cerradas / asistencias) * 100 : 0,
        facturacion: meetings.reduce((s, m) => s + (m.amountBought ?? 0), 0),
        cashCollected: meetings.reduce((s, m) => s + (m.cashCollected ?? 0), 0),
      };
    });
    return acc;
  }, [meetingsByAdvisor]);

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 7);

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
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-purple kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Agendadas
            <KpiTooltip significado={kpiTooltips.agendadas.significado} calculo={kpiTooltips.agendadas.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-purple">{agg.agendadas}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Asistidas
            <KpiTooltip significado={kpiTooltips.asistidas.significado} calculo={kpiTooltips.asistidas.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-cyan">{agg.asistidas}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-red kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Canceladas
            <KpiTooltip significado={kpiTooltips.canceladas.significado} calculo={kpiTooltips.canceladas.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-red">{agg.canceladas}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Efectivas
            <KpiTooltip significado={kpiTooltips.efectivas.significado} calculo={kpiTooltips.efectivas.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-green">{agg.efectivas}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Ingresos
            <KpiTooltip significado={kpiTooltips.revenue.significado} calculo={kpiTooltips.revenue.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-green break-words">{fm(agg.revenue)}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Efectivo cobrado
            <KpiTooltip significado={kpiTooltips.cashCollected.significado} calculo={kpiTooltips.cashCollected.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-green break-words">{fm(agg.cashCollected)}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-blue kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Ticket promedio
            <KpiTooltip significado={kpiTooltips.ticket.significado} calculo={kpiTooltips.ticket.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-blue break-words">{fm(agg.ticket)}</p>
          <div className="kpi-card-spacer" />
        </div>
      </div>

      {/* Tabla por asesor (estilo panel ejecutivo): asesor → despliegue con leads y registros */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Videollamadas por asesor
        </h3>
        <p className="text-[10px] text-gray-500 mb-2">
          Haz clic en un asesor para ver los leads y sus registros de videollamada. En cada registro: eliminar, modificar, transcripción, análisis IA y enlace a la grabación.
        </p>
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
                    .map(([aid, advisorMeetings]) => ({
                      advisorId: aid,
                      advisor: advisors.find((a) => a.id === aid),
                      meetings: [...advisorMeetings].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
                    }))
                    .filter((x) => x.advisor)
                    .sort((a, b) => (a.advisor!.name ?? '').localeCompare(b.advisor!.name ?? ''))
                    .map(({ advisorId, advisor, meetings: advisorMeetings }) => {
                      const isExpanded = expandedAdvisorId === advisorId;
                      const metrics = advisorMetrics[advisorId];
                      return (
                        <Fragment key={advisorId}>
                          <tr
                            className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                            onClick={() => setExpandedAdvisorId(isExpanded ? null : advisorId)}
                          >
                            <td className="px-1 py-2 text-gray-400">
                              <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-1.5 text-white font-medium">
                                <User className="w-3.5 h-3.5 text-accent-purple" />
                                {advisor!.name}
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
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads y registros de videollamada de {advisor!.name}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Correo electrónico</th>
                                          <th className="px-2 py-2 font-medium">Nº videoll.</th>
                                          <th className="px-2 py-2 font-medium">Asistió</th>
                                          <th className="px-2 py-2 font-medium">Calificado</th>
                                          <th className="px-2 py-2 font-medium">Compró</th>
                                          <th className="px-2 py-2 font-medium">Acciones</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advisorMeetings.map((m) => {
                                          const lead = getLeadById(m.leadId);
                                          const meetingsOfLead = advisorMeetings.filter((x) => x.leadId === m.leadId);
                                          const countVideoll = meetingsOfLead.length;
                                          return (
                                            <tr key={m.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                              <td className="px-2 py-2 text-gray-300">{format(new Date(m.datetime), 'dd/MM/yy HH:mm')}</td>
                                              <td className="px-2 py-2 text-white">{lead?.name ?? m.leadId}</td>
                                              <td className="px-2 py-2 text-gray-400">{lead?.email ?? '—'}</td>
                                              <td className="px-2 py-2 text-accent-purple font-medium">{countVideoll}</td>
                                              <td className="px-2 py-2">{m.attended ? <span className="text-accent-green">Sí</span> : <span className="text-accent-red">No</span>}</td>
                                              <td className="px-2 py-2">{m.qualified ? <span className="text-accent-green">Sí</span> : <span className="text-gray-400">No</span>}</td>
                                              <td className="px-2 py-2">{(m.amountBought ?? 0) > 0 ? <span className="text-accent-green">Sí</span> : <span className="text-gray-400">No</span>}</td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex flex-wrap gap-1">
                                                  <button type="button" title="Eliminar registro" className="p-1 rounded text-gray-400 hover:text-accent-red hover:bg-accent-red/10"><Trash2 className="w-3.5 h-3.5" /></button>
                                                  <button type="button" title="Modificar" className="p-1 rounded text-gray-400 hover:text-accent-amber hover:bg-accent-amber/10" onClick={() => setEditingMeetingId(editingMeetingId === m.id ? null : m.id)}><Pencil className="w-3.5 h-3.5" /></button>
                                                  <button type="button" onClick={() => openTranscripcionIA(meetingsOfLead)} className="text-accent-cyan text-[10px] inline-flex items-center gap-0.5"><FileText className="w-3 h-3" /> Transcripción</button>
                                                  <button type="button" onClick={() => openTranscripcionIA(meetingsOfLead)} className="text-accent-purple text-[10px] inline-flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> Análisis IA</button>
                                                  {m.recordingUrl ? (
                                                    <a href={m.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-accent-green text-[10px] inline-flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /> Ver grabación</a>
                                                  ) : (
                                                    <span className="text-gray-500 text-[10px] inline-flex items-center gap-0.5" title="Sin URL de grabación"><ExternalLink className="w-3 h-3" /> Ver grabación</span>
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
        <ModalTranscripcionIA
          meeting={modalTranscripcionIA}
          onClose={() => setModalTranscripcionIA(null)}
        />
      )}
    </div>
  );
}
