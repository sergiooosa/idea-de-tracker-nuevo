"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  Users,
  Phone,
  MessageSquare,
  Video,
  CalendarCheck,
  CalendarX,
  CheckSquare,
  Square,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useApiData } from "@/hooks/useApiData";
import type {
  SegmentoCalificadoCanal,
  SegmentoCanal,
  LeadSegmentoItem,
} from "@/types";

interface Props {
  dateFrom: string;
  dateTo: string;
  segmentacion?: SegmentoCalificadoCanal[];
}

type Segmento = "calificado" | "no_calificado";
type Agendo = "si" | "no" | "all";

interface BulkTagResult {
  applied: number;
  failed: number;
  errors?: string[];
}

const CANAL_ICONS: Record<SegmentoCanal, typeof Phone> = {
  llamada: Phone,
  chat: MessageSquare,
  videollamada: Video,
};

const CANAL_LABELS: Record<SegmentoCanal, string> = {
  llamada: "Llamadas",
  chat: "Chats",
  videollamada: "Videollamadas",
};

type CounterColor = "accent-green" | "accent-red" | "accent-purple" | "accent-amber";

const COLOR_CLASSES: Record<
  CounterColor,
  { active: string; text: string }
> = {
  "accent-green": {
    active: "border-accent-green/50 bg-accent-green/10 ring-1 ring-accent-green/30",
    text: "text-accent-green",
  },
  "accent-red": {
    active: "border-accent-red/50 bg-accent-red/10 ring-1 ring-accent-red/30",
    text: "text-accent-red",
  },
  "accent-purple": {
    active: "border-accent-purple/50 bg-accent-purple/10 ring-1 ring-accent-purple/30",
    text: "text-accent-purple",
  },
  "accent-amber": {
    active: "border-accent-amber/50 bg-accent-amber/10 ring-1 ring-accent-amber/30",
    text: "text-accent-amber",
  },
};

function CounterCard({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: CounterColor;
}) {
  const styles = COLOR_CLASSES[color];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all ${
        active
          ? styles.active
          : "border-surface-500 bg-surface-800/60 hover:border-surface-400"
      }`}
    >
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">
        {label}
      </p>
      <p className={`text-lg font-bold mt-0.5 ${active ? styles.text : "text-white"}`}>
        {count}
      </p>
    </button>
  );
}

function LeadRow({
  lead,
  selected,
  onToggle,
}: {
  lead: LeadSegmentoItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const CanalIcon = CANAL_ICONS[lead.canal];
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
      <button type="button" onClick={onToggle} className="shrink-0 text-gray-400 hover:text-white">
        {selected ? (
          <CheckSquare className="h-4 w-4 text-accent-cyan" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <span className="truncate text-slate-200 block">
          {lead.nombre ?? "Sin nombre"}
        </span>
        {lead.telefono && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Phone className="h-3 w-3 shrink-0" />
            {lead.telefono}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <CanalIcon className="h-3.5 w-3.5 text-gray-500" />
        {lead.agendo ? (
          <span className="rounded-full bg-accent-green/15 border border-accent-green/30 px-2 py-0.5 text-[10px] text-accent-green">
            Agendó
          </span>
        ) : (
          <span className="rounded-full bg-gray-500/15 border border-gray-500/30 px-2 py-0.5 text-[10px] text-gray-400">
            No agendó
          </span>
        )}
      </div>
    </div>
  );
}

export default function SegmentacionCalificados({
  dateFrom,
  dateTo,
  segmentacion,
}: Props) {
  const [canal, setCanal] = useState<SegmentoCanal | null>(null);
  const [segmento, setSegmento] = useState<Segmento | null>(null);
  const [agendo, setAgendo] = useState<Agendo>("all");
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkTagResult | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const canales = useMemo(() => {
    if (!segmentacion?.length) return [];
    return segmentacion.filter(
      (s) => s.calificado + s.noCalificado > 0,
    );
  }, [segmentacion]);

  const selectedCanalData = useMemo(
    () => canales.find((c) => c.canal === canal) ?? null,
    [canales, canal],
  );

  const drilldownEnabled = canal != null && segmento != null;

  const {
    data: drilldownLeads,
    loading: leadsLoading,
    error: leadsError,
  } = useApiData<LeadSegmentoItem[]>(
    "/api/data/leads-segmento",
    {
      from: dateFrom,
      to: dateTo,
      segmento: segmento ?? undefined,
      canal: canal ?? undefined,
      agendo,
    },
    { enabled: drilldownEnabled },
  );

  const handleExpand = () => {
    if (!drilldownEnabled) return;
    setExpanded((v) => !v);
    setSelectedIds(new Set());
    setBulkResult(null);
    setBulkError(null);
  };

  const handleSelectAll = () => {
    if (!drilldownLeads) return;
    const allIds = drilldownLeads
      .map((l) => l.ghl_contact_id)
      .filter((id): id is string => id != null);
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleLead = (contactId: string | null) => {
    if (!contactId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  const handleBulkTag = async () => {
    if (selectedIds.size === 0 || !bulkTag.trim()) return;
    setBulkLoading(true);
    setBulkResult(null);
    setBulkError(null);
    try {
      const res = await fetch("/api/data/bulk-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: Array.from(selectedIds),
          tags: [bulkTag.trim()],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          debug?: string;
        } | null;
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      const result = (await res.json()) as BulkTagResult;
      setBulkResult(result);
      setSelectedIds(new Set());
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : String(err));
    } finally {
      setBulkLoading(false);
    }
  };

  if (!segmentacion?.length || canales.length === 0) return null;

  const selectableLeads =
    drilldownLeads?.filter((l) => l.ghl_contact_id != null) ?? [];

  return (
    <section className="rounded-2xl border border-surface-500 bg-surface-800/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-accent-purple" />
          <h2 className="text-base font-semibold text-slate-100">
            Segmentación por calificación
          </h2>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Canal selector */}
        <div className="flex flex-wrap gap-2">
          {canales.map((c) => {
            const Icon = CANAL_ICONS[c.canal];
            const isActive = canal === c.canal;
            return (
              <button
                key={c.canal}
                type="button"
                onClick={() => {
                  setCanal(isActive ? null : c.canal);
                  setSegmento(null);
                  setExpanded(false);
                  setSelectedIds(new Set());
                  setBulkResult(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan"
                    : "border-surface-500 text-gray-400 hover:border-surface-400 hover:text-gray-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {CANAL_LABELS[c.canal]}
                <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                  {c.calificado + c.noCalificado}
                </span>
              </button>
            );
          })}
        </div>

        {/* Counters for selected canal */}
        {selectedCanalData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <CounterCard
              label="Calificados"
              count={selectedCanalData.calificado}
              active={segmento === "calificado" && agendo === "all"}
              onClick={() => {
                setSegmento("calificado");
                setAgendo("all");
                setExpanded(false);
                setSelectedIds(new Set());
                setBulkResult(null);
              }}
              color="accent-green"
            />
            <CounterCard
              label="No calificados"
              count={selectedCanalData.noCalificado}
              active={segmento === "no_calificado" && agendo === "all"}
              onClick={() => {
                setSegmento("no_calificado");
                setAgendo("all");
                setExpanded(false);
                setSelectedIds(new Set());
                setBulkResult(null);
              }}
              color="accent-red"
            />
            {canal !== "chat" && (
              <>
                <CounterCard
                  label={`${segmento === "no_calificado" ? "No cal." : "Cal."} + agendó`}
                  count={
                    segmento === "no_calificado"
                      ? selectedCanalData.noCalificadoAgendo
                      : selectedCanalData.calificadoAgendo
                  }
                  active={segmento != null && agendo === "si"}
                  onClick={() => {
                    if (!segmento) setSegmento("calificado");
                    setAgendo("si");
                    setExpanded(false);
                    setSelectedIds(new Set());
                    setBulkResult(null);
                  }}
                  color="accent-purple"
                />
                <CounterCard
                  label={`${segmento === "no_calificado" ? "No cal." : "Cal."} + no agendó`}
                  count={
                    segmento === "no_calificado"
                      ? selectedCanalData.noCalificadoNoAgendo
                      : selectedCanalData.calificadoNoAgendo
                  }
                  active={segmento != null && agendo === "no"}
                  onClick={() => {
                    if (!segmento) setSegmento("calificado");
                    setAgendo("no");
                    setExpanded(false);
                    setSelectedIds(new Set());
                    setBulkResult(null);
                  }}
                  color="accent-amber"
                />
              </>
            )}
          </div>
        )}

        {/* Expand/collapse leads drilldown */}
        {drilldownEnabled && (
          <button
            type="button"
            onClick={handleExpand}
            className="flex w-full items-center justify-between rounded-lg border border-surface-500 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-cyan" />
              {expanded ? "Ocultar leads" : "Ver leads del segmento"}
              {leadsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
              {!leadsLoading && drilldownLeads && (
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">
                  {drilldownLeads.length}
                </span>
              )}
            </span>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
        )}

        {/* Leads list */}
        {expanded && drilldownEnabled && (
          <div className="space-y-3">
            {leadsLoading && (
              <div className="flex items-center gap-2 py-4 justify-center text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando leads…
              </div>
            )}

            {leadsError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {leadsError}
              </div>
            )}

            {!leadsLoading && drilldownLeads && drilldownLeads.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No hay leads en este segmento para el período seleccionado.
              </p>
            )}

            {!leadsLoading && drilldownLeads && drilldownLeads.length > 0 && (
              <>
                {/* Select all + bulk action bar */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-surface-500 bg-surface-700/50 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    {selectedIds.size === selectableLeads.length &&
                    selectableLeads.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-accent-cyan" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Seleccionar todos ({selectableLeads.length})
                  </button>

                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[11px] text-gray-500">
                        {selectedIds.size} seleccionado
                        {selectedIds.size !== 1 ? "s" : ""}
                      </span>
                      <input
                        type="text"
                        value={bulkTag}
                        onChange={(e) => setBulkTag(e.target.value)}
                        placeholder="Nombre de etiqueta"
                        className="rounded-md border border-surface-500 bg-surface-800 px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:border-accent-cyan/50 focus:outline-none w-40"
                      />
                      <button
                        type="button"
                        onClick={handleBulkTag}
                        disabled={bulkLoading || !bulkTag.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent-cyan/20 border border-accent-cyan/50 px-3 py-1 text-xs font-medium text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {bulkLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Tag className="h-3.5 w-3.5" />
                        )}
                        Etiquetar
                      </button>
                    </div>
                  )}
                </div>

                {/* Bulk result feedback */}
                {bulkResult && (
                  <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2.5 text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent-green shrink-0" />
                    <span className="text-accent-green">
                      {bulkResult.applied} etiquetado
                      {bulkResult.applied !== 1 ? "s" : ""}
                      {bulkResult.failed > 0 && (
                        <span className="text-red-400 ml-2">
                          · {bulkResult.failed} fallido
                          {bulkResult.failed !== 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {bulkError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <span className="text-red-300">{bulkError}</span>
                  </div>
                )}

                {/* Lead rows */}
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {drilldownLeads.map((lead, i) => (
                    <LeadRow
                      key={lead.ghl_contact_id ?? `${lead.nombre}-${i}`}
                      lead={lead}
                      selected={
                        lead.ghl_contact_id != null &&
                        selectedIds.has(lead.ghl_contact_id)
                      }
                      onToggle={() => toggleLead(lead.ghl_contact_id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
