"use client";

import { useState, useMemo } from "react";
import {
  Phone,
  PhoneOff,
  Voicemail,
  ChevronDown,
  ChevronUp,
  ShieldX,
  Search,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from "lucide-react";
import type { ApiLlamadaLog } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Helpers ────────────────────────────────────────────────────────────────

type Classification = "interesado" | "no_interesado" | "otro";

function classifyCall(call: ApiLlamadaLog): Classification {
  const estado = call.estadoResultado?.toLowerCase().trim() ?? "";
  const enrichRecepcion = call.enrichment?.recepcion_lead?.toLowerCase() ?? "";

  if (
    estado === "interesado" ||
    estado === "calificada" ||
    estado === "reagendado" ||
    enrichRecepcion === "interesado" ||
    enrichRecepcion === "muy_interesado"
  ) {
    return "interesado";
  }
  if (
    estado === "no_interesado" ||
    estado === "no interesado" ||
    estado === "perdido" ||
    estado === "perdida" ||
    enrichRecepcion === "no_interesado" ||
    enrichRecepcion === "rechazo"
  ) {
    return "no_interesado";
  }
  return "otro";
}

function formatDuration(secs: number | null): string {
  if (!secs || secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function OutcomeBadge({ outcome }: { outcome: ApiLlamadaLog["outcome"] }) {
  if (outcome === "answered") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
        <Phone className="w-2.5 h-2.5" /> Contestó
      </span>
    );
  }
  if (outcome === "voicemail") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
        <Voicemail className="w-2.5 h-2.5" /> Buzón
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20">
      <PhoneOff className="w-2.5 h-2.5" /> No contestó
    </span>
  );
}

function ClassificationBadge({ cls }: { cls: Classification }) {
  if (cls === "interesado") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
        <ThumbsUp className="w-2.5 h-2.5" /> Interesado
      </span>
    );
  }
  if (cls === "no_interesado") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20">
        <ThumbsDown className="w-2.5 h-2.5" /> No interesado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20">
      <Clock className="w-2.5 h-2.5" /> Pendiente
    </span>
  );
}

// ─── Stacked outcome bar ──────────────────────────────────────────────────────

function OutcomeBar({ calls }: { calls: ApiLlamadaLog[] }) {
  const total = calls.length;
  if (total === 0) return null;

  const answered = calls.filter((c) => c.outcome === "answered").length;
  const voicemail = calls.filter((c) => c.outcome === "voicemail").length;
  const noAnswer = total - answered - voicemail;

  const pct = (n: number) => ((n / total) * 100).toFixed(1);

  return (
    <div className="space-y-1.5">
      <div className="flex h-4 w-full rounded-full overflow-hidden gap-[2px]">
        {answered > 0 && (
          <div
            className="h-full bg-[#22C55E] flex items-center justify-center"
            style={{ width: `${(answered / total) * 100}%` }}
            title={`Contestó: ${answered}`}
          >
            {answered / total >= 0.12 && (
              <span className="text-[9px] font-bold text-white">{answered}</span>
            )}
          </div>
        )}
        {noAnswer > 0 && (
          <div
            className="h-full bg-[#F59E0B] flex items-center justify-center"
            style={{ width: `${(noAnswer / total) * 100}%` }}
            title={`No contestó: ${noAnswer}`}
          >
            {noAnswer / total >= 0.12 && (
              <span className="text-[9px] font-bold text-white">{noAnswer}</span>
            )}
          </div>
        )}
        {voicemail > 0 && (
          <div
            className="h-full bg-[#8B5CF6] flex items-center justify-center"
            style={{ width: `${(voicemail / total) * 100}%` }}
            title={`Buzón: ${voicemail}`}
          >
            {voicemail / total >= 0.12 && (
              <span className="text-[9px] font-bold text-white">{voicemail}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#22C55E] inline-block" />
          Contestó {pct(answered)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block" />
          No contestó {pct(noAnswer)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#8B5CF6] inline-block" />
          Buzón {pct(voicemail)}%
        </span>
      </div>
    </div>
  );
}

// ─── Single call card ─────────────────────────────────────────────────────────

function CallCard({ call }: { call: ApiLlamadaLog }) {
  const [expanded, setExpanded] = useState(false);
  const cls = classifyCall(call);
  const hasDetail =
    call.transcripcion ||
    call.iaDescripcion ||
    (call.objeciones && call.objeciones.length > 0) ||
    call.enrichment?.frases_relevantes?.length;

  const date = format(new Date(call.datetime), "d MMM yyyy · HH:mm", { locale: es });

  return (
    <div className="rounded-lg border border-[#1E2B40]/60 bg-[#0E1626] overflow-hidden">
      <div className="px-3 py-2.5 flex items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <OutcomeBadge outcome={call.outcome} />
            <ClassificationBadge cls={cls} />
            {call.duracionSegundos != null && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(call.duracionSegundos)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-medium text-white truncate max-w-[200px]">
              {call.leadName ?? call.leadEmail ?? call.phone ?? "Lead sin nombre"}
            </span>
            <span className="text-gray-500 text-[10px]">{date}</span>
          </div>

          {/* Enrichment summary */}
          {call.enrichment && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {call.enrichment.tono_lead && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#152238] text-gray-300 border border-[#1E2B40]/40">
                  Tono: {call.enrichment.tono_lead}
                </span>
              )}
              {call.enrichment.engagement && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#152238] text-gray-300 border border-[#1E2B40]/40">
                  Engagement: {call.enrichment.engagement}
                </span>
              )}
              {call.enrichment.calidad_cierre && call.enrichment.calidad_cierre !== "no_aplica" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#152238] text-gray-300 border border-[#1E2B40]/40">
                  Cierre: {call.enrichment.calidad_cierre}
                </span>
              )}
            </div>
          )}

          {/* Objections summary */}
          {call.objeciones && call.objeciones.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {call.objeciones.slice(0, 3).map((o, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20"
                  title={o.frase_textual ?? undefined}
                >
                  <ShieldX className="w-2.5 h-2.5 inline mr-0.5" />
                  {o.objecion}
                </span>
              ))}
              {call.objeciones.length > 3 && (
                <span className="text-[10px] text-gray-500">+{call.objeciones.length - 3} más</span>
              )}
            </div>
          )}
        </div>

        {hasDetail && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 p-1 rounded text-gray-500 hover:text-accent-cyan hover:bg-[#152238] transition-colors"
            aria-label={expanded ? "Colapsar detalle" : "Ver detalle"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expanded && hasDetail && (
        <div className="border-t border-[#1E2B40]/60 px-3 py-2.5 space-y-3">
          {/* IA Description */}
          {call.iaDescripcion && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Análisis IA</p>
              <div className="text-[11px] text-gray-300 leading-relaxed bg-[#152238]/60 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {call.iaDescripcion}
              </div>
            </div>
          )}

          {/* Transcript */}
          {call.transcripcion && !call.iaDescripcion && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Transcripción</p>
              <div className="text-[11px] text-gray-300 leading-relaxed bg-[#152238]/60 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {call.transcripcion}
              </div>
            </div>
          )}

          {/* Objections detail */}
          {call.objeciones && call.objeciones.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldX className="w-3 h-3 text-[#EF4444]" /> Objeciones detectadas
              </p>
              <ul className="space-y-1.5">
                {call.objeciones.map((o, i) => (
                  <li key={i} className="text-[11px] rounded bg-[#EF4444]/5 border border-[#EF4444]/15 px-2.5 py-1.5">
                    <span className="font-medium text-[#EF4444]">{o.objecion}</span>
                    {o.frase_textual && (
                      <p className="text-gray-400 italic mt-0.5">&ldquo;{o.frase_textual}&rdquo;</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Razon calificacion */}
          {call.enrichment?.razon_calificacion && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Razón de calificación</p>
              <p className="text-[11px] text-gray-300 bg-[#152238]/60 rounded p-2">{call.enrichment.razon_calificacion}</p>
            </div>
          )}

          {/* Frases relevantes */}
          {call.enrichment?.frases_relevantes && call.enrichment.frases_relevantes.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Frases del lead</p>
              <ul className="space-y-1">
                {call.enrichment.frases_relevantes.map((f, i) => (
                  <li key={i} className="text-[11px] text-gray-300 italic bg-[#152238]/60 rounded px-2 py-1">
                    &ldquo;{f}&rdquo;
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type FilterType = "all" | "answered" | "interesado" | "no_interesado";

interface LlamadasReportProps {
  calls: ApiLlamadaLog[];
  advisorName?: string | null;
}

export default function LlamadasReport({ calls, advisorName }: LlamadasReportProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const classified = useMemo(
    () => calls.map((c) => ({ call: c, cls: classifyCall(c) })),
    [calls],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return classified.filter(({ call, cls }) => {
      if (filter === "answered" && call.outcome !== "answered") return false;
      if (filter === "interesado" && cls !== "interesado") return false;
      if (filter === "no_interesado" && cls !== "no_interesado") return false;
      if (!q) return true;
      return (
        (call.leadName?.toLowerCase().includes(q) ?? false) ||
        (call.leadEmail?.toLowerCase().includes(q) ?? false) ||
        (call.phone?.includes(q) ?? false) ||
        (call.iaDescripcion?.toLowerCase().includes(q) ?? false) ||
        (call.objeciones?.some((o) => o.objecion.toLowerCase().includes(q)) ?? false)
      );
    });
  }, [classified, filter, search]);

  const stats = useMemo(() => {
    const total = calls.length;
    const answered = calls.filter((c) => c.outcome === "answered").length;
    const interesados = classified.filter((x) => x.cls === "interesado").length;
    const noInteresados = classified.filter((x) => x.cls === "no_interesado").length;
    const withObjeciones = calls.filter((c) => c.objeciones && c.objeciones.length > 0).length;

    // Top objections
    const objecionMap: Record<string, number> = {};
    for (const c of calls) {
      for (const o of c.objeciones ?? []) {
        objecionMap[o.objecion] = (objecionMap[o.objecion] ?? 0) + 1;
      }
    }
    const topObjeciones = Object.entries(objecionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { total, answered, interesados, noInteresados, withObjeciones, topObjeciones };
  }, [calls, classified]);

  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Phone className="w-8 h-8 text-gray-600 mb-2" />
        <p className="text-sm text-gray-400">Sin llamadas en el período</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 text-center">
          <div className="text-xl font-bold text-[#E7EFF8]">{stats.total}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Total llamadas</div>
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 text-center">
          <div className="text-xl font-bold text-[#22C55E]">{stats.interesados}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Interesados</div>
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 text-center">
          <div className="text-xl font-bold text-[#EF4444]">{stats.noInteresados}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">No interesados</div>
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 text-center">
          <div className="text-xl font-bold text-[#EF4444]/80">{stats.withObjeciones}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Con objeciones</div>
        </div>
      </div>

      {/* Outcome distribution bar */}
      <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 space-y-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Distribución de resultados
          {advisorName && <span className="ml-1 normal-case font-normal text-gray-500">— {advisorName}</span>}
        </p>
        <OutcomeBar calls={calls} />
      </div>

      {/* Top objections */}
      {stats.topObjeciones.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldX className="w-3 h-3 text-[#EF4444]" /> Objeciones más frecuentes
          </p>
          <div className="space-y-1.5">
            {stats.topObjeciones.map(([obj, count]) => {
              const maxCount = stats.topObjeciones[0][1];
              return (
                <div key={obj} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-300 truncate mr-2">{obj}</span>
                    <span className="text-[#EF4444] font-bold shrink-0">{count}×</span>
                  </div>
                  <div className="h-1 rounded-full bg-[#152238] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#EF4444]/50"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lead, análisis, objeción…"
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-[#0E1626] border border-[#1E2B40]/60 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan/40"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-gray-500 shrink-0" />
          {(["all", "answered", "interesado", "no_interesado"] as FilterType[]).map((f) => {
            const labels: Record<FilterType, string> = {
              all: `Todo (${stats.total})`,
              answered: `Contestó (${stats.answered})`,
              interesado: `Interesados (${stats.interesados})`,
              no_interesado: `No interesados (${stats.noInteresados})`,
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`text-[10px] px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${
                  filter === f
                    ? "bg-accent-cyan text-surface-900 font-semibold"
                    : "bg-[#0E1626] border border-[#1E2B40]/60 text-gray-400 hover:text-white"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Call list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-gray-500 py-6">Sin llamadas para los filtros aplicados</p>
        ) : (
          filtered.map(({ call }) => <CallCard key={call.id} call={call} />)
        )}
      </div>
    </div>
  );
}
