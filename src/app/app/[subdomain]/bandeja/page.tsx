"use client";

import { useState, useMemo, useCallback } from "react";
import PageHeader from "@/components/dashboard/PageHeader";
import { useApiData } from "@/hooks/useApiData";
import { Inbox, AlertTriangle, CheckCircle2, XCircle, Mail, Send, Loader2, Phone, User, Calendar, Radio } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import clsx from "clsx";

type EstadoTab = "pendiente" | "resuelto" | "descartado";

interface HuerfanoData {
  id_huerfano: number;
  id_cuenta: number;
  origen: string;
  motivo: string;
  payload_original: Record<string, unknown>;
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

function extractPayloadDetails(payload: Record<string, unknown>) {
  const nombre = (payload.nombre_lead ?? payload.leadName ?? payload.nombre ?? payload.name ?? "") as string;
  const telefono = (payload.phone ?? payload.telefono ?? payload.phone_raw_format ?? "") as string;
  const email = (payload.email ?? payload.mail_lead ?? payload.email_lead ?? "") as string;
  const fecha = (payload.fecha ?? payload.ts ?? payload.datetime ?? "") as string;
  return { nombre, telefono, email, fecha };
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

  const { data, loading, refetch } = useApiData<HuerfanoData[]>("/api/data/huerfanos", {
    estado: activeTab,
  });

  const items = data ?? [];
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
            <div className="text-gray-400 text-sm animate-pulse">Cargando eventos...</div>
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
