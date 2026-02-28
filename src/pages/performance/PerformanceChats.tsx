import { useState, Fragment } from 'react';
import Lead360Drawer from '@/components/Lead360Drawer';
import KpiTooltip from '@/components/KpiTooltip';
import { chatEvents, advisors, getLeadsByAdvisor } from '@/data/mockData';
import type { Lead } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, ChevronDown, User } from 'lucide-react';

const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

const chatKpiTooltips = {
  asignados: {
    significado: 'Cantidad de leads que tienen al menos una conversación de chat asignada en el período.',
    calculo: 'Conteo único de leadId en eventos de chat.',
  },
  tasaContacto: {
    significado: 'Porcentaje de chats asignados en los que se logró respuesta o primer contacto.',
    calculo: 'Chats contactados / Total asignados × 100.',
  },
  speedToLead: {
    significado: 'Tiempo promedio desde que se asigna el chat hasta la primera respuesta del asesor.',
    calculo: 'Promedio de speedToLeadSeconds de todos los eventos con valor.',
  },
  calificados: {
    significado: 'Leads marcados como calificados (👍) según criterio del equipo.',
    calculo: 'Eventos con qualified = true.',
  },
  interesados: {
    significado: 'Leads que mostraron interés (💡) en la conversación.',
    calculo: 'Eventos con interested = true.',
  },
  noCalificados: {
    significado: 'Leads contactados que aún no se marcan como calificados (👎).',
    calculo: 'Eventos con contacted = true y qualified = false.',
  },
};

export default function PerformanceChats() {
  const [expandedAdvisor, setExpandedAdvisor] = useState('');
  const [expandedLeadIdChat, setExpandedLeadIdChat] = useState('');
  const [lead360, setLead360] = useState<Lead | null>(null);

  const assigned = [...new Set(chatEvents.map((e) => e.leadId))].length;
  const contacted = chatEvents.filter((e) => e.contacted).length;
  const speedAvg =
    chatEvents.filter((e) => e.speedToLeadSeconds != null).length > 0
      ? chatEvents
          .filter((e) => e.speedToLeadSeconds != null)
          .reduce((s, e) => s + (e.speedToLeadSeconds ?? 0), 0) /
        chatEvents.filter((e) => e.speedToLeadSeconds != null).length
      : 0;
  const contactRate = assigned ? contacted / assigned : 0;

  const calificados = chatEvents.filter((e) => e.qualified).length;
  const interesados = chatEvents.filter((e) => e.interested).length;
  const noCalificados = chatEvents.filter((e) => !e.qualified && e.contacted).length;

  const byAdvisor = advisors.filter((a) => ['adv-4', 'adv-5', 'adv-6', 'adv-7', 'adv-8'].includes(a.id)).map((a) => {
    const evts = chatEvents.filter((e) => e.advisorId === a.id);
    const leadIds = [...new Set(evts.map((e) => e.leadId))];
    const qual = evts.filter((e) => e.qualified).length;
    return {
      advisor: a,
      asignados: leadIds.length,
      activos: evts.filter((e) => e.contacted).length,
      respuesta: leadIds.length ? 100 : 0,
      calificados: qual,
      evts,
    };
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Total asignados
            <KpiTooltip significado={chatKpiTooltips.asignados.significado} calculo={chatKpiTooltips.asignados.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-cyan break-words">{assigned}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Tasa de contacto
            <KpiTooltip significado={chatKpiTooltips.tasaContacto.significado} calculo={chatKpiTooltips.tasaContacto.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-cyan break-words">{`${(contactRate * 100).toFixed(1)}%`}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-purple overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Speed to lead promedio
            <KpiTooltip significado={chatKpiTooltips.speedToLead.significado} calculo={chatKpiTooltips.speedToLead.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-purple break-words">{min(speedAvg)}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Calificados 👍
            <KpiTooltip significado={chatKpiTooltips.calificados.significado} calculo={chatKpiTooltips.calificados.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-green break-words">{calificados}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-amber overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            Interesados 💡
            <KpiTooltip significado={chatKpiTooltips.interesados.significado} calculo={chatKpiTooltips.interesados.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-amber break-words">{interesados}</p>
          <div className="mb-3" />
        </div>
        <div className="rounded-xl border border-surface-500 bg-surface-800 pl-4 border-l-4 border-l-accent-red overflow-hidden">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">
            No calificados 👎
            <KpiTooltip significado={chatKpiTooltips.noCalificados.significado} calculo={chatKpiTooltips.noCalificados.calculo} />
          </p>
          <p className="text-xl sm:text-2xl font-bold mt-0.5 text-accent-red break-words">{noCalificados}</p>
          <div className="mb-3" />
        </div>
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Chats por asesor (contacto dueño)
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          En esta sección no se muestra ningún chat por defecto. Despliega el <strong>contacto dueño (asesor)</strong> para ver sus leads y conversaciones; ahí aparece Ver conversación.
        </p>
        <div className="rounded-xl border border-surface-500 overflow-hidden">
          <ul className="divide-y divide-surface-500">
            {byAdvisor.map((r) => {
              const expanded = expandedAdvisor === r.advisor.id;
              const advisorLeads = getLeadsByAdvisor(r.advisor.id);
              return (
                <li key={r.advisor.id} className="bg-surface-800">
                  <button
                    type="button"
                    onClick={() => setExpandedAdvisor(expanded ? '' : r.advisor.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-700/50"
                  >
                    <span className="flex items-center gap-2 text-white font-medium">
                      {expanded ? <ChevronDown className="w-4 h-4 text-accent-cyan shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                      <User className="w-4 h-4 text-accent-cyan" />
                      {r.advisor.name}
                    </span>
                    <span className="text-xs text-gray-500">{r.asignados} asignado(s) · {r.calificados} calificados</span>
                  </button>
                  {expanded && (
                    <div className="border-t border-surface-500 px-4 py-3">
                      <div className="text-xs text-gray-400 mb-2">{r.advisor.name} · Asignados: {r.asignados} · Activos: {r.activos} · Calificados: {r.calificados}</div>
                      <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[360px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-surface-700">
                            <tr className="text-left text-gray-400">
                              <th className="px-3 py-2 font-medium">Lead</th>
                              <th className="px-3 py-2 font-medium">Última actividad</th>
                              <th className="px-3 py-2 font-medium">Seguimientos</th>
                              <th className="px-3 py-2 font-medium w-32" />
                            </tr>
                          </thead>
                          <tbody>
                            {advisorLeads.slice(0, 20).map((lead) => {
                              const leadEvts = chatEvents.filter((e) => e.leadId === lead.id).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
                              const showChat = expandedLeadIdChat === lead.id;
                              return (
                                <Fragment key={lead.id}>
                                  <tr className="border-t border-surface-500 hover:bg-surface-600/50">
                                    <td className="px-3 py-2 text-white">{lead.name}</td>
                                    <td className="px-3 py-2 text-gray-400 text-xs">
                                      {lead.lastContactAt ? formatDistanceToNow(new Date(lead.lastContactAt), { addSuffix: true, locale: es }) : 'Sin contacto'}
                                    </td>
                                    <td className="px-3 py-2 text-gray-400">{leadEvts.length}</td>
                                    <td className="px-3 py-2">
                                      <button
                                        type="button"
                                        className="text-accent-cyan text-xs font-medium"
                                        onClick={(e) => { e.stopPropagation(); setExpandedLeadIdChat(showChat ? '' : lead.id); }}
                                      >
                                        {showChat ? 'Ocultar conversación' : 'Ver conversación'}
                                      </button>
                                      <button type="button" className="text-gray-400 text-xs ml-2" onClick={(e) => { e.stopPropagation(); setLead360(lead); }}>
                                        Ver 360
                                      </button>
                                    </td>
                                  </tr>
                                  {showChat && (
                                    <tr className="bg-surface-700/80">
                                      <td colSpan={4} className="px-3 py-2 align-top">
                                        <div className="text-xs text-gray-400 mb-1 font-medium">Conversación (eventos de chat)</div>
                                        <ul className="space-y-2 max-h-48 overflow-y-auto">
                                          {leadEvts.length === 0 ? (
                                            <li className="text-gray-500">Sin eventos</li>
                                          ) : (
                                            leadEvts.map((evt) => (
                                              <li key={evt.id} className="rounded bg-surface-600 px-2 py-1.5 border-l-2 border-accent-cyan">
                                                <span className="text-gray-500">{format(new Date(evt.datetime), 'dd/MM/yy HH:mm')}</span>
                                                {evt.notes && <p className="text-gray-300 mt-0.5">{evt.notes}</p>}
                                                {evt.emojiStatus && <span className="ml-1">{evt.emojiStatus}</span>}
                                              </li>
                                            ))
                                          )}
                                        </ul>
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
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {lead360 && <Lead360Drawer lead={lead360} onClose={() => setLead360(null)} />}
    </div>
  );
}

