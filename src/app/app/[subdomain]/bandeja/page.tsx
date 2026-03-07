"use client";

import { useState } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { Inbox, AlertTriangle, CheckCircle2, XCircle, Mail, Send, Loader2, Phone, User, Calendar, Radio, ExternalLink, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import clsx from "clsx";

type EstadoTab = "pendiente" | "resuelto" | "descartado";

interface HuerfanoData {
  id_huerfano: number;
  id_cuenta: number;
  origen: string;
  motivo: string;
  payload_original: unknown;
  estado: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const ESTADO_TABS: { id: EstadoTab; label: string; icon: typeof Inbox }[] = [
  { id: "pendiente", label: "Pendientes", icon: AlertTriangle },
  { id: "resuelto", label: "Resueltos", icon: CheckCircle2 },
  { id: "descartado", label: "Descartados", icon: XCircle },
];

const ORIGEN_COLORS: Record<string, string> = {
  fathom: "bg-accent-purple/20 text-accent-purple border-accent-purple/30",
  twilio: "bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30",
};

/** Extrae una URL válida aunque venga como string, array o objeto (ej. Fathom). */
function toShareUrl(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" && (v.startsWith("http://") || v.startsWith("https://"))) return v;
  if (Array.isArray(v) && v.length > 0) {
    const first = v[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object" && "url" in first) return String((first as { url: string }).url);
  }
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.url === "string") return o.url;
    if (typeof o.href === "string") return o.href;
    if (typeof o.share_url === "string") return o.share_url;
  }
  return "";
}

/** Extrae texto de transcripción aunque venga como array de segmentos u objeto (ej. Fathom). */
function toTranscriptString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    const parts = v.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        if (typeof o.text === "string") return o.text;
        if (typeof o.content === "string") return o.content;
        if (typeof o.transcript === "string") return o.transcript;
      }
      return "";
    }).filter(Boolean);
    return parts.join("\n");
  }
  if (typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.transcript === "string") return o.transcript;
    if (typeof o.content === "string") return o.content;
    if (typeof o.summary === "string") return o.summary;
  }
  return "";
}

function extractPayloadDetails(payload: unknown) {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const nombre = String(p.nombre_lead ?? p.leadName ?? p.nombre ?? p.name ?? p.visitor_name ?? "");
  const telefono = String(p.phone ?? p.telefono ?? p.phone_raw_format ?? "");
  const email = String(p.email ?? p.mail_lead ?? p.email_lead ?? p.visitor_email ?? "");
  const fecha = String(p.fecha ?? p.ts ?? p.datetime ?? p.timestamp ?? p.created_at ?? p.occurred_at ?? "");
  const props = (p.properties && typeof p.properties === "object") ? p.properties as Record<string, unknown> : {};
  const shareUrl = toShareUrl(p.share_url ?? p.recording_url ?? p.video_url ?? props.share_url ?? props.recording_url ?? props.video_url ?? "");
  const transcript = toTranscriptString(p.transcript ?? p.summary ?? p.transcription ?? props.transcript ?? props.summary ?? props.transcription ?? "");
  return { nombre, telefono, email, fecha, shareUrl, transcript };
}

function HuerfanoCard({
  huerfano,
  onAction,
}: {
  huerfano: HuerfanoData;
  onAction: () => void;
}) {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const isPendiente = huerfano.estado === "pendiente";
  const details = extractPayloadDetails(huerfano.payload_original);

  const handleCorregir = async () => {
    if (!correo.trim() || !correo.includes("@")) {
      toast.error("Ingresa un correo válido");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/data/huerfanos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_huerfano: huerfano.id_huerfano,
          correo_corregido: correo.trim(),
          accion: "corregir",
        }),
      });
      if (res.ok) {
        toast.success("Evento corregido y reenviado al Cerebro");
        onAction();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Error al procesar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const handleDescartar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/data/huerfanos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_huerfano: huerfano.id_huerfano,
          accion: "descartar",
        }),
      });
      if (res.ok) {
        toast.success("Evento descartado");
        onAction();
      } else {
        toast.error("Error al descartar");
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const origenClass = ORIGEN_COLORS[huerfano.origen.toLowerCase()] ?? "bg-surface-600 text-gray-300 border-surface-500";

  return (
    <div className="rounded-xl border border-surface-500 bg-surface-800/80 overflow-hidden transition-all hover:border-surface-400">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-surface-700/60 border-b border-surface-500/60">
        <div className="flex items-center gap-2">
          <span className={clsx("px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border", origenClass)}>
            <Radio className="w-3 h-3 inline mr-1" />{huerfano.origen}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-accent-amber/15 text-accent-amber border border-accent-amber/30 text-[10px] font-medium">
            {huerfano.motivo}
          </span>
        </div>
        {huerfano.created_at && (
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(huerfano.created_at), "dd/MM/yy HH:mm")}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {details.nombre && (
            <div className="flex items-center gap-1.5 text-gray-300">
              <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{details.nombre}</span>
            </div>
          )}
          {details.telefono && (
            <div className="flex items-center gap-1.5 text-gray-300">
              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{details.telefono}</span>
            </div>
          )}
          {details.email && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{details.email}</span>
            </div>
          )}
        </div>
        {(details.shareUrl || details.transcript) && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {details.shareUrl && (
                <a
                  href={details.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 hover:bg-accent-cyan/25 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  Ver grabación
                </a>
              )}
              {details.transcript && (
                <button
                  type="button"
                  onClick={() => setShowTranscript((s) => !s)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-600 text-gray-300 border border-surface-500 hover:bg-surface-500 hover:text-white transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {showTranscript ? "Ocultar transcripción" : "Ver transcripción"}
                </button>
              )}
            </div>
            {details.transcript && showTranscript && (
              <div className="rounded-lg border border-surface-500 bg-surface-700/50 p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {details.transcript}
              </div>
            )}
          </div>
        )}

        {isPendiente && (
          <div className="flex items-center gap-2 pt-2 border-t border-surface-500/50">
            <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-surface-700 border border-surface-500 px-2.5 py-1.5">
              <Mail className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@corregido.com"
                className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleCorregir}
              disabled={loading || !correo.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-xs font-semibold hover:shadow-[0_0_16px_-4px_rgba(0,240,255,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Corregir
            </button>
            <button
              type="button"
              onClick={handleDescartar}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30 disabled:opacity-50 shrink-0"
            >
              <XCircle className="w-3.5 h-3.5" />
              Descartar
            </button>
          </div>
        )}

        {!isPendiente && (
          <div className="flex items-center gap-1.5 pt-1 text-[10px]">
            {huerfano.estado === "resuelto" ? (
              <span className="flex items-center gap-1 text-accent-green"><CheckCircle2 className="w-3 h-3" /> Resuelto</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-500"><XCircle className="w-3 h-3" /> Descartado</span>
            )}
            {huerfano.updated_at && (
              <span className="text-gray-600 ml-1">
                · {format(new Date(huerfano.updated_at), "dd/MM/yy HH:mm")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BandejaPage() {
  const [activeTab, setActiveTab] = useState<EstadoTab>("pendiente");

  const { data, loading, error, refetch } = useApiData<HuerfanoData[]>("/api/data/huerfanos", {
    estado: activeTab,
  });

  const items = Array.isArray(data) ? data : [];
  const pendingCount = activeTab === "pendiente" ? items.length : null;

  return (
    <>
      <PageHeader
        title="Bandeja de datos"
        subtitle="Eventos huérfanos · Datos perdidos"
        action={
          pendingCount != null && pendingCount > 0 ? (
            <span className="px-2.5 py-1 rounded-full bg-accent-amber/20 text-accent-amber text-xs font-semibold border border-accent-amber/30">
              {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
            </span>
          ) : null
        }
      />
      <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
        <div className="flex items-center gap-1.5">
          {ESTADO_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
                  isActive
                    ? "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30"
                    : "bg-surface-700/60 text-gray-400 border-surface-500 hover:text-white hover:bg-surface-600"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando eventos...
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 text-sm font-medium mb-1">Error al cargar eventos</p>
            <p className="text-gray-500 text-xs mb-4">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-600 text-gray-300 border border-surface-500 hover:bg-surface-500 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-500 bg-surface-700/30 px-4 py-12 text-center">
            <Inbox className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {activeTab === "pendiente"
                ? "No hay eventos pendientes. Todo al día."
                : `No hay eventos ${activeTab === "resuelto" ? "resueltos" : "descartados"}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((h) => (
              <HuerfanoCard key={h.id_huerfano} huerfano={h} onAction={refetch} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
