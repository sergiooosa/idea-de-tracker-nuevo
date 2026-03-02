"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/dashboard/PageHeader';
import { ChevronRight, ChevronLeft, Phone, Video, Tag, BarChart3, Building2, Save, Target, Loader2 } from 'lucide-react';

interface TagRule { id: string; condition: string; tag: string; source: string }
interface MetricRule {
  id: string; name: string; description: string; condition: string;
  increment: number; whenMeasured: string; isRecurring: 'recurrente' | 'unica';
  section: string; panel: string;
}
interface SystemConfig {
  prompt_ventas: string; prompt_videollamadas: string; prompt_llamadas: string;
  reglas_etiquetas: TagRule[]; metricas_personalizadas: MetricRule[];
}
interface MetasData {
  meta_llamadas_diarias: number; leads_nuevos_dia_1: number;
  leads_nuevos_dia_2: number; leads_nuevos_dia_3: number;
}

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
  const initialStep = Math.min(6, Math.max(1, Number(stepParam) || 1));
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [promptEmpresa, setPromptEmpresa] = useState('');
  const [promptEvaluacion, setPromptEvaluacion] = useState('');
  const [promptLlamadas, setPromptLlamadas] = useState('');
  const [tagRules, setTagRules] = useState<TagRule[]>([]);
  const [metricRules, setMetricRules] = useState<MetricRule[]>([]);
  const [metas, setMetas] = useState<MetasData>({ meta_llamadas_diarias: 50, leads_nuevos_dia_1: 3, leads_nuevos_dia_2: 4, leads_nuevos_dia_3: 5 });

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
      await fetch('/api/data/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_ventas: promptEmpresa,
          prompt_videollamadas: promptEvaluacion,
          prompt_llamadas: promptLlamadas,
          reglas_etiquetas: tagRules,
          metricas_personalizadas: metricRules,
        }),
      });
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
      <PageHeader title="Control del sistema" subtitle="Prompts / Etiquetas / Métricas" />
      <div className="p-3 md:p-4 max-w-3xl mx-auto space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          {[
            { id: 1, title: 'Contexto de empresa', icon: Building2, color: 'blue' },
            { id: 2, title: 'Evaluación videollamadas', icon: Video, color: 'purple' },
            { id: 3, title: 'Evaluación llamadas', icon: Phone, color: 'cyan' },
            { id: 4, title: 'Reglas de etiquetas', icon: Tag, color: 'amber' },
            { id: 5, title: 'Métricas personalizadas', icon: BarChart3, color: 'green' },
            { id: 6, title: 'Establecer metas', icon: Target, color: 'cyan' },
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
            <button type="button" onClick={() => setCurrentStep((s) => Math.min(6, s + 1))} disabled={currentStep === 6}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-[0_0_24px_-6px_rgba(0,240,255,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
