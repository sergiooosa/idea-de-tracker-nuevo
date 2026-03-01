"use client";

import { useState, useMemo, Fragment } from 'react';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import type { ChatsResponse, ApiChatLead } from '@/types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, X } from 'lucide-react';

const minFmt = (s: number | null) => {
  if (s == null || s === 0) return '—';
  return s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)} min`;
};

const chatKpiTooltips = {
  asignados: { significado: 'Cantidad de conversaciones de chat en el rango.', calculo: 'Conteo de registros en chats_logs.' },
  activos: { significado: 'Chats donde el agente respondió al menos una vez.', calculo: 'Chats con al menos un mensaje de role "agent".' },
  seguimientos: { significado: 'Total de mensajes en todas las conversaciones.', calculo: 'Suma de todos los mensajes del JSONB.' },
  speedToLead: { significado: 'Tiempo promedio desde primer mensaje del lead hasta primera respuesta del agente.', calculo: 'Promedio de (timestamp primer msg agente − timestamp primer msg lead).' },
};

export default function PerformanceChatsPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalConversacion, setModalConversacion] = useState<ApiChatLead | null>(null);

  const { data, loading } = useApiData<ChatsResponse>('/api/data/chats', { from: dateFrom, to: dateTo });

  const agg = data?.agg ?? { assigned: 0, activos: 0, seguimientosTotal: 0, speedAvg: 0 };

  const chatsByAgent = useMemo(() => {
    if (!data) return {} as Record<string, ApiChatLead[]>;
    const map: Record<string, ApiChatLead[]> = {};
    for (const c of data.chats) {
      const key = c.agentName ?? 'Sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [data]);

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 14);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-sm animate-pulse">Cargando datos de chats...</div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-0">
        <span className="text-xs text-gray-400">Rango de fechas:</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
      </div>

      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        {[
          { label: 'Chats asignados', value: agg.assigned, color: 'cyan', tip: chatKpiTooltips.asignados },
          { label: 'Chats activos', value: agg.activos, color: 'cyan', tip: chatKpiTooltips.activos },
          { label: 'Mensajes totales', value: agg.seguimientosTotal, color: 'purple', tip: chatKpiTooltips.seguimientos },
          { label: 'Speed to lead prom.', value: minFmt(agg.speedAvg), color: 'purple', tip: chatKpiTooltips.speedToLead },
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

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chats por agente</h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {Object.keys(chatsByAgent).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">No hay chats en el rango.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">Agente</th>
                    <th className="px-2 py-2 font-medium">Asignados</th>
                    <th className="px-2 py-2 font-medium">Activos</th>
                    <th className="px-2 py-2 font-medium">Mensajes</th>
                    <th className="px-2 py-2 font-medium">Speed to lead</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(chatsByAgent)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([agentKey, agentChats]) => {
                      const isExpanded = expandedAdvisorId === agentKey;
                      const metrics = data?.advisorMetrics[agentKey];
                      return (
                        <Fragment key={agentKey}>
                          <tr className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer" onClick={() => setExpandedAdvisorId(isExpanded ? null : agentKey)}>
                            <td className="px-1 py-2 text-gray-400">
                              <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-1.5 text-white font-medium">
                                <User className="w-3.5 h-3.5 text-accent-cyan" />
                                {agentKey}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.asignados ?? 0}</td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.activos ?? 0}</td>
                            <td className="px-2 py-2 text-accent-purple">{metrics?.seguimientos ?? 0}</td>
                            <td className="px-2 py-2 text-gray-300">{minFmt(metrics?.speedToLead ?? null)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={6} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Chats de {agentKey}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[360px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Lead</th>
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Mensajes</th>
                                          <th className="px-2 py-2 font-medium">Speed to lead</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium w-32" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {agentChats.map((chat) => (
                                          <tr key={chat.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                            <td className="px-2 py-2 text-white">{chat.leadName ?? '—'}</td>
                                            <td className="px-2 py-2 text-gray-400">{chat.datetime ? format(new Date(chat.datetime), 'dd/MM/yy HH:mm') : '—'}</td>
                                            <td className="px-2 py-2 text-accent-purple">{chat.totalMessages}</td>
                                            <td className="px-2 py-2 text-gray-400">{minFmt(chat.speedToLeadSeconds)}</td>
                                            <td className="px-2 py-2 text-gray-300">{chat.estado ?? '—'}</td>
                                            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                              <button type="button" onClick={() => setModalConversacion(chat)} className="text-accent-cyan text-[10px] font-medium hover:underline">
                                                Ver conversación
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalConversacion(null)} aria-hidden />
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
              <h3 className="font-semibold text-white">Conversación · {modalConversacion.leadName ?? 'Lead'}</h3>
              <button type="button" onClick={() => setModalConversacion(null)} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {modalConversacion.messages.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay mensajes en esta conversación.</p>
              ) : (
                modalConversacion.messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'lead' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'lead' ? 'bg-surface-700 text-gray-200' : 'bg-accent-cyan/20 text-white'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium text-gray-400">{msg.name}</span>
                        {msg.timestamp && <span className="text-[9px] text-gray-500">{format(new Date(msg.timestamp), 'HH:mm')}</span>}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
