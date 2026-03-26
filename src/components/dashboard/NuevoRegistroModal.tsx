"use client";

import { useState, useEffect } from "react";
import { X, Plus, Loader2 } from "lucide-react";

type TipoRegistro = "llamada" | "videollamada" | "chat";

interface Asesor {
  id: number;
  nombre: string | null;
  email: string;
}

interface NuevoRegistroModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tipo?: TipoRegistro;
}

export default function NuevoRegistroModal({
  open,
  onClose,
  onSuccess,
  tipo: tipoProp,
}: NuevoRegistroModalProps) {
  const [tipo, setTipo] = useState<TipoRegistro>(tipoProp ?? "llamada");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asesores, setAsesores] = useState<Asesor[]>([]);

  // Campos comunes
  const [nombreLead, setNombreLead] = useState("");
  const [emailLead, setEmailLead] = useState("");
  const [asesor, setAsesor] = useState("");

  // Llamada-specific
  const [phone, setPhone] = useState("");
  const [tipoEvento, setTipoEvento] = useState("efectiva_manual");

  // Videollamada-specific
  const [categoria, setCategoria] = useState("");
  const [fechaReunion, setFechaReunion] = useState("");
  const [facturacion, setFacturacion] = useState("");
  const [cashCollected, setCashCollected] = useState("");

  // Chat-specific
  const [estado, setEstado] = useState("activo");
  const [notasExtra, setNotasExtra] = useState("");

  useEffect(() => {
    if (tipoProp) setTipo(tipoProp);
  }, [tipoProp]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/data/usuarios")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setAsesores(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  const resetForm = () => {
    setNombreLead(""); setEmailLead(""); setAsesor(""); setPhone("");
    setTipoEvento("efectiva_manual"); setCategoria(""); setFechaReunion("");
    setFacturacion(""); setCashCollected(""); setEstado("activo"); setNotasExtra("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let url = "";
      let payload: Record<string, unknown> = {};

      if (tipo === "llamada") {
        url = "/api/data/llamadas";
        payload = {
          nombre_lead: nombreLead || null,
          mail_lead: emailLead || null,
          phone: phone || null,
          closer_mail: asesor || null,
          nombre_closer: (asesores.find((a) => a.email === asesor)?.nombre ?? asesor) || null,
          tipo_evento: tipoEvento,
        };
      } else if (tipo === "videollamada") {
        url = "/api/data/videollamadas";
        payload = {
          nombre_lead: nombreLead,
          email_lead: emailLead || null,
          closer: asesor || null,
          categoria: categoria || null,
          fecha_reunion: fechaReunion || null,
          facturacion: facturacion || null,
          cash_collected: cashCollected || null,
        };
      } else {
        url = "/api/data/chats";
        payload = {
          nombre_lead: nombreLead,
          asesor_asignado: asesor || null,
          notas_extra: notasExtra || null,
          estado,
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar");
        setLoading(false);
        return;
      }

      resetForm();
      onSuccess();
      onClose();
    } catch {
      setError("Error de red");
    }
    setLoading(false);
  };

  if (!open) return null;

  const tipoLabels: Record<TipoRegistro, string> = {
    llamada: "📞 Nueva llamada",
    videollamada: "🎥 Nueva videollamada",
    chat: "💬 Nuevo chat",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500 shrink-0">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent-cyan" />
            Nueva entrada manual
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form className="p-4 space-y-4 overflow-y-auto flex-1" onSubmit={handleSubmit}>
          {/* Tipo selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de registro</label>
            <div className="flex gap-2">
              {(["llamada", "videollamada", "chat"] as TipoRegistro[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    tipo === t
                      ? "bg-accent-cyan text-black"
                      : "bg-surface-700 text-gray-300 hover:bg-surface-600 border border-surface-500"
                  }`}
                >
                  {tipoLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Nombre lead (todos) */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Nombre del lead {tipo !== "llamada" && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={nombreLead}
              onChange={(e) => setNombreLead(e.target.value)}
              required={tipo !== "llamada"}
              placeholder="Juan García"
              className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
            />
          </div>

          {/* Email lead */}
          {(tipo === "llamada" || tipo === "videollamada") && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email del lead</label>
              <input
                type="email"
                value={emailLead}
                onChange={(e) => setEmailLead(e.target.value)}
                placeholder="lead@ejemplo.com"
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
              />
            </div>
          )}

          {/* Asesor (todos) */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Asesor</label>
            {asesores.length > 0 ? (
              <select
                value={asesor}
                onChange={(e) => setAsesor(e.target.value)}
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
              >
                <option value="">— Sin asignar —</option>
                {asesores.map((a) => (
                  <option key={a.id} value={a.email}>
                    {a.nombre ?? a.email}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={asesor}
                onChange={(e) => setAsesor(e.target.value)}
                placeholder="Email del asesor"
                className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
              />
            )}
          </div>

          {/* Llamada fields */}
          {tipo === "llamada" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 1234 5678"
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tipo de evento</label>
                <select
                  value={tipoEvento}
                  onChange={(e) => setTipoEvento(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="efectiva_manual">Efectiva (manual)</option>
                  <option value="no_contestada_manual">No contestada (manual)</option>
                  <option value="buzon_manual">Buzón (manual)</option>
                  <option value="numero_invalido_manual">Número inválido (manual)</option>
                </select>
              </div>
            </>
          )}

          {/* Videollamada fields */}
          {tipo === "videollamada" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Categoría / resultado</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej: Cerrada, No_Ofertada..."
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha de reunión</label>
                <input
                  type="datetime-local"
                  value={fechaReunion}
                  onChange={(e) => setFechaReunion(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Facturación</label>
                  <input
                    type="number"
                    value={facturacion}
                    onChange={(e) => setFacturacion(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cash collected</label>
                  <input
                    type="number"
                    value={cashCollected}
                    onChange={(e) => setCashCollected(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40"
                  />
                </div>
              </div>
            </>
          )}

          {/* Chat fields */}
          {tipo === "chat" && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Estado</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-accent-cyan/40"
                >
                  <option value="activo">Activo</option>
                  <option value="seguimiento">Seguimiento</option>
                  <option value="cerrado">Cerrado</option>
                  <option value="no_calificado">No calificado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notas</label>
                <textarea
                  value={notasExtra}
                  onChange={(e) => setNotasExtra(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                  className="w-full rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-accent-cyan/40 resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-3 py-2 rounded-lg bg-surface-600 text-gray-300 text-sm font-medium hover:bg-surface-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:bg-accent-cyan/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
