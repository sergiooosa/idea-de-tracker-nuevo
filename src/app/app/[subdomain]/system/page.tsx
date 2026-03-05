"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/dashboard/PageHeader';
import { ChevronRight, ChevronLeft, Phone, Video, Tag, BarChart3, Building2, Save, Target, Loader2, Key, GitBranch, MessageSquare, Database, Plus, Trash2, GripVertical, ArrowRight, Pencil } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getMetricasQueDependenDe } from '@/lib/metricas-engine';
import MetricaEditSheet from '@/components/dashboard/MetricaEditSheet';
import type { MetricaConfig, MetricaManualEntry } from '@/lib/db/schema';

interface TagRule { id: string; condition: string; tag: string; source: string }
interface MetricRule {
  id: string; name: string; description: string; condition: string;
  increment: number; whenMeasured: string; isRecurring: 'recurrente' | 'unica';
  section: string; panel: string; ubicacion?: 'panel_ejecutivo' | 'rendimiento' | 'ambos';
}
interface EmbudoEtapa { id: string; nombre: string; color?: string; orden: number; condition?: string }
interface ChatTrigger { trigger: string; accion: string; valor: string }
interface SystemConfig {
  prompt_ventas: string; prompt_videollamadas: string; prompt_llamadas: string;
  reglas_etiquetas: TagRule[]; metricas_personalizadas: MetricRule[];
  metricas_config: MetricaConfig[]; metricas_manual_data: Record<string, MetricaManualEntry[]>;
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

function SortableMetricaCard({
  m,
  onEdit,
  onDelete,
}: {
  m: MetricaConfig;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: m.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const tipoLabel = m.tipo === 'manual' ? 'Manual' : m.tipo === 'automatica' ? 'Automática' : 'Fija';
  const ubicLabel = m.ubicacion === 'panel_ejecutivo' ? 'Panel' : m.ubicacion === 'rendimiento' ? 'Rendimiento' : 'Ambos';
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-xl p-4 border-l-4 border-accent-green/60 bg-gradient-to-b from-surface-700/90 to-surface-800/90 border border-surface-500 flex items-center gap-3 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{m.nombre}</p>
        <p className="text-[10px] text-gray-500">
          {tipoLabel} · {ubicLabel}
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-accent-cyan"
        title="Editar"
      >
        <Pencil className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

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
  const [metricasConfig, setMetricasConfig] = useState<MetricaConfig[]>([]);
  const [metricasManualData, setMetricasManualData] = useState<Record<string, MetricaManualEntry[]>>({});
  const [metricasSheetOpen, setMetricasSheetOpen] = useState(false);
  const [metricasSheetTipo, setMetricasSheetTipo] = useState<'manual' | 'automatica' | 'fija'>('manual');
  const [metricasEditingId, setMetricasEditingId] = useState<string | null>(null);
  const [metricasDeleteConfirm, setMetricasDeleteConfirm] = useState<{ id: string; dependientes: MetricaConfig[] } | null>(null);

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
        setMetricasConfig(Array.isArray(cfg.metricas_config) ? cfg.metricas_config : []);
        setMetricasManualData(
          cfg.metricas_manual_data && typeof cfg.metricas_manual_data === 'object'
            ? cfg.metricas_manual_data
            : {},
        );
      }
      if (metasRes.ok) {
        const m = await metasRes.json();
        setMetas({ meta_llamadas_diarias: m.meta_llamadas_diarias, leads_nuevos_dia_1: m.leads_nuevos_dia_1, leads_nuevos_dia_2: m.leads_nuevos_dia_2, leads_nuevos_dia_3: m.leads_nuevos_dia_3 });
      }
    } catch { /* silently use defaults */ }
    setLoadingConfig(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const editParam = searchParams.get('edit');
  useEffect(() => {
    if (editParam && !loadingConfig && currentStep === 5) {
      const m = metricasConfig.find((x) => x.id === editParam);
      if (m) {
        setMetricasEditingId(m.id);
        setMetricasSheetTipo(m.tipo);
        setMetricasSheetOpen(true);
      }
    }
  }, [editParam, loadingConfig, currentStep, metricasConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        prompt_ventas: promptEmpresa,
        prompt_videollamadas: promptEvaluacion,
        prompt_llamadas: promptLlamadas,
        reglas_etiquetas: tagRules,
        metricas_personalizadas: metricRules,
        metricas_config: metricasConfig,
        metricas_manual_data: metricasManualData,
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

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const addTagRule = () => setTagRules((r) => [...r, { id: Date.now().toString(), condition: '', tag: '', source: 'call' }]);
  const addMetricRule = () => setMetricRules((r) => [...r, { id: Date.now().toString(), name: '', description: '', condition: '', increment: 1, whenMeasured: '', isRecurring: 'recurrente', section: '', panel: '', ubicacion: 'ambos' }]);
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
                  <p className="text-sm text-gray-400">Selecciona una condición y asigna una etiqueta GHL.</p>
                </div>
              </div>
              <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
                <strong className="text-amber-200">Aviso:</strong> La etiqueta debe existir tal cual en GHL para que se asigne correctamente.
              </div>
              <ul className="space-y-3">
                {tagRules.map((r) => (
                  <li key={r.id} className="rounded-xl p-4 space-y-3 border-l-4 border-accent-amber/60 bg-gradient-to-b from-surface-700/90 to-surface-800/90 border border-surface-500">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-[11px] font-medium text-accent-amber mb-1">Condición</label>
                        <select
                          value={['mencion_precio', 'enojo', 'interes_alto', 'solicitud_propuesta', 'objecion_precio', 'objecion_tiempo', 'duracion_mayor', 'intentos_mayor', 'speed_mayor'].includes(r.condition) ? r.condition : '_custom'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== '_custom') setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, condition: val } : x));
                          }}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                        >
                          <optgroup label="Condición IA">
                            <option value="mencion_precio">Mención de precio</option>
                            <option value="enojo">Enojo del lead</option>
                            <option value="interes_alto">Interés alto</option>
                            <option value="solicitud_propuesta">Solicitud de propuesta</option>
                            <option value="objecion_precio">Objeción por precio</option>
                            <option value="objecion_tiempo">Objeción por tiempo</option>
                          </optgroup>
                          <optgroup label="Condición Fija">
                            <option value="duracion_mayor">Duración mayor a X min</option>
                            <option value="intentos_mayor">Intentos mayor a Y</option>
                            <option value="speed_mayor">Speed to lead mayor a Z min</option>
                          </optgroup>
                          <optgroup label="Personalizada">
                            <option value="_custom">Texto libre...</option>
                          </optgroup>
                        </select>
                        {!['mencion_precio', 'enojo', 'interes_alto', 'solicitud_propuesta', 'objecion_precio', 'objecion_tiempo', 'duracion_mayor', 'intentos_mayor', 'speed_mayor'].includes(r.condition) && (
                          <input type="text" value={r.condition} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, condition: e.target.value } : x))}
                            placeholder="Condición personalizada"
                            className="w-full mt-1.5 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-amber/40" />
                        )}
                      </div>
                      <div className="w-36">
                        <label className="block text-[11px] font-medium text-accent-cyan mb-1">Etiqueta GHL</label>
                        <input type="text" value={r.tag} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, tag: e.target.value } : x))} placeholder="nombre_etiqueta"
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40" />
                      </div>
                      <div className="w-32">
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Fuente</label>
                        <select value={r.source} onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, source: e.target.value } : x))}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white">
                          <option value="call">Llamada</option><option value="chat">Chat</option><option value="meeting">Meeting</option>
                        </select>
                      </div>
                    </div>
                    {embudoEtapas.length > 0 && (
                      <div>
                        <label className="block text-[11px] font-medium text-accent-purple mb-1">Mover etapa de funnel a (opcional)</label>
                        <select
                          value=""
                          onChange={() => {}}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white"
                        >
                          <option value="">No mover etapa</option>
                          {embudoEtapas.map((e) => (
                            <option key={e.id} value={e.nombre}>{e.nombre}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setTagRules((prev) => prev.filter((x) => x.id !== r.id))}
                        className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Eliminar regla
                      </button>
                    </div>
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
                  <h3 className="text-lg font-semibold text-white">Métricas personalizadas</h3>
                  <p className="text-sm text-gray-400">Manuales (campos), automáticas (fórmulas) o fijas (valor constante). Arrastra para ordenar.</p>
                </div>
              </div>
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  if (over && active.id !== over.id) {
                    setMetricasConfig((prev) => {
                      const ids = prev.map((x) => x.id);
                      const oldIdx = ids.indexOf(String(active.id));
                      const newIdx = ids.indexOf(String(over.id));
                      if (oldIdx === -1 || newIdx === -1) return prev;
                      const reordered = arrayMove(prev, oldIdx, newIdx);
                      return reordered.map((m, i) => ({ ...m, orden: i }));
                    });
                  }
                }}
              >
                <SortableContext items={metricasConfig.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {metricasConfig
                      .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999))
                      .map((m) => (
                        <SortableMetricaCard
                          key={m.id}
                          m={m}
                          onEdit={() => {
                            setMetricasEditingId(m.id);
                            setMetricasSheetTipo(m.tipo);
                            setMetricasSheetOpen(true);
                          }}
                          onDelete={() => {
                            const deps = getMetricasQueDependenDe(m.id, metricasConfig);
                            if (deps.length > 0) {
                              setMetricasDeleteConfirm({ id: m.id, dependientes: deps });
                            } else {
                              setMetricasConfig((prev) => prev.filter((x) => x.id !== m.id));
                              setMetricasManualData((prev) => {
                                const next = { ...prev };
                                delete next[m.id];
                                return next;
                              });
                            }
                          }}
                        />
                      ))}
                  </ul>
                </SortableContext>
              </DndContext>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMetricasEditingId(null);
                    setMetricasSheetTipo('manual');
                    setMetricasSheetOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent-green/20 text-accent-green border border-accent-green/50 hover:bg-accent-green/30"
                >
                  <Plus className="w-4 h-4" /> Manual
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMetricasEditingId(null);
                    setMetricasSheetTipo('automatica');
                    setMetricasSheetOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30"
                >
                  <Plus className="w-4 h-4" /> Automática
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMetricasEditingId(null);
                    setMetricasSheetTipo('fija');
                    setMetricasSheetOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/50 hover:bg-accent-purple/30"
                >
                  <Plus className="w-4 h-4" /> Fija
                </button>
              </div>
              {metricasDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/60" onClick={() => setMetricasDeleteConfirm(null)} aria-hidden />
                  <div className="relative rounded-xl bg-surface-800 border border-surface-500 p-4 max-w-md">
                    <h4 className="font-semibold text-white mb-2">Eliminar métrica</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Esta métrica alimenta a {metricasDeleteConfirm.dependientes.length} otra(s):{' '}
                      {metricasDeleteConfirm.dependientes.map((d) => d.nombre).join(', ')}. Si la eliminas, esas fallarán.
                    </p>
                    <p className="text-sm text-gray-500 mb-4">¿Continuar?</p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setMetricasDeleteConfirm(null)}
                        className="px-3 py-1.5 rounded-lg bg-surface-600 text-gray-300"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const id = metricasDeleteConfirm.id;
                          setMetricasConfig((prev) => prev.filter((x) => x.id !== id));
                          setMetricasManualData((prev) => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                          });
                          setMetricasDeleteConfirm(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {metricasSheetOpen && (
                <MetricaEditSheet
                  metricasConfig={metricasConfig}
                  metricasManualData={metricasManualData}
                  editingMetric={metricasEditingId ? metricasConfig.find((x) => x.id === metricasEditingId) ?? null : null}
                  tipoInicial={metricasSheetTipo}
                  onClose={() => {
                    setMetricasSheetOpen(false);
                    setMetricasEditingId(null);
                  }}
                  onSave={(config, manualData) => {
                    setMetricasConfig((prev) => {
                      const idx = prev.findIndex((x) => x.id === config.id);
                      const next = [...prev];
                      if (idx >= 0) {
                        next[idx] = config;
                      } else {
                        next.push(config);
                      }
                      return next.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
                    });
                    if (manualData !== undefined) {
                      setMetricasManualData((prev) => {
                        const next = { ...prev };
                        next[config.id] = manualData;
                        return next;
                      });
                    }
                    setMetricasSheetOpen(false);
                    setMetricasEditingId(null);
                  }}
                />
              )}
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
                  <p className="text-sm text-gray-400">Define cada etapa de tu embudo y escribe la condición exacta que la IA debe evaluar para clasificar al lead en ese estado.</p>
                </div>
              </div>
              {embudoEtapas.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-6 text-center text-gray-500 text-sm">
                  Sin embudo personalizado. Se usa el estándar (Cerrada, Ofertada, No_Ofertada, CANCELADA, PDTE).
                </div>
              )}
              <ul className="space-y-3">
                {embudoEtapas.map((etapa, i) => (
                  <li key={etapa.id} className="rounded-xl p-4 space-y-3 border-l-4 bg-gradient-to-b from-surface-700/90 to-surface-800/90 border border-surface-500" style={{ borderLeftColor: etapa.color ?? '#8b5cf6' }}>
                    <div className="flex items-center gap-2">
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
                        placeholder={`Nombre de la etapa (ej: Demo Agendada)`}
                        className="flex-1 rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white font-medium focus:ring-2 focus:ring-accent-purple/40"
                      />
                      {i < embudoEtapas.length - 1 && <ArrowRight className="w-4 h-4 text-gray-600 shrink-0" />}
                      <button type="button" onClick={() => removeEmbudoEtapa(etapa.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-accent-cyan mb-1">Condición para la IA</label>
                      <textarea
                        value={etapa.condition ?? ''}
                        onChange={(e) => setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, condition: e.target.value } : x))}
                        placeholder={`Describe cuándo un lead debe clasificarse en esta etapa.\nEj: "El lead mostró interés real, preguntó por precios o pidió una propuesta formal."`}
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-600 min-h-[60px] focus:ring-2 focus:ring-accent-cyan/40 resize-y"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={addEmbudoEtapa}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/50 hover:bg-accent-purple/30 transition-all">
                <Plus className="w-4 h-4" /> Añadir etapa
              </button>
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 px-3 py-2 text-sm text-gray-400 space-y-1">
                <p><strong className="text-accent-purple">Cómo funciona:</strong></p>
                <p>La IA lee la transcripción de cada llamada/videollamada y la compara con las condiciones que escribas aquí. El estado que mejor coincida es el que se asigna al lead.</p>
                <p>Si el nombre de la etapa contiene &quot;cerrad&quot; (ej. &quot;Cerrada MRR&quot;), el sistema lo trata automáticamente como cierre para calcular revenue.</p>
              </div>
            </div>
          )}

          {currentStep === 8 && (() => {
            const EMOJI_GRID = ['💰', '✅', '❌', '🔥', '⏳', '📞', '📅', '🤝', '👍', '👎', '💡', '⭐', '🎯', '💬', '☀️', '🚀', '💎', '🏆', '📊', '🔔'];
            const usedEmojis = new Set(chatTriggers.map((t) => t.trigger));
            return (
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
              <ul className="space-y-3">
                {chatTriggers.map((t, idx) => (
                  <li key={idx} className="rounded-xl p-4 space-y-3 bg-surface-700/80 border border-surface-500 border-l-4 border-l-accent-amber/60">
                    <div className="flex items-center gap-3">
                      <span className="text-accent-amber text-xs font-medium shrink-0 uppercase">Emoji trigger</span>
                      <div className="flex-1" />
                      <button type="button" onClick={() => removeChatTrigger(idx)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-accent-amber mb-2">Selecciona un emoji</label>
                      <div className="flex flex-wrap gap-1.5">
                        {EMOJI_GRID.map((emoji) => {
                          const isUsed = usedEmojis.has(emoji) && t.trigger !== emoji;
                          const isSelected = t.trigger === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              disabled={isUsed}
                              onClick={() => setChatTriggers((prev) => prev.map((x, i) => i === idx ? { ...x, trigger: emoji } : x))}
                              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all border ${
                                isSelected
                                  ? 'bg-accent-amber/20 border-accent-amber/60 shadow-[0_0_12px_-4px_rgba(255,176,32,0.5)] scale-110'
                                  : isUsed
                                    ? 'bg-surface-700 border-surface-500 opacity-30 cursor-not-allowed'
                                    : 'bg-surface-600 border-surface-500 hover:bg-surface-500 hover:border-accent-amber/30'
                              }`}
                              title={isUsed ? 'Ya usado en otra regla' : emoji}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                      {t.trigger && !EMOJI_GRID.includes(t.trigger) && (
                        <div className="mt-2 text-xs text-gray-400">Emoji actual: <span className="text-xl">{t.trigger}</span></div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-accent-cyan mb-1">Estado al que cambia el lead</label>
                      {embudoEtapas.length > 0 ? (
                        <select
                          value={t.valor}
                          onChange={(e) => setChatTriggers((prev) => prev.map((x, i) => i === idx ? { ...x, valor: e.target.value } : x))}
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                        >
                          <option value="">Seleccionar estado...</option>
                          {embudoEtapas.map((e) => (
                            <option key={e.id} value={e.nombre}>{e.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={t.valor}
                          onChange={(e) => setChatTriggers((prev) => prev.map((x, i) => i === idx ? { ...x, valor: e.target.value } : x))}
                          placeholder="Cerrada"
                          className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                        />
                      )}
                    </div>
                    {t.trigger && t.valor && (
                      <div className="rounded-lg bg-surface-800/60 border border-surface-500/50 px-3 py-2 text-xs text-gray-400 flex items-center gap-2">
                        <span className="text-2xl">{t.trigger}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-accent-cyan" />
                        <span className="text-accent-cyan font-medium">{t.valor}</span>
                      </div>
                    )}
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
            );
          })()}

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
