"use client";

import { useState, useCallback, useEffect } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { format, subDays } from 'date-fns';
import { BadgeDollarSign, Plus, Trash2, Pencil, X, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ComisionConfig {
  id: number;
  id_cuenta: number;
  closer_email: string;
  closer_nombre: string | null;
  tipo: string;
  valor: string;
  aplica_sobre: string | null;
  activo: boolean;
}

interface ComisionResultado {
  closer_email: string;
  closer_nombre: string | null;
  tipo: string;
  valor: string;
  aplica_sobre: string | null;
  cierres: number;
  monto_generado: number;
  comision_calculada: number;
}

interface ComisionesResponse {
  configs: ComisionConfig[];
  resultados: ComisionResultado[];
}

interface FormState {
  closer_email: string;
  closer_nombre: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: string;
  aplica_sobre: 'cash_collected' | 'facturacion';
}

const EMPTY_FORM: FormState = {
  closer_email: '',
  closer_nombre: '',
  tipo: 'porcentaje',
  valor: '',
  aplica_sobre: 'cash_collected',
};

const fm = (n: number) =>
  `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ComisionesPage() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<ComisionesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

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

  useEffect(() => { void loadData(); }, [loadData]);

  const handleOpenNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleOpenEdit = (cfg: ComisionConfig) => {
    setEditingId(cfg.id);
    setForm({
      closer_email: cfg.closer_email,
      closer_nombre: cfg.closer_nombre ?? '',
      tipo: (cfg.tipo as 'porcentaje' | 'monto_fijo') ?? 'porcentaje',
      valor: cfg.valor,
      aplica_sobre: (cfg.aplica_sobre as 'cash_collected' | 'facturacion') ?? 'cash_collected',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.closer_email.trim()) {
      toast.error('El correo del closer es requerido');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/data/comisiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId ?? undefined,
          closer_email: form.closer_email.trim(),
          closer_nombre: form.closer_nombre.trim() || null,
          tipo: form.tipo,
          valor: parseFloat(form.valor) || 0,
          aplica_sobre: form.aplica_sobre,
          activo: true,
        }),
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

  const totalComisiones = (data?.resultados ?? []).reduce((s, r) => s + r.comision_calculada, 0);

  return (
    <div className="p-3 md:p-4 space-y-4 text-sm min-w-0 max-w-full overflow-x-hidden">
      <PageHeader title="Comisiones" />

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
            <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">Closers configurados</p>
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
                  <th className="px-3 py-2 font-medium">Closer</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Aplica sobre</th>
                  <th className="px-3 py-2 font-medium text-right">Cierres</th>
                  <th className="px-3 py-2 font-medium text-right">Monto generado</th>
                  <th className="px-3 py-2 font-medium text-right">Comisión</th>
                </tr>
              </thead>
              <tbody>
                {data.resultados.map((r, i) => (
                  <tr key={i} className="border-t border-surface-500 hover:bg-surface-700/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-white">{r.closer_nombre ?? r.closer_email}</div>
                      <div className="text-[10px] text-gray-500">{r.closer_email}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {r.tipo === 'porcentaje'
                        ? `${parseFloat(r.valor).toFixed(2)}%`
                        : `${fm(parseFloat(r.valor))} / cierre`}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {r.aplica_sobre === 'facturacion' ? 'Facturación' : 'Cash collected'}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-white">{r.cierres}</td>
                    <td className="px-3 py-2 text-right text-gray-300">{fm(r.monto_generado)}</td>
                    <td className="px-3 py-2 text-right font-bold text-accent-green">{fm(r.comision_calculada)}</td>
                  </tr>
                ))}
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
                Define cuánto gana cada closer por sus cierres. Puedes usar porcentaje sobre el monto o un monto fijo por cierre.
              </span>
            </span>
          </h3>
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar comisión
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
                  <th className="px-3 py-2 font-medium">Closer</th>
                  <th className="px-3 py-2 font-medium">Tipo comisión</th>
                  <th className="px-3 py-2 font-medium">Valor</th>
                  <th className="px-3 py-2 font-medium">Aplica sobre</th>
                  <th className="px-3 py-2 font-medium w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.configs.map((cfg) => (
                  <tr key={cfg.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-white">{cfg.closer_nombre ?? cfg.closer_email}</div>
                      <div className="text-[10px] text-gray-500">{cfg.closer_email}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-300">
                      {cfg.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                    </td>
                    <td className="px-3 py-2 font-medium text-white">
                      {cfg.tipo === 'porcentaje'
                        ? `${parseFloat(cfg.valor).toFixed(2)}%`
                        : `${fm(parseFloat(cfg.valor))} / cierre`}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {cfg.aplica_sobre === 'facturacion' ? 'Facturación' : 'Cash collected'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} aria-hidden />
          <div className="relative rounded-xl border border-surface-500 bg-surface-800 shadow-xl max-w-sm w-full overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BadgeDollarSign className="w-4 h-4 text-accent-cyan" />
                {editingId ? 'Editar comisión' : 'Nueva comisión'}
              </h3>
              <button type="button" onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-surface-600">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Correo del closer *</label>
                <input
                  type="email"
                  value={form.closer_email}
                  onChange={(e) => setForm((f) => ({ ...f, closer_email: e.target.value }))}
                  placeholder="closer@empresa.com"
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Nombre del closer</label>
                <input
                  type="text"
                  value={form.closer_nombre}
                  onChange={(e) => setForm((f) => ({ ...f, closer_nombre: e.target.value }))}
                  placeholder="Nombre visible (opcional)"
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Tipo de comisión</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as 'porcentaje' | 'monto_fijo' }))}
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="porcentaje">Porcentaje sobre monto</option>
                  <option value="monto_fijo">Monto fijo por cierre</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">
                  {form.tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto fijo por cierre ($)'}
                </label>
                <input
                  type="number"
                  min={0}
                  step={form.tipo === 'porcentaje' ? 0.1 : 1}
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder={form.tipo === 'porcentaje' ? 'Ej. 5.5' : 'Ej. 500'}
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-400 mb-1">Aplica sobre</label>
                <select
                  value={form.aplica_sobre}
                  onChange={(e) => setForm((f) => ({ ...f, aplica_sobre: e.target.value as 'cash_collected' | 'facturacion' }))}
                  className="w-full rounded-lg bg-surface-600 border border-surface-400/30 px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="cash_collected">Cash collected</option>
                  <option value="facturacion">Facturación</option>
                </select>
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
