"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, User } from "lucide-react";
import { useApiData } from "@/hooks/useApiData";

export interface LeadEnEspera {
  nombre_lead: string;
  nombre_closer: string | null;
  closer_mail: string | null;
  creativo_origen: string | null;
  min_sin_llamar: number;
}

export interface CloserConLeadsEnEspera {
  nombre_closer: string;
  closer_mail: string | null;
  leads: LeadEnEspera[];
  lead_mas_antiguo_min: number;
}

export interface LeadsEnEsperaResponse {
  grupos: CloserConLeadsEnEspera[];
  total: number;
  umbral_min: number;
}

function formatTiempoEspera(minutos: number): string {
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}

type UrgenciaNivel = "amarillo" | "naranja" | "rojo";

function getUrgencia(minutos: number): UrgenciaNivel {
  if (minutos >= 1440) return "rojo";   // +24h
  if (minutos >= 240) return "naranja"; // +4h
  return "amarillo";                    // +60min
}

const URGENCIA_STYLES: Record<UrgenciaNivel, { badge: string; dot: string }> = {
  amarillo: {
    badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    dot: "bg-yellow-400",
  },
  naranja: {
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dot: "bg-orange-400",
  },
  rojo: {
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    dot: "bg-red-400",
  },
};

function LeadRow({ lead }: { lead: LeadEnEspera }) {
  const urgencia = getUrgencia(lead.min_sin_llamar);
  const styles = URGENCIA_STYLES[urgencia];

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
        <span className="truncate text-slate-200">{lead.nombre_lead}</span>
        {lead.creativo_origen && (
          <span className="hidden shrink-0 rounded px-1.5 py-0.5 text-xs bg-slate-700 text-slate-400 sm:inline">
            {lead.creativo_origen}
          </span>
        )}
        {!lead.creativo_origen && (
          <span className="hidden shrink-0 rounded px-1.5 py-0.5 text-xs bg-slate-800 text-slate-600 sm:inline">
            Sin fuente
          </span>
        )}
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${styles.badge}`}
      >
        {formatTiempoEspera(lead.min_sin_llamar)} sin llamar
      </span>
    </div>
  );
}

function CloserCard({ grupo }: { grupo: CloserConLeadsEnEspera }) {
  const [expandido, setExpandido] = useState(false);
  const urgenciaMayor = getUrgencia(grupo.lead_mas_antiguo_min);
  const styles = URGENCIA_STYLES[urgenciaMayor];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/50 overflow-hidden">
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpandido((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700">
            <User className="h-4 w-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-100">
              {grupo.nombre_closer}
            </p>
            <p className="text-xs text-slate-500">
              {grupo.leads.length} lead{grupo.leads.length !== 1 ? "s" : ""} sin contacto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles.badge}`}
          >
            {formatTiempoEspera(grupo.lead_mas_antiguo_min)} máx
          </span>
          {expandido ? (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          )}
        </div>
      </button>

      {expandido && (
        <div className="border-t border-white/10 px-4 py-3 space-y-2">
          {grupo.leads.map((lead, i) => (
            <LeadRow key={`${lead.nombre_lead}-${i}`} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadsEnEspera({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, loading, error } = useApiData<LeadsEnEsperaResponse>(
    "/api/data/leads-en-espera",
    { from: dateFrom, to: dateTo },
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Verificando leads en espera…</span>
        </div>
      </div>
    );
  }

  if (error) return null;
  if (!data || data.total === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
        <span className="text-sm text-emerald-300">
          Todo al día — ningún lead lleva más de {data?.umbral_min ?? 60} min sin contacto inicial.
        </span>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-orange-500/20 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Leads sin contacto inicial
          </h2>
          <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
            {data.total}
          </span>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">
          Llevan más de {data.umbral_min} min esperando primera llamada
        </p>
      </div>

      {/* Grupos por closer */}
      <div className="p-4 space-y-3">
        {data.grupos.map((grupo) => (
          <CloserCard key={grupo.closer_mail ?? grupo.nombre_closer} grupo={grupo} />
        ))}
      </div>
    </section>
  );
}
