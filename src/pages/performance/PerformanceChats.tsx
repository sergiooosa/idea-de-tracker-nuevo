import { useState, useMemo, Fragment } from 'react';
import Lead360Drawer from '@/components/Lead360Drawer';
import KpiTooltip from '@/components/KpiTooltip';
import ModalConversacionChat from '@/components/ModalConversacionChat';
import { chatEvents, advisors, getLeadsByAdvisor, getLeadById } from '@/data/mockData';
import type { Lead } from '@/types';
import type { ChatEvent } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, User } from 'lucide-react';

const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

const chatKpiTooltips = {
  asignados: {
    significado: 'Cantidad de leads con al menos una conversación de chat asignada.',
    calculo: 'Conteo único de leadId en eventos de chat.',
  },
  activos: {
    significado: 'Leads con los que se logró contacto (conversación iniciada).',
    calculo: 'Leads con al menos un evento con contacted = true.',
  },
  calificados: {
    significado: 'Leads marcados como calificados (👍) según criterio del equipo.',
    calculo: 'Leads con al menos un evento qualified = true.',
  },
  noCalificados: {
    significado: 'Leads contactados que aún no se marcan como calificados.',
    calculo: 'Leads con contacted y sin qualified.',
  },
  seguimientos: {
    significado: 'Total de interacciones o mensajes de seguimiento realizados en chat.',
    calculo: 'Suma de eventos de chat (cada mensaje o seguimiento cuenta).',
  },
  speedToLead: {
    significado: 'Tiempo promedio desde que se asigna el chat hasta la primera respuesta del asesor.',
    calculo: 'Promedio de speedToLeadSeconds de todos los eventos con valor.',
  },
};

export default function PerformanceChats() {
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [lead360, setLead360] = useState<Lead | null>(null);
  const [modalConversacion, setModalConversacion] = useState<{ leadName: string; events: ChatEvent[] } | null>(null);

  const assigned = [...new Set(chatEvents.map((e) => e.leadId))].length;
  const leadIdsContacted = new Set(chatEvents.filter((e) => e.contacted).map((e) => e.leadId));
  const activos = leadIdsContacted.size;
  const leadIdsQualified = new Set(chatEvents.filter((e) => e.qualified).map((e) => e.leadId));
  const calificados = leadIdsQualified.size;
  const noCalificados = [...leadIdsContacted].filter((id) => !leadIdsQualified.has(id)).length;
  const seguimientosTotal = chatEvents.length;
  const speedAvg =
    chatEvents.filter((e) => e.speedToLeadSeconds != null).length > 0
      ? chatEvents
          .filter((e) => e.speedToLeadSeconds != null)
          .reduce((s, e) => s + (e.speedToLeadSeconds ?? 0), 0) /
        chatEvents.filter((e) => e.speedToLeadSeconds != null).length
      : 0;

  const advisorIdsInChat = useMemo(
    () => [...new Set(chatEvents.map((e) => e.advisorId))],
    []
  );

  const chatEventsByAdvisor = useMemo(() => {
    const map: Record<string, ChatEvent[]> = {};
    chatEvents.forEach((e) => {
      if (!map[e.advisorId]) map[e.advisorId] = [];
      map[e.advisorId].push(e);
    });
    return map;
  }, []);

  const advisorMetrics = useMemo(() => {
    const acc: Record<
      string,
      { asignados: number; activos: number; calificados: number; noCalificados: number; seguimientos: number; speedToLead: number | null }
    > = {};
    Object.entries(chatEventsByAdvisor).forEach(([aid, evts]) => {
      const leadIds = new Set(evts.map((e) => e.leadId));
      const contactados = new Set(evts.filter((e) => e.contacted).map((e) => e.leadId));
      const qual = new Set(evts.filter((e) => e.qualified).map((e) => e.leadId));
      const noQual = [...contactados].filter((id) => !qual.has(id)).length;
      const withSpeed = evts.filter((e) => e.speedToLeadSeconds != null);
      acc[aid] = {
        asignados: leadIds.size,
        activos: contactados.size,
        calificados: qual.size,
        noCalificados: noQual,
        seguimientos: evts.length,
        speedToLead:
          withSpeed.length > 0
            ? withSpeed.reduce((s, e) => s + (e.speedToLeadSeconds ?? 0), 0) / withSpeed.length
            : null,
      };
    });
    return acc;
  }, [chatEventsByAdvisor]);

  return (
    <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Chats asignados
            <KpiTooltip significado={chatKpiTooltips.asignados.significado} calculo={chatKpiTooltips.asignados.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-cyan break-words">{assigned}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Chats activos
            <KpiTooltip significado={chatKpiTooltips.activos.significado} calculo={chatKpiTooltips.activos.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-cyan break-words">{activos}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Calificados 👍
            <KpiTooltip significado={chatKpiTooltips.calificados.significado} calculo={chatKpiTooltips.calificados.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-green break-words">{calificados}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-red kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            No calificados 👎
            <KpiTooltip significado={chatKpiTooltips.noCalificados.significado} calculo={chatKpiTooltips.noCalificados.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-red break-words">{noCalificados}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-purple kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Seguimientos realizados
            <KpiTooltip significado={chatKpiTooltips.seguimientos.significado} calculo={chatKpiTooltips.seguimientos.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-purple break-words">{seguimientosTotal}</p>
          <div className="kpi-card-spacer" />
        </div>
        <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-purple kpi-card-fixed">
          <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">
            Speed to lead promedio
            <KpiTooltip significado={chatKpiTooltips.speedToLead.significado} calculo={chatKpiTooltips.speedToLead.calculo} />
          </p>
          <p className="text-base font-bold mt-0.5 text-accent-purple break-words">{min(speedAvg)}</p>
          <div className="kpi-card-spacer" />
        </div>
      </div>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Chats por asesor
        </h3>
        <p className="text-[10px] text-gray-500 mb-2">
          Métricas por asesor. Haz clic en uno para ver sus leads y el botón <strong>Ver conversación</strong> abre un popup con lo que se habló.
        </p>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {advisorIdsInChat.length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">No hay chats en el período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">Asesor</th>
                    <th className="px-2 py-2 font-medium">Asignados</th>
                    <th className="px-2 py-2 font-medium">Activos</th>
                    <th className="px-2 py-2 font-medium">Calificados</th>
                    <th className="px-2 py-2 font-medium">No calificados</th>
                    <th className="px-2 py-2 font-medium">Seguimientos</th>
                    <th className="px-2 py-2 font-medium">Speed to lead (prom.)</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorIdsInChat
                    .map((aid) => ({
                      advisorId: aid,
                      advisor: advisors.find((a) => a.id === aid),
                      evts: chatEventsByAdvisor[aid] ?? [],
                    }))
                    .filter((x) => x.advisor)
                    .sort((a, b) => (a.advisor!.name ?? '').localeCompare(b.advisor!.name ?? ''))
                    .map(({ advisorId, advisor, evts }) => {
                      const isExpanded = expandedAdvisorId === advisorId;
                      const metrics = advisorMetrics[advisorId];
                      const leadIds = [...new Set(evts.map((e) => e.leadId))];
                      const rows = leadIds.map((leadId) => {
                        const leadFromAdvisor = getLeadsByAdvisor(advisorId).find((l) => l.id === leadId);
                        const leadFromGlobal = getLeadById(leadId);
                        const lead = leadFromAdvisor ?? leadFromGlobal ?? { id: leadId, name: leadId, phone: '', email: '', status: 'nuevo', createdAt: '', assignedAdvisorId: advisorId, tags: [] } as Lead;
                        const leadEvts = evts.filter((e) => e.leadId === leadId).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                        const lastActivity = leadEvts[0]?.datetime;
                        const hasQualified = leadEvts.some((e) => e.qualified);
                        const speed = leadEvts.find((e) => e.speedToLeadSeconds != null)?.speedToLeadSeconds ?? null;
                        return { lead, leadEvts, lastActivity, hasQualified, speed };
                      });
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
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.asignados ?? 0}</td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.activos ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics?.calificados ?? 0}</td>
                            <td className="px-2 py-2 text-accent-red">{metrics?.noCalificados ?? 0}</td>
                            <td className="px-2 py-2 text-accent-purple">{metrics?.seguimientos ?? 0}</td>
                            <td className="px-2 py-2 text-gray-300">{metrics?.speedToLead != null ? min(metrics.speedToLead) : '—'}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={8} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads con chat de {advisor!.name}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[360px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Lead</th>
                                          <th className="px-2 py-2 font-medium">Última actividad</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium">Seguimientos</th>
                                          <th className="px-2 py-2 font-medium">Speed to lead</th>
                                          <th className="px-2 py-2 font-medium w-32" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {rows.map(({ lead, leadEvts, lastActivity, hasQualified, speed }) => (
                                          <tr key={lead.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                            <td className="px-2 py-2 text-white">{lead.name}</td>
                                            <td className="px-2 py-2 text-gray-400 text-[10px]">
                                              {lastActivity ? formatDistanceToNow(new Date(lastActivity), { addSuffix: true, locale: es }) : '—'}
                                            </td>
                                            <td className="px-2 py-2">
                                              {hasQualified ? <span className="text-accent-green">Calificado 👍</span> : <span className="text-gray-400">No calificado 👎</span>}
                                            </td>
                                            <td className="px-2 py-2 text-accent-purple">{leadEvts.length}</td>
                                            <td className="px-2 py-2 text-gray-400">{speed != null ? min(speed) : '—'}</td>
                                            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                type="button"
                                                onClick={() => setModalConversacion({ leadName: lead.name, events: leadEvts })}
                                                className="text-accent-cyan text-[10px] font-medium hover:underline"
                                              >
                                                Ver conversación
                                              </button>
                                              <button
                                                type="button"
                                                className="text-gray-400 text-[10px] ml-1.5 hover:text-white"
                                                onClick={(e) => { e.stopPropagation(); setLead360(lead); }}
                                              >
                                                Ver 360
                                              </button>
                                            </td>
                                          </tr>
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
          )}
        </div>
      </section>

      {modalConversacion && (
        <ModalConversacionChat
          leadName={modalConversacion.leadName}
          events={modalConversacion.events}
          onClose={() => setModalConversacion(null)}
        />
      )}
      {lead360 && <Lead360Drawer lead={lead360} onClose={() => setLead360(null)} />}
    </div>
  );
}
