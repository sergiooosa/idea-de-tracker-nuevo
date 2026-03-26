"use client";

import { useState, useMemo, Fragment } from 'react';
import { useT } from '@/contexts/LocaleContext';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import type { ChatsResponse, ApiChatLead } from '@/types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, User, X, Plus } from 'lucide-react';
import NuevoRegistroModal from '@/components/dashboard/NuevoRegistroModal';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';

const minFmt = (s: number | null) => {
  if (s == null || s === 0) return '—';
  return s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)} min`;
};

const chatKpiTooltips = {
  asignados: { significado: 'Cantidad de conversaciones de chat en el rango.', calculo: 'Conteo de registros en chats_logs.' },
  activos: { significado: 'Chats donde el agente respondió al menos una vez.', calculo: 'Chats con al menos un mensaje de role "agent".' },
  contactados: { significado: 'Chats donde un asesor respondió al menos una vez.', calculo: 'Conteo de chats con agentMessages > 0 en el período.' },
  seguimientos: { significado: 'Total de mensajes en todas las conversaciones.', calculo: 'Suma de todos los mensajes del JSONB.' },
  speedToLead: { significado: 'Tiempo promedio desde primer mensaje del lead hasta primera respuesta del agente.', calculo: 'Promedio de (timestamp primer msg agente − timestamp primer msg lead).' },
};

type Canal = 'todos' | 'WhatsApp' | 'FB' | 'IG' | 'SMS' | 'Custom';

const CANAL_EMOJI: Record<string, string> = {
  WhatsApp: '📱',
  FB: '👤',
  IG: '📸',
  SMS: '💬',
  Custom: '⚙️',
};

const CANAL_LABELS: Canal[] = ['todos', 'WhatsApp', 'FB', 'IG', 'SMS', 'Custom'];

function detectCanal(chat: ApiChatLead): string {
  if (!chat.messages || chat.messages.length === 0) return 'Custom';
  const firstMsg = chat.messages[0];
  const t = (firstMsg?.type ?? '').toLowerCase();
  if (t.includes('whatsapp') || t === 'wa') return 'WhatsApp';
  if (t.includes('fb') || t.includes('facebook') || t.includes('messenger')) return 'FB';
  if (t.includes('ig') || t.includes('instagram')) return 'IG';
  if (t.includes('sms')) return 'SMS';
  return 'Custom';
}

export default function PerformanceChatsPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalConversacion, setModalConversacion] = useState<ApiChatLead | null>(null);
  const [editingRecord, setEditingRecord] = useState<{id: number; nombre_lead: string | null; closer: string | null; estado: string | null} | null>(null);
  const [canalActivo, setCanalActivo] = useState<Canal>('todos');
  const [showNuevoModal, setShowNuevoModal] = useState(false);

  const { data, loading, refetch } = useApiData<ChatsResponse>('/api/data/chats', { from: dateFrom, to: dateTo });

  const agg = data?.agg ?? { assigned: 0, activos: 0, seguimientosTotal: 0, speedAvg: 0 };

  // Compute canal counts for badges
  const canalCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: 0 };
    if (!data) return counts;
    counts['todos'] = data.chats.length;
    for (const c of data.chats) {
      const canal = detectCanal(c);
      counts[canal] = (counts[canal] ?? 0) + 1;
    }
    return counts;
  }, [data]);

  // Filter chats by canal
  const filteredChats = useMemo(() => {
    if (!data) return [];
    if (canalActivo === 'todos') return data.chats;
    return data.chats.filter((c) => detectCanal(c) === canalActivo);
  }, [data, canalActivo]);

  const chatsByAgent = useMemo(() => {
    const map: Record<string, ApiChatLead[]> = {};
    for (const c of filteredChats) {
      const key = c.agentName ?? 'Sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return map;
  }, [filteredChats]);

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
        <button
          type="button"
          onClick={() => setShowNuevoModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-xs font-semibold hover:bg-accent-cyan/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva entrada
        </button>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase">Beta</span>
        <span className="text-xs text-gray-400">Rango de fechas:</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
      </div>

      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        {[
          { label: t.performance.chats.kpis.asignados, value: agg.assigned, color: 'cyan', tip: chatKpiTooltips.asignados },
          { label: t.performance.chats.kpis.activos, value: agg.activos, color: 'cyan', tip: chatKpiTooltips.activos },
          { label: t.performance.chats.kpis.contactados, value: agg.activos, color: 'cyan', tip: chatKpiTooltips.contactados },
          { label: t.performance.chats.kpis.mensajes, value: agg.seguimientosTotal, color: 'purple', tip: chatKpiTooltips.seguimientos },
          { label: t.performance.chats.kpis.speedToLead, value: minFmt(agg.speedAvg), color: 'purple', tip: chatKpiTooltips.speedToLead },
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

      {/* ── Filtro por canal ── */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 font-medium">{t.performance.chats.canal}:</span>
          <div className="flex flex-wrap gap-1.5">
            {CANAL_LABELS.map((canal) => {
              const count = canalCounts[canal] ?? 0;
              const isActive = canalActivo === canal;
              return (
                <button
                  key={canal}
                  type="button"
                  onClick={() => setCanalActivo(canal)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                    isActive
                      ? 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50'
                      : 'bg-surface-700 text-gray-400 border-surface-500 hover:border-accent-cyan/30 hover:text-gray-300'
                  }`}
                >
                  {canal !== 'todos' && <span>{CANAL_EMOJI[canal]}</span>}
                  {canal === 'todos' ? t.performance.chats.todos : canal}
                  {count > 0 && (
                    <span className={`rounded-full px-1 text-[10px] ${isActive ? 'bg-accent-cyan/30' : 'bg-surface-600'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {canalActivo !== 'todos' && (
          <p className="text-[11px] text-gray-500">
            Mostrando {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''} del canal {CANAL_EMOJI[canalActivo]} {canalActivo}
          </p>
        )}
      </div>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.performance.chats.titulo}</h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {Object.keys(chatsByAgent).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">{t.performance.chats.noData}{canalActivo !== 'todos' ? ` (${canalActivo})` : ''}</div>
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
                      const agentActivos = agentChats.filter((c) => c.agentMessages > 0).length;
                      const agentSpeeds = agentChats.filter((c) => c.speedToLeadSeconds != null).map((c) => c.speedToLeadSeconds!);
                      const agentSpeedAvg = agentSpeeds.length > 0 ? agentSpeeds.reduce((s, v) => s + v, 0) / agentSpeeds.length : null;
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
                            <td className="px-2 py-2 text-accent-cyan">{agentChats.length}</td>
                            <td className="px-2 py-2 text-accent-cyan">{agentActivos}</td>
                            <td className="px-2 py-2 text-accent-purple">{agentChats.reduce((s, c) => s + c.totalMessages, 0)}</td>
                            <td className="px-2 py-2 text-gray-300">{minFmt(agentSpeedAvg)}</td>
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
                                          <th className="px-2 py-2 font-medium w-8">Canal</th>
                                          <th className="px-2 py-2 font-medium">Lead</th>
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Mensajes</th>
                                          <th className="px-2 py-2 font-medium">Speed to lead</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium w-32" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {agentChats.map((chat) => {
                                          const canal = detectCanal(chat);
                                          return (
                                            <tr key={chat.id} className="border-t border-surface-500 hover:bg-surface-600/50">
                                              <td className="px-2 py-2 text-center" title={canal}>
                                                <span className="text-base">{CANAL_EMOJI[canal] ?? '⚙️'}</span>
                                              </td>
                                              <td className="px-2 py-2 text-white">{chat.leadName ?? '—'}</td>
                                              <td className="px-2 py-2 text-gray-400">{chat.datetime ? format(new Date(chat.datetime), 'dd/MM/yy HH:mm', { locale: es }) : '—'}</td>
                                              <td className="px-2 py-2 text-accent-purple">{chat.totalMessages}</td>
                                              <td className="px-2 py-2 text-gray-400">{minFmt(chat.speedToLeadSeconds)}</td>
                                              <td className="px-2 py-2 text-gray-300">{chat.estado ?? '—'}</td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => setEditingRecord({ id: chat.id, nombre_lead: chat.leadName, closer: chat.agentName, estado: chat.estado })} className="text-accent-amber text-[10px] inline-flex items-center gap-0.5 mr-2"><Pencil className="w-3 h-3" /> Editar</button>
                                                <button type="button" onClick={() => setModalConversacion(chat)} className="text-accent-cyan text-[10px] font-medium hover:underline">
                                                  Ver conversación
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

      {editingRecord && (
        <EditRecordSheet
          type="chat"
          record={editingRecord}
          advisors={data?.advisors?.map(a => ({ name: a.name, email: a.email })) ?? []}
          onClose={() => setEditingRecord(null)}
          onSaved={() => setEditingRecord(null)}
        />
      )}
      {modalConversacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalConversacion(null)} aria-hidden />
          <div className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span>{CANAL_EMOJI[detectCanal(modalConversacion)] ?? '💬'}</span>
                Conversación · {modalConversacion.leadName ?? 'Lead'}
              </h3>
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
      <NuevoRegistroModal
        open={showNuevoModal}
        onClose={() => setShowNuevoModal(false)}
        onSuccess={() => refetch()}
        tipo="chat"
      />
    </div>
  );
}
