"use client";

import { X, MessageSquare, Phone, Calendar, Clock, User, ChevronDown, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import type {
  UnifiedLead,
  UnifiedLeadChat,
  UnifiedLeadCall,
  UnifiedLeadAppointment,
} from "@/types";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  solo_chat: { label: "Solo chat", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  chat_llamada: { label: "Chat + Llamada", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  cita: { label: "Cita", color: "bg-green-500/20 text-green-300 border-green-500/30" },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage] ?? { label: stage, color: "bg-gray-500/20 text-gray-300 border-gray-500/30" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-gray-500 italic py-2">Sin respuesta registrada — {label}</p>
  );
}

function formatDt(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function ChatSection({ chats }: { chats: UnifiedLeadChat[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (chats.length === 0) {
    return <EmptyState label="no hay chats registrados" />;
  }

  return (
    <div className="space-y-2">
      {chats.map((c) => (
        <div key={c.id} className="rounded-lg bg-surface-700/60 border border-surface-500/40">
          <button
            type="button"
            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-surface-600/40 transition-colors rounded-lg"
          >
            {expanded === c.id ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">{formatDt(c.datetime)}</span>
                {c.asesor && <span className="text-gray-500">· {c.asesor}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                <span>{c.totalMessages} msgs</span>
                <span>Lead: {c.leadMessages}</span>
                <span>Agente: {c.agentMessages}</span>
                {c.iaCategoria && <span className="text-accent-cyan">{c.iaCategoria}</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${c.humanTookOver ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"}`}>
              {c.humanTookOver ? "Atendido" : "Sin atender"}
            </span>
          </button>
          {expanded === c.id && (
            <div className="px-3 pb-3 max-h-60 overflow-y-auto space-y-1.5 border-t border-surface-500/40 pt-2">
              {c.messages.map((m, i) => (
                <div key={i} className={`text-xs rounded-md px-2.5 py-1.5 max-w-[85%] ${m.role === "lead" ? "bg-surface-600 text-gray-300 mr-auto" : "bg-accent-cyan/10 text-accent-cyan ml-auto"}`}>
                  <span className="font-medium">{m.name || m.role}:</span>{" "}
                  <span className="text-gray-300">{m.message}</span>
                  <span className="block text-[10px] text-gray-500 mt-0.5">{formatDt(m.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CallsSection({ calls }: { calls: UnifiedLeadCall[] }) {
  if (calls.length === 0) {
    return <EmptyState label="colgó la llamada" />;
  }

  return (
    <div className="space-y-2">
      {calls.map((c) => (
        <div key={c.id} className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">{formatDt(c.datetime)}</span>
                {c.closerName && <span className="text-gray-500">· {c.closerName}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                <span>{c.tipoEvento.replace(/_/g, " ")}</span>
                {c.duracionSegundos != null && c.duracionSegundos > 0 && (
                  <span><Clock className="w-3 h-3 inline mr-0.5" />{formatDuration(c.duracionSegundos)}</span>
                )}
                {c.speedToLeadMinutes != null && (
                  <span>STL: {c.speedToLeadMinutes.toFixed(1)} min</span>
                )}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${c.outcome === "answered" ? "bg-green-500/20 text-green-300" : c.outcome === "voicemail" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
              {c.outcome === "answered" ? "Contestada" : c.outcome === "voicemail" ? "Buzón" : c.outcome === "no_answer" ? "No contestó" : c.outcome === "pending" ? "Pendiente" : c.outcome}
            </span>
          </div>
          {c.iaDescripcion && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-2">{c.iaDescripcion}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function AppointmentsSection({ appointments }: { appointments: UnifiedLeadAppointment[] }) {
  if (appointments.length === 0) {
    return <EmptyState label="sin cita registrada" />;
  }

  return (
    <div className="space-y-2">
      {appointments.map((a) => (
        <div key={a.id} className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-300">{formatDt(a.datetime)}</span>
                {a.closer && <span className="text-gray-500">· {a.closer}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {a.categoria && <span>{a.categoria}</span>}
                {a.facturacion > 0 && <span>${a.facturacion.toLocaleString()}</span>}
                {a.cashCollected > 0 && <span>Cobrado: ${a.cashCollected.toLocaleString()}</span>}
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${a.canceled ? "bg-red-500/20 text-red-300" : a.attended ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"}`}>
              {a.canceled ? "Cancelada" : a.attended ? "Asistió" : "No Show"}
            </span>
          </div>
          {a.resumenIa && (
            <p className="text-xs text-gray-400 mt-2 line-clamp-3">{a.resumenIa}</p>
          )}
          {a.linkLlamada && (
            <a href={a.linkLlamada} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-cyan hover:underline mt-1 inline-block">
              Ver grabación
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LeadJourneyDetail({
  lead,
  onClose,
}: {
  lead: UnifiedLead;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full md:max-w-2xl ml-auto h-full bg-surface-800 border-l border-surface-500 shadow-2xl flex flex-col animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-lg text-white truncate">
                {lead.name}
              </h2>
              <StageBadge stage={lead.journeyStage} />
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
              {lead.advisor && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />{lead.advisor}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — 3 sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Chats */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Chats ({lead.chats.length})
            </h3>
            <ChatSection chats={lead.chats} />
          </section>

          {/* Llamadas */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Phone className="w-4 h-4 text-amber-400" />
              Llamadas ({lead.calls.length})
            </h3>
            <CallsSection calls={lead.calls} />
          </section>

          {/* Citas */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
              <Calendar className="w-4 h-4 text-green-400" />
              Citas ({lead.appointments.length})
            </h3>
            <AppointmentsSection appointments={lead.appointments} />
          </section>
        </div>
      </div>
    </div>
  );
}
