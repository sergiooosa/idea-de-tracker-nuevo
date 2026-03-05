"use client";

import { useState, useMemo } from "react";
import { KPI_DEFAULT_KEYS, KPI_DEFAULT_LABELS } from "@/lib/metricas-engine";
import type { MetricaConfig } from "@/lib/db/schema";

interface SelectorFuenteConBusquedaProps {
  metricasConfig: MetricaConfig[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  maxSources?: number;
  excludeMetricId?: string;
  placeholder?: string;
}

export default function SelectorFuenteConBusqueda({
  metricasConfig,
  selected,
  onChange,
  multiple = false,
  maxSources = 2,
  excludeMetricId,
  placeholder = "Buscar por nombre...",
}: SelectorFuenteConBusquedaProps) {
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const kpis = KPI_DEFAULT_KEYS.map((key) => ({
      id: key,
      nombre: KPI_DEFAULT_LABELS[key] ?? key,
      tipo: "kpi" as const,
    }));
    const metricas = metricasConfig
      .filter((m) => m.id !== excludeMetricId)
      .map((m) => ({
        id: m.id,
        nombre: m.nombre,
        tipo: "metrica" as const,
      }));
    const all = [...kpis, ...metricas];
    if (!search.trim()) return all;
    const q = search.toLowerCase().trim();
    return all.filter((o) => o.nombre.toLowerCase().includes(q));
  }, [metricasConfig, excludeMetricId, search]);

  const handleSelect = (id: string) => {
    if (multiple) {
      if (selected.includes(id)) {
        onChange(selected.filter((s) => s !== id));
      } else if (selected.length < maxSources) {
        onChange([...selected, id]);
      }
    } else {
      onChange([id]);
    }
  };

  const removeSelected = (id: string) => {
    onChange(selected.filter((s) => s !== id));
  };

  const getLabel = (id: string) => {
    const kpi = KPI_DEFAULT_LABELS[id];
    if (kpi) return kpi;
    const m = metricasConfig.find((x) => x.id === id);
    return m?.nombre ?? id;
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-surface-600 border border-surface-500 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan text-xs"
            >
              {getLabel(id)}
              <button
                type="button"
                onClick={() => removeSelected(id)}
                className="hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="max-h-40 overflow-y-auto rounded-lg border border-surface-500 divide-y divide-surface-500">
        {options.length === 0 ? (
          <div className="px-2 py-3 text-xs text-gray-500 text-center">
            No hay opciones
          </div>
        ) : (
          options.map((opt) => {
            const isSelected = selected.includes(opt.id);
            const disabled = !isSelected && multiple && selected.length >= maxSources;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => !disabled && handleSelect(opt.id)}
                disabled={disabled}
                className={`w-full text-left px-2 py-1.5 text-xs transition-colors ${
                  isSelected
                    ? "bg-accent-cyan/20 text-accent-cyan"
                    : disabled
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-300 hover:bg-surface-600"
                }`}
              >
                <span className="text-[10px] text-gray-500 mr-1.5">
                  {opt.tipo === "kpi" ? "KPI" : "Métrica"}
                </span>
                {opt.nombre}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
