import { useState, Fragment } from 'react';
import KPICard from '@/components/KPICard';
import ModalRegistrosLlamadas from '@/components/ModalRegistrosLlamadas';
import { advisors, leads, getCallsByLeadInRange, getCallsInRange, getLeadById } from '@/data/mockData';
import { format, subDays } from 'date-fns';
import { FileText, Sparkles, ChevronRight, ChevronDown, User } from 'lucide-react';
import { outcomeLlamadaToSpanish } from '@/utils/outcomeLabels';
import KpiTooltip from '@/components/KpiTooltip';

const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

type ExpandedCall = { callId: string; type: 'transcript' | 'ia' };

export default function PerformanceLlamadas() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [registrosModal, setRegistrosModal] = useState<{ leadId: string; leadName: string } | null>(null);
  const [expandedAdvisorId, setExpandedAdvisorId] = useState('');
  const [expandedCall, setExpandedCall] = useState<ExpandedCall | null>(null);
  const [expandedLeadIdPerAdvisor, setExpandedLeadIdPerAdvisor] = useState<string | null>(null);
  const [expandedAsesorLlamadas, setExpandedAsesorLlamadas] = useState<string | null>(null);

  const setters = advisors.filter((a) => a.role === 'setter' || a.role === 'closer');

  const callsInRange = getCallsInRange(dateFrom, dateTo);
  const callsByAdvisor = callsInRange.reduce<Record<string, typeof callsInRange>>((acc, c) => {
    if (!acc[c.advisorId]) acc[c.advisorId] = [];
    acc[c.advisorId].push(c);
    return acc;
  }, {});

  const byAdvisor = advisors.slice(0, 5).map((a) => {
    const advisorCalls = callsInRange.filter((c) => c.advisorId === a.id);
    const leadsIds = [...new Set(advisorCalls.map((c) => c.leadId))];
    const answered = advisorCalls.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
    const attemptsAvg =
      advisorCalls.length > 0
        ? advisorCalls.reduce((s, c) => s + c.attemptsCountForLead, 0) / advisorCalls.length
        : 0;
    const speedAvg =
      advisorCalls.filter((c) => c.speedToLeadSeconds != null).length > 0
        ? advisorCalls
            .filter((c) => c.speedToLeadSeconds != null)
            .reduce((s, c) => s + (c.speedToLeadSeconds ?? 0), 0) /
          advisorCalls.filter((c) => c.speedToLeadSeconds != null).length
        : null;
    return {
      advisor: a,
      leads: leadsIds.length,
      totalCalls: advisorCalls.length,
      answered,
      attemptsAvg: attemptsAvg.toFixed(1),
      speedAvg,
      contactRate: advisorCalls.length ? answered / advisorCalls.length : 0,
    };
  });

  const totalLeads = [...new Set(callsInRange.map((c) => c.leadId))].length;
  const totalCalls = callsInRange.length;
  const answered = callsInRange.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
  const speedAll =
    callsInRange.filter((c) => c.speedToLeadSeconds != null).length > 0
      ? callsInRange
          .filter((c) => c.speedToLeadSeconds != null)
          .reduce((s, c) => s + (c.speedToLeadSeconds ?? 0), 0) /
        callsInRange.filter((c) => c.speedToLeadSeconds != null).length
      : 0;
  const attemptsAvg =
    callsInRange.length > 0
      ? callsInRange.reduce((s, c) => s + c.attemptsCountForLead, 0) / callsInRange.length
      : 0;
  const firstContactAttempts = callsInRange.filter((c) => c.firstContactAt).length
    ? callsInRange
        .filter((c) => c.attemptsCountForLead >= 1)
        .reduce((s, c) => s + c.attemptsCountForLead, 0) /
      callsInRange.filter((c) => c.attemptsCountForLead >= 1).length
    : 0;

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        <KPICard
          label="Total leads (llamadas)"
          value={totalLeads}
          color="blue"
          tooltip={{ significado: 'Leads únicos con al menos una llamada en el período.', calculo: 'Conteo de leadId distintos en las llamadas del rango.' }}
        />
        <KPICard
          label="Llamadas totales"
          value={totalCalls}
          color="cyan"
          tooltip={{ significado: 'Número total de llamadas realizadas.', calculo: 'Suma de todas las llamadas en el rango de fechas.' }}
        />
        <KPICard
          label="Tiempo al lead (promedio)"
          value={min(speedAll)}
          color="purple"
          tooltip={{ significado: 'Tiempo promedio desde que llega el lead hasta el primer contacto.', calculo: 'Promedio de speedToLeadSeconds de las llamadas.' }}
        />
        <KPICard
          label="Intentos promedio"
          value={attemptsAvg.toFixed(1)}
          color="amber"
          tooltip={{ significado: 'Promedio de intentos de llamada por lead.', calculo: 'Suma de intentos por lead / cantidad de llamadas.' }}
        />
        <KPICard
          label="Intentos hasta primer contacto"
          value={firstContactAttempts.toFixed(1)}
          color="purple"
          tooltip={{ significado: 'Cuántos intentos en promedio hasta que el lead contesta por primera vez.', calculo: 'Promedio de attemptsCountForLead en llamadas con primer contacto.' }}
        />
        <KPICard
          label="Tasa de contestación"
          value={`${(answered / totalCalls * 100).toFixed(1)}%`}
          color="green"
          tooltip={{ significado: 'Porcentaje de llamadas que el lead contestó.', calculo: '(Llamadas contestadas / Total llamadas) × 100.' }}
        />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Por asesor (resumen)
        </h3>
        <div className="rounded-xl border border-surface-500 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-4 py-3 font-medium w-8" />
                <th className="px-4 py-3 font-medium">Asesor</th>
                <th className="px-4 py-3 font-medium">Leads</th>
                <th className="px-4 py-3 font-medium">Llamadas</th>
                <th className="px-4 py-3 font-medium">Pend.</th>
                <th className="px-4 py-3 font-medium">Inter.</th>
                <th className="px-4 py-3 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {byAdvisor.map((r, i) => {
                const expanded = expandedAdvisorId === r.advisor.id;
                const advisorCallsList = callsInRange.filter((c) => c.advisorId === r.advisor.id);
                return (
                  <Fragment key={r.advisor.id}>
                    <tr
                      className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                      onClick={() => {
                        setExpandedAdvisorId(expanded ? '' : r.advisor.id);
                        setExpandedLeadIdPerAdvisor(null);
                      }}
                    >
                      <td className="px-2 py-3 text-gray-400">
                        <span className="inline-block transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block w-2 h-2 rounded-full bg-accent-green mr-2" />
                        {i === 0 && '🥇 '}
                        {i === 1 && '🥈 '}
                        {i === 2 && '🥉 '}
                        {r.advisor.name}
                      </td>
                      <td className="px-4 py-3 text-white">{r.leads}</td>
                      <td className="px-4 py-3 text-accent-cyan">{r.totalCalls}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue text-xs">
                          {Math.max(0, r.leads - Math.round(r.totalCalls / 2))} pend.
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-accent-green/20 text-accent-green text-xs">
                          {Math.round(r.leads * 0.3)} inter.
                        </span>
                      </td>
                      <td className="px-4 py-3 text-accent-green">
                        {(r.contactRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                    {expanded && (() => {
                      const byLead = new Map<string, { calls: typeof advisorCallsList; speedToLeadSeconds: number | null }>();
                      advisorCallsList.forEach((c) => {
                        if (!byLead.has(c.leadId)) {
                          const leadCalls = advisorCallsList.filter((x) => x.leadId === c.leadId);
                          const withSpeed = leadCalls.find((x) => x.speedToLeadSeconds != null);
                          byLead.set(c.leadId, {
                            calls: leadCalls,
                            speedToLeadSeconds: withSpeed?.speedToLeadSeconds ?? null,
                          });
                        }
                      });
                      const leadsOrdered = Array.from(byLead.entries()).sort((a, b) => b[1].calls.length - a[1].calls.length);
                      return (
                        <tr className="bg-surface-800/90">
                          <td colSpan={7} className="p-0">
                            <div className="px-4 py-3 border-t border-surface-500">
                              <div className="text-xs text-gray-400 mb-2">Llamadas de {r.advisor.name} — por lead (tiempo al lead y total de llamadas suman al asesor)</div>
                              <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[360px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="sticky top-0 bg-surface-700">
                                    <tr className="text-left text-gray-400">
                                      <th className="px-3 py-2 font-medium">Lead</th>
                                      <th className="px-3 py-2 font-medium">Tiempo al lead</th>
                                      <th className="px-3 py-2 font-medium"># Llamadas</th>
                                      <th className="px-3 py-2 font-medium w-24" />
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {leadsOrdered.map(([leadId, { calls: leadCalls, speedToLeadSeconds }]) => {
                                      const lead = getLeadById(leadId);
                                      const showCalls = expandedLeadIdPerAdvisor === leadId;
                                      return (
                                        <Fragment key={leadId}>
                                          <tr className="border-t border-surface-500 hover:bg-surface-600/50">
                                            <td className="px-3 py-2 text-white font-medium">{lead?.name ?? leadId}</td>
                                            <td className="px-3 py-2 text-gray-300">
                                              {speedToLeadSeconds != null ? min(speedToLeadSeconds) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-accent-cyan">{leadCalls.length}</td>
                                            <td className="px-3 py-2">
                                              <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setExpandedLeadIdPerAdvisor(showCalls ? null : leadId); }}
                                                className="text-accent-cyan text-xs"
                                              >
                                                {showCalls ? 'Ocultar' : `Ver ${leadCalls.length} llamada(s)`}
                                              </button>
                                            </td>
                                          </tr>
                                          {showCalls && leadCalls.map((c) => (
                                            <Fragment key={c.id}>
                                              <tr className="bg-surface-700/60 border-t border-surface-500/50">
                                                <td className="px-3 py-1.5 text-gray-400 text-xs" colSpan={2}>
                                                  {format(new Date(c.datetime), 'dd/MM/yy HH:mm')}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                  <span className={c.outcome === 'answered' || c.outcome === 'completed' ? 'text-accent-green text-xs' : 'text-accent-red text-xs'}>
                                                    {outcomeLlamadaToSpanish(c.outcome)}
                                                  </span>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                  <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedCall(expandedCall?.callId === c.id && expandedCall?.type === 'transcript' ? null : { callId: c.id, type: 'transcript' }); }} className="text-accent-cyan text-xs mr-1 inline-flex items-center gap-0.5">
                                                    <FileText className="w-3 h-3" /> Transcripción
                                                  </button>
                                                  <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedCall(expandedCall?.callId === c.id && expandedCall?.type === 'ia' ? null : { callId: c.id, type: 'ia' }); }} className="text-accent-purple text-xs inline-flex items-center gap-0.5">
                                                    <Sparkles className="w-3 h-3" /> IA
                                                  </button>
                                                </td>
                                              </tr>
                                              {expandedCall?.callId === c.id && (
                                                <tr className="bg-surface-700/80">
                                                  <td colSpan={4} className="px-3 py-2 text-gray-300 text-xs whitespace-pre-wrap border-l-4 border-accent-cyan">
                                                    {expandedCall.type === 'transcript'
                                                      ? `[Transcripción] ${format(new Date(c.datetime), 'dd/MM/yyyy HH:mm')}\n\n${c.notes ? `Notas: ${c.notes}` : 'Fragmento de transcripción de la llamada. El lead mostró interés en el producto. Se acordó seguimiento.'}`
                                                      : `[Análisis IA] ${format(new Date(c.datetime), 'dd/MM/yyyy HH:mm')}\n\n${c.summary ?? 'Resumen: Llamada de calificación. Objeciones detectadas: ' + (c.objections?.join(', ') || 'ninguna') + '.'}`}
                                                  </td>
                                                </tr>
                                              )}
                                            </Fragment>
                                          ))}
                                        </Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Registro de llamadas por asesor (contacto dueño)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          En esta sección no se muestra ninguna llamada por defecto. Despliega el <strong>contacto dueño (asesor)</strong> para ver sus llamadas en el rango; ahí aparecen Ver transcripción y Ver análisis IA.
        </p>
        <div className="rounded-xl border border-surface-500 overflow-hidden">
          {Object.keys(callsByAdvisor).length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">No hay llamadas en el rango de fechas.</div>
          ) : (
            <ul className="divide-y divide-surface-500">
              {Object.entries(callsByAdvisor)
                .map(([aid, advisorCalls]) => ({
                  advisorId: aid,
                  advisor: setters.find((a) => a.id === aid) ?? advisors.find((a) => a.id === aid),
                  calls: [...advisorCalls].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
                }))
                .filter((x) => x.advisor)
                .sort((a, b) => (a.advisor!.name ?? '').localeCompare(b.advisor!.name ?? ''))
                .map(({ advisorId, advisor, calls: advisorCalls }) => {
                  const isExpanded = expandedAsesorLlamadas === advisorId;
                  return (
                    <li key={advisorId} className="bg-surface-800">
                      <button
                        type="button"
                        onClick={() => setExpandedAsesorLlamadas(isExpanded ? null : advisorId)}
                        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-700/50"
                      >
                        <span className="flex items-center gap-2 text-white font-medium">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-accent-cyan shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                          <User className="w-4 h-4 text-accent-cyan" />
                          {advisor!.name}
                        </span>
                        <span className="text-xs text-gray-500">{advisorCalls.length} llamada(s)</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-surface-500 overflow-x-auto max-h-[420px] overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface-800">
                              <tr className="text-left text-gray-400">
                                <th className="px-2 sm:px-4 py-2 font-medium">Fecha</th>
                                <th className="px-2 sm:px-4 py-2 font-medium">Lead</th>
                                <th className="px-2 sm:px-4 py-2 font-medium hidden sm:table-cell">Teléfono</th>
                                <th className="px-2 sm:px-4 py-2 font-medium"># Llamadas</th>
                                <th className="px-2 sm:px-4 py-2 font-medium">Contestó</th>
                                <th className="px-2 sm:px-4 py-2 font-medium hidden md:table-cell">Tiempo al lead</th>
                                <th className="px-2 sm:px-4 py-2 font-medium hidden md:table-cell">Transcripción / IA</th>
                              </tr>
                            </thead>
                            <tbody>
                              {advisorCalls.map((c) => {
                                const lead = getLeadById(c.leadId);
                                const leadCallsInRange = getCallsByLeadInRange(c.leadId, dateFrom, dateTo);
                                const count = leadCallsInRange.length;
                                const showTranscript = expandedCall?.callId === c.id && expandedCall?.type === 'transcript';
                                const showIa = expandedCall?.callId === c.id && expandedCall?.type === 'ia';
                                return (
                                  <Fragment key={c.id}>
                                    <tr className="border-t border-surface-500 hover:bg-surface-700/50">
                                      <td className="px-2 sm:px-4 py-2 text-gray-300">{format(new Date(c.datetime), 'dd/MM/yy HH:mm')}</td>
                                      <td className="px-2 sm:px-4 py-2 text-white">{lead?.name ?? c.leadId}</td>
                                      <td className="px-2 sm:px-4 py-2 text-gray-400 hidden sm:table-cell">{lead?.phone ?? '-'}</td>
                                      <td className="px-2 sm:px-4 py-2">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setRegistrosModal({ leadId: c.leadId, leadName: lead?.name ?? c.leadId }); }}
                                          className="inline-flex items-center justify-center min-w-[1.75rem] h-7 rounded-full bg-accent-blue/20 text-accent-cyan text-xs font-medium hover:bg-accent-blue/30"
                                        >
                                          {count}
                                        </button>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2">
                                        <span className={c.outcome === 'answered' || c.outcome === 'completed' ? 'text-accent-green' : 'text-accent-red'}>{c.outcome === 'no_answer' ? 'No' : 'Sí'}</span>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2 text-gray-400 hidden md:table-cell">{c.speedToLeadSeconds != null ? min(c.speedToLeadSeconds) : '-'}</td>
                                      <td className="px-2 sm:px-4 py-2 hidden md:table-cell" colSpan={2}>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedCall(showTranscript ? null : { callId: c.id, type: 'transcript' }); }} className="text-accent-cyan text-xs mr-2 inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Ver transcripción</button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); setExpandedCall(showIa ? null : { callId: c.id, type: 'ia' }); }} className="text-accent-purple text-xs inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Ver análisis IA</button>
                                      </td>
                                    </tr>
                                    {(showTranscript || showIa) && (
                                      <tr className="bg-surface-700/80">
                                        <td colSpan={7} className="px-4 py-3 text-gray-300 text-xs whitespace-pre-wrap border-l-4 border-accent-cyan">
                                          {showTranscript ? `[Transcripción] ${format(new Date(c.datetime), 'dd/MM/yyyy HH:mm')}\n\n${c.notes ? `Notas: ${c.notes}` : 'Fragmento de transcripción de la llamada. El lead mostró interés. Se acordó seguimiento.'}` : `[Análisis IA] ${format(new Date(c.datetime), 'dd/MM/yyyy HH:mm')}\n\n${c.summary ?? 'Resumen: Llamada de calificación. Objeciones: ' + (c.objections?.join(', ') || 'ninguna') + '.'}`}
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

      {registrosModal && (
        <ModalRegistrosLlamadas
          registros={getCallsByLeadInRange(registrosModal.leadId, dateFrom, dateTo)}
          leadName={registrosModal.leadName}
          onClose={() => setRegistrosModal(null)}
        />
      )}
    </div>
  );
}
