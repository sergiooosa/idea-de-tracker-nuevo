"use client";

import { useState, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Merge, Users } from "lucide-react";

export interface MergeSuggestion {
  id: string;
  candidatos: Array<{ email?: string; nombre: string; conteo: number }>;
  canonical_nombre: string;
  canonical_email: string | null;
  status: string;
}

interface Props {
  suggestions: MergeSuggestion[];
  onClose: () => void;
  onSuggestionResolved: (id: string) => void;
}

export default function MergeSuggestionsModal({
  suggestions,
  onClose,
  onSuggestionResolved,
}: Props) {
  const [index, setIndex] = useState(0);
  const [editNombre, setEditNombre] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = suggestions[index];
  const total = suggestions.length;

  const canonicalNombre = editNombre ?? current?.canonical_nombre ?? "";
  const canonicalEmail = editEmail ?? current?.canonical_email ?? "";

  const resetEdits = useCallback(() => {
    setEditNombre(null);
    setEditEmail(null);
    setError(null);
  }, []);

  const goTo = (newIndex: number) => {
    resetEdits();
    setIndex(Math.max(0, Math.min(newIndex, suggestions.length - 1)));
  };

  const handleAccept = async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/data/asesores/merge-suggestions/${current.id}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonical_nombre: canonicalNombre,
            canonical_email: canonicalEmail || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al unificar");

      const totalRecords =
        (data.merged?.log_llamadas ?? 0) +
        (data.merged?.registros_llamada ?? 0) +
        (data.merged?.agendas ?? 0) +
        (data.merged?.chats ?? 0);

      // Show toast-like notification
      showToast(`Asesores unificados — ${totalRecords} registros actualizados`, "success");

      onSuggestionResolved(current.id);
      const remaining = suggestions.filter((s) => s.id !== current.id);
      if (remaining.length === 0) {
        onClose();
      } else {
        resetEdits();
        setIndex(Math.min(index, remaining.length - 1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/data/asesores/merge-suggestions/${current.id}/reject`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Error al rechazar");

      onSuggestionResolved(current.id);
      const remaining = suggestions.filter((s) => s.id !== current.id);
      if (remaining.length === 0) {
        onClose();
      } else {
        resetEdits();
        setIndex(Math.min(index, remaining.length - 1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Sugerencias de merge de asesores"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative rounded-xl border border-surface-500 bg-surface-800 shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 bg-surface-700/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-amber" />
            <h3 className="text-sm font-semibold text-white">
              Detectamos posibles asesores duplicados
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-xs font-semibold text-gray-300">
            ¿Son la misma persona?
          </p>

          {/* Candidates list */}
          <div className="space-y-1.5">
            {current.candidatos.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-surface-700/60 border border-surface-500/60 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-medium text-white">{c.nombre}</div>
                  {c.email && (
                    <div className="text-[10px] text-gray-500">{c.email}</div>
                  )}
                </div>
                <span className="text-[10px] text-accent-cyan font-medium shrink-0 ml-2">
                  {c.conteo} llamada{c.conteo !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Canonical fields */}
          <div className="space-y-2">
            <p className="text-[11px] text-gray-400">Unificar como:</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">
                  Nombre
                </label>
                <input
                  type="text"
                  value={canonicalNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-accent-cyan/50 transition-colors"
                  placeholder="Nombre canónico"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">
                  Email{" "}
                  <span className="text-gray-600">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={canonicalEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-accent-cyan/50 transition-colors"
                  placeholder="email@empresa.com"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={loading || !canonicalNombre.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-accent-cyan text-surface-900 font-semibold text-xs px-3 py-2 hover:bg-accent-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="animate-pulse">Unificando...</span>
              ) : (
                <>
                  <Merge className="w-3.5 h-3.5" />
                  <span>Unificar</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={loading}
              className="flex-1 rounded-lg bg-surface-700 border border-surface-500 text-gray-300 font-medium text-xs px-3 py-2 hover:bg-surface-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Son personas distintas
            </button>
          </div>
        </div>

        {/* Footer: pagination */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-surface-500 bg-surface-700/30">
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0 || loading}
              className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-gray-400">
              {index + 1} de {total} sugerencias
            </span>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === total - 1 || loading}
              className="p-1 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal toast helper (doesn't rely on a toast library)
function showToast(message: string, type: "success" | "error") {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === "success" ? "#0d9488" : "#dc2626"};
    color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px;
    z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: fadeIn 0.2s ease;
  `;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.3s";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}
