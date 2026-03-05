"use client";

import { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import type {
  MetricaConfig,
  MetricaCampoConfig,
  MetricaFormulaConfig,
  MetricaManualEntry,
} from "@/lib/db/schema";
import SelectorFuenteConBusqueda from "./SelectorFuenteConBusqueda";

const TIPOS_CAMPO = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "fecha", label: "Fecha" },
  { value: "boolean", label: "Sí/No" },
] as const;

const TIPOS_FORMULA = [
  { value: "directo", label: "Directo (copiar valor)" },
  { value: "suma", label: "Suma" },
  { value: "promedio", label: "Promedio" },
  { value: "division", label: "División" },
  { value: "multiplicacion", label: "Multiplicación" },
  { value: "resta", label: "Resta" },
  { value: "condicion", label: "Condición (si X entonces Y)" },
] as const;

const OPERADORES = [
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
] as const;

const UBICACIONES = [
  { value: "panel_ejecutivo", label: "Panel Ejecutivo" },
  { value: "rendimiento", label: "Rendimiento" },
  { value: "ambos", label: "Ambos" },
] as const;

interface MetricaEditSheetProps {
  metricasConfig: MetricaConfig[];
  metricasManualData: Record<string, MetricaManualEntry[]>;
  editingMetric: MetricaConfig | null;
  tipoInicial: "manual" | "automatica" | "fija";
  onClose: () => void;
  onSave: (
    config: MetricaConfig,
    manualData?: MetricaManualEntry[],
  ) => void;
}

export default function MetricaEditSheet({
  metricasConfig,
  metricasManualData,
  editingMetric,
  tipoInicial,
  onClose,
  onSave,
}: MetricaEditSheetProps) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ubicacion, setUbicacion] = useState<MetricaConfig["ubicacion"]>("ambos");
  const [tipo, setTipo] = useState<"manual" | "automatica" | "fija">(tipoInicial);

  const [campos, setCampos] = useState<MetricaCampoConfig[]>([]);

  const [formulaTipo, setFormulaTipo] = useState<MetricaFormulaConfig["tipo"]>("directo");
  const [fuente, setFuente] = useState<string[]>([]);
  const [operador, setOperador] = useState<MetricaFormulaConfig["operador"]>(">");
  const [valorComparacion, setValorComparacion] = useState<string>("");
  const [valorSiCumple, setValorSiCumple] = useState<string>("");
  const [valorSiNo, setValorSiNo] = useState<string>("");

  const [valorFijo, setValorFijo] = useState<string>("");

  const [nuevaEntrada, setNuevaEntrada] = useState<Record<string, string | number | boolean>>({});
  const [entradas, setEntradas] = useState<MetricaManualEntry[]>([]);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingMetric) {
      setNombre(editingMetric.nombre);
      setDescripcion(editingMetric.descripcion ?? "");
      setUbicacion(editingMetric.ubicacion ?? "ambos");
      setTipo(editingMetric.tipo);
      setCampos(editingMetric.campos ?? []);
      if (editingMetric.formula) {
        setFormulaTipo(editingMetric.formula.tipo);
        setFuente(
          editingMetric.formula.fuente
            ? [editingMetric.formula.fuente]
            : editingMetric.formula.fuentes ?? [],
        );
        setOperador(editingMetric.formula.operador ?? ">");
        setValorComparacion(String(editingMetric.formula.valorComparacion ?? ""));
        setValorSiCumple(String(editingMetric.formula.valorSiCumple ?? ""));
        setValorSiNo(String(editingMetric.formula.valorSiNo ?? ""));
      }
      setValorFijo(String(editingMetric.valorFijo ?? ""));
      setEntradas(metricasManualData[editingMetric.id] ?? []);
    } else {
      setNombre("");
      setDescripcion("");
      setUbicacion("ambos");
      setTipo(tipoInicial);
      setCampos([]);
      setFormulaTipo("directo");
      setFuente([]);
      setOperador(">");
      setValorComparacion("");
      setValorSiCumple("");
      setValorSiNo("");
      setValorFijo("");
      setEntradas([]);
    }
    setNuevaEntrada({});
  }, [editingMetric, tipoInicial, metricasManualData]);

  const addCampo = () => {
    setCampos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nombre: "",
        tipo: "texto",
      },
    ]);
  };

  const updateCampo = (id: string, updates: Partial<MetricaCampoConfig>) => {
    setCampos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const removeCampo = (id: string) => {
    setCampos((prev) => prev.filter((c) => c.id !== id));
  };

  const addEntrada = () => {
    const entry: MetricaManualEntry = {};
    for (const c of campos) {
      const v = nuevaEntrada[c.id];
      if (v !== undefined) {
        if (c.tipo === "numero") entry[c.id] = typeof v === "number" ? v : parseFloat(String(v)) || 0;
        else if (c.tipo === "boolean") entry[c.id] = v === true || v === "true";
        else if (c.tipo === "fecha") entry[c.id] = typeof v === "string" ? v : null;
        else entry[c.id] = v != null ? String(v) : null;
      } else {
        entry[c.id] = null;
      }
    }
    setEntradas((prev) => [...prev, entry]);
    setNuevaEntrada({});
  };

  const removeEntrada = (idx: number) => {
    setEntradas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!nombre.trim()) return;
    setSaving(true);

    const id = editingMetric?.id ?? crypto.randomUUID();
    const orden = editingMetric?.orden ?? metricasConfig.length;

    let config: MetricaConfig;

    if (tipo === "fija") {
      config = {
        id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo: "fija",
        ubicacion,
        orden,
        valorFijo: valorFijo.trim() || "0",
      };
      onSave(config);
    } else if (tipo === "manual") {
      if (campos.length === 0) {
        setSaving(false);
        return;
      }
      const validCampos = campos
        .filter((c) => c.nombre.trim())
        .map((c) => ({
          ...c,
          nombre: c.nombre.trim(),
          esClaveFiltro: c.tipo === "fecha" ? c.esClaveFiltro : undefined,
        }));
      if (validCampos.length === 0) {
        setSaving(false);
        return;
      }
      config = {
        id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo: "manual",
        ubicacion,
        orden,
        campos: validCampos,
      };
      onSave(config, entradas);
    } else {
      const formula: MetricaFormulaConfig = { tipo: formulaTipo };
      if (formulaTipo === "directo" && fuente[0]) {
        formula.fuente = fuente[0];
      } else if (
        ["suma", "promedio", "multiplicacion"].includes(formulaTipo) &&
        fuente.length > 0
      ) {
        formula.fuentes = fuente;
      } else if (["division", "resta"].includes(formulaTipo) && fuente.length === 2) {
        formula.fuentes = fuente;
      } else if (formulaTipo === "condicion" && fuente[0]) {
        formula.fuente = fuente[0];
        formula.operador = operador;
        const cmp = valorComparacion.trim();
        formula.valorComparacion =
          cmp === "true" ? true : cmp === "false" ? false : parseFloat(cmp) || 0;
        formula.valorSiCumple =
          valorSiCumple.trim() === "" ? 0 : parseFloat(valorSiCumple) || valorSiCumple;
        formula.valorSiNo =
          valorSiNo.trim() === "" ? 0 : parseFloat(valorSiNo) || valorSiNo;
      }
      config = {
        id,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo: "automatica",
        ubicacion,
        orden,
        formula,
      };
      onSave(config);
    }
    setSaving(false);
    onClose();
  };

  const canSave =
    nombre.trim() &&
    (tipo === "fija" ||
      (tipo === "manual" && campos.some((c) => c.nombre.trim())) ||
      (tipo === "automatica" &&
        (formulaTipo === "directo"
          ? fuente.length === 1
          : formulaTipo === "condicion"
            ? fuente.length === 1
            : formulaTipo === "division" || formulaTipo === "resta"
              ? fuente.length === 2
              : fuente.length > 0)));

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-lg bg-surface-800 border-l border-surface-500 shadow-xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-surface-800 border-b border-surface-500 px-4 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">
            {editingMetric ? "Editar métrica" : "Nueva métrica"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-accent-cyan mb-1">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Meta mensual"
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white focus:ring-2 focus:ring-accent-cyan/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Ubicación</label>
            <select
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value as MetricaConfig["ubicacion"])}
              className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
            >
              {UBICACIONES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {!editingMetric && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as MetricaConfig["tipo"])}
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
              >
                <option value="manual">Manual (campos personalizados)</option>
                <option value="automatica">Automática (fórmula)</option>
                <option value="fija">Fija (valor constante)</option>
              </select>
            </div>
          )}

          {tipo === "fija" && (
            <div>
              <label className="block text-xs font-medium text-accent-green mb-1">Valor fijo *</label>
              <input
                type="text"
                value={valorFijo}
                onChange={(e) => setValorFijo(e.target.value)}
                placeholder="Número o texto"
                className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
              />
            </div>
          )}

          {tipo === "manual" && (
            <>
              <div>
                <label className="block text-xs font-medium text-accent-purple mb-1">Campos</label>
                <div className="space-y-2">
                  {campos.map((c) => (
                    <div
                      key={c.id}
                      className="flex gap-2 items-start p-2 rounded-lg bg-surface-700/50 border border-surface-500"
                    >
                      <input
                        type="text"
                        value={c.nombre}
                        onChange={(e) => updateCampo(c.id, { nombre: e.target.value })}
                        placeholder="Nombre del campo"
                        className="flex-1 rounded bg-surface-600 px-2 py-1 text-white text-xs"
                      />
                      <select
                        value={c.tipo}
                        onChange={(e) =>
                          updateCampo(c.id, {
                            tipo: e.target.value as MetricaCampoConfig["tipo"],
                          })
                        }
                        className="w-24 rounded bg-surface-600 px-2 py-1 text-white text-xs"
                      >
                        {TIPOS_CAMPO.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {c.tipo === "fecha" && (
                        <label className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                          <input
                            type="checkbox"
                            checked={c.esClaveFiltro ?? false}
                            onChange={(e) =>
                              updateCampo(c.id, { esClaveFiltro: e.target.checked })
                            }
                            className="rounded"
                          />
                          Filtro fechas
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCampo(c.id)}
                        className="p-1 text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCampo}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-accent-purple hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Añadir campo
                </button>
              </div>

              {campos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-accent-amber mb-1">
                    Datos registrados
                  </label>
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-500 divide-y divide-surface-500">
                    {entradas.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-gray-500 text-center">
                        Sin datos. Añade entradas abajo.
                      </div>
                    ) : (
                      entradas.map((e, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-2 py-1.5 text-xs"
                        >
                          <span className="text-gray-400 truncate">
                            {Object.entries(e)
                              .filter(([, v]) => v != null)
                              .map(([k, v]) => {
                                const campo = campos.find((c) => c.id === k);
                                return `${campo?.nombre ?? k}: ${v}`;
                              })
                              .join(", ")}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeEntrada(idx)}
                            className="text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 p-2 rounded-lg bg-surface-700/30 border border-surface-500 space-y-2">
                    <span className="text-[10px] text-gray-500 uppercase">Añadir dato</span>
                    <div className="flex flex-wrap gap-2">
                      {campos.map((c) => (
                        <div key={c.id} className="flex flex-col gap-0.5">
                          <label className="text-[10px] text-gray-500">{c.nombre}</label>
                          {c.tipo === "numero" ? (
                            <input
                              type="number"
                              value={String(nuevaEntrada[c.id] ?? "")}
                              onChange={(ev) =>
                                setNuevaEntrada((prev) => ({
                                  ...prev,
                                  [c.id]: parseFloat(ev.target.value) || 0,
                                }))
                              }
                              className="w-20 rounded bg-surface-600 px-1.5 py-1 text-xs text-white"
                            />
                          ) : c.tipo === "boolean" ? (
                            <select
                              value={String(nuevaEntrada[c.id] ?? "")}
                              onChange={(ev) =>
                                setNuevaEntrada((prev) => ({
                                  ...prev,
                                  [c.id]: ev.target.value === "true",
                                }))
                              }
                              className="rounded bg-surface-600 px-1.5 py-1 text-xs text-white"
                            >
                              <option value="">—</option>
                              <option value="true">Sí</option>
                              <option value="false">No</option>
                            </select>
                          ) : c.tipo === "fecha" ? (
                            <input
                              type="date"
                              value={String(nuevaEntrada[c.id] ?? "")}
                              onChange={(ev) =>
                                setNuevaEntrada((prev) => ({
                                  ...prev,
                                  [c.id]: ev.target.value,
                                }))
                              }
                              className="rounded bg-surface-600 px-1.5 py-1 text-xs text-white"
                            />
                          ) : (
                            <input
                              type="text"
                              value={String(nuevaEntrada[c.id] ?? "")}
                              onChange={(ev) =>
                                setNuevaEntrada((prev) => ({
                                  ...prev,
                                  [c.id]: ev.target.value,
                                }))
                              }
                              className="w-28 rounded bg-surface-600 px-1.5 py-1 text-xs text-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addEntrada}
                      className="inline-flex items-center gap-1 text-xs text-accent-green hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Añadir
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tipo === "automatica" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-accent-cyan mb-1">
                  Tipo de fórmula
                </label>
                <select
                  value={formulaTipo}
                  onChange={(e) =>
                    setFormulaTipo(e.target.value as MetricaFormulaConfig["tipo"])
                  }
                  className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
                >
                  {TIPOS_FORMULA.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {(formulaTipo === "directo" ||
                formulaTipo === "suma" ||
                formulaTipo === "promedio" ||
                formulaTipo === "multiplicacion" ||
                formulaTipo === "division" ||
                formulaTipo === "resta") && (
                <div>
                  <label className="block text-xs font-medium text-accent-cyan mb-1">
                    {formulaTipo === "directo" ? "Fuente" : "Fuentes"}
                  </label>
                  <SelectorFuenteConBusqueda
                    metricasConfig={metricasConfig}
                    selected={fuente}
                    onChange={setFuente}
                    multiple={formulaTipo !== "directo"}
                    maxSources={
                      formulaTipo === "division" || formulaTipo === "resta" ? 2 : 10
                    }
                    excludeMetricId={editingMetric?.id}
                  />
                </div>
              )}

              {formulaTipo === "condicion" && (
                <div className="space-y-3 p-3 rounded-lg bg-surface-700/50 border border-surface-500">
                  <div>
                    <label className="block text-xs font-medium text-accent-cyan mb-1">
                      Fuente a comparar
                    </label>
                    <SelectorFuenteConBusqueda
                      metricasConfig={metricasConfig}
                      selected={fuente}
                      onChange={setFuente}
                      excludeMetricId={editingMetric?.id}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Operador
                    </label>
                    <select
                      value={operador}
                      onChange={(e) =>
                        setOperador(e.target.value as MetricaFormulaConfig["operador"])
                      }
                      className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
                    >
                      {OPERADORES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Valor de comparación
                    </label>
                    <input
                      type="text"
                      value={valorComparacion}
                      onChange={(e) => setValorComparacion(e.target.value)}
                      placeholder="Número, true o false"
                      className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Si cumple
                      </label>
                      <input
                        type="text"
                        value={valorSiCumple}
                        onChange={(e) => setValorSiCumple(e.target.value)}
                        placeholder="Número"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Si no cumple
                      </label>
                      <input
                        type="text"
                        value={valorSiNo}
                        onChange={(e) => setValorSiNo(e.target.value)}
                        placeholder="Número"
                        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-surface-800 border-t border-surface-500 px-4 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-600 text-gray-300 hover:bg-surface-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="px-4 py-2 rounded-lg bg-accent-green text-black font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
