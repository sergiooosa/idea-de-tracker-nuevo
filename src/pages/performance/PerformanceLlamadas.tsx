import { useState, useMemo, Fragment } from 'react';
import KPICard from '@/components/KPICard';
import ModalTranscripcionIALlamadas from '@/components/ModalTranscripcionIALlamadas';
import DateRangePicker from '@/components/DateRangePicker';
import { advisors, getCallsByLeadInRange, getCallsInRange, getLeadById } from '@/data/mockData';
import { format, subDays } from 'date-fns';
import { FileText, Sparkles, ChevronDown, User, X } from 'lucide-react';
import type { CallPhone } from '@/types';
import { outcomeLlamadaToSpanish } from '@/utils/outcomeLabels';

const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);
const pct = (n: number) => `${n.toFixed(1)}%`;

export default function PerformanceLlamadas() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalSelectorCalls, setModalSelectorCalls] = useState<CallPhone[] | null>(null);
  const [modalTranscripcionIA, setModalTranscripcionIA] = useState<CallPhone | null>(null);

  const openTranscripcionIA = (callsOfLead: CallPhone[]) => {
    if (callsOfLead.length === 1) setModalTranscripcionIA(callsOfLead[0]);
    else setModalSelectorCalls(callsOfLead);
  };

  const callsInRange = useMemo(() => getCallsInRange(dateFrom, dateTo), [dateFrom, dateTo]);
  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 7);

  const callsByAdvisor = useMemo(() => {
    const map: Record<string, CallPhone[]> = {};
    callsInRange.forEach((c) => {
      if (!map[c.advisorId]) map[c.advisorId] = [];
      map[c.advisorId].push(c);
    });
    return map;
  }, [callsInRange]);

  const advisorMetrics = useMemo(() => {
    const acc: Record<string, { llamadas: number; contestadas: number; pctContestacion: number; tiempoAlLead: number | null }> = {};
    Object.entries(callsByAdvisor).forEach(([aid, calls]) => {
      const contestadas = calls.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
      const withSpeed = calls.filter((c) => c.speedToLeadSeconds != null);
      const tiempoAlLead =
        withSpeed.length > 0
          ? withSpeed.reduce((s, c) => s + (c.speedToLeadSeconds ?? 0), 0) / withSpeed.length
          : null;
      acc[aid] = {
        llamadas: calls.length,
        contestadas,
        pctContestacion: calls.length > 0 ? (contestadas / calls.length) * 100 : 0,
        tiempoAlLead,
      };
    });
    return acc;
  }, [callsByAdvisor]);

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

  const kpiCompact = "[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3";

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
        <KPICard
          label="Leads generados (llamadas)"
          value={totalLeads}
          color="blue"
          className={kpiCompact}
          tooltip={{ significado: 'Contactos creados en GHL.', calculo: 'Leads con al menos una llamada en el rango.' }}
        />
        <KPICard
          label="Llamadas totales"
          value={totalCalls}
          color="cyan"
          className={kpiCompact}
          tooltip={{ significado: 'Todas las llamadas realizadas en el rango.', calculo: 'Suma de todas las llamadas.' }}
        />
        <KPICard
          label="Tiempo al lead (promedio)"
          value={min(speedAll)}
          color="purple"
          className={kpiCompact}
          tooltip={{ significado: 'Tiempo que se demoran en contactar al lead.', calculo: 'Promedio de (primer contacto − creación del lead).' }}
        />
        <KPICard
          label="Intentos promedio"
          value={attemptsAvg.toFixed(1)}
          color="amber"
          className={kpiCompact}
          tooltip={{ significado: 'Intentos promedios por lead.', calculo: 'Suma de intentos / cantidad de llamadas.' }}
        />
        <KPICard
          label="Intentos hasta primer contacto"
          value={firstContactAttempts.toFixed(1)}
          color="purple"
          className={kpiCompact}
          tooltip={{ significado: 'Cuántas llamadas en promedio hasta que el lead contesta.', calculo: 'Promedio de intentos hasta primer contacto.' }}
        />
        <KPICard
          label="Tasa de contestación"
          value={`${(answered / totalCalls * 100).toFixed(1)}%`}
          color="green"
          className={kpiCompact}
          tooltip={{ significado: 'Porcentaje de llamadas que el lead contestó.', calculo: '(Contestadas / Total) × 100.' }}
        />
      </div>

      {/* Una sola tabla por asesor (como Videollamadas): métricas visibles, al expandir detalle por registro */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Llamadas por asesor
        </h3>
        <p className="text-[10px] text-gray-500 mb-2">
          Haz clic en un asesor para ver los leads y sus registros. En cada registro: número de llamadas (abre popup con todos los momentos), transcripción y análisis IA en un solo popup.
        </p>
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
                    .map(([aid, advisorCalls]) => ({
                      advisorId: aid,
                      advisor: advisors.find((a) => a.id === aid),
                      calls: [...advisorCalls].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()),
                    }))
                    .filter((x) => x.advisor)
                    .sort((a, b) => (a.advisor!.name ?? '').localeCompare(b.advisor!.name ?? ''))
                    .map(({ advisorId, advisor, calls: advisorCalls }) => {
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
                                <User className="w-3.5 h-3.5 text-accent-cyan" />
                                {advisor!.name}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.llamadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics?.contestadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics != null ? pct(metrics.pctContestacion) : '—'}</td>
                            <td className="px-2 py-2 text-gray-300">{metrics?.tiempoAlLead != null ? min(metrics.tiempoAlLead) : '—'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={6} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Registros de llamadas de {advisor!.name}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Teléfono</th>
                                          <th className="px-2 py-2 font-medium">Nº llam.</th>
                                          <th className="px-2 py-2 font-medium">Contestó</th>
                                          <th className="px-2 py-2 font-medium">Tiempo al lead</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium">Transcripción / Análisis IA</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advisorCalls.map((c) => {
                                          const lead = getLeadById(c.leadId);
                                          const callsOfLead = advisorCalls.filter((x) => x.leadId === c.leadId);
                                          const countCalls = callsOfLead.length;
                                          return (
                                            <tr key={c.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                              <td className="px-2 py-2 text-gray-300">{format(new Date(c.datetime), 'dd/MM/yy HH:mm')}</td>
                                              <td className="px-2 py-2 text-white">{lead?.name ?? c.leadId}</td>
                                              <td className="px-2 py-2 text-gray-400">{lead?.phone ?? '—'}</td>
                                              <td className="px-2 py-2 text-accent-cyan font-medium">{countCalls}</td>
                                              <td className="px-2 py-2">
                                                {c.outcome === 'answered' || c.outcome === 'completed' ? (
                                                  <span className="text-accent-green">Sí</span>
                                                ) : (
                                                  <span className="text-accent-red">No</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-2 text-gray-400">
                                                {c.speedToLeadSeconds != null ? min(c.speedToLeadSeconds) : '—'}
                                              </td>
                                              <td className="px-2 py-2 text-gray-300">{outcomeLlamadaToSpanish(c.outcome)}</td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                  type="button"
                                                  onClick={() => openTranscripcionIA(callsOfLead)}
                                                  className="text-accent-cyan text-[10px] inline-flex items-center gap-0.5"
                                                >
                                                  <FileText className="w-3 h-3" /> Transcripción
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => openTranscripcionIA(callsOfLead)}
                                                  className="text-accent-purple text-[10px] inline-flex items-center gap-0.5 ml-1"
                                                >
                                                  <Sparkles className="w-3 h-3" /> Análisis IA
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
                  <button
                    type="button"
                    onClick={() => { setModalTranscripcionIA(call); setModalSelectorCalls(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm"
                  >
                    {format(new Date(call.datetime), "dd/MM/yyyy 'a las' HH:mm")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {modalTranscripcionIA && (
        <ModalTranscripcionIALlamadas call={modalTranscripcionIA} onClose={() => setModalTranscripcionIA(null)} />
      )}
    </div>
  );
}
