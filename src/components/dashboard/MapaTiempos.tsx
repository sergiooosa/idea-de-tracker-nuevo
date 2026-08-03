"use client";

import { useState, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData";
import type {
  MapaTiemposResponse,
  MapaTiemposAsesor,
} from "@/types";
import HelpTooltip from "./HelpTooltip";
import { Clock, User, Search, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
  const dias = Math.round(seconds / 86400);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SortKey = "asesor" | "t1" | "t2";

export default function MapaTiempos({
  dateFrom,
  dateTo,
}: {
  dateFrom: string;
  dateTo: string;
}) {
  const [asesorFilter, setAsesorFilter] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("t1");
  const [sortAsc, setSortAsc] = useState(true);

  const { data, loading, error } = useApiData<MapaTiemposResponse>(
    "/api/data/mapa-tiempos",
    {
      desde: dateFrom,
      hasta: dateTo,
      asesor: asesorFilter || undefined,
      lead: leadId || undefined,
    },
  );

  const asesores = data?.asesores ?? [];
  const leadTimeline = data?.lead_timeline ?? null;
  const totalLeads = data?.total_leads ?? 0;

  const maxT1 = useMemo(() => {
    let max = 0;
    for (const a of asesores) {
      if (a.t1_mediana_seconds != null && a.t1_mediana_seconds > max) max = a.t1_mediana_seconds;
    }
    return max || 1;
  }, [asesores]);

  const maxT2 = useMemo(() => {
    let max = 0;
    for (const a of asesores) {
      if (a.t2_mediana_seconds != null && a.t2_mediana_seconds > max) max = a.t2_mediana_seconds;
    }
    return max || 1;
  }, [asesores]);

  const sortedAsesores = useMemo(() => {
    const arr = [...asesores];
    arr.sort((a, b) => {
      let va: number;
      let vb: number;
      switch (sortKey) {
        case "asesor":
          return sortAsc
            ? a.asesor.localeCompare(b.asesor)
            : b.asesor.localeCompare(a.asesor);
        case "t1":
          va = a.t1_mediana_seconds ?? Infinity;
          vb = b.t1_mediana_seconds ?? Infinity;
          break;
        case "t2":
          va = a.t2_mediana_seconds ?? Infinity;
          vb = b.t2_mediana_seconds ?? Infinity;
          break;
      }
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [asesores, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortAsc ? (
        <ChevronUp className="w-3 h-3 inline ml-0.5" />
      ) : (
        <ChevronDown className="w-3 h-3 inline ml-0.5" />
      )
    ) : null;

  const handleLeadSearch = () => {
    const trimmed = leadSearch.trim();
    if (/^\d+$/.test(trimmed)) {
      setLeadId(trimmed);
    } else {
      setLeadId(null);
    }
  };

  const clearLeadSearch = () => {
    setLeadSearch("");
    setLeadId(null);
  };

  const uniqueAsesores = useMemo(() => {
    const names = asesores.map((a) => a.asesor);
    return [...new Set(names)].sort();
  }, [asesores]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <Clock className="w-4 h-4" />
          Mapa de tiempos
          <span className="ml-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase rounded bg-accent-cyan/20 text-accent-cyan tracking-wide">
            Beta
          </span>
          <HelpTooltip
            titulo="Mapa de tiempos"
            contenido={
              "Visualiza el tiempo que tarda cada asesor en avanzar los leads por el funnel.\n\n" +
              "T1 (Llegó el lead → Llamarlo): tiempo desde que el lead llega hasta la primera llamada.\n" +
              "T2 (Llamarlo → Agendar cita): tiempo desde la primera llamada hasta que se agenda una cita.\n\n" +
              "Se muestra la mediana (valor central, robusto a outliers). La barra refleja el tamaño relativo entre asesores.\n\n" +
              "Etapas futuras (Que asista, Que aparte, Que compre) aparecen atenuadas — aún no hay datos suficientes para calcularlas."
            }
            comoProbar="Selecciona un asesor del filtro para ver solo sus tiempos. Ingresa un ID de lead para ver su linea de tiempo individual con fechas exactas."
          />
        </h2>
        {!leadId && (
          <span className="text-xs text-gray-500">
            {totalLeads} leads totales
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Advisor filter */}
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray-500" />
          <select
            value={asesorFilter}
            onChange={(e) => setAsesorFilter(e.target.value)}
            className="bg-surface-700 border border-surface-500 rounded-md px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
          >
            <option value="">Todos los asesores</option>
            {uniqueAsesores.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Lead search */}
        <div className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="ID del lead"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLeadSearch()}
            className="bg-surface-700 border border-surface-500 rounded-md px-2 py-1 text-xs text-gray-300 w-28 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
          />
          <button
            type="button"
            onClick={handleLeadSearch}
            className="px-2 py-1 text-xs rounded-md bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors"
          >
            Buscar
          </button>
          {leadId && (
            <button
              type="button"
              onClick={clearLeadSearch}
              className="px-2 py-1 text-xs rounded-md bg-surface-600 text-gray-400 hover:text-white transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Single lead timeline */}
      {!loading && !error && leadId && (
        <LeadTimelineView timeline={leadTimeline} />
      )}

      {/* Advisor comparison view */}
      {!loading && !error && !leadId && asesores.length > 0 && (
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th
                    className="px-3 py-2 font-medium cursor-pointer hover:text-white w-36"
                    onClick={() => toggleSort("asesor")}
                  >
                    Asesor
                    <SortIcon col="asesor" />
                  </th>
                  <th
                    className="px-3 py-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort("t1")}
                  >
                    <span title="Tiempo desde que llega el lead hasta la primera llamada">
                      T1: Llegó el lead → Llamarlo
                    </span>
                    <SortIcon col="t1" />
                  </th>
                  <th
                    className="px-3 py-2 font-medium cursor-pointer hover:text-white"
                    onClick={() => toggleSort("t2")}
                  >
                    <span title="Tiempo desde la primera llamada hasta que se agenda una cita">
                      T2: Llamarlo → Agendar cita
                    </span>
                    <SortIcon col="t2" />
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-600">
                    <span title="Aún sin datos — etapa beta">
                      T3: Agendar cita → Que asista
                    </span>
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-600">
                    <span title="Aún sin datos — etapa beta">
                      T4: Que asista → Que aparte
                    </span>
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-600">
                    <span title="Aún sin datos — etapa beta">
                      T5: Que aparte → Que compre
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedAsesores.map((a) => (
                  <AsesorRow
                    key={a.asesor}
                    asesor={a}
                    maxT1={maxT1}
                    maxT2={maxT2}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && !leadId && asesores.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-500">
          Sin datos de tiempos para el periodo seleccionado
        </div>
      )}
    </div>
  );
}

function AsesorRow({
  asesor,
  maxT1,
  maxT2,
}: {
  asesor: MapaTiemposAsesor;
  maxT1: number;
  maxT2: number;
}) {
  const t1Pct = asesor.t1_mediana_seconds != null ? (asesor.t1_mediana_seconds / maxT1) * 100 : 0;
  const t2Pct = asesor.t2_mediana_seconds != null ? (asesor.t2_mediana_seconds / maxT2) * 100 : 0;

  return (
    <tr className="border-t border-surface-500 hover:bg-surface-700/50">
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-cyan shrink-0" />
          <span className="text-gray-200 truncate max-w-[120px]">{asesor.asesor}</span>
        </span>
      </td>
      <td className="px-3 py-2.5">
        <TimeBar
          seconds={asesor.t1_mediana_seconds}
          p90={asesor.t1_p90_seconds}
          n={asesor.t1_n}
          pct={t1Pct}
          color="cyan"
        />
      </td>
      <td className="px-3 py-2.5">
        <TimeBar
          seconds={asesor.t2_mediana_seconds}
          p90={asesor.t2_p90_seconds}
          n={asesor.t2_n}
          pct={t2Pct}
          color="purple"
        />
      </td>
      {/* Fase 2 columns — attenuated */}
      <td className="px-3 py-2.5">
        <span className="text-gray-600 italic text-[10px]">sin datos (beta)</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-gray-600 italic text-[10px]">sin datos (beta)</span>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-gray-600 italic text-[10px]">sin datos (beta)</span>
      </td>
    </tr>
  );
}

function TimeBar({
  seconds,
  p90,
  n,
  pct,
  color,
}: {
  seconds: number | null;
  p90: number | null;
  n: number;
  pct: number;
  color: "cyan" | "purple";
}) {
  if (seconds == null || n === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-600">—</span>
      </div>
    );
  }

  const barColor = color === "cyan" ? "bg-accent-cyan/40" : "bg-accent-purple/40";
  const textColor = color === "cyan" ? "text-accent-cyan" : "text-accent-purple";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-5 bg-surface-600 rounded-sm overflow-hidden relative min-w-[60px] max-w-[200px]">
          <div
            className={clsx("h-full rounded-sm transition-all", barColor)}
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
          <span
            className={clsx(
              "absolute inset-0 flex items-center px-1.5 text-[11px] font-medium",
              textColor,
            )}
          >
            {formatDuration(seconds)}
          </span>
        </div>
      </div>
      {p90 != null && (
        <span className="text-[10px] text-gray-500">
          p90: {formatDuration(p90)}
        </span>
      )}
    </div>
  );
}

function LeadTimelineView({
  timeline,
}: {
  timeline: {
    id_registro: number;
    nombre_lead: string | null;
    asesor: string;
    t_llegada: string;
    t_llamada: string | null;
    t_agenda: string | null;
    t1_seconds: number | null;
    t2_seconds: number | null;
  } | null;
}) {
  if (!timeline) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No se encontro timeline para este lead
      </div>
    );
  }

  const stages = [
    {
      label: "Llegó el lead",
      timestamp: timeline.t_llegada,
      delta: null as number | null,
      deltaLabel: "",
      active: true,
    },
    {
      label: "Llamarlo",
      timestamp: timeline.t_llamada,
      delta: timeline.t1_seconds,
      deltaLabel: "T1",
      active: !!timeline.t_llamada,
    },
    {
      label: "Agendar cita",
      timestamp: timeline.t_agenda,
      delta: timeline.t2_seconds,
      deltaLabel: "T2",
      active: !!timeline.t_agenda,
    },
    {
      label: "Que asista",
      timestamp: null,
      delta: null,
      deltaLabel: "T3",
      active: false,
    },
    {
      label: "Que aparte",
      timestamp: null,
      delta: null,
      deltaLabel: "T4",
      active: false,
    },
    {
      label: "Que compre",
      timestamp: null,
      delta: null,
      deltaLabel: "T5",
      active: false,
    },
  ];

  return (
    <div className="rounded-lg border border-surface-500 bg-surface-800 p-4 space-y-4">
      {/* Lead info header */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-400">Lead:</span>
        <span className="text-white font-medium">
          {timeline.nombre_lead ?? `#${timeline.id_registro}`}
        </span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-400">Asesor:</span>
        <span className="text-accent-cyan">{timeline.asesor}</span>
      </div>

      {/* Horizontal timeline */}
      <div className="flex items-start gap-0 overflow-x-auto py-2">
        {stages.map((stage, i) => (
          <div key={stage.label} className="flex items-start">
            {/* Delta connector */}
            {i > 0 && (
              <div className="flex flex-col items-center pt-3 min-w-[80px]">
                <div
                  className={clsx(
                    "h-0.5 w-full",
                    stage.active ? "bg-accent-cyan/40" : "bg-gray-700",
                  )}
                />
                {stage.delta != null ? (
                  <span className="text-[10px] text-accent-cyan mt-1 whitespace-nowrap">
                    {stage.deltaLabel}: {formatDuration(stage.delta)}
                  </span>
                ) : (
                  <span
                    className={clsx(
                      "text-[10px] mt-1",
                      stage.active ? "text-gray-500" : "text-gray-700",
                    )}
                  >
                    {i >= 3 ? "sin datos (beta)" : "—"}
                  </span>
                )}
              </div>
            )}

            {/* Stage node */}
            <div className="flex flex-col items-center min-w-[90px]">
              <div
                className={clsx(
                  "w-3 h-3 rounded-full border-2",
                  stage.active
                    ? "border-accent-cyan bg-accent-cyan/30"
                    : "border-gray-600 bg-surface-700",
                )}
              />
              <span
                className={clsx(
                  "text-[11px] font-medium mt-1.5 text-center",
                  stage.active ? "text-gray-200" : "text-gray-600",
                )}
              >
                {stage.label}
              </span>
              <span
                className={clsx(
                  "text-[10px] mt-0.5 text-center whitespace-nowrap",
                  stage.active ? "text-gray-400" : "text-gray-700",
                )}
              >
                {stage.timestamp
                  ? formatTimestamp(stage.timestamp)
                  : i >= 3
                    ? "sin datos (beta)"
                    : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Phase 2 legend */}
      <div className="flex items-center gap-1.5 text-[10px] text-gray-600 border-t border-surface-500 pt-3">
        <div className="w-2 h-2 rounded-full border border-gray-600 bg-surface-700 shrink-0" />
        Que asista, Que aparte y Que compre: sin datos suficientes para calcular (beta)
      </div>
    </div>
  );
}
