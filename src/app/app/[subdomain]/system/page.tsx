"use client";

import { toast } from 'sonner';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/contexts/LocaleContext';
import type { Locale } from '@/lib/i18n';
import PageHeader from '@/components/dashboard/PageHeader';
import { ChevronRight, ChevronLeft, Phone, Video, Tag, BarChart3, Building2, Save, Target, Loader2, Key, GitBranch, MessageSquare, Database, Plus, Trash2, GripVertical, ArrowRight, Pencil, HelpCircle } from 'lucide-react';
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
import { getMetricasQueDependenDe, DEFAULT_METRICAS_CONFIG, DEFAULT_EMBUDO_CONFIG } from '@/lib/metricas-engine';
import MetricaEditSheet from '@/components/dashboard/MetricaEditSheet';
import type { MetricaConfig, MetricaManualEntry } from '@/lib/db/schema';
import ChatRecoverySection from '@/features/quick-triggers/chat-recovery/ChatRecoverySection';

interface TagRule { id: string; condition: string; tag: string; source: string; funnelStage?: string }
interface MetricRule {
  id: string; name: string; description: string; condition: string;
  increment: number; whenMeasured: string; isRecurring: 'recurrente' | 'unica';
  section: string; panel: string; ubicacion?: 'panel_ejecutivo' | 'rendimiento' | 'ambos';
}
interface ReglaAutomatica {
  evento: 'no_show' | 'cancelada' | 'sin_actividad_dias';
  valor?: number;
}
interface EmbudoEtapa {
  id: string;
  nombre: string;
  color?: string;
  orden: number;
  condition?: string;
  fuentes?: ('llamadas' | 'videollamadas' | 'chats')[];
  reglas_automaticas?: ReglaAutomatica[];
  es_fallback?: boolean;  // captura leads que no clasifican en ninguna otra etapa
}
interface ChatConfig {
  tiene_chatbot: boolean;
  emoji_toma_atencion: string;
}
interface RolConfigLocal {
  id: string;
  nombre: string;
}

interface MetaPorRolLocal {
  rol_id: string;
  rol_nombre: string;
  meta_llamadas_diarias: number | null;
  meta_chats_diarios: number | null;
  meta_cierres_semanales: number | null;
  meta_contestacion: number | null;
}

interface SystemConfig {
  prompt_ventas: string; prompt_videollamadas: string; prompt_llamadas: string;
  reglas_etiquetas: TagRule[]; metricas_personalizadas: MetricRule[];
  metricas_config: MetricaConfig[]; metricas_manual_data: Record<string, MetricaManualEntry[]>;
  embudo_personalizado: EmbudoEtapa[];
  has_openai_key: boolean; fuente_datos_financieros: 'nativa' | 'api_externa';
  seccion_chats_dashboard?: boolean;
  chat_config?: ChatConfig;
  chat_analisis_hora?: number;
  roles_config?: RolConfigLocal[];
  idioma?: 'es' | 'en';
}
interface MetasData {
  // ── Campos originales ─────────────────────────────────────────
  meta_llamadas_diarias: number; leads_nuevos_dia_1: number;
  leads_nuevos_dia_2: number; leads_nuevos_dia_3: number;
  meta_citas_semanales: number | null; meta_cierres_semanales: number | null;
  meta_revenue_mensual: number | null; meta_cash_collected_mensual: number | null;
  meta_tasa_cierre: number | null; meta_tasa_contestacion: number | null;
  meta_speed_to_lead_min: number | null;
  // ── Canal: Llamadas ───────────────────────────────────────────
  meta_llamadas_semanales: number | null;
  meta_contestacion_llamadas: number | null;
  meta_speed_llamadas_min: number | null;
  // ── Canal: Videollamadas ──────────────────────────────────────
  meta_citas_semanales_video: number | null;
  meta_cierre_video: number | null;
  meta_revenue_video: number | null;
  // ── Canal: Chats ──────────────────────────────────────────────
  meta_chats_diarios: number | null;
  meta_chats_contestacion: number | null;
  meta_speed_chat_min: number | null;
  // ── Metas por rol ─────────────────────────────────────────────
  metas_por_rol?: MetaPorRolLocal[];
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
  const formatoLabel = m.formato === 'moneda' ? '$' : m.formato === 'porcentaje' ? '%' : m.formato === 'tiempo' ? 'min' : m.formato === 'decimal' ? '.0' : '#';
  const colorMap: Record<string, string> = { blue: 'bg-blue-500', cyan: 'bg-cyan-500', green: 'bg-green-500', purple: 'bg-purple-500', amber: 'bg-amber-500', red: 'bg-red-500' };
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
      {m.color && <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMap[m.color] ?? 'bg-gray-500'}`} />}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{m.nombre}</p>
        <p className="text-[10px] text-gray-500">
          {tipoLabel} · {ubicLabel} · Formato: {formatoLabel}
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
  const t = useT();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const TOTAL_STEPS = 10;
  const initialStep = Math.min(TOTAL_STEPS, Math.max(1, Number(stepParam) || 1));
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [currentIdioma, setCurrentIdioma] = useState<Locale>('es');

  const [promptEmpresa, setPromptEmpresa] = useState('');
  const [promptEvaluacion, setPromptEvaluacion] = useState('');
  const [promptLlamadas, setPromptLlamadas] = useState('');
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [metricRules, setMetricRules] = useState<MetricRule[]>([]);
  const [metas, setMetas] = useState<MetasData>({ meta_llamadas_diarias: 50, leads_nuevos_dia_1: 3, leads_nuevos_dia_2: 4, leads_nuevos_dia_3: 5, meta_citas_semanales: null, meta_cierres_semanales: null, meta_revenue_mensual: null, meta_cash_collected_mensual: null, meta_tasa_cierre: null, meta_tasa_contestacion: null, meta_speed_to_lead_min: null, meta_llamadas_semanales: null, meta_contestacion_llamadas: null, meta_speed_llamadas_min: null, meta_citas_semanales_video: null, meta_cierre_video: null, meta_revenue_video: null, meta_chats_diarios: null, meta_chats_contestacion: null, meta_speed_chat_min: null });

  const [openaiKey, setOpenaiKey] = useState('');
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [embudoEtapas, setEmbudoEtapas] = useState<EmbudoEtapa[]>([]);
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    tiene_chatbot: false,
    emoji_toma_atencion: '',
  });
  const [chatAnalisisHora, setChatAnalisisHora] = useState<number>(2);
  const [analizandoChats, setAnalizandoChats] = useState(false);
  const [analisisResult, setAnalisisResult] = useState<{ processed: number; updated: number; errors: number; costEstimate: string } | null>(null);
  const [reglasAbiertasMap, setReglasAbiertasMap] = useState<Record<string, boolean>>({});
  const [fuenteFinanciera, setFuenteFinanciera] = useState<'nativa' | 'api_externa'>('nativa');
  const [seccionChatsDashboard, setSeccionChatsDashboard] = useState(true);
  const [fuenteLlamadas, setFuenteLlamadas] = useState<'twilio' | 'ghl'>('twilio');
  const [metricasConfig, setMetricasConfig] = useState<MetricaConfig[]>([]);
  const [metricasManualData, setMetricasManualData] = useState<Record<string, MetricaManualEntry[]>>({});
  const [metricasSheetOpen, setMetricasSheetOpen] = useState(false);
  const [metricasSheetTipo, setMetricasSheetTipo] = useState<'manual' | 'automatica' | 'fija'>('manual');
  const [metricasEditingId, setMetricasEditingId] = useState<string | null>(null);
  const [metricasDeleteConfirm, setMetricasDeleteConfirm] = useState<{ id: string; dependientes: MetricaConfig[] } | null>(null);
  const [rolesConfig, setRolesConfig] = useState<RolConfigLocal[]>([]);
  const [metasPorRol, setMetasPorRol] = useState<MetaPorRolLocal[]>([]);

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
        const loadedEmbudo = Array.isArray(cfg.embudo_personalizado) ? cfg.embudo_personalizado : [];
        setEmbudoEtapas(loadedEmbudo.length > 0 ? loadedEmbudo : DEFAULT_EMBUDO_CONFIG);
        setHasOpenaiKey(cfg.has_openai_key ?? false);
        setFuenteFinanciera(cfg.fuente_datos_financieros ?? 'nativa');
        setSeccionChatsDashboard(cfg.seccion_chats_dashboard !== false);
        if (cfg.idioma === 'en' || cfg.idioma === 'es') setCurrentIdioma(cfg.idioma);
        setFuenteLlamadas((cfg as unknown as { fuente_llamadas?: string }).fuente_llamadas === 'ghl' ? 'ghl' : 'twilio');
        if (cfg.chat_config) {
          setChatConfig({
            tiene_chatbot: cfg.chat_config.tiene_chatbot ?? false,
            emoji_toma_atencion: cfg.chat_config.emoji_toma_atencion ?? '',
          });
        }
        if (typeof cfg.chat_analisis_hora === 'number') {
          setChatAnalisisHora(cfg.chat_analisis_hora);
        }
        if (Array.isArray(cfg.roles_config)) {
          setRolesConfig(cfg.roles_config);
        }
        const loadedConfig = Array.isArray(cfg.metricas_config) ? cfg.metricas_config : [];
        setMetricasConfig(loadedConfig.length > 0 ? loadedConfig : DEFAULT_METRICAS_CONFIG);
        setMetricasManualData(
          cfg.metricas_manual_data && typeof cfg.metricas_manual_data === 'object'
            ? cfg.metricas_manual_data
            : {},
        );
      }
      if (metasRes.ok) {
        const m = await metasRes.json();
        setMetas({ meta_llamadas_diarias: m.meta_llamadas_diarias, leads_nuevos_dia_1: m.leads_nuevos_dia_1, leads_nuevos_dia_2: m.leads_nuevos_dia_2, leads_nuevos_dia_3: m.leads_nuevos_dia_3, meta_citas_semanales: m.meta_citas_semanales ?? null, meta_cierres_semanales: m.meta_cierres_semanales ?? null, meta_revenue_mensual: m.meta_revenue_mensual ?? null, meta_cash_collected_mensual: m.meta_cash_collected_mensual ?? null, meta_tasa_cierre: m.meta_tasa_cierre ?? null, meta_tasa_contestacion: m.meta_tasa_contestacion ?? null, meta_speed_to_lead_min: m.meta_speed_to_lead_min ?? null, meta_llamadas_semanales: m.meta_llamadas_semanales ?? null, meta_contestacion_llamadas: m.meta_contestacion_llamadas ?? null, meta_speed_llamadas_min: m.meta_speed_llamadas_min ?? null, meta_citas_semanales_video: m.meta_citas_semanales_video ?? null, meta_cierre_video: m.meta_cierre_video ?? null, meta_revenue_video: m.meta_revenue_video ?? null, meta_chats_diarios: m.meta_chats_diarios ?? null, meta_chats_contestacion: m.meta_chats_contestacion ?? null, meta_speed_chat_min: m.meta_speed_chat_min ?? null, metas_por_rol: Array.isArray(m.metas_por_rol) ? m.metas_por_rol : [] });
        if (Array.isArray(m.metas_por_rol)) {
          setMetasPorRol(m.metas_por_rol);
        }
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

  const saveConfig = async (): Promise<boolean> => {
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
        embudo_personalizado: embudoEtapas,
        fuente_datos_financieros: fuenteFinanciera,
        seccion_chats_dashboard: seccionChatsDashboard,
        chat_config: chatConfig,
        chat_analisis_hora: chatAnalisisHora,
        fuente_llamadas: fuenteLlamadas,
      };
      if (openaiKey) payload.openai_api_key = openaiKey;
      const res = await fetch('/api/data/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al guardar');
      if (openaiKey) {
        setHasOpenaiKey(true);
        setOpenaiKey('');
      }
      toast.success('Configuración guardada');
      setSaving(false);
      return true;
    } catch {
      toast.error('Error al guardar la configuración');
      setSaving(false);
      return false;
    }
  };

  const saveMetas = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch('/api/data/metas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...metas, metas_por_rol: metasPorRol }),
      });
      if (!res.ok) throw new Error('Error al guardar metas');
      toast.success('Metas guardadas');
      setSaving(false);
      return true;
    } catch {
      toast.error('Error al guardar las metas');
      setSaving(false);
      return false;
    }
  };

  const handleSave = async () => {
    if (currentStep === 6) await saveMetas();
    else await saveConfig();
  };

  const saveIdioma = async (lang: Locale) => {
    try {
      const res = await fetch('/api/data/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idioma: lang }),
      });
      if (!res.ok) throw new Error('Error al guardar idioma');
      setCurrentIdioma(lang);
      toast.success(lang === 'es' ? 'Idioma: Español' : 'Language: English');
    } catch {
      toast.error('Error al guardar el idioma');
    }
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const addTagRule = () => setTagRules((r) => [...r, { id: Date.now().toString(), condition: '', tag: '', source: 'call' }]);
  const addMetricRule = () => setMetricRules((r) => [...r, { id: Date.now().toString(), name: '', description: '', condition: '', increment: 1, whenMeasured: '', isRecurring: 'recurrente', section: '', panel: '', ubicacion: 'ambos' }]);
  const addEmbudoEtapa = () => setEmbudoEtapas((e) => [...e, { id: Date.now().toString(), nombre: '', color: EMBUDO_COLORS[e.length % EMBUDO_COLORS.length], orden: e.length + 1 }]);
  const removeEmbudoEtapa = (id: string) => setEmbudoEtapas((e) => e.filter((x) => x.id !== id).map((x, i) => ({ ...x, orden: i + 1 })));
  const handleAnalizarChats = async () => {
    setAnalizandoChats(true);
    setAnalisisResult(null);
    try {
      const res = await fetch('/api/data/analizar-chats', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAnalisisResult(data);
        toast.success(`Análisis completado: ${data.updated ?? 0} chats clasificados`);
      } else {
        toast.error('Error al analizar chats');
      }
    } catch {
      toast.error('Error de conexión al analizar chats');
    } finally {
      setAnalizandoChats(false);
    }
  };

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
            const isBetaStep = [5, 6, 7, 10].includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => setCurrentStep(s.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${colorClasses[s.color]}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.id}. {s.title}
                {isBetaStep && <span className="text-[9px] px-1 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase">Beta</span>}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl p-4 min-h-[280px] section-futuristic border border-surface-500/80 shadow-[0_0_28px_-8px_rgba(0,240,255,0.06)]">
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Selector de idioma */}
              <div className="rounded-xl border border-surface-500 bg-surface-700/50 p-4">
                <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  🌐 {t.sistema.idioma.titulo}
                </h4>
                <p className="text-xs text-gray-400 mb-3">
                  {t.sistema.idioma.descripcion}
                </p>
                <div className="flex gap-3">
                  {(['es', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => saveIdioma(lang)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        currentIdioma === lang
                          ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                          : 'bg-surface-600 border-surface-500 text-gray-400 hover:border-gray-400'
                      }`}
                    >
                      {lang === 'es' ? `🇪🇸 ${t.sistema.idioma.es}` : `🇺🇸 ${t.sistema.idioma.en}`}
                    </button>
                  ))}
                </div>
              </div>

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
              <p className="text-[11px] text-gray-500 mt-1">Se recomienda ser lo más completo posible para que la IA entienda tu negocio de la mejor manera.</p>
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
              <p className="text-[11px] text-gray-500 mt-1">Se recomienda ser lo más completo posible para que la IA entienda tu negocio de la mejor manera.</p>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-cyan/30">
                <div className="rounded-lg p-2 bg-accent-cyan/20 border border-accent-cyan/40"><Phone className="w-5 h-5 text-accent-cyan" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Llamadas telefónicas</h3>
                  <p className="text-sm text-gray-400">Configura el origen de llamadas y el prompt de evaluación IA.</p>
                </div>
              </div>

              {/* ── Origen de llamadas ─────────────────────────────────── */}
              <div className="rounded-xl p-4 bg-surface-700/60 border border-surface-500 space-y-3">
                <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">📞 Origen de llamadas telefónicas</p>
                <p className="text-xs text-gray-400">¿Cómo realizan las llamadas telefónicas tus asesores?</p>
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${fuenteLlamadas === 'twilio' ? 'border-accent-cyan/60 bg-accent-cyan/10' : 'border-surface-500 hover:border-surface-400'}`}>
                    <input type="radio" name="fuente_llamadas" value="twilio" checked={fuenteLlamadas === 'twilio'} onChange={() => setFuenteLlamadas('twilio')} className="mt-0.5 accent-cyan-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Twilio <span className="text-[10px] text-green-400 font-semibold">(recomendado)</span></p>
                      <p className="text-[11px] text-green-400 mt-0.5">✅ IA disponible: transcripción automática + análisis de llamadas</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Tus asesores llaman usando Twilio. El sistema transcribe y analiza cada llamada con IA.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${fuenteLlamadas === 'ghl' ? 'border-amber-500/60 bg-amber-500/10' : 'border-surface-500 hover:border-surface-400'}`}>
                    <input type="radio" name="fuente_llamadas" value="ghl" checked={fuenteLlamadas === 'ghl'} onChange={() => setFuenteLlamadas('ghl')} className="mt-0.5 accent-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-white">GoHighLevel (GHL)</p>
                      <p className="text-[11px] text-amber-400 mt-0.5">⚠️ IA no disponible: solo se registran métricas básicas</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Tus asesores llaman directamente desde GHL. No hay transcripción ni análisis IA de llamadas. Solo se registra si la llamada fue contestada o no. (GHL planea agregar transcripción automática en el futuro — cuando esté disponible podrás cambiar a Twilio)</p>
                    </div>
                  </label>
                </div>
                {fuenteLlamadas === 'ghl' && (
                  <div className="rounded-lg p-3 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                    <p className="font-semibold">⚠️ Con GHL como origen: el prompt de llamadas, análisis IA y transcripciones no están disponibles.</p>
                    <p>Las métricas de llamadas mostrarán: total realizadas, contestadas y no contestadas.</p>
                  </div>
                )}
              </div>

              {/* ── Prompt de evaluación (solo Twilio) ────────────────── */}
              {fuenteLlamadas === 'twilio' && (
                <>
                  <textarea value={promptLlamadas} onChange={(e) => setPromptLlamadas(e.target.value)}
                    className="w-full rounded-lg bg-surface-700/80 border border-surface-500 p-3 text-sm text-white placeholder-gray-500 min-h-[180px] focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-colors"
                    placeholder="Evalúa la llamada telefónica según..." />
                  <p className="text-[11px] text-gray-500 mt-1">Se recomienda ser lo más completo posible para que la IA entienda tu negocio de la mejor manera.</p>
                </>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-amber/30">
                <div className="rounded-lg p-2 bg-accent-amber/20 border border-accent-amber/40"><Tag className="w-5 h-5 text-accent-amber" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Reglas de etiquetas</h3>
                  <p className="text-sm text-gray-400">Define condiciones para asignar etiquetas automáticamente.</p>
                </div>
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
                        <label className="block text-[11px] font-medium text-accent-cyan mb-1">Etiqueta</label>
                        <input type="text" value={r.tag} onChange={(e) => { const v = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''); setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, tag: v } : x)); }} placeholder="nombre_etiqueta"
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
                          value={r.funnelStage ?? ''}
                          onChange={(e) => setTagRules((prev) => prev.map((x) => x.id === r.id ? { ...x, funnelStage: e.target.value || undefined } : x))}
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
                  <p className="text-sm text-gray-400">Manuales (campos) o automáticas (fórmulas). Arrastra para ordenar.</p>
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
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-cyan/30">
                <div className="rounded-lg p-2 bg-accent-cyan/20 border border-accent-cyan/40"><Target className="w-5 h-5 text-accent-cyan" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Establecer metas por canal</h3>
                  <p className="text-sm text-gray-400">Configura metas independientes para cada canal. Solo activa los canales que uses.</p>
                </div>
              </div>

              {/* ── Distribución de leads (universal) ────────────── */}
              <div className="rounded-xl border border-surface-500/60 bg-surface-700/40 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📊</span>
                  <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Distribución de leads nuevos</h4>
                </div>
                <p className="text-[11px] text-gray-500">¿Cuántos leads nuevos se asignan a un asesor según el día en que ingresan? (Para alertas de bandeja.)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              </div>

              {/* ── Canal: Llamadas ───────────────────────────────── */}
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📞</span>
                  <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Canal Llamadas</h4>
                </div>
                <p className="text-[11px] text-gray-500">Metas para el equipo de calling (SDRs / closers telefónicos). Deja vacío lo que no aplique.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-blue-300 mb-1">Llamadas diarias por asesor</label>
                    <input type="number" min={1} value={metas.meta_llamadas_diarias} onChange={(e) => setMetas((m) => ({ ...m, meta_llamadas_diarias: Math.max(1, +e.target.value || 1) }))}
                      className="w-full rounded-lg bg-surface-600 border border-blue-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Total de llamadas que debe hacer cada asesor por día.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-300 mb-1">Llamadas semanales totales (equipo)</label>
                    <input type="number" min={0} value={metas.meta_llamadas_semanales ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_llamadas_semanales: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-blue-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Si se define, reemplaza el cálculo diario×días en alertas.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-300 mb-1">Meta % contestación de llamadas</label>
                    <input type="number" min={0} max={100} step={1} value={metas.meta_contestacion_llamadas ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_contestacion_llamadas: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Ej. 60"
                      className="w-full rounded-lg bg-surface-600 border border-blue-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">% de llamadas que deben ser contestadas. Ej: 60%.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-blue-300 mb-1">Speed to lead máximo (min) 🔻</label>
                    <input type="number" min={0} step={0.5} value={metas.meta_speed_llamadas_min ?? metas.meta_speed_to_lead_min ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_speed_llamadas_min: e.target.value ? Math.max(0, +e.target.value) : null, meta_speed_to_lead_min: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Ej. 5"
                      className="w-full rounded-lg bg-surface-600 border border-blue-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Tiempo máximo en minutos para contactar un lead. Verde = menor al límite.</p>
                  </div>
                </div>
              </div>

              {/* ── Canal: Videollamadas ─────────────────────────── */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🎥</span>
                  <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Canal Videollamadas</h4>
                </div>
                <p className="text-[11px] text-gray-500">Metas para el canal de videollamadas / agendas (closers). Solo configura si usas este canal.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Citas semanales agendadas</label>
                    <input type="number" min={0} value={metas.meta_citas_semanales_video ?? metas.meta_citas_semanales ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_citas_semanales_video: e.target.value ? Math.max(0, +e.target.value) : null, meta_citas_semanales: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-purple-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Citas agendadas por semana que debe alcanzar el equipo.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Cierres semanales</label>
                    <input type="number" min={0} value={metas.meta_cierres_semanales ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_cierres_semanales: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-purple-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Número de ventas cerradas por semana.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Meta % cierre (de citas asistidas)</label>
                    <input type="number" min={0} max={100} step={1} value={metas.meta_cierre_video ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_cierre_video: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Ej. 30"
                      className="w-full rounded-lg bg-surface-600 border border-purple-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">% de citas que deben convertirse en venta. Ej: 30%.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-300 mb-1">Revenue mensual ($)</label>
                    <input type="number" min={0} value={metas.meta_revenue_video ?? metas.meta_revenue_mensual ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_revenue_video: e.target.value ? Math.max(0, +e.target.value) : null, meta_revenue_mensual: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-purple-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Revenue total mensual a alcanzar por videollamadas.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Meta cash collected mensual ($)</label>
                    <input type="number" min={0} value={metas.meta_cash_collected_mensual ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_cash_collected_mensual: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40" />
                  </div>
                </div>
              </div>

              {/* ── Canal: Chats ─────────────────────────────────── */}
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💬</span>
                  <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Canal Chats</h4>
                </div>
                <p className="text-[11px] text-gray-500">Metas para el canal de mensajería / chats. Solo configura si tu equipo gestiona chats activamente.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-green-300 mb-1">Chats diarios atendidos</label>
                    <input type="number" min={0} value={metas.meta_chats_diarios ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_chats_diarios: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Sin meta"
                      className="w-full rounded-lg bg-surface-600 border border-green-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-green-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Total de chats que el equipo debe atender por día.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-300 mb-1">Meta % chats con respuesta</label>
                    <input type="number" min={0} max={100} step={1} value={metas.meta_chats_contestacion ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_chats_contestacion: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Ej. 90"
                      className="w-full rounded-lg bg-surface-600 border border-green-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-green-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">% de chats entrantes que deben recibir respuesta del equipo.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-300 mb-1">Speed to lead en chat (min) 🔻</label>
                    <input type="number" min={0} step={0.5} value={metas.meta_speed_chat_min ?? ''} onChange={(e) => setMetas((m) => ({ ...m, meta_speed_chat_min: e.target.value ? Math.max(0, +e.target.value) : null }))}
                      placeholder="Ej. 2"
                      className="w-full rounded-lg bg-surface-600 border border-green-500/30 px-2 py-1.5 text-sm text-white focus:ring-2 focus:ring-green-500/40" />
                    <p className="text-[10px] text-gray-600 mt-0.5">Tiempo máximo en minutos para responder un chat. Verde = bajo el límite.</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-500">🔻 = métrica invertida: menor valor es mejor. Deja vacío cualquier campo que no aplique a tu operación.</p>

              {/* ── Metas por Rol ─────────────────────────────────── */}
              <div className="mt-6 rounded-xl border border-surface-500 bg-surface-800/60 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <h4 className="text-sm font-semibold text-white">Metas por Rol</h4>
                  <span className="relative group ml-1">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Un closer junior puede tener meta de 30 llamadas/día mientras un senior tiene 50. Configura metas específicas por rol para un seguimiento más justo.
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">Define metas diferentes según el rol del asesor en tu equipo.</p>
                {rolesConfig.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-4 text-center text-[11px] text-gray-500">
                    Configura roles en <strong className="text-gray-400">Sistema → Configuración</strong> para usar esta función.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rolesConfig.map((rol) => {
                      const metaRol = metasPorRol.find((m) => m.rol_id === rol.id) ?? {
                        rol_id: rol.id,
                        rol_nombre: rol.nombre,
                        meta_llamadas_diarias: null,
                        meta_chats_diarios: null,
                        meta_cierres_semanales: null,
                        meta_contestacion: null,
                      };
                      const updateMeta = (patch: Partial<MetaPorRolLocal>) => {
                        setMetasPorRol((prev) => {
                          const exists = prev.find((m) => m.rol_id === rol.id);
                          if (exists) {
                            return prev.map((m) => m.rol_id === rol.id ? { ...m, ...patch } : m);
                          }
                          return [...prev, { ...metaRol, ...patch }];
                        });
                      };
                      return (
                        <div key={rol.id} className="rounded-lg border border-surface-500 bg-surface-700/50 p-3 space-y-2">
                          <p className="text-xs font-semibold text-accent-cyan">{rol.nombre}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Llamadas/día</label>
                              <input
                                type="number" min={0}
                                value={metaRol.meta_llamadas_diarias ?? ''}
                                onChange={(e) => updateMeta({ meta_llamadas_diarias: e.target.value ? Math.max(0, +e.target.value) : null })}
                                placeholder="Ej. 30"
                                className="w-full rounded bg-surface-600 border border-surface-400/30 px-2 py-1 text-xs text-white focus:ring-1 focus:ring-accent-cyan/40"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Chats/día</label>
                              <input
                                type="number" min={0}
                                value={metaRol.meta_chats_diarios ?? ''}
                                onChange={(e) => updateMeta({ meta_chats_diarios: e.target.value ? Math.max(0, +e.target.value) : null })}
                                placeholder="Ej. 20"
                                className="w-full rounded bg-surface-600 border border-surface-400/30 px-2 py-1 text-xs text-white focus:ring-1 focus:ring-accent-cyan/40"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">Cierres/semana</label>
                              <input
                                type="number" min={0}
                                value={metaRol.meta_cierres_semanales ?? ''}
                                onChange={(e) => updateMeta({ meta_cierres_semanales: e.target.value ? Math.max(0, +e.target.value) : null })}
                                placeholder="Ej. 5"
                                className="w-full rounded bg-surface-600 border border-surface-400/30 px-2 py-1 text-xs text-white focus:ring-1 focus:ring-accent-cyan/40"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 mb-1">% Contestación</label>
                              <input
                                type="number" min={0} max={100}
                                value={metaRol.meta_contestacion ?? ''}
                                onChange={(e) => updateMeta({ meta_contestacion: e.target.value ? Math.max(0, +e.target.value) : null })}
                                placeholder="Ej. 60"
                                className="w-full rounded bg-surface-600 border border-surface-400/30 px-2 py-1 text-xs text-white focus:ring-1 focus:ring-accent-cyan/40"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-purple/30">
                <div className="rounded-lg p-2 bg-accent-purple/20 border border-accent-purple/40"><GitBranch className="w-5 h-5 text-accent-purple" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">Embudo unificado <span className="relative group"><HelpCircle className="w-4 h-4 text-gray-500 cursor-help" /><span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Define las etapas de tu embudo de ventas. La IA clasifica llamadas, videollamadas y chats de forma automática. Todas las fuentes contribuyen al mismo funnel.</span></span></h3>
                  <p className="text-sm text-gray-400">Define cada etapa, la condición para la IA, las fuentes de datos y reglas automáticas por evento.</p>
                </div>
              </div>
              {embudoEtapas.length === 0 && (
                <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-6 text-center text-gray-500 text-sm">
                  Sin embudo personalizado. Se usa el estándar (Cerrada, Ofertada, No_Ofertada, CANCELADA, PDTE).
                </div>
              )}
              <ul className="space-y-3">
                {embudoEtapas.map((etapa, i) => {
                  // Abiertas por defecto si no hay reglas aún (para descubribilidad)
                  const reglas = etapa.reglas_automaticas ?? [];
                  const reglasAbiertas = reglasAbiertasMap[etapa.id] ?? (reglas.length === 0);
                  const fuentes = etapa.fuentes ?? ['llamadas', 'videollamadas', 'chats'];
                  return (
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
                    {/* Condición IA — solo visible si la etapa incluye llamadas o videollamadas */}
                    {(() => {
                      const fuentesEtapa = etapa.fuentes ?? ['llamadas', 'videollamadas', 'chats'];
                      const soloChats = fuentesEtapa.length > 0 && !fuentesEtapa.includes('llamadas') && !fuentesEtapa.includes('videollamadas');
                      if (soloChats) return (
                        <div className="rounded-lg bg-surface-600/30 border border-surface-500/50 p-3 text-xs text-gray-500 flex items-start gap-2">
                          <span>💡</span>
                          <span>Esta etapa solo incluye <strong className="text-gray-400">Chats</strong>. Los chats se clasifican por <strong className="text-gray-400">IA automática</strong> igual que llamadas y videollamadas. No necesitas definir una condición aquí.</span>
                        </div>
                      );
                      return (
                        <div>
                          <label className="block text-[11px] font-medium text-accent-cyan mb-1">
                            Condición para la IA
                            <span className="text-gray-500 font-normal ml-1">(clasifica llamadas y videollamadas)</span>
                          </label>
                          <textarea
                            value={etapa.condition ?? ''}
                            onChange={(e) => setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, condition: e.target.value } : x))}
                            placeholder={`Describe cuándo un lead debe clasificarse en esta etapa.\nEj: "El lead mostró interés real, preguntó por precios o pidió una propuesta formal."`}
                            className="w-full rounded-lg bg-surface-600 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-600 min-h-[60px] focus:ring-2 focus:ring-accent-cyan/40 resize-y"
                          />
                        </div>
                      );
                    })()}
                    {/* Fuentes de datos */}
                    <div className="rounded-lg bg-surface-600/50 border border-surface-500 p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-300">Fuentes de datos para esta etapa</span>
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                          <span className="absolute bottom-full left-0 mb-2 w-64 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Selecciona de qué canales provienen los leads que pueden llegar a esta etapa. Todos los canales (llamadas, videollamadas y chats) son clasificados automáticamente por IA.
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {(['llamadas', 'videollamadas', 'chats'] as const).map((fuente) => {
                          const isChecked = fuentes.includes(fuente);
                          const label = fuente === 'llamadas' ? '📞 Llamadas' : fuente === 'videollamadas' ? '🎥 Videollamadas' : '💬 Chats';
                          return (
                            <label key={fuente} className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const newFuentes = e.target.checked
                                    ? [...fuentes, fuente]
                                    : fuentes.filter((f) => f !== fuente);
                                  setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, fuentes: newFuentes } : x));
                                }}
                                className="w-3.5 h-3.5 rounded accent-purple-500"
                              />
                              <span className="text-xs text-gray-300">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    {/* Etapa catch-all */}
                    <label className="flex items-start gap-2.5 cursor-pointer rounded-lg bg-surface-600/30 border border-surface-500/50 p-3">
                      <input
                        type="checkbox"
                        checked={etapa.es_fallback ?? false}
                        onChange={(e) => setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, es_fallback: e.target.checked } : x))}
                        className="mt-0.5 accent-accent-amber"
                      />
                      <div>
                        <span className="text-xs font-medium text-gray-300">🪣 Etapa de captura general (catch-all)</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Si está activado, los leads que no clasifiquen en ninguna otra etapa del embudo llegan aquí automáticamente.
                          Útil como etapa de "En seguimiento" o "Sin clasificar" para no perder ningún lead.
                        </p>
                      </div>
                    </label>

                    {/* Reglas automáticas — abiertas por defecto si no hay reglas aún */}
                    <div className="rounded-lg border border-surface-500 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setReglasAbiertasMap((m) => ({ ...m, [etapa.id]: !reglasAbiertas }))}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface-600/50 hover:bg-surface-600 transition-colors text-xs font-medium text-gray-400 hover:text-white"
                      >
                        <span className="flex items-center gap-1.5">
                          ⚙️ Reglas automáticas (sin IA)
                          {reglas.length > 0
                            ? <span className="bg-accent-purple/30 text-accent-purple rounded-full px-1.5 py-0.5 text-[10px]">{reglas.length} activa{reglas.length > 1 ? 's' : ''}</span>
                            : <span className="text-gray-600 text-[10px]">— opcional, sin necesidad de IA</span>
                          }
                        </span>
                        <span>{reglasAbiertas ? '▲' : '▼'}</span>
                      </button>
                      {reglasAbiertas && (
                        <div className="p-3 space-y-2 bg-surface-700/50">
                          <p className="text-[10px] text-gray-500">Mueve leads a esta etapa automáticamente cuando ocurre un evento, sin necesitar clasificación de IA.</p>
                          {reglas.length === 0 && (
                            <p className="text-[11px] text-gray-600 italic">Sin reglas automáticas configuradas.</p>
                          )}
                          {reglas.map((regla, ri) => (
                            <div key={ri} className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-gray-400">Si el lead tiene estado:</span>
                              <select
                                value={regla.evento}
                                onChange={(e) => {
                                  const newReglas = reglas.map((r, j) => j === ri ? { ...r, evento: e.target.value as ReglaAutomatica['evento'] } : r);
                                  setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, reglas_automaticas: newReglas } : x));
                                }}
                                className="rounded bg-surface-600 border border-surface-500 px-2 py-1 text-xs text-white"
                                title={regla.evento === 'no_show' ? 'Cuando el lead tenía cita agendada pero no se presentó.' : regla.evento === 'cancelada' ? 'Cuando el lead cancela una cita.' : 'Si el lead no tiene ninguna interacción nueva después de X días.'}
                              >
                                <option value="no_show">no_show — no se presentó a la cita</option>
                                <option value="cancelada">cancelada — canceló la cita</option>
                                <option value="sin_actividad_dias">sin actividad por X días</option>
                              </select>
                              {regla.evento === 'sin_actividad_dias' && (
                                <input
                                  type="number"
                                  min={1}
                                  value={regla.valor ?? 7}
                                  onChange={(e) => {
                                    const newReglas = reglas.map((r, j) => j === ri ? { ...r, valor: Number(e.target.value) } : r);
                                    setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, reglas_automaticas: newReglas } : x));
                                  }}
                                  className="w-16 rounded bg-surface-600 border border-surface-500 px-2 py-1 text-xs text-white"
                                  placeholder="días"
                                />
                              )}
                              <span className="text-[11px] text-accent-cyan">→ mover a esta etapa</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const newReglas = reglas.filter((_, j) => j !== ri);
                                  setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, reglas_automaticas: newReglas } : x));
                                }}
                                className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400"
                                title="Eliminar regla"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const newReglas = [...reglas, { evento: 'no_show' as const }];
                              setEmbudoEtapas((prev) => prev.map((x) => x.id === etapa.id ? { ...x, reglas_automaticas: newReglas } : x));
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-accent-purple hover:text-accent-purple/80 mt-1"
                          >
                            <Plus className="w-3 h-3" /> Agregar regla
                          </button>
                          <div className="rounded bg-surface-800/60 border border-surface-600 px-2 py-1.5 text-[10px] text-gray-500 space-y-0.5 mt-1">
                            <p>💡 <strong className="text-gray-400">no_show:</strong> Cuando el lead tenía cita agendada pero no se presentó, se mueve automáticamente a esta etapa.</p>
                            <p>💡 <strong className="text-gray-400">cancelada:</strong> Cuando el lead cancela una cita, se mueve a esta etapa.</p>
                            <p>💡 <strong className="text-gray-400">sin_actividad_dias:</strong> Si el lead no tiene ninguna interacción nueva después de X días, se mueve a esta etapa. Útil para identificar leads fríos.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
              <button type="button" onClick={addEmbudoEtapa}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/50 hover:bg-accent-purple/30 transition-all">
                <Plus className="w-4 h-4" /> Añadir etapa
              </button>
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/5 px-3 py-2 text-sm text-gray-400 space-y-1">
                <p><strong className="text-accent-purple">Cómo funciona el embudo unificado:</strong></p>
                <p>📞 <strong className="text-gray-300">Llamadas y videollamadas:</strong> La IA lee la transcripción y la compara con las condiciones que escribas aquí. El estado que mejor coincida es el que se asigna al lead.</p>
                <p>💬 <strong className="text-gray-300">Chats:</strong> Se clasifican automáticamente por IA igual que llamadas y videollamadas. El análisis ocurre cada noche y clasifica los chats del día anterior.</p>
                <p>Si el nombre de la etapa contiene &quot;cerrad&quot; (ej. &quot;Cerrada MRR&quot;), el sistema lo trata automáticamente como cierre para calcular revenue.</p>
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-accent-amber/30">
                <div className="rounded-lg p-2 bg-accent-amber/20 border border-accent-amber/40"><MessageSquare className="w-5 h-5 text-accent-amber" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">Chats: Speed to Lead e IA <span className="relative group"><HelpCircle className="w-4 h-4 text-gray-500 cursor-help" /><span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-normal">Configura cómo se mide el Speed to Lead en chats y cuándo se ejecuta el análisis IA nocturno. La IA clasifica cada chat automáticamente igual que llamadas y videollamadas.</span></span></h3>
                  <p className="text-sm text-gray-400">Configuración de chatbot, Speed to Lead y análisis IA nocturno para chats.</p>
                </div>
              </div>

              {/* ── Sección: Speed to Lead ── */}
              <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-accent-cyan flex items-center gap-2">⚡ Configuración de Speed to Lead</h4>

                {/* Toggle chatbot */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-white font-medium">¿Tu equipo usa un chatbot antes de que atienda el asesor?</span>
                      <span className="relative group">
                        <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                        <span className="absolute bottom-full left-0 mb-2 w-72 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          Si tienes un chatbot automático que responde primero, el Speed to Lead real es cuando el asesor humano toma la conversación. Si no tienes chatbot, se mide desde el primer mensaje del lead.
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500">Actívalo si el primer que responde es un bot, no un asesor.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatConfig((c) => ({ ...c, tiene_chatbot: !c.tiene_chatbot }))}
                    className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${chatConfig.tiene_chatbot ? 'bg-accent-cyan' : 'bg-surface-500'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${chatConfig.tiene_chatbot ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {chatConfig.tiene_chatbot && (
                  <div className="rounded-lg bg-surface-700/60 border border-surface-500 p-3 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-gray-300">Emoji que usa el asesor para tomar el chat</label>
                        <span className="relative group">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                          <span className="absolute bottom-full left-0 mb-2 w-72 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Cuando el asesor humano quiera tomar una conversación del chatbot, debe enviar este emoji. El sistema calculará el Speed to Lead desde el primer mensaje del lead hasta este emoji. Ej: ⚡ o 👋
                          </span>
                        </span>
                      </div>
                      <input
                        type="text"
                        value={chatConfig.emoji_toma_atencion}
                        onChange={(e) => setChatConfig((c) => ({ ...c, emoji_toma_atencion: e.target.value }))}
                        placeholder="ej: ⚡ o 👋"
                        className="w-32 rounded-lg bg-surface-600 border border-surface-500 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                        maxLength={8}
                      />
                      {chatConfig.emoji_toma_atencion && (
                        <p className="text-[11px] text-gray-500">Emoji activo: <span className="text-2xl">{chatConfig.emoji_toma_atencion}</span></p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Sección: Análisis IA de chats ── */}
              <div className="rounded-xl border border-accent-purple/30 bg-accent-purple/5 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-accent-purple flex items-center gap-2">🤖 Análisis automático de chats</h4>
                <p className="text-sm text-gray-400">
                  El sistema analiza tus conversaciones de chat cada noche y clasifica automáticamente cada lead en tu embudo,
                  igual que con llamadas y videollamadas.
                </p>

                {/* Hora del análisis */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-gray-300">Hora del análisis nocturno</label>
                    <span className="relative group">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
                      <span className="absolute bottom-full left-0 mb-2 w-60 p-2 rounded-lg bg-surface-900 border border-surface-500 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        El sistema analiza los chats del día anterior a esta hora.
                      </span>
                    </span>
                  </div>
                  <select
                    value={chatAnalisisHora}
                    onChange={(e) => setChatAnalisisHora(Number(e.target.value))}
                    className="w-40 rounded-lg bg-surface-600 border border-surface-500 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-purple/40"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500">💡 El sistema analiza los chats del día anterior a esta hora.</p>
                </div>

                {/* Botón analizar ahora */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleAnalizarChats}
                    disabled={analizandoChats}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-purple/20 text-accent-purple border border-accent-purple/50 hover:bg-accent-purple/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analizandoChats ? (
                      <>
                        <span className="animate-spin">⏳</span> Analizando chats...
                      </>
                    ) : (
                      <>▶ Analizar chats pendientes ahora</>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-500">ℹ️ Analiza los chats de las últimas 24h que aún no tienen clasificación. Tiempo estimado: ~2 min por cada 100 chats.</p>
                  {analisisResult && (
                    <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2 text-xs text-gray-300 space-y-0.5">
                      <p className="text-accent-green font-semibold">✅ Análisis completado</p>
                      <p>Procesados: <strong>{analisisResult.processed}</strong> · Actualizados: <strong>{analisisResult.updated}</strong> · Errores: <strong>{analisisResult.errors}</strong></p>
                      <p>Costo estimado: <strong className="text-accent-amber">{analisisResult.costEstimate}</strong></p>
                    </div>
                  )}
                </div>

                {/* Estimado de costos */}
                <div className="rounded-lg border border-surface-500 bg-surface-700/40 px-3 py-2.5 text-xs text-gray-400 space-y-1">
                  <p className="font-semibold text-gray-300">Estimado de costos</p>
                  <p>💡 Usamos GPT-4o-mini, el modelo más eficiente de OpenAI.</p>
                  <p>Precio: <span className="text-accent-amber">$0.15/1M tokens entrada · $0.60/1M tokens salida</span></p>
                  <p>Estimado por chat: ~$0.00008 USD (500 tokens entrada + 100 salida)</p>
                  <p className="text-gray-500">Si usas tu propia API Key (Paso 9), los costos van a tu cuenta de OpenAI directamente.</p>
                </div>

                {/* ── Recuperar chats históricos ── */}
                <ChatRecoverySection />

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

              {/* Toggle: Sección de Chats en Dashboard */}
              <div className="rounded-xl border border-surface-500 bg-surface-800/60 p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-surface-600/50">
                  <div className="rounded-lg p-1.5 bg-accent-cyan/20 border border-accent-cyan/40">
                    <MessageSquare className="w-4 h-4 text-accent-cyan" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Visibilidad de secciones</h4>
                    <p className="text-xs text-gray-400">Activa o desactiva secciones del panel ejecutivo.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSeccionChatsDashboard((v) => !v)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl p-3 border-2 text-left transition-all ${
                    seccionChatsDashboard
                      ? 'border-accent-cyan bg-accent-cyan/10 shadow-[0_0_16px_-6px_rgba(0,240,255,0.25)]'
                      : 'border-surface-500 bg-surface-700/50 hover:border-surface-400'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-white">💬 Mostrar sección de Chats en Dashboard</p>
                    <p className="text-xs text-gray-400 mt-0.5">Muestra un resumen de conversaciones de chat en el panel ejecutivo.</p>
                  </div>
                  <div className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${seccionChatsDashboard ? 'bg-accent-cyan' : 'bg-surface-600'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${seccionChatsDashboard ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-surface-500/80">
          <button type="button" onClick={async () => { await handleSave(); setCurrentStep((s) => Math.max(1, s - 1)); }} disabled={currentStep === 1 || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-700/80 border border-surface-500 text-sm text-gray-300 hover:bg-surface-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-green text-black text-sm font-semibold hover:shadow-[0_0_20px_-6px_rgba(0,230,118,0.5)] transition-all border border-accent-green disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button type="button" onClick={async () => { await handleSave(); setCurrentStep((s) => Math.min(TOTAL_STEPS, s + 1)); }} disabled={currentStep === TOTAL_STEPS || saving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-[0_0_24px_-6px_rgba(0,240,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
