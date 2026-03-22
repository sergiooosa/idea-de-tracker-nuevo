"use client";

import { useState, useCallback } from "react";
import { Loader2, Search, Download, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Accion = "importar_nuevo" | "actualizar_existente" | "ya_completo";

interface ConversacionPreview {
  conversationId: string;
  contactId: string;
  contactName: string;
  lastMessage: string;
  lastMessageDate: string;
  channel: string;
  existeEnBD: boolean;
  mensajesEnBD: number;
  mensajesEnGHL: number;
  accion: Accion;
}

interface PreviewResponse {
  success: boolean;
  message?: string;
  data?: { items: ConversacionPreview[] };
}

interface ExecuteResponse {
  success: boolean;
  message?: string;
  data?: {
    procesadas: number;
    insertadas: number;
    actualizadas: number;
    errores: number;
    items: Array<{
      conversationId: string;
      contactName: string;
      status: string;
      mensajesImportados: number;
      motivo: string;
    }>;
  };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CANALES_DISPONIBLES = ["Todos", "WhatsApp", "FB", "IG", "SMS", "Email", "Live_Chat"];

const ACCION_LABELS: Record<Accion, { label: string; color: string; bg: string }> = {
  importar_nuevo: {
    label: "Importar nuevo",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10 border-accent-blue/30",
  },
  actualizar_existente: {
    label: "Actualizar",
    color: "text-accent-amber",
    bg: "bg-accent-amber/10 border-accent-amber/30",
  },
  ya_completo: {
    label: "Ya completo",
    color: "text-gray-500",
    bg: "bg-surface-700/40 border-surface-600",
  },
};

function formatFecha(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ChatRecoverySection() {
  const [uiState, setUiState] = useState<
    "idle" | "cargandoPreview" | "previewListo" | "ejecutando" | "listo" | "error"
  >("idle");

  const [conversaciones, setConversaciones] = useState<ConversacionPreview[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [canalFiltro, setCanalFiltro] = useState("Todos");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultadoEjecucion, setResultadoEjecucion] = useState<ExecuteResponse["data"] | null>(
    null,
  );

  // ─── Filtro local de canal ──────────────────────────────────────────────────

  const conversacionesFiltradas = conversaciones.filter((c) =>
    canalFiltro === "Todos" ? true : c.channel === canalFiltro,
  );

  // ─── Preview ───────────────────────────────────────────────────────────────

  const handleVerConversaciones = useCallback(async () => {
    setUiState("cargandoPreview");
    setErrorMsg(null);
    setConversaciones([]);
    setSeleccionadas(new Set());
    setResultadoEjecucion(null);

    try {
      const res = await fetch("/api/quick-triggers/chat-recovery/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const data = (await res.json()) as PreviewResponse;

      if (!data.success || !data.data) {
        throw new Error(data.message ?? "Error al obtener conversaciones");
      }

      setConversaciones(data.data.items);
      // Pre-seleccionar las que no están completas
      const presel = new Set<string>();
      for (const conv of data.data.items) {
        if (conv.accion !== "ya_completo") {
          presel.add(conv.conversationId);
        }
      }
      setSeleccionadas(presel);
      setUiState("previewListo");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setUiState("error");
    }
  }, []);

  // ─── Toggle selección ──────────────────────────────────────────────────────

  const toggleSeleccion = useCallback((conversationId: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  }, []);

  const toggleTodas = useCallback(() => {
    const importables = conversacionesFiltradas
      .filter((c) => c.accion !== "ya_completo")
      .map((c) => c.conversationId);
    const todasSeleccionadas = importables.every((id) => seleccionadas.has(id));
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (todasSeleccionadas) {
        for (const id of importables) next.delete(id);
      } else {
        for (const id of importables) next.add(id);
      }
      return next;
    });
  }, [conversacionesFiltradas, seleccionadas]);

  // ─── Execute ───────────────────────────────────────────────────────────────

  const handleImportar = useCallback(async () => {
    const paraImportar = conversaciones.filter((c) => seleccionadas.has(c.conversationId));
    if (paraImportar.length === 0) return;

    setUiState("ejecutando");
    setErrorMsg(null);

    try {
      const payload = {
        selected_conversations: paraImportar.map((c) => ({
          conversationId: c.conversationId,
          contactId: c.contactId,
          contactName: c.contactName,
        })),
      };

      const res = await fetch("/api/quick-triggers/chat-recovery/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ExecuteResponse;

      if (!data.success) {
        throw new Error(data.message ?? "Error al importar conversaciones");
      }

      setResultadoEjecucion(data.data ?? null);
      setUiState("listo");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setUiState("error");
    }
  }, [conversaciones, seleccionadas]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const paraImportarCount = conversacionesFiltradas.filter(
    (c) => seleccionadas.has(c.conversationId) && c.accion !== "ya_completo",
  ).length;

  return (
    <div className="rounded-xl border border-surface-500 bg-surface-800/60 overflow-hidden">
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-600">
        <div className="rounded-lg p-1.5 bg-accent-blue/20 border border-accent-blue/30">
          <MessageSquare className="w-4 h-4 text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">
            📥 Recuperar chats históricos
          </h4>
          <p className="text-[11px] text-gray-500 mt-0.5">
            ¿Tienes conversaciones anteriores en GHL que no aparecen en el sistema? Puedes
            importarlas aquí.
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Estado: idle o error */}
        {(uiState === "idle" || uiState === "error") && (
          <div className="space-y-2">
            {uiState === "error" && errorMsg && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleVerConversaciones}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-blue/20 text-accent-blue border border-accent-blue/50 hover:bg-accent-blue/30 transition-all"
            >
              <Search className="w-4 h-4" />
              Ver conversaciones disponibles
            </button>
            <p className="text-[11px] text-gray-600">
              ℹ️ Consulta las últimas 100 conversaciones de GHL y compara con lo que ya tienes en
              el sistema.
            </p>
          </div>
        )}

        {/* Estado: cargando preview */}
        {uiState === "cargandoPreview" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />
            <span>Consultando conversaciones en GHL...</span>
          </div>
        )}

        {/* Estado: preview listo */}
        {uiState === "previewListo" && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Canal:</span>
              {CANALES_DISPONIBLES.map((canal) => (
                <button
                  key={canal}
                  type="button"
                  onClick={() => setCanalFiltro(canal)}
                  className={`px-2 py-0.5 rounded text-xs border transition-all ${
                    canalFiltro === canal
                      ? "bg-accent-blue/20 text-accent-blue border-accent-blue/50"
                      : "text-gray-400 border-surface-500 hover:border-gray-500"
                  }`}
                >
                  {canal}
                </button>
              ))}
              <span className="ml-auto text-[11px] text-gray-500">
                {conversacionesFiltradas.length} conversación
                {conversacionesFiltradas.length !== 1 ? "es" : ""}
              </span>
            </div>

            {conversacionesFiltradas.length === 0 ? (
              <p className="text-xs text-gray-500 py-2">
                No hay conversaciones disponibles para el filtro seleccionado.
              </p>
            ) : (
              <>
                {/* Tabla */}
                <div className="overflow-x-auto rounded-lg border border-surface-600">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-600 bg-surface-700/50">
                        <th className="px-3 py-2 text-left w-8">
                          <input
                            type="checkbox"
                            aria-label="Seleccionar todas"
                            checked={
                              conversacionesFiltradas
                                .filter((c) => c.accion !== "ya_completo")
                                .every((c) => seleccionadas.has(c.conversationId)) &&
                              conversacionesFiltradas.some((c) => c.accion !== "ya_completo")
                            }
                            onChange={toggleTodas}
                            className="rounded border-surface-500 bg-surface-700 accent-accent-blue cursor-pointer"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Lead</th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Canal</th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">
                          Último mensaje
                        </th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Fecha</th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Estado</th>
                        <th className="px-3 py-2 text-left text-gray-400 font-medium">Msgs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversacionesFiltradas.map((conv) => {
                        const accionInfo = ACCION_LABELS[conv.accion];
                        const esCompletaYsinSeleccionar = conv.accion === "ya_completo";
                        const estaSeleccionada = seleccionadas.has(conv.conversationId);

                        return (
                          <tr
                            key={conv.conversationId}
                            className={`border-b border-surface-700/50 last:border-0 transition-colors ${
                              esCompletaYsinSeleccionar
                                ? "opacity-50"
                                : "hover:bg-surface-700/30 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (!esCompletaYsinSeleccionar) {
                                toggleSeleccion(conv.conversationId);
                              }
                            }}
                          >
                            <td className="px-3 py-2">
                              {esCompletaYsinSeleccionar ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-gray-600" />
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={estaSeleccionada}
                                  onChange={() => toggleSeleccion(conv.conversationId)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-surface-500 bg-surface-700 accent-accent-blue cursor-pointer"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 text-white font-medium">
                              {conv.contactName}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{conv.channel}</td>
                            <td className="px-3 py-2 text-gray-400 max-w-[180px] truncate">
                              {conv.lastMessage ? `"${conv.lastMessage}"` : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                              {formatFecha(conv.lastMessageDate)}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium ${accionInfo.color} ${accionInfo.bg}`}
                              >
                                {conv.accion === "actualizar_existente"
                                  ? `${accionInfo.label} (${conv.mensajesEnBD}→${conv.mensajesEnGHL})`
                                  : accionInfo.label}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-[10px]">
                              {conv.mensajesEnGHL}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Botón importar */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleImportar}
                    disabled={paraImportarCount === 0}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-accent-green/20 text-accent-green border border-accent-green/50 hover:bg-accent-green/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    Importar seleccionadas ({paraImportarCount})
                  </button>
                  <button
                    type="button"
                    onClick={handleVerConversaciones}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    ↺ Actualizar lista
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Estado: ejecutando */}
        {uiState === "ejecutando" && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-accent-green" />
            <span>Importando conversaciones desde GHL...</span>
          </div>
        )}

        {/* Estado: listo — resultado */}
        {uiState === "listo" && resultadoEjecucion && (
          <div className="space-y-2">
            <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 px-3 py-2 text-xs text-gray-300 space-y-1">
              <p className="text-accent-green font-semibold">✅ Importación completada</p>
              <p>
                Importadas nuevas:{" "}
                <strong className="text-white">{resultadoEjecucion.insertadas}</strong> · Actualizadas:{" "}
                <strong className="text-white">{resultadoEjecucion.actualizadas}</strong> · Errores:{" "}
                <strong className={resultadoEjecucion.errores > 0 ? "text-red-400" : "text-white"}>
                  {resultadoEjecucion.errores}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUiState("idle");
                setConversaciones([]);
                setSeleccionadas(new Set());
                setResultadoEjecucion(null);
              }}
              className="text-xs text-accent-blue hover:underline"
            >
              ↺ Hacer otra importación
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
