"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/dashboard/PageHeader';
import { ChevronRight, ChevronLeft, Phone, Video, Tag, BarChart3, Building2, Save, Target, Loader2, Key, GitBranch, MessageSquare, Database, Plus, Trash2, GripVertical, ArrowRight } from 'lucide-react';

interface TagRule { id: string; condition: string; tag: string; source: string }
interface MetricRule {
  id: string; name: string; description: string; condition: string;
  increment: number; whenMeasured: string; isRecurring: 'recurrente' | 'unica';
  section: string; panel: string;
}
interface EmbudoEtapa { id: string; nombre: string; color?: string; orden: number }
interface ChatTrigger { trigger: string; accion: string; valor: string }
interface SystemConfig {
  prompt_ventas: string; prompt_videollamadas: string; prompt_llamadas: string;
  reglas_etiquetas: TagRule[]; metricas_personalizadas: MetricRule[];
  chat_triggers: ChatTrigger[]; embudo_personalizado: EmbudoEtapa[];
  has_openai_key: boolean; fuente_datos_financieros: 'nativa' | 'api_externa';
}
interface MetasData {
  meta_llamadas_diarias: number; leads_nuevos_dia_1: number;
  leads_nuevos_dia_2: number; leads_nuevos_dia_3: number;
}

const EMBUDO_COLORS = ['#06b6d4', '#8b5cf6', '#22c55e', '#f97316', '#ef4444', '#eab308', '#ec4899', '#14b8a6'];

const sections = ['Performance', 'Panel asesor', 'Resumen adquisición', 'Panel ejecutivo', 'Otro'];
const panelsBySection: Record<string, string[]> = {
  Performance: ['Llamadas', 'Videollamadas', 'Chats'],
  'Panel asesor': ['KPIs período'],
  'Resumen adquisición': ['Tabla por canal'],
  'Panel ejecutivo': ['KPIs globales', 'Ranking asesores'],
  Otro: [],
};

export default function SystemPage() {
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const TOTAL_STEPS = 10;
  const initialStep = Math.min(TOTAL_STEPS, Math.max(1, Number(stepParam) || 1));
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [promptEmpresa, setPromptEmpresa] = useState('');
  const [promptEvaluacion, setPromptEvaluacion] = useState('');
  const [promptLlamadas, setPromptLlamadas] = useState('');
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [metricRules, setMetricRules] = useState<MetricRule[]>([]);
  const [metas, setMetas] = useState<MetasData>({ meta_llamadas_diarias: 50, leads_nuevos_dia_1: 3, leads_nuevos_dia_2: 4, leads_nuevos_dia_3: 5 });

  const [openaiKey, setOpenaiKey] = useState('');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [embudoEtapas, setEmbudoEtapas] = useState<EmbudoEtapa[]>([]);
  const [chatTriggers, setChatTriggers] = useState<ChatTrigger[]>([]);
  const [fuenteFinanciera, setFuenteFinanciera] = useState<'nativa' | 'api_externa'>('nativa');

  const loadData = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const [cfgRes, metasRes] = await Promise.all([
        fetch('/api/data/system-config'),
        fetch('/api/data/metas'),
      ]);
      if (cfgRes.ok) {
        const cfg: SystemConfig = await cfgRes.json();
        setPromptEmpresa(cfg.prompt_ventas);
        setPromptEvaluacion(cfg.prompt_videollamadas);
        setPromptLlamadas(cfg.prompt_llamadas);
        setTagRules(cfg.reglas_etiquetas.length > 0 ? cfg.reglas_etiquetas : []);
        setMetricRules(cfg.metricas_personalizadas.length > 0 ? cfg.metricas_personalizadas : []);
        setChatTriggers(Array.isArray(cfg.chat_triggers) ? cfg.chat_triggers : []);
        setEmbudoEtapas(Array.isArray(cfg.embudo_personalizado) ? cfg.embudo_personalizado : []);
        setHasOpenaiKey(cfg.has_openai_key ?? false);
        setFuenteFinanciera(cfg.fuente_datos_financieros ?? 'nativa');
      }
      if (metasRes.ok) {
        const m = await metasRes.json();
        setMetas({ meta_llamadas_diarias: m.meta_llamadas_diarias, leads_nuevos_dia_1: m.leads_nuevos_dia_1, leads_nuevos_dia_2: m.leads_nuevos_dia_2, leads_nuevos_dia_3: m.leads_nuevos_dia_3 });
      }
    } catch { /* silently use defaults */ }
    setLoadingConfig(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        prompt_ventas: promptEmpresa,
        prompt_videollamadas: promptEvaluacion,
        prompt_llamadas: promptLlamadas,
        reglas_etiquetas: tagRules,
        metricas_personalizadas: metricRules,
        chat_triggers: chatTriggers,
        embudo_personalizado: embudoEtapas,
        fuente_datos_financieros: fuenteFinanciera,
      };
      if (openaiKey) payload.openai_api_key = openaiKey;
      await fetch('/api/data/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (openaiKey) {
        setHasOpenaiKey(true);
        setOpenaiKey('');
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const saveMetas = async () => {
    setSaving(true);
    try {
      await fetch('/api/data/metas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metas),
      });
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleSave = () => {
    if (currentStep === 6) saveMetas();
    else saveConfig();
  };

  const addTagRule = () => setTagRules((r) => [...r, { id: Date.now().toString(), condition: '', tag: '', source: 'call' }]);
  const addMetricRule = () => setMetricRules((r) => [...r, { id: Date.now().toString(), name: '', description: '', condition: '', increment: 1, whenMeasured: '', isRecurring: 'recurrente', section: '', panel: '' }]);
  const addEmbudoEtapa = () => setEmbudoEtapas((e) => [...e, { id: Date.now().toString(), nombre: '', color: EMBUDO_COLORS[e.length % EMBUDO_COLORS.length], orden: e.length + 1 }]);
  const removeEmbudoEtapa = (id: string) => setEmbudoEtapas((e) => e.filter((x) => x.id !== id).map((x, i) => ({ ...x, orden: i + 1 })));
  const addChatTrigger = () => setChatTriggers((t) => [...t, { trigger: '', accion: 'cambiar_estado', valor: '' }]);
  const removeChatTrigger = (idx: number) => setChatTriggers((t) => t.filter((_, i) => i !== idx));

  if (loadingConfig) {
    return (
      <>
        <PageHeader title="Control del sistema" subtitle="Prompts / Etiquetas / Métricas" />
        <div className="flex items-center justify-center min-h-[300px]"><div className="text-gray-400 text-sm animate-pulse">Cargando configuración...</div></div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Control del sistema" subtitle="Prompts / Etiquetas / Métricas / Marca Blanca" />
      <div className="p-3 md:p-4 max-w-3xl mx-auto space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {[
            { id: 1, title: 'Contexto de empresa', icon: Building2, color: 'blue' },
            { id: 2, title: 'Eval. videollamadas', icon: Video, color: 'purple' },
            { id: 3, title: 'Eval. llamadas', icon: Phone, color: 'cyan' },
            { id: 4, title: 'Reglas de etiquetas', icon: Tag, color: 'amber' },
            { id: 5, title: 'Métricas custom', icon: BarChart3, color: 'green' },
            { id: 6, title: 'Metas', icon: Target, color: 'cyan' },
            { id: 7, title: 'Embudo IA', icon: GitBranch, color: 'purple' },
            { id: 8, title: 'Chat Triggers', icon: MessageSquare, color: 'amber' },
            { id: 9, title: 'OpenAI Key', icon: Key, color: 'green' },
            { id: 10, title: 'Fuente financiera', icon: Database, color: 'blue' },
          ].map((s) => {
            const Icon = s.icon;
            const active = currentStep === s.id;
            const colorClasses: Record<string, string> = {
              blue: active ? 'bg-accent-blue text-white border-accent-blue shadow-[0_0_16px_-4px_rgba(77,171,247,0.5)]' : 'bg-surface-700/80 text-gray-400 border-surface-500 hover:text-accent-blue hover:border-accent-blue/50',
              purple: active ? 'bg-accent-purple text-white border-accent-purple shadow-[0_0_16px_-4px_rgba(178,75,243,0.5)]' : 'bg-surface-700/80 text-gray-400 border-surface-500 hover:text-accent-purple hover:border-accent-purple/50',
              cyan: active ? 'bg-accent-cyan text-black border-accent-cyan shadow-[0_0_16px_-4px_rgba(0,240,255,0.5)]' : 'bg-surface-700/80 text-gray-400 border-surface-500 hover:text-accent-cyan hover:border-accent-cyan/50',
              amber: active ? 'bg-accent-amber text-black border-accent-amber shadow-[0_0_16px_-4px_rgba(255,176,32,0.5)]' : 'bg-surface-700/80 text-gray-400 border-surface-500 hover:text-accent-amber hover:border-accent-amber/50',
              green: active ? 'bg-accent-green text-black border-accent-green shadow-[0_0_16px_-4px_rgba(0,230,118,0.5)]' : 'bg-surface-700/80 text-gray-400 border-surface-500 hover:text-accent-green hover:border-accent-green/50',
            };
            return (
              <button key={s.id} type="button" onClick={() => setCurrentStep(s.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${colorClasses[s.color]}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.id}. {s.title}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl p-4 min-h-[280px] section-futuristic border border-surface-500/80 shadow-[0_0_28px_-8px_rgba(0,240,255,0.06)]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-blue/30">
                <div className="rounded-lg p-2 bg-accent-blue/20 border border-accent-blue/40"><Building2 className="w-5 h-5 text-accent-blue" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Prompt de contexto de empresa</h3>
                  <p className="text-sm text-gray-400">Describe qué hace la empresa para que la IA tenga contexto.</p>
                </div>
              </div>
              <textarea value={promptEmpresa} onChange={(e) => setPromptEmpresa(e.target.value)}
                className="w-full rounded-lg bg-surface-700/80 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 transition-colors"
                placeholder="Qué hace la empresa..." />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-purple/30">
                <div className="rounded-lg p-2 bg-accent-purple/20 border border-accent-purple/40"><Video className="w-5 h-5 text-accent-purple" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Evaluación de videollamadas</h3>
                  <p className="text-sm text-gray-400">Prompt / rúbrica para evaluar reuniones (criterios, puntajes).</p>
                </div>
              </div>
              <textarea value={promptEvaluacion} onChange={(e) => setPromptEvaluacion(e.target.value)}
                className="w-full rounded-lg bg-surface-700/80 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-purple/50 focus:border-accent-purple/50 transition-colors"
                placeholder="Evalúa la videollamada según..." />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-cyan/30">
                <div className="rounded-lg p-2 bg-accent-cyan/20 border border-accent-cyan/40"><Phone className="w-5 h-5 text-accent-cyan" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Evaluación de llamadas telefónicas</h3>
                  <p className="text-sm text-gray-400">Prompt con el que la IA evaluará cada llamada.</p>
                </div>
              </div>
              <textarea value={promptLlamadas} onChange={(e) => setPromptLlamadas(e.target.value)}
                className="w-full rounded-lg bg-surface-700/80 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-colors"
                placeholder="Evalúa la llamada telefónica según..." />
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-amber/30">
                <div className="rounded-lg p-2 bg-accent-amber/20 border border-accent-amber/40"><Tag className="w-5 h-5 text-accent-amber" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Reglas de etiquetas para GHL</h3>
                  <p className="text-sm text-gray-400">Si en llamada/chats/meetings pasa X → aplicar etiqueta Y.</p>
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
                <strong className="text-amber-200">Aviso:</strong> Esta etiqueta no se le va a añadir al cliente si no está creada tal cual se escribe aquí en GHL.
              </div>
              <ul className="space-y-3">
                {tagRules.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg p-3 border-l-4 border-accent-amber/60 bg-surface-700/80 border border-surface-500 shadow-[0_0_20px_-6px_rgba(255,176,32,0.12)]">
                    <span className="text-accent-amber text-sm font-medium">Si</span>
                    <input type="text" value={r.condition} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, condition: e.target.value } : x))} placeholder="condición"
                      className="flex-1 min-w-[140px] rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-amber/40" />
                    <span className="text-accent-cyan text-sm font-medium">→ tag</span>
                    <input type="text" value={r.tag} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, tag: e.target.value } : x))} placeholder="nombre_etiqueta"
                      className="w-32 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40" />
                    <select value={r.source} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, source: e.target.value } : x))}
                      className="rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white">
                      <option value="call">Llamada</option><option value="chat">Chat</option><option value="meeting">Meeting</option>
                    </select>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addTagRule} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent-amber/20 text-accent-amber border border-accent-amber/40 hover:bg-accent-amber/30 transition-all">
                <Tag className="w-4 h-4" /> + Añadir regla
              </button>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-green/30">
                <div className="rounded-lg p-2 bg-accent-green/20 border border-accent-green/40"><BarChart3 className="w-5 h-5 text-accent-green" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Reglas para métricas personalizadas</h3>
                  <p className="text-sm text-gray-400">Define métricas que suman N cuando se cumple X.</p>
                </div>
              </div>
              <ul className="space-y-4">
                {metricRules.map((r) => (
                  <li key={r.id} className="rounded-xl p-4 space-y-3 border-l-4 border-accent-green/60 bg-gradient-to-b from-surface-700/90 to-surface-800/90 border border-surface-500">
                    <div>
                      <label className="block text-xs font-medium text-accent-cyan mb-1">Nombre</label>
                      <input type="text" value={r.name} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))} placeholder="Ej: Mención de precio"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-accent-purple mb-1">Cuándo se mide</label>
                      <input type="text" value={r.whenMeasured} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, whenMeasured: e.target.value } : x))} placeholder="Ej: Cuando la llamada termine"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-accent-amber mb-1">Recurrente o única</label>
                      <select value={r.isRecurring} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, isRecurring: e.target.value as 'recurrente' | 'unica' } : x))}
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white">
                        <option value="recurrente">Recurrente</option><option value="unica">Única</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-accent-cyan mb-1">Condición</label>
                      <input type="text" value={r.condition} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, condition: e.target.value } : x))} placeholder="Ej: 'precio' en transcripción"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40" />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <label className="block text-xs font-medium text-accent-green mb-1">Incremento</label>
                        <input type="number" min={1} value={r.increment} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, increment: Math.max(1, +e.target.value || 1) } : x))}
                          className="w-20 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white" />
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-accent-blue mb-1">Sección</label>
                        <select value={r.section} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, section: e.target.value, panel: '' } : x))}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white">
                          <option value="">Seleccionar</option>
                          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <label className="block text-xs font-medium text-accent-purple mb-1">Panel</label>
                        <select value={r.panel} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, panel: e.target.value } : x))}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white">
                          <option value="">Seleccionar</option>
                          {(panelsBySection[r.section] || []).map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Descripción</label>
                      <input type="text" value={r.description} onChange={(e) => setMetricRules((prev) => prev.map((x) => x.id === r.id ? { ...x, description: e.target.value } : x))} placeholder="Detalle adicional"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white" />
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addMetricRule} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent-green/20 text-accent-green border border-accent-green/50 hover:bg-accent-green/30 transition-all">
                <BarChart3 className="w-4 h-4" /> + Añadir métrica
              </button>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-cyan/30">
                <div className="rounded-lg p-2 bg-accent-cyan/20 border border-accent-cyan/40"><Target className="w-5 h-5 text-accent-cyan" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Establecer metas y proceso de llamadas</h3>
                  <p className="text-sm text-gray-400">Define la meta diaria de llamadas y cuántas llamadas hacer a leads nuevos los primeros días.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-accent-cyan mb-1">Meta de llamadas diarias</label>
                  <input type="number" min={1} value={metas.meta_llamadas_diarias} onChange={(e) => setMetas((m) => ({ ...m, meta_llamadas_diarias: Math.max(1, +e.target.value || 1) }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-accent-purple mb-1">Leads nuevos — día 1</label>
                  <input type="number" min={0} value={metas.leads_nuevos_dia_1} onChange={(e) => setMetas((m) => ({ ...m, leads_nuevos_dia_1: Math.max(0, +e.target.value || 0) }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-accent-purple mb-1">Leads nuevos — día 2</label>
                  <input type="number" min={0} value={metas.leads_nuevos_dia_2} onChange={(e) => setMetas((m) => ({ ...m, leads_nuevos_dia_2: Math.max(0, +e.target.value || 0) }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-accent-purple mb-1">Leads nuevos — día 3</label>
                  <input type="number" min={0} value={metas.leads_nuevos_dia_3} onChange={(e) => setMetas((m) => ({ ...m, leads_nuevos_dia_3: Math.max(0, +e.target.value || 0) }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40" />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">Meta semanal = meta diaria x 7 · Meta mensual = meta diaria x 30.</p>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-purple/30">
                <div className="rounded-lg p-2 bg-accent-purple/20 border border-accent-purple/40"><GitBranch className="w-5 h-5 text-accent-purple" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Embudo IA personalizado</h3>
                  <p className="text-sm text-gray-400">Define las etapas de tu embudo de ventas. La IA clasificará leads según estos estados.</p>
                </div>
              </div>
              {embudoEtapas.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-6 text-center text-gray-500 text-sm">
                  Sin embudo personalizado. Se usa el estándar (Cerrada, Ofertada, No_Ofertada, CANCELADA, PDTE).
                </div>
              )}
              <ul className="space-y-2">
                {embudoEtapas.map((etapa, i) => (
                  <li key={etapa.id} className="flex items-center gap-2 rounded-lg p-3 bg-surface-700/80 border border-surface-500">
                    <GripVertical className="w-4 h-4 text-gray-600 shrink-0" />
                    <span className="text-xs text-gray-500 font-mono w-6 shrink-0">#{etapa.orden}</span>
                    <input
                      type="color"
                      value={etapa.color ?? '#06b6d4'}
                      onChange={(e) => setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, color: e.target.value } : x))}
                      className="w-8 h-8 rounded-lg border border-surface-500 bg-transparent cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={etapa.nombre}
                      onChange={(e) => setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, nombre: e.target.value } : x))}
                      placeholder={`Etapa ${i + 1} (ej: Demo Agendada)`}
                      className="flex-1 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40"
                    />
                    {i < embudoEtapas.length - 1 && <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />}
                    <button type="button" onClick={() => removeEmbudoEtapa(etapa.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addEmbudoEtapa}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/50 hover:bg-accent-purple/30 transition-all">
                <Plus className="w-4 h-4" /> Añadir etapa
              </button>
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 px-3 py-2 text-sm text-gray-400">
                <strong className="text-accent-purple">Tip:</strong> Si el nombre contiene &quot;cerrad&quot; (ej. &quot;Cerrada MRR&quot;), el sistema lo considera automáticamente como cierre para calcular revenue.
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-amber/30">
                <div className="rounded-lg p-2 bg-accent-amber/20 border border-accent-amber/40"><MessageSquare className="w-5 h-5 text-accent-amber" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Triggers de chat por emoji</h3>
                  <p className="text-sm text-gray-400">Cuando un asesor envía un emoji en el chat, el estado del lead cambia automáticamente.</p>
                </div>
              </div>
              {chatTriggers.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-6 text-center text-gray-500 text-sm">
                  Sin triggers configurados. Los estados de chat se gestionan solo con IA.
                </div>
              )}
              <ul className="space-y-2">
                {chatTriggers.map((t, idx) => (
                  <li key={idx} className="flex flex-wrap items-center gap-2 rounded-lg p-3 bg-surface-700/80 border border-surface-500 border-l-4 border-l-accent-amber/60">
                    <span className="text-accent-amber text-sm font-medium shrink-0">Si el agente envía</span>
                    <input
                      type="text"
                      value={t.trigger}
                      onChange={(e) => setChatTriggers((prev) => prev.map((x, i) => i === idx ? { ...x, trigger: e.target.value } : x))}
                      placeholder="💰"
                      className="w-20 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-center text-lg text-white focus:ring-2 focus:ring-accent-amber/40"
                    />
                    <span className="text-accent-cyan text-sm font-medium shrink-0">→ estado cambia a</span>
                    <input
                      type="text"
                      value={t.valor}
                      onChange={(e) => setChatTriggers((prev) => prev.map((x, i) => i === idx ? { ...x, valor: e.target.value } : x))}
                      placeholder="Cerrada"
                      className="flex-1 min-w-[120px] rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                    />
                    <button type="button" onClick={() => removeChatTrigger(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addChatTrigger}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent-amber/20 text-accent-amber border border-accent-amber/50 hover:bg-accent-amber/30 transition-all">
                <Plus className="w-4 h-4" /> Añadir trigger
              </button>
              <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2 text-sm text-gray-400">
                <strong className="text-accent-amber">Ejemplo:</strong> Si configuras <span className="text-2xl mx-0.5">💰</span> → <span className="text-accent-cyan">Cerrada</span>,
                cuando un asesor envíe 💰 en el chat de WhatsApp, el lead pasa automáticamente a estado &quot;Cerrada&quot; sin usar IA.
              </div>
            </div>
          )}

          {currentStep === 9 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-green/30">
                <div className="rounded-lg p-2 bg-accent-green/20 border border-accent-green/40"><Key className="w-5 h-5 text-accent-green" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Bring Your Own Key (OpenAI)</h3>
                  <p className="text-sm text-gray-400">Conecta tu propia API Key de OpenAI para procesar llamadas sin límites ni colas.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-surface-500 bg-surface-700/50 px-4 py-3">
                <div className={`w-3 h-3 rounded-full ${hasOpenaiKey ? 'bg-accent-green animate-pulse' : 'bg-gray-600'}`} />
                <span className="text-sm text-white font-medium">
                  {hasOpenaiKey ? 'API Key conectada' : 'Sin API Key propia'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${hasOpenaiKey ? 'bg-accent-green/20 text-accent-green' : 'bg-surface-600 text-gray-500'}`}>
                  {hasOpenaiKey ? 'Activa' : 'No configurada'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  {hasOpenaiKey ? 'Reemplazar API Key' : 'Ingresar API Key'}
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green/50"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">Tu key se guarda encriptada y solo se usa para procesar tus llamadas. Nunca se expone en el frontend.</p>
              </div>
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2 text-sm text-gray-400 space-y-1">
                <p><strong className="text-accent-green">Ventajas de tu propia key:</strong></p>
                <ul className="list-disc list-inside text-gray-500 space-y-0.5">
                  <li>Procesamiento inmediato sin cola compartida</li>
                  <li>Control total de costos con tu cuenta de OpenAI</li>
                  <li>Acceso al modelo GPT más reciente disponible</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 10 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-blue/30">
                <div className="rounded-lg p-2 bg-accent-blue/20 border border-accent-blue/40"><Database className="w-5 h-5 text-accent-blue" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Fuente de datos financieros</h3>
                  <p className="text-sm text-gray-400">Elige de dónde vienen tus métricas de facturación y cash collected.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFuenteFinanciera('nativa')}
                  className={`rounded-xl p-4 text-left border-2 transition-all ${
                    fuenteFinanciera === 'nativa'
                      ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_20px_-6px_rgba(0,240,255,0.3)]'
                      : 'border-surface-500 bg-surface-700/50 hover:border-surface-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fuenteFinanciera === 'nativa' ? 'border-accent-cyan' : 'border-gray-600'}`}>
                      {fuenteFinanciera === 'nativa' && <div className="w-2 h-2 rounded-full bg-accent-cyan" />}
                    </div>
                    <span className="text-sm font-semibold text-white">Nativa con IA</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">
                    La facturación se extrae de las reuniones clasificadas como &quot;Cerrada&quot; en <code className="text-accent-cyan">resumenes_diarios_agendas</code>.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFuenteFinanciera('api_externa')}
                  className={`rounded-xl p-4 text-left border-2 transition-all ${
                    fuenteFinanciera === 'api_externa'
                      ? 'border-accent-purple bg-accent-purple/10 shadow-[0_0_20px_-6px_rgba(178,75,243,0.3)]'
                      : 'border-surface-500 bg-surface-700/50 hover:border-surface-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fuenteFinanciera === 'api_externa' ? 'border-accent-purple' : 'border-gray-600'}`}>
                      {fuenteFinanciera === 'api_externa' && <div className="w-2 h-2 rounded-full bg-accent-purple" />}
                    </div>
                    <span className="text-sm font-semibold text-white">API Externa</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">
                    La facturación viene de tu sistema externo vía <code className="text-accent-purple">POST /webhooks/external-data</code>. Ideal para Stripe, CRMs, ERPs.
                  </p>
                </button>
              </div>
              <div className="rounded-lg border border-accent-blue/30 bg-accent-blue/5 px-3 py-2 text-sm text-gray-400">
                <strong className="text-accent-blue">Nota:</strong> Este cambio afecta cómo se muestran los KPIs de ingresos en el Dashboard.
                Consulta la sección <em>Documentación</em> en el menú lateral para configurar el webhook.
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-surface-500/80">
          <button type="button" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={currentStep === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-700/80 border border-surface-500 text-sm text-gray-300 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green text-black text-sm font-semibold hover:shadow-[0_0_20px_-6px_rgba(0,230,118,0.5)] transition-all border border-accent-green disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button type="button" onClick={() => setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1))} disabled={currentStep === TOTAL_STEPS}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-[0_0_24px_-6px_rgba(0,240,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
