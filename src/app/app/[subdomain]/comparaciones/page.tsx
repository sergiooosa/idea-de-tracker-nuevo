"use client";

import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { GitCompareArrows, TrendingUp, TrendingDown, Minus, ChevronDown, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricItem {
  id: string;
  nombre: string;
  formato?: "numero" | "moneda" | "porcentaje" | "decimal" | "tiempo";
  fija?: boolean;
}

interface MonthlySummaryRow {
  metricId: string;
  nombre: string;
  formato?: string;
  mesA: number | null;
  mesB: number | null;
}

interface MonthlySummaryResponse {
  rows: MonthlySummaryRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: number | null, formato?: string): string {
  if (value == null) return "—";
  switch (formato) {
    case "moneda":
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(value);
    case "porcentaje":
      return `${(value * 100).toFixed(1)}%`;
    case "decimal":
      return value.toFixed(2);
    case "tiempo": {
      const mins = Math.round(value);
      if (mins < 60) return `${mins} min`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    default:
      return Math.round(value).toLocaleString("es-CO");
  }
}

function buildMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("es-CO", { year: "numeric", month: "long" });
    options.push({ value, label });
  }
  return options;
}

const MONTH_OPTIONS = buildMonthOptions();

// ─── Multi-select dropdown ────────────────────────────────────────────────────

function MetricMultiSelect({
  metrics,
  selected,
  onChange,
  loading,
}: {
  metrics: MetricItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const toggleMetric = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  const selectedNames = metrics
    .filter((m) => selected.includes(m.id))
    .map((m) => m.nombre);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-500 bg-surface-700 text-sm text-gray-300 hover:border-accent-cyan/40 min-w-[200px] max-w-[340px] text-left"
      >
        <span className="flex-1 truncate">
          {loading
            ? "Cargando métricas..."
            : selected.length === 0
              ? "Seleccionar métricas"
              : selectedNames.slice(0, 2).join(", ") +
                (selectedNames.length > 2 ? ` +${selectedNames.length - 2}` : "")}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-30 w-72 rounded-lg border border-surface-500 bg-surface-800 shadow-xl max-h-60 overflow-y-auto">
          <div className="p-2 flex items-center justify-between border-b border-surface-500/60 sticky top-0 bg-surface-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Métricas</p>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] text-gray-500 hover:text-accent-red flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
          {metrics.length > 0 ? (
            metrics.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-surface-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(m.id)}
                  onChange={() => toggleMetric(m.id)}
                  className="accent-accent-cyan w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs text-gray-300 truncate">{m.nombre}</span>
              </label>
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-gray-500 text-center">Sin métricas configuradas</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparacionesPage() {
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [mesA, setMesA] = useState(MONTH_OPTIONS[1]?.value ?? "");
  const [mesB, setMesB] = useState(MONTH_OPTIONS[0]?.value ?? "");

  const [rows, setRows] = useState<MonthlySummaryRow[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Fetch available metrics on mount
  useEffect(() => {
    setMetricsLoading(true);
    fetch("/api/data/metricas")
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<MetricItem[] | { metrics?: MetricItem[] }>;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as { metrics?: MetricItem[] }).metrics ?? [];
        setMetrics(list);
        const stdIds = list.filter((m) => m.fija).map((m) => m.id);
        setSelectedMetrics(stdIds.length > 0 ? stdIds : list.slice(0, 5).map((m) => m.id));
      })
      .catch((err: unknown) => {
        console.error("[comparaciones] Error cargando métricas:", err);
      })
      .finally(() => setMetricsLoading(false));
  }, []);

  const fetchComparison = useCallback(() => {
    if (selectedMetrics.length === 0 || !mesA || !mesB) {
      setRows([]);
      return;
    }

    setTableLoading(true);
    setTableError(null);

    const sp = new URLSearchParams();
    sp.set("from", mesA);
    sp.set("to", mesB);
    for (const id of selectedMetrics) {
      sp.append("metricIds[]", id);
    }

    fetch(`/api/data/metricas/monthly-summary?${sp.toString()}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e: { error?: string }) => { throw new Error(e.error ?? `Error ${r.status}`); });
        return r.json() as Promise<MonthlySummaryResponse | MonthlySummaryRow[]>;
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data as MonthlySummaryResponse).rows ?? [];
        setRows(list);
      })
      .catch((err: unknown) => {
        setTableError((err as Error).message);
      })
      .finally(() => setTableLoading(false));
  }, [selectedMetrics, mesA, mesB]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const mesALabel = MONTH_OPTIONS.find((o) => o.value === mesA)?.label ?? mesA;
  const mesBLabel = MONTH_OPTIONS.find((o) => o.value === mesB)?.label ?? mesB;

  return (
    <>
      <PageHeader
        title="Proyecciones"
        subtitle="Compara métricas entre dos meses"
      />

      <div className="p-3 md:p-4 space-y-4 min-w-0 max-w-full overflow-x-hidden text-sm">
        {!metricsLoading && metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Sin métricas disponibles
            </h3>
            <p className="text-gray-500 max-w-md">
              No se encontraron métricas para esta cuenta.
            </p>
          </div>
        ) : (
          <>
        {/* Controls */}
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <GitCompareArrows className="w-3.5 h-3.5 text-accent-cyan" />
            Configurar comparación
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            {/* Metric selector */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Métricas
              </label>
              <MetricMultiSelect
                metrics={metrics}
                selected={selectedMetrics}
                onChange={setSelectedMetrics}
                loading={metricsLoading}
              />
            </div>

            {/* Mes A */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Mes A
              </label>
              <select
                value={mesA}
                onChange={(e) => setMesA(e.target.value)}
                className="px-3 py-2 rounded-lg border border-surface-500 bg-surface-700 text-sm text-gray-300 hover:border-accent-cyan/40 focus:outline-none focus:border-accent-cyan"
              >
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mes B */}
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                Mes B
              </label>
              <select
                value={mesB}
                onChange={(e) => setMesB(e.target.value)}
                className="px-3 py-2 rounded-lg border border-surface-500 bg-surface-700 text-sm text-gray-300 hover:border-accent-cyan/40 focus:outline-none focus:border-accent-cyan"
              >
                {MONTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 overflow-hidden">
          {tableLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm animate-pulse">
              Cargando comparación...
            </div>
          ) : tableError ? (
            <div className="p-4 text-sm text-red-400">
              <p className="font-medium mb-1">Error al cargar datos</p>
              <p className="text-gray-400">{tableError}</p>
              <button
                type="button"
                onClick={fetchComparison}
                className="mt-2 px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 hover:bg-accent-cyan/30 text-xs font-medium"
              >
                Reintentar
              </button>
            </div>
          ) : selectedMetrics.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Selecciona al menos una métrica para comparar.
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Sin datos para los meses seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400 border-b border-surface-500">
                    <th className="px-3 py-2.5 font-medium">Métrica</th>
                    <th className="px-3 py-2.5 font-medium text-right">{mesALabel}</th>
                    <th className="px-3 py-2.5 font-medium text-right">{mesBLabel}</th>
                    <th className="px-3 py-2.5 font-medium text-right">Δ Absoluto</th>
                    <th className="px-3 py-2.5 font-medium text-right">Δ %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const a = row.mesA;
                    const b = row.mesB;
                    const delta = a != null && b != null ? b - a : null;
                    const deltaPct =
                      a != null && b != null && a !== 0
                        ? ((b - a) / Math.abs(a)) * 100
                        : null;

                    const improved = delta != null && delta > 0;
                    const worsened = delta != null && delta < 0;
                    const neutral = delta === 0;

                    return (
                      <tr
                        key={row.metricId}
                        className="border-t border-surface-500/60 hover:bg-surface-700/40"
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-200">
                          {row.nombre}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                          {formatValue(a, row.formato)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-300 tabular-nums">
                          {formatValue(b, row.formato)}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {delta == null ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <span
                              className={
                                improved
                                  ? "text-accent-green"
                                  : worsened
                                    ? "text-accent-red"
                                    : "text-gray-400"
                              }
                            >
                              {delta > 0 ? "+" : ""}
                              {formatValue(delta, row.formato)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {deltaPct == null ? (
                            <span className="text-gray-500">—</span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                improved
                                  ? "text-accent-green"
                                  : worsened
                                    ? "text-accent-red"
                                    : "text-gray-400"
                              }`}
                            >
                              {improved ? (
                                <TrendingUp className="w-3.5 h-3.5" />
                              ) : worsened ? (
                                <TrendingDown className="w-3.5 h-3.5" />
                              ) : (
                                <Minus className="w-3 h-3" />
                              )}
                              {deltaPct > 0 ? "+" : ""}
                              {deltaPct.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </>
  );
}
