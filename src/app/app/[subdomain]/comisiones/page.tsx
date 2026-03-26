"use client";

import { useState, useCallback, useEffect } from 'react';
import { useT } from '@/contexts/LocaleContext';
import PageHeader from '@/components/dashboard/PageHeader';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { format, subDays } from 'date-fns';
import { BadgeDollarSign, Plus, Trash2, Pencil, X, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { TramoEscalada, SocioSplit } from '@/lib/db/schema';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TipoComision = 'individual' | 'global' | 'equipo' | 'escalada';
type TipoValor = 'porcentaje' | 'monto_fijo';
type AplicaSobre = 'cash_collected' | 'facturacion';

interface ComisionConfig {
  id: number;
  id_cuenta: number;
  closer_email: string;
  closer_nombre: string | null;
  tipo: string;
  valor: string;
  aplica_sobre: string | null;
  activo: boolean;
  tipo_comision: TipoComision;
  asesores_equipo: string[];
  tramos_escalada: TramoEscalada[];
}

interface ComisionResultado {
  id: number;
  closer_email: string;
  closer_nombre: string | null;
  tipo_comision: TipoComision;
  tipo_valor: string;
  valor: string;
  aplica_sobre: string | null;
  activo: boolean;
  asesores_equipo: string[];
  tramos_escalada: TramoEscalada[];
  cierres: number;
  revenue_base: number;
  comision_calculada: number;
  meta_revenue?: number;
  pct_meta_alcanzado?: number;
  tramo_aplicado?: TramoEscalada;
}

interface ComisionesResponse {
  configs: ComisionConfig[];
  resultados: ComisionResultado[];
}

interface UsuarioBasic {
  email: string;
  nombre: string | null;
}

interface FormState {
  tipo_comision: TipoComision;
  closer_email: string;
  closer_nombre: string;
  tipo_valor: TipoValor;
  valor: string;
  aplica_sobre: AplicaSobre;
  asesores_equipo: string[];
  tramos_escalada: TramoEscalada[];
  // Extended fields
  subtipo: string;
  nombre_proyecto: string;
  pct_division: string;
  forma_pago: string;
  socios_split: SocioSplit[];
  notas: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  tipo_comision: 'individual',
  closer_email: '',
  closer_nombre: '',
  tipo_valor: 'porcentaje',
  valor: '',
  aplica_sobre: 'cash_collected',
  asesores_equipo: [],
  tramos_escalada: [{ meta_pct: 0, comision_pct: 3 }],
  subtipo: 'estandar',
  nombre_proyecto: '',
  pct_division: '100',
  forma_pago: 'transferencia',
  socios_split: [],
  notas: '',
};

const TIPO_COMISION_INFO: Record<TipoComision, { label: string; color: string; desc: string; tooltip: string }> = {
  individual: {
    label: 'Individual',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    desc: 'Comisión sobre sus propios cierres',
    tooltip: 'El asesor gana un porcentaje (o monto fijo) de cada venta que cierra personalmente. Solo se cuentan sus propios cierres.',
  },
  global: {
    label: 'Global',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    desc: 'Comisión sobre todos los cierres del equipo',
    tooltip: 'El administrador o dueño gana un % de TODO lo que cierra el equipo completo. Ideal para owners o managers generales que supervisan todas las ventas.',
  },
  equipo: {
    label: 'Por equipo',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    desc: 'Comisión sobre cierres de asesores asignados',
    tooltip: 'El team lead gana un % de las ventas que cierran los asesores específicos bajo su cargo. Solo se cuentan los asesores que asignes en la lista.',
  },
  escalada: {
    label: 'Escalada',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    desc: 'El % sube según cuánto de la meta se cumple',
    tooltip: 'Incentiva superar la meta: el porcentaje de comisión sube automáticamente según el % de la meta que el asesor alcance. Por ejemplo: 3% si llega al 80% de la meta, 5% si llega al 90%, 8% si supera el 100%.',
  },
};

const fm = (n: number) =>
  `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Componente principal ───────────────────────────────────────────────────────

export default function ComisionesPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<ComisionesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioBasic[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/data/comisiones?from=${dateFrom}&to=${dateTo}`);
      if (res.ok) {
        const json = await res.json() as ComisionesResponse;
        setData(json);
      } else {
        toast.error('Error al cargar comisiones');
      }
    } catch {
      toast.error('Error de red al cargar comisiones');
    }
    setLoading(false);
  }, [dateFrom, dateTo]);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/data/usuarios');
      if (res.ok) {
        const json = await res.json() as UsuarioBasic[];
        setUsuarios(json);
      }
    } catch {
      // silencioso — no crítico
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => { void loadUsuarios(); }, [loadUsuarios]);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (cfg: ComisionConfig) => {
    setEditingId(cfg.id);
    const cfgExt = cfg as ComisionConfig & { subtipo?: string; nombre_proyecto?: string; pct_division?: string; forma_pago?: string; socios_split?: SocioSplit[]; notas?: string };
    setForm({
      tipo_comision: cfg.tipo_comision ?? 'individual',
      closer_email: cfg.closer_email,
      closer_nombre: cfg.closer_nombre ?? '',
      tipo_valor: (cfg.tipo as TipoValor) ?? 'porcentaje',
      valor: cfg.valor,
      aplica_sobre: (cfg.aplica_sobre as AplicaSobre) ?? 'cash_collected',
      asesores_equipo: cfg.asesores_equipo ?? [],
      tramos_escalada: cfg.tramos_escalada?.length ? cfg.tramos_escalada : [{ meta_pct: 0, comision_pct: 3 }],
      subtipo: cfgExt.subtipo ?? 'estandar',
      nombre_proyecto: cfgExt.nombre_proyecto ?? '',
      pct_division: cfgExt.pct_division ?? '100',
      forma_pago: cfgExt.forma_pago ?? 'transferencia',
      socios_split: cfgExt.socios_split ?? [],
      notas: cfgExt.notas ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    // Validaciones por tipo
    if (form.tipo_comision === 'individual' || form.tipo_comision === 'escalada') {
      if (!form.closer_email.trim()) {
        toast.error('El correo del asesor es requerido');
        return;
      }
    }
    if (form.tipo_comision === 'global' && !form.closer_nombre.trim()) {
      toast.error('El nombre del comisionista es requerido');
      return;
    }
    if (form.tipo_comision === 'equipo') {
      if (!form.closer_email.trim()) {
        toast.error('El correo del team lead es requerido');
        return;
      }
      if (form.asesores_equipo.length === 0) {
        toast.error('Debes asignar al menos un asesor al equipo');
        return;
      }
    }
    if (form.tipo_comision === 'escalada' && form.tramos_escalada.length === 0) {
      toast.error('Debes agregar al menos un tramo de comisión');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingId ?? undefined,
        closer_email: form.tipo_comision === 'global' ? `global_${Date.now()}` : form.closer_email.trim(),
        closer_nombre: form.closer_nombre.trim() || null,
        tipo: form.tipo_comision === 'escalada' ? 'porcentaje' : form.tipo_valor,
        valor: form.tipo_comision === 'escalada' ? 0 : (parseFloat(form.valor) || 0),
        aplica_sobre: form.aplica_sobre,
        activo: true,
        tipo_comision: form.tipo_comision,
        asesores_equipo: form.asesores_equipo,
        tramos_escalada: form.tramos_escalada,
        subtipo: form.subtipo || 'estandar',
        nombre_proyecto: form.nombre_proyecto || null,
        pct_division: parseFloat(form.pct_division) || 100,
        forma_pago: form.forma_pago || 'transferencia',
        socios_split: form.socios_split ?? [],
        notas: form.notas || null,
      };

      // Para global: usar un email especial si es nuevo
      if (form.tipo_comision === 'global') {
        payload.closer_email = editingId
          ? (data?.configs.find(c => c.id === editingId)?.closer_email ?? `global_${Date.now()}`)
          : `global_${Date.now()}`;
      }

      const res = await fetch('/api/data/comisiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success(editingId ? 'Comisión actualizada' : 'Comisión creada');
        setShowForm(false);
        void loadData();
      } else {
        toast.error('Error al guardar comisión');
      }
    } catch {
      toast.error('Error de red');
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/data/comisiones?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Comisión eliminada');
        setDeleteConfirm(null);
        void loadData();
      } else {
        toast.error('Error al eliminar');
      }
    } catch {
      toast.error('Error de red');
    }
  };

  const addTramo = () => {
    setForm(f => ({
      ...f,
      tramos_escalada: [...f.tramos_escalada, { meta_pct: 100, comision_pct: 0 }],
    }));
  };

  const removeTramo = (idx: number) => {
    setForm(f => ({ ...f, tramos_escalada: f.tramos_escalada.filter((_, i) => i !== idx) }));
  };

  const updateTramo = (idx: number, field: keyof TramoEscalada, value: number) => {
    setForm(f => ({
      ...f,
      tramos_escalada: f.tramos_escalada.map((t, i) => i === idx ? { ...t, [field]: value } : t),
    }));
  };

  const toggleAsesorEquipo = (email: string) => {
    setForm(f => {
      const existing = f.asesores_equipo.includes(email);
      return {
        ...f,
        asesores_equipo: existing
          ? f.asesores_equipo.filter(e => e !== email)
          : [...f.asesores_equipo, email],
      };
    });
  };

  const totalComisiones = (data?.resultados ?? []).reduce((s, r) => s + r.comision_calculada, 0);

  return (
    <div className="p-3 md:p-4 space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
      <PageHeader title={t.comisiones.titulo} />

      {/* Filtro de fechas */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">Período:</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(subDays(new Date(), 29), 'yyyy-MM-dd')}
          defaultTo={format(new Date(), 'yyyy-MM-dd')}
        />
      </div>

      {/* Resumen */}
      {data && data.resultados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-cyan kpi-card-fixed">
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">Total comisiones</p>
            <p className="text-base font-bold mt-0.5 text-accent-cyan">{fm(totalComisiones)}</p>
            <div className="kpi-card-spacer" />
          </div>
          <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-purple kpi-card-fixed">
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">Configurados</p>
            <p className="text-base font-bold mt-0.5 text-accent-purple">{data.configs.length}</p>
            <div className="kpi-card-spacer" />
          </div>
          <div className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">Total cierres</p>
            <p className="text-base font-bold mt-0.5 text-accent-green">
              {data.resultados.reduce((s, r) => s + r.cierres, 0)}
            </p>
            <div className="kpi-card-spacer" />
          </div>
        </div>
      )}

      {/* Tabla de resultados */}
      {data && data.resultados.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Resultados del período
          </h3>
          <div className="rounded-lg border border-surface-500 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Comisionista</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Base de cálculo</th>
                  <th className="px-3 py-2 font-medium text-right">Cierres</th>
                  <th className="px-3 py-2 font-medium text-right">Revenue base</th>
                  <th className="px-3 py-2 font-medium text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((r, i) => {
                  const info = TIPO_COMISION_INFO[r.tipo_comision];
                  return (
                    <tr key={i} className="border-t border-surface-500 hover:bg-surface-700/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-white">{r.closer_nombre ?? r.closer_email}</div>
                        {r.tipo_comision !== 'global' && (
                          <div className="text-[10px] text-gray-500">{r.closer_email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${info.color}`}>
                          {info.label}
                        </span>
                        {r.tipo_comision === 'escalada' && r.tramo_aplicado && (
                          <div className="text-[10px] text-purple-400 mt-0.5">
                            Tramo: {r.tramo_aplicado.meta_pct}% meta → {r.tramo_aplicado.comision_pct}%
                          </div>
                        )}
                        {r.tipo_comision === 'equipo' && (
                          <div className="text-[10px] text-yellow-400 mt-0.5">
                            Equipo: {r.asesores_equipo.length} asesores
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-[10px]">
                        {r.tipo_comision === 'global' && (
                          <span className="text-green-400 font-medium">TODO el equipo</span>
                        )}
                        {r.tipo_comision === 'equipo' && (
                          <span>Asesores asignados</span>
                        )}
                        {r.tipo_comision === 'individual' && (
                          <span>{r.aplica_sobre === 'facturacion' ? 'Facturación' : 'Cash collected'}</span>
                        )}
                        {r.tipo_comision === 'escalada' && r.meta_revenue !== undefined && (
                          <div>
                            <span>{r.aplica_sobre === 'facturacion' ? 'Facturación' : 'Cash collected'}</span>
                            <div className="text-purple-400">
                              Meta: {fm(r.meta_revenue)} · {r.pct_meta_alcanzado?.toFixed(1)}% alcanzado
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-white">{r.cierres}</td>
                      <td className="px-3 py-2 text-right text-gray-300">{fm(r.revenue_base)}</td>
                      <td className="px-3 py-2 text-right font-bold text-accent-green">
                        {fm(r.comision_calculada)}
                        {(r as ComisionResultado & { pct_division?: number; comision_neta?: number; splits_calculados?: Array<SocioSplit & { comision_asignada: number }> }).pct_division != null && (r as ComisionResultado & { pct_division?: number }).pct_division !== 100 && (
                          <div className="text-[10px] text-accent-amber">
                            Neta ({(r as ComisionResultado & { pct_division?: number }).pct_division}%): {fm((r as ComisionResultado & { comision_neta?: number }).comision_neta ?? r.comision_calculada)}
                          </div>
                        )}
                        {((r as ComisionResultado & { splits_calculados?: Array<SocioSplit & { comision_asignada: number }> }).splits_calculados ?? []).length > 0 && (
                          <div className="text-[10px] text-accent-purple mt-0.5">
                            {((r as ComisionResultado & { splits_calculados?: Array<SocioSplit & { comision_asignada: number }> }).splits_calculados ?? []).map((s, i) => (
                              <div key={i}>{s.nombre ?? s.email}: {fm(s.comision_asignada)}</div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-surface-400 bg-surface-700/30">
                  <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-gray-300">Total comisiones:</td>
                  <td className="px-3 py-2 text-right font-bold text-accent-cyan">{fm(totalComisiones)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-accent-cyan" />
          <span className="ml-2 text-sm text-gray-400">Cargando...</span>
        </div>
      )}

      {/* Tabla de configuración */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            Configuración de comisiones
            <span className="relative group">
              <HelpCircle className="w-3.5 h-3.5 text-gray-500 cursor-help" />
              <span className="absolute bottom-full left-0 mb-2 w-64 p-2 rounded-lg bg-surface-900 border border-surface-500 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Define cuánto gana cada comisionista según el tipo: individual, global, por equipo o escalada según meta.
              </span>
            </span>
          </h3>
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.comisiones.agregar}
          </button>
        </div>

        {!data || data.configs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-surface-500 bg-surface-700/30 px-4 py-6 text-center text-gray-500 text-xs">
            Sin comisiones configuradas. Haz clic en &quot;+ Agregar comisión&quot; para comenzar.
          </div>
        ) : (
          <div className="rounded-lg border border-surface-500 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Comisionista</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Valor / Tramos</th>
                  <th className="px-3 py-2 font-medium">Aplica sobre</th>
                  <th className="px-3 py-2 font-medium w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.configs.map((cfg) => {
                  const tipoComision = cfg.tipo_comision ?? 'individual';
                  const info = TIPO_COMISION_INFO[tipoComision];
                  return (
                    <tr key={cfg.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-white">{cfg.closer_nombre ?? cfg.closer_email}</div>
                        {tipoComision !== 'global' && (
                          <div className="text-[10px] text-gray-500">{cfg.closer_email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${info.color}`}>
                          {info.label}
                        </span>
                        {tipoComision === 'equipo' && cfg.asesores_equipo?.length > 0 && (
                          <div className="text-[10px] text-yellow-400 mt-0.5">{cfg.asesores_equipo.length} asesores</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {tipoComision === 'escalada' ? (
                          <div className="space-y-0.5">
                            {(cfg.tramos_escalada ?? []).map((t, i) => (
                              <div key={i} className="text-[10px] text-purple-300">
                                ≥{t.meta_pct}% meta → {t.comision_pct}%
                              </div>
                            ))}
                          </div>
                        ) : cfg.tipo === 'porcentaje' ? (
                          `${parseFloat(cfg.valor).toFixed(2)}%`
                        ) : (
                          `${fm(parseFloat(cfg.valor))} / cierre`
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-400">
                        {tipoComision === 'global'
                          ? 'Todo el equipo'
                          : cfg.aplica_sobre === 'facturacion'
                          ? 'Facturación'
                          : 'Cash collected'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cfg)}
                            className="p-1 rounded hover:bg-surface-600 text-gray-400 hover:text-accent-cyan transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirm === cfg.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDelete(cfg.id)}
                                className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] hover:bg-red-500/30"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1 rounded hover:bg-surface-600 text-gray-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(cfg.id)}
                              className="p-1 rounded hover:bg-surface-600 text-gray-400 hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} aria-hidden />
          <div className="relative rounded-xl border border-surface-500 bg-surface-800 shadow-xl max-w-md w-full overflow-hidden my-8">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4 text-accent-cyan" />
                {editingId ? 'Editar comisión' : 'Nueva comisión'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface-600">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Selector de tipo */}
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-2">Tipo de comisión *</label>
                <div className="space-y-2">
                  {(Object.keys(TIPO_COMISION_INFO) as TipoComision[]).map((tipo) => {
                    const info = TIPO_COMISION_INFO[tipo];
                    const isSelected = form.tipo_comision === tipo;
                    return (
                      <label
                        key={tipo}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-accent-cyan/50 bg-accent-cyan/5'
                            : 'border-surface-400/30 hover:border-surface-400/60 bg-surface-700/30'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tipo_comision"
                          value={tipo}
                          checked={isSelected}
                          onChange={() => setForm(f => ({ ...f, tipo_comision: tipo }))}
                          className="mt-0.5 accent-cyan-400"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${info.color}`}>
                              {info.label}
                            </span>
                            <span className="text-xs text-gray-300">{info.desc}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-1">💡 {info.tooltip}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Nombre (siempre visible) */}
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                  {form.tipo_comision === 'global' ? 'Nombre del comisionista *' : 'Nombre visible (opcional)'}
                </label>
                <input
                  type="text"
                  value={form.closer_nombre}
                  onChange={(e) => setForm(f => ({ ...f, closer_nombre: e.target.value }))}
                  placeholder={form.tipo_comision === 'global' ? 'Ej. Juan Díaz - Dueño' : 'Nombre visible (opcional)'}
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>

              {/* Email asesor — individual, equipo (team lead), escalada */}
              {form.tipo_comision !== 'global' && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">
                    {form.tipo_comision === 'equipo' ? 'Correo del team lead *' : 'Correo del asesor *'}
                  </label>
                  {usuarios.length > 0 ? (
                    <select
                      value={form.closer_email}
                      onChange={(e) => setForm(f => ({ ...f, closer_email: e.target.value }))}
                      className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                    >
                      <option value="">— Seleccionar asesor —</option>
                      {usuarios.map(u => (
                        <option key={u.email} value={u.email}>
                          {u.nombre ? `${u.nombre} (${u.email})` : u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={form.closer_email}
                      onChange={(e) => setForm(f => ({ ...f, closer_email: e.target.value }))}
                      placeholder="asesor@empresa.com"
                      className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                    />
                  )}
                </div>
              )}

              {/* Asesores del equipo — solo tipo equipo */}
              {form.tipo_comision === 'equipo' && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">
                    Asesores bajo su cargo *
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Selecciona los asesores cuyos cierres contarán para la comisión de este team lead.
                  </p>
                  {usuarios.length > 0 ? (
                    <div className="rounded-lg border border-surface-400/30 bg-surface-700/30 max-h-36 overflow-y-auto divide-y divide-surface-500/30">
                      {usuarios.map(u => (
                        <label key={u.email} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-600/40">
                          <input
                            type="checkbox"
                            checked={form.asesores_equipo.includes(u.email)}
                            onChange={() => toggleAsesorEquipo(u.email)}
                            className="accent-yellow-400"
                          />
                          <span className="text-xs text-gray-300">
                            {u.nombre ? `${u.nombre}` : u.email}
                          </span>
                          <span className="text-[10px] text-gray-500 ml-auto">{u.email}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500">
                      No se pudieron cargar los usuarios. Verifica permisos.
                    </p>
                  )}
                  {form.asesores_equipo.length > 0 && (
                    <p className="text-[10px] text-yellow-400 mt-1">
                      {form.asesores_equipo.length} asesor{form.asesores_equipo.length !== 1 ? 'es' : ''} seleccionado{form.asesores_equipo.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {/* Tramos escalada — solo tipo escalada */}
              {form.tipo_comision === 'escalada' ? (
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">
                    Tramos de comisión *
                  </label>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Define qué % de comisión aplica según el % de meta alcanzado. El sistema aplica el tramo más alto que corresponda.
                  </p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-[10px] text-gray-500 px-1">
                      <span>% de meta alcanzado</span>
                      <span>% de comisión</span>
                      <span></span>
                    </div>
                    {form.tramos_escalada.map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={t.meta_pct}
                            onChange={(e) => updateTramo(i, 'meta_pct', parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">%</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={t.comision_pct}
                            onChange={(e) => updateTramo(i, 'comision_pct', parseFloat(e.target.value) || 0)}
                            className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500/40 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTramo(i)}
                          disabled={form.tramos_escalada.length <= 1}
                          className="p-1.5 rounded hover:bg-surface-600 text-gray-500 hover:text-red-400 disabled:opacity-30"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTramo}
                      className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar tramo
                    </button>
                  </div>
                </div>
              ) : (
                /* Tipo valor y valor — todos excepto escalada */
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">Tipo de valor</label>
                    <select
                      value={form.tipo_valor}
                      onChange={(e) => setForm(f => ({ ...f, tipo_valor: e.target.value as TipoValor }))}
                      className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                    >
                      <option value="porcentaje">Porcentaje sobre monto</option>
                      <option value="monto_fijo">Monto fijo por cierre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-400 mb-1">
                      {form.tipo_valor === 'porcentaje' ? 'Porcentaje (%)' : 'Monto fijo por cierre ($)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={form.tipo_valor === 'porcentaje' ? 0.1 : 1}
                      value={form.valor}
                      onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                      placeholder={form.tipo_valor === 'porcentaje' ? 'Ej. 5.5' : 'Ej. 500'}
                      className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                    />
                  </div>
                </>
              )}

              {/* Aplica sobre — siempre visible excepto global que no necesita */}
              {form.tipo_comision !== 'global' && (
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Aplica sobre</label>
                  <select
                    value={form.aplica_sobre}
                    onChange={(e) => setForm(f => ({ ...f, aplica_sobre: e.target.value as AplicaSobre }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                  >
                    <option value="cash_collected">Cash collected (dinero efectivamente cobrado)</option>
                    <option value="facturacion">Facturación (monto facturado)</option>
                  </select>
                </div>
              )}
            </div>

            {/* ── Campos extendidos ── */}
            <div className="px-4 pb-4 space-y-3 border-t border-surface-600 pt-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Campos adicionales (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Subtipo</label>
                  <select
                    value={form.subtipo}
                    onChange={(e) => setForm(f => ({ ...f, subtipo: e.target.value }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                  >
                    <option value="estandar">Estándar</option>
                    <option value="proyecto">Proyecto</option>
                    <option value="division">División</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Forma de pago</label>
                  <select
                    value={form.forma_pago}
                    onChange={(e) => setForm(f => ({ ...f, forma_pago: e.target.value }))}
                    className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                  >
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="crypto">Crypto</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">% sobre comisión total (división)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.01}
                    value={form.pct_division}
                    onChange={(e) => setForm(f => ({ ...f, pct_division: e.target.value }))}
                    placeholder="100"
                    className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-400 mb-1">Nombre proyecto</label>
                  <input
                    type="text"
                    value={form.nombre_proyecto}
                    onChange={(e) => setForm(f => ({ ...f, nombre_proyecto: e.target.value }))}
                    placeholder="Ej: Proyecto Alpha"
                    className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Notas</label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))}
                  placeholder="Notas internas..."
                  rows={2}
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-500">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
