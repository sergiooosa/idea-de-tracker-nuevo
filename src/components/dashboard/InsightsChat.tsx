"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageSquare, Sparkles } from 'lucide-react';
import type { DashboardResponse } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type Intent =
  | 'objeciones' | 'speed_to_lead' | 'ranking' | 'leads_caida'
  | 'revenue' | 'tasa_cierre' | 'tasa_contestacion' | 'volumen_llamadas'
  | 'citas' | 'resumen_general' | 'embudo' | 'tags' | 'triggers' | 'unknown';

function detectIntent(query: string): Intent {
  const q = query.toLowerCase();
  if (/embudo|funnel|etapa|fase|pipeline/.test(q)) return 'embudo';
  if (/tag|etiqueta|label|marca/.test(q)) return 'tags';
  if (/trigger|emoji|disparador/.test(q)) return 'triggers';
  if (/objecion|objeciones/.test(q)) return 'objeciones';
  if (/speed|tiempo.*lead|rapidez|respuesta/.test(q)) return 'speed_to_lead';
  if (/ranking|mejor|peor|top|asesor|equipo/.test(q)) return 'ranking';
  if (/ca[ií]da|seguimiento|sin contacto|abandonado|perdiendo/.test(q)) return 'leads_caida';
  if (/revenue|ingreso|factur|dinero|venta|cobr|cash/.test(q)) return 'revenue';
  if (/tasa.*cierre|cierre|cerr|conversion/.test(q)) return 'tasa_cierre';
  if (/contest|contacto|tasa.*contact/.test(q)) return 'tasa_contestacion';
  if (/llamada|volumen|cuant/.test(q)) return 'volumen_llamadas';
  if (/cita|agenda|reunión|reuniones|pendiente|cancelad/.test(q)) return 'citas';
  if (/resumen|general|cómo va|como va|estado|panorama/.test(q)) return 'resumen_general';
  return 'unknown';
}

const fm = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;
const minFmt = (m: number) => m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`;

function buildResponse(intent: Intent, data: DashboardResponse): string {
  const { kpis, advisorRanking, objeciones } = data;
  const sorted = [...advisorRanking].sort((a, b) => (b.revenue + b.callsMade) - (a.revenue + a.callsMade));

  switch (intent) {
    case 'objeciones':
      if (objeciones.length === 0) return 'No hay objeciones registradas en los últimos 7 días.';
      return `Las objeciones más repetidas esta semana son: ${objeciones.slice(0, 5).map((o) => `**${o.name}** (${o.count}x)`).join(', ')}. Te recomiendo preparar respuestas tipo para las primeras.`;

    case 'speed_to_lead': {
      const withSpeed = sorted.filter((a) => a.speedToLeadAvg != null);
      if (withSpeed.length === 0) return 'No hay datos de speed to lead en este período.';
      const best = withSpeed.reduce((a, b) => (a.speedToLeadAvg ?? 99) < (b.speedToLeadAvg ?? 99) ? a : b);
      const worst = withSpeed.reduce((a, b) => (a.speedToLeadAvg ?? 0) > (b.speedToLeadAvg ?? 0) ? a : b);
      return `Promedio general: **${minFmt(kpis.speedToLeadAvg)}**. El más rápido es **${best.advisorName}** (${minFmt(best.speedToLeadAvg!)}). El más lento: **${worst.advisorName}** (${minFmt(worst.speedToLeadAvg!)}). Revisa la carga de trabajo del más lento.`;
    }

    case 'ranking':
      if (sorted.length === 0) return 'No hay actividad de asesores en este período.';
      return `Ranking esta semana:\n${sorted.slice(0, 5).map((a, i) => `${i + 1}. **${a.advisorName}** — ${a.callsMade} llamadas, ${a.meetingsBooked} agendadas, ${fm(a.revenue)} facturado`).join('\n')}`;

    case 'leads_caida':
      return `En este período hay **${kpis.totalLeads}** leads totales. Con una tasa de contestación del **${pctFmt(kpis.answerRate)}**, aproximadamente **${Math.round(kpis.totalLeads * (1 - kpis.answerRate))}** no han sido contactados efectivamente. Revisa los leads con más intentos sin respuesta.`;

    case 'revenue':
      return `Facturación total: **${fm(kpis.revenue)}**. Efectivo cobrado: **${fm(kpis.cashCollected)}**. Ticket promedio: **${fm(kpis.avgTicket)}**. ${sorted.length > 0 ? `El asesor que más factura es **${sorted[0].advisorName}** con ${fm(sorted[0].revenue)}.` : ''}`;

    case 'tasa_cierre':
      return `Tasa de cierre actual: **${kpis.tasaCierre.toFixed(1)}%** (${kpis.meetingsClosed} cerradas de ${kpis.meetingsAttended} asistidas). Tasa de agendamiento: **${kpis.tasaAgendamiento.toFixed(1)}%**.`;

    case 'tasa_contestacion':
      return `Tasa de contestación: **${pctFmt(kpis.answerRate)}** (${kpis.contestadas} contestadas de ${kpis.callsMade} llamadas). Intentos promedio: **${kpis.avgAttempts.toFixed(1)}** por lead.`;

    case 'volumen_llamadas':
      return `Total de llamadas esta semana: **${kpis.callsMade}**. Contestadas: **${kpis.contestadas}**. ${sorted.length > 0 ? `El que más llama es **${sorted.reduce((a, b) => a.callsMade > b.callsMade ? a : b).advisorName}**.` : ''}`;

    case 'citas':
      return `Citas agendadas: **${kpis.meetingsBooked}**. Asistieron: **${kpis.meetingsAttended}**. Canceladas: **${kpis.meetingsCanceled}**. Pendientes: **${Math.max(0, kpis.meetingsBooked - kpis.meetingsAttended - kpis.meetingsCanceled)}**. Efectivas (cierre u oferta): **${kpis.effectiveAppointments}**.`;

    case 'resumen_general':
      return `Resumen de la semana:\n• **${kpis.totalLeads}** leads, **${kpis.callsMade}** llamadas (${pctFmt(kpis.answerRate)} contestación)\n• **${kpis.meetingsBooked}** citas agendadas, **${kpis.meetingsAttended}** asistidas\n• **${kpis.meetingsClosed}** cerradas, tasa cierre **${kpis.tasaCierre.toFixed(1)}%**\n• Facturación **${fm(kpis.revenue)}**, cobrado **${fm(kpis.cashCollected)}**\n• Speed to lead promedio: **${minFmt(kpis.speedToLeadAvg)}**`;

    case 'embudo': {
      const dist = data.distribucionEmbudo;
      const etapas = data.embudoPersonalizado;
      if (etapas && etapas.length > 0) {
        const lines = etapas
          .sort((a, b) => a.orden - b.orden)
          .map((e) => `• **${e.nombre}**: ${dist?.[e.nombre] ?? 0} leads`);
        return `Tu embudo personalizado tiene ${etapas.length} etapas:\n${lines.join('\n')}`;
      }
      if (dist && Object.keys(dist).length > 0) {
        const lines = Object.entries(dist)
          .sort(([, a], [, b]) => b - a)
          .map(([k, v]) => `• **${k}**: ${v}`);
        return `Distribución por categoría:\n${lines.join('\n')}`;
      }
      return 'No hay datos de embudo disponibles en este período.';
    }

    case 'tags': {
      const tags = data.tagsDisponibles;
      if (tags && tags.length > 0) {
        return `Hay **${tags.length}** etiquetas internas en uso: ${tags.slice(0, 15).map((t) => `**${t}**`).join(', ')}${tags.length > 15 ? ` y ${tags.length - 15} más` : ''}. Puedes filtrar por etiquetas en el dashboard.`;
      }
      return 'No hay etiquetas internas registradas en este período.';
    }

    case 'triggers':
      return 'Los **Triggers de Chat** permiten que los asesores cambien el estado de un lead enviando un emoji en el chat (ej. 💰 → Cerrada). Consulta la sección de **Documentación** en el menú lateral para ver tus triggers configurados.';

    case 'unknown':
      return 'No tengo contexto suficiente para responder eso. Puedes preguntar por:\n• Objeciones de la semana\n• Speed to lead por asesor\n• Ranking de asesores\n• Facturación y revenue\n• Tasa de cierre o contestación\n• Citas pendientes o canceladas\n• Embudo y distribución por etapa\n• Etiquetas internas\n• Triggers de chat\n• Resumen general\n\nEscribe tu pregunta y la respondo con datos reales.';
  }
}

export default function InsightsChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: 'Hola. Soy tu copiloto de datos v2.0. Puedo responderte con información real de los últimos 7 días. Pregunta por objeciones, speed to lead, ranking, revenue, citas, embudo personalizado, etiquetas internas, triggers de chat y más.' },
  ]);
  const [input, setInput] = useState('');
  const [dashData, setDashData] = useState<DashboardResponse | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const to = now.toISOString().slice(0, 10);
    fetch(`/api/data/dashboard?from=${from}&to=${to}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setDashData(d); })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, []);

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);

    setTimeout(() => {
      let reply: string;
      if (!dashData) {
        reply = 'Todavía estoy cargando los datos del dashboard. Intenta de nuevo en unos segundos.';
      } else {
        const intent = detectIntent(text);
        reply = buildResponse(intent, dashData);
      }
      setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: 'assistant', content: reply }]);
    }, 300);
  }, [input, dashData]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col md:max-w-md md:right-6 md:bottom-24 md:top-auto md:rounded-2xl md:inset-auto md:h-[480px] bg-surface-800 border border-surface-500 shadow-2xl animate-fade-in overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-surface-500 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-cyan" />
          <span className="font-semibold text-white">Habla con tus datos</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30">Beta</span>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loadingData && (
          <div className="text-center py-2 text-xs text-gray-500 animate-pulse">Cargando datos del dashboard...</div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-accent-cyan/20 text-white' : 'bg-surface-700 text-gray-200'}`}>
              {msg.role === 'assistant' && msg.content.includes('**') ? (
                <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-accent-cyan">$1</strong>') }} />
              ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-surface-500 shrink-0">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ej: ¿Cómo va la facturación esta semana?"
            className="flex-1 rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/50" />
          <button type="button" onClick={send} className="p-2 rounded-lg bg-accent-cyan text-white hover:opacity-90">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
