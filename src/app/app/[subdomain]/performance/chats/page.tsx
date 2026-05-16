"use client";

import React, { useState, useMemo, Fragment } from 'react';
import { useT } from '@/contexts/LocaleContext';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import type { ChatsResponse, ApiChatLead } from '@/types';
import type { MetricaConfig } from '@/lib/db/schema';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Pencil, User, X, Plus, Sparkles, AlertTriangle } from 'lucide-react';
import NuevoRegistroModal from '@/components/dashboard/NuevoRegistroModal';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';
import InsightsChat from '@/components/dashboard/InsightsChat';

const minFmt = (s: number | null) => {
  if (s == null || s === 0) return '—';
  return s < 60 ? `${Math.round(s)}s` : `${(s / 60).toFixed(1)} min`;
};

/** Formatea minutos de espera con colores: verde <15, amarillo <60, rojo ≥60 */
function waitBadge(minutes: number | null): React.ReactNode {
  if (minutes == null) return <span className="text-gray-500">—</span>;
  if (minutes < 15) return <span className="text-green-400 font-medium">{minutes}m</span>;
  if (minutes < 60) return <span className="text-accent-amber font-medium">{minutes}m ⚠️</span>;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const label = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${minutes}m`;
  return <span className="text-red-400 font-bold">{label} 🔴</span>;
}

const chatKpiTooltips = {
  asignados: { significado: 'Cantidad de conversaciones de chat en el rango.', calculo: 'Conteo de registros en chats_logs.' },
  activos: { significado: 'Chats donde el agente respondió al menos una vez.', calculo: 'Chats con al menos un mensaje de role "agent".' },
  contactados: { significado: 'Chats donde un asesor respondió al menos una vez.', calculo: 'Conteo de chats con agentMessages > 0 en el período.' },
  seguimientos: { significado: 'Total de mensajes en todas las conversaciones.', calculo: 'Suma de todos los mensajes del JSONB.' },
  speedToLead: { significado: 'Tiempo promedio desde primer mensaje del lead hasta primera respuesta del agente.', calculo: 'Promedio de (timestamp primer msg agente − timestamp primer msg lead).' },
  sinRespuesta: { significado: 'Chats donde el lead esperó respuesta y aún no hubo una del agente.', calculo: 'Chats con minutesSinceLastLeadMsg != null (el agente no respondió después del último mensaje del lead).' },
  sinContactar: { significado: '% de chats donde ningún humano respondió al lead.', calculo: 'Chats sin humanTookOver / total × 100.' },
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

/** Convierte una categoría IA cruda a label capitalizada legible */
function categoriaLabel(cat: string): string {
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
}

/** Formatea el valor de una métrica custom según su formato */
function fmtMetricaValue(value: number | null, formato: MetricaConfig["formato"]): string {
  if (value === null || value === undefined) return '—';
  switch (formato) {
    case 'moneda': return `$${value.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
    case 'porcentaje': return `${value.toFixed(1)}%`;
    case 'tiempo': return value < 60 ? `${Math.round(value)}s` : `${(value / 60).toFixed(1)} min`;
    case 'decimal': return value.toFixed(2);
    default: return value.toLocaleString('es-MX', { maximumFractionDigits: 1 });
  }
}

const OBJECION_CATEGORIA_EMOJI: Record<string, string> = {
  precio: '💰',
  tiempo: '⏰',
  confianza: '🤝',
  competencia: '⚔️',
  necesidad: '🤔',
  autoridad: '👔',
  otra: '💬',
};

export default function PerformanceChatsPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 14), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalConversacion, setModalConversacion] = useState<ApiChatLead | null>(null);
  const [editingRecord, setEditingRecord] = useState<{id: number; nombre_lead: string | null; closer: string | null; estado: string | null} | null>(null);
  const [canalActivo, setCanalActivo] = useState<Canal>('todos');
  const [soloSinContactar, setSoloSinContactar] = useState(false);
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [showInsightsChat, setShowInsightsChat] = useState(false);

  const { data, loading, refetch } = useApiData<ChatsResponse>('/api/data/chats', { from: dateFrom, to: dateTo });

  const agg = data?.agg ?? { assigned: 0, activos: 0, seguimientosTotal: 0, speedAvg: 0 };

  // KPIs adicionales calculados en el cliente
  const extraKpis = useMemo(() => {
    if (!data) return { sinRespuesta: 0, pctSinContactar: 0 };
    const sinRespuesta = data.chats.filter((c) => c.minutesSinceLastLeadMsg != null).length;
    const sinContactar = data.chats.filter((c) => !c.humanTookOver).length;
    const pctSinContactar = data.chats.length > 0 ? Math.round((sinContactar / data.chats.length) * 100) : 0;
    return { sinRespuesta, pctSinContactar };
  }, [data]);

  // Distribución de ia_categoria (top 6 temas de interés)
  const categoriasDistrib = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const c of data.chats) {
      if (c.iaCategoria) {
        counts[c.iaCategoria] = (counts[c.iaCategoria] ?? 0) + 1;
      }
    }
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([cat, count]) => ({ cat, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
  }, [data]);

  // Distribución de objeciones IA (top 8)
  const objecionesDistrib = useMemo(() => {
    if (!data) return [];
    const counts: Record<string, number> = {};
    for (const c of data.chats) {
      if (c.iaObjeciones) {
        for (const obj of c.iaObjeciones) {
          const key = obj.categoria ?? 'otra';
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
    }
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([cat, count]) => ({ cat, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));
  }, [data]);

  // Total de objeciones detectadas
  const totalObjeciones = useMemo(() => {
    if (!data) return 0;
    return data.chats.reduce((s, c) => s + (c.iaObjeciones?.length ?? 0), 0);
  }, [data]);

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

  // Filter chats by canal + sin contactar
  const filteredChats = useMemo(() => {
    if (!data) return [];
    let chats = canalActivo === 'todos' ? data.chats : data.chats.filter((c) => detectCanal(c) === canalActivo);
    if (soloSinContactar) chats = chats.filter((c) => !c.humanTookOver);
    return chats;
  }, [data, canalActivo, soloSinContactar]);

  const chatsByAgent = useMemo(() => {
    const map: Record<string, ApiChatLead[]> = {};
    const INVALID = new Set(['', 'agente', 'agent', 'bot', 'por asignar', 'workflow', 'api/bot', 'campaña', 'campaign']);
    for (const c of filteredChats) {
      const raw = (c.asesorAsignado?.trim() || c.agentName?.trim() || '').toLowerCase();
      const key = (!raw || INVALID.has(raw))
        ? 'Sin asignar'
        : (c.asesorAsignado?.trim() || c.agentName?.trim())!;
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

        <button
          type="button"
          onClick={() => setShowInsightsChat(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-purple/20 text-accent-purple border border-accent-purple/40 text-xs font-semibold hover:bg-accent-purple/30 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" /> Habla con tus datos
        </button>

        <span className="text-xs text-gray-400">Rango de fechas:</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
      </div>

      {/* ── KPIs principales ── */}
      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        {[
          { label: t.performance.chats.kpis.asignados, value: agg.assigned, color: 'cyan', tip: chatKpiTooltips.asignados },
          { label: t.performance.chats.kpis.activos, value: agg.activos, color: 'cyan', tip: chatKpiTooltips.activos },
          { label: t.performance.chats.kpis.contactados, value: agg.activos, color: 'cyan', tip: chatKpiTooltips.contactados },
          { label: t.performance.chats.kpis.mensajes, value: agg.seguimientosTotal, color: 'purple', tip: chatKpiTooltips.seguimientos },
          { label: t.performance.chats.kpis.speedToLead, value: minFmt(agg.speedAvg), color: 'purple', tip: chatKpiTooltips.speedToLead },
          { label: 'Sin respuesta', value: extraKpis.sinRespuesta, color: 'amber', tip: chatKpiTooltips.sinRespuesta },
          { label: '% Sin contactar', value: `${extraKpis.pctSinContactar}%`, color: 'amber', tip: chatKpiTooltips.sinContactar },
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

      {/* ── KPIs custom tipo "chat" ── */}
      {data?.metricasChatConfig && data.metricasChatConfig.length > 0 && data.metricasCustom && (
        <section>
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Métricas custom de chats</h3>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
            {data.metricasChatConfig.map((m) => {
              const valor = data.metricasCustom?.[m.id] ?? null;
              const colorClass = m.color ?? 'purple';
              return (
                <div key={m.id} className={`rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-${colorClass} kpi-card-fixed`} title={m.descripcion ?? m.nombre}>
                  <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate pr-2">{m.nombre}</p>
                  <p className={`text-base font-bold mt-0.5 text-accent-${colorClass}`}>
                    {fmtMetricaValue(valor, m.formato as MetricaConfig["formato"])}
                  </p>
                  <div className="kpi-card-spacer" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Panel de intereses IA (ia_categoria) ── */}
      {categoriasDistrib.length > 0 && (
        <section className="rounded-lg border border-surface-500 p-3 bg-surface-800/50">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Top intereses detectados por IA</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriasDistrib.map(({ cat, count, pct }) => (
              <div key={cat} className="flex items-center gap-1.5 bg-surface-700 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-semibold text-white">{categoriaLabel(cat)}</span>
                <span className="text-[10px] text-accent-purple font-bold">{count}</span>
                <span className="text-[10px] text-gray-500">({pct}%)</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Basado en análisis nocturno de la IA sobre conversaciones del período seleccionado.</p>
        </section>
      )}

      {/* ── Panel de objeciones IA ── */}
      {objecionesDistrib.length > 0 && (
        <section className="rounded-lg border border-surface-500 p-3 bg-surface-800/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Objeciones detectadas por IA
            </h3>
            <span className="ml-auto text-[10px] text-accent-amber font-bold">{totalObjeciones} total</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {objecionesDistrib.map(({ cat, count, pct }) => (
              <div key={cat} className="flex items-center gap-1.5 bg-surface-700 rounded-lg px-2.5 py-1.5">
                <span className="text-base leading-none">{OBJECION_CATEGORIA_EMOJI[cat] ?? '💬'}</span>
                <span className="text-xs font-semibold text-white">{categoriaLabel(cat)}</span>
                <span className="text-[10px] text-accent-amber font-bold">{count}</span>
                <span className="text-[10px] text-gray-500">({pct}%)</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Objeciones agrupadas por categoría. Basadas en análisis nocturno de la IA sobre las conversaciones del período.
          </p>
        </section>
      )}

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
        <button
          type="button"
          onClick={() => setSoloSinContactar(!soloSinContactar)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
            soloSinContactar
              ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/50'
              : 'bg-surface-700 text-gray-400 border-surface-500 hover:border-accent-amber/30 hover:text-gray-300'
          }`}
        >
          ⚡ Sin contactar
          {data && (
            <span className={`rounded-full px-1 text-[10px] ${soloSinContactar ? 'bg-accent-amber/30' : 'bg-surface-600'}`}>
              {data.chats.filter((c) => !c.humanTookOver).length}
            </span>
          )}
        </button>
        {(canalActivo !== 'todos' || soloSinContactar) && (
          <p className="text-[11px] text-gray-500">
            Mostrando {filteredChats.length} chat{filteredChats.length !== 1 ? 's' : ''}
            {canalActivo !== 'todos' ? ` del canal ${CANAL_EMOJI[canalActivo]} ${canalActivo}` : ''}
            {soloSinContactar ? ' · sin contactar' : ''}
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
                      const agentActivos = agentChats.filter((c) => c.humanTookOver).length;
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
                              <td colSpan={8} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Chats de {agentKey}</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[360px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium w-8">Canal</th>
                                          <th className="px-2 py-2 font-medium">Lead</th>
                                          <th className="px-2 py-2 font-medium">Asignado</th>
                                          <th className="px-2 py-2 font-medium">Fecha</th>
                                          <th className="px-2 py-2 font-medium">Msgs</th>
                                          <th className="px-2 py-2 font-medium">Speed</th>
                                          <th className="px-2 py-2 font-medium" title="Minutos desde último mensaje del lead sin respuesta del agente">⏳ Espera</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium">Interés IA</th>
                                          <th className="px-2 py-2 font-medium" title="Objeciones detectadas por IA">Objeciones</th>
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
                                              <td className="px-2 py-2">
                                                {chat.asesorAsignado ? (
                                                  <span className="text-accent-cyan font-medium">{chat.asesorAsignado}</span>
                                                ) : chat.agentName ? (
                                                  <span className="text-gray-300">{chat.agentName}</span>
                                                ) : (
                                                  <span className="text-gray-500 italic">Sin asignar</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-2 text-gray-400">{chat.datetime ? format(new Date(chat.datetime), 'dd/MM/yy HH:mm', { locale: es }) : '—'}</td>
                                              <td className="px-2 py-2 text-accent-purple">{chat.totalMessages}</td>
                                              <td className="px-2 py-2 text-gray-400">{minFmt(chat.speedToLeadSeconds)}</td>
                                              <td className="px-2 py-2">{waitBadge(chat.minutesSinceLastLeadMsg)}</td>
                                              <td className="px-2 py-2 text-gray-300">{chat.estado ?? '—'}</td>
                                              <td className="px-2 py-2">
                                                {chat.iaCategoria ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-purple/10 text-accent-purple border border-accent-purple/20 font-medium">
                                                    {categoriaLabel(chat.iaCategoria)}
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-600 text-[10px]">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-2">
                                                {chat.iaObjeciones && chat.iaObjeciones.length > 0 ? (
                                                  <div className="flex flex-wrap gap-0.5">
                                                    {chat.iaObjeciones.slice(0, 2).map((obj, i) => (
                                                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-accent-amber/10 text-accent-amber border border-accent-amber/20 font-medium" title={obj.objecion}>
                                                        {OBJECION_CATEGORIA_EMOJI[obj.categoria] ?? '💬'} {categoriaLabel(obj.categoria)}
                                                      </span>
                                                    ))}
                                                    {chat.iaObjeciones.length > 2 && (
                                                      <span className="text-[10px] text-gray-500">+{chat.iaObjeciones.length - 2}</span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-gray-600 text-[10px]">—</span>
                                                )}
                                              </td>
                                              <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                                <button type="button" onClick={() => setEditingRecord({ id: chat.id, nombre_lead: chat.leadName, closer: chat.asesorAsignado ?? chat.agentName, estado: chat.estado })} className="text-accent-amber text-[10px] inline-flex items-center gap-0.5 mr-2"><Pencil className="w-3 h-3" /> Editar</button>
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
          onSaved={() => { setEditingRecord(null); refetch(); }}
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
      {showInsightsChat && <InsightsChat onClose={() => setShowInsightsChat(false)} />}
    </div>
  );
}
