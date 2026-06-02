"use client";

import { useState, useEffect, useCallback } from "react";
import { Phone, MessageCircle, ChevronRight, Loader2 } from "lucide-react";

interface Lead {
  id_registro: number;
  nombre_lead: string | null;
  mail_lead: string | null;
  phone: string | null;
  estado: string | null;
  intentos_contacto: number;
  creativo_origen: string | null;
}

interface SesionActiva {
  id: string;
  nombre: string;
  modo: string;
  orden: string;
}

const RESULTADOS = [
  { valor: "contesto", label: "Contestó", color: "bg-green-600 hover:bg-green-500" },
  { valor: "no_contesto", label: "No contestó", color: "bg-red-600 hover:bg-red-500" },
  { valor: "buzon", label: "Buzón", color: "bg-orange-600 hover:bg-orange-500" },
  { valor: "seguimiento", label: "Seguimiento", color: "bg-blue-600 hover:bg-blue-500" },
  { valor: "interesado", label: "Interesado", color: "bg-emerald-600 hover:bg-emerald-500" },
  { valor: "programado", label: "Programado", color: "bg-cyan-600 hover:bg-cyan-500" },
  { valor: "calificada", label: "Calificada", color: "bg-purple-600 hover:bg-purple-500" },
  { valor: "no_calificada", label: "No calificada", color: "bg-amber-700 hover:bg-amber-600" },
  { valor: "cerrada", label: "Cerrada", color: "bg-teal-600 hover:bg-teal-500" },
  { valor: "no_interesado", label: "No interesado", color: "bg-gray-600 hover:bg-gray-500" },
] as const;

export default function EnfoquePantalla() {
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [completados, setCompletados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [nota, setNota] = useState("");
  const [resultadoSeleccionado, setResultadoSeleccionado] = useState<string | null>(null);
  const [sinSesion, setSinSesion] = useState(false);
  const [sinLeads, setSinLeads] = useState(false);

  const cargarSesion = useCallback(async () => {
    try {
      const res = await fetch("/api/enfoque/sesion-activa");
      const data = await res.json();
      if (!data.sesion) {
        setSinSesion(true);
        setLoading(false);
        return;
      }
      setSesion(data.sesion);
      return data.sesion as SesionActiva;
    } catch {
      setSinSesion(true);
      setLoading(false);
      return null;
    }
  }, []);

  const cargarSiguiente = useCallback(async (idSesion: string) => {
    try {
      const res = await fetch(`/api/enfoque/siguiente?sesion=${encodeURIComponent(idSesion)}`);
      const data = await res.json();
      setLead(data.lead ?? null);
      setCompletados(data.completados ?? 0);
      if (!data.lead) setSinLeads(true);
    } catch {
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await cargarSesion();
      if (s) await cargarSiguiente(s.id);
    })();
  }, [cargarSesion, cargarSiguiente]);

  const registrarResultado = async () => {
    if (!resultadoSeleccionado || !lead || !sesion) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/enfoque/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesion: sesion.id,
          id_registro: lead.id_registro,
          resultado: resultadoSeleccionado,
          nota: nota.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLead(data.lead ?? null);
        setCompletados(data.completados ?? 0);
        setNota("");
        setResultadoSeleccionado(null);
        if (!data.lead) setSinLeads(true);
      }
    } catch {
      // silently fail, user can retry
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (sinSesion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Sin sesión activa</h1>
          <p className="text-gray-400">
            No hay una sesión de enfoque activa para esta cuenta. Pide a tu administrador que cree una desde el panel.
          </p>
        </div>
      </div>
    );
  }

  if (sinLeads) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h1>
          <p className="text-gray-400 mb-2">
            Completaste {completados} lead{completados !== 1 ? "s" : ""} en esta sesión.
          </p>
          <p className="text-gray-500 text-sm">No hay más leads pendientes por gestionar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-400 font-medium">{sesion?.nombre ?? "Enfoque"}</span>
        </div>
        <div className="text-sm text-gray-500">
          {completados} completado{completados !== 1 ? "s" : ""} hoy
        </div>
      </header>

      {/* Lead card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div className="w-full max-w-lg space-y-6">
          {/* Nombre */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              {lead?.nombre_lead ?? "Sin nombre"}
            </h1>
            <p className="text-gray-500 text-sm">
              {lead?.creativo_origen ? `Origen: ${lead.creativo_origen}` : ""}
            </p>
          </div>

          {/* Teléfono grande + botón llamar */}
          {lead?.phone && (
            <div className="text-center">
              <a
                href={`tel:${lead.phone}`}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-2xl font-bold transition-colors"
              >
                <Phone className="w-7 h-7" />
                {lead.phone}
              </a>
            </div>
          )}

          {/* Contexto mínimo */}
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
            <span>
              Estado: <span className="text-white font-medium">{lead?.estado ?? "—"}</span>
            </span>
            <span>
              Intentos: <span className="text-white font-medium">{lead?.intentos_contacto ?? 0}</span>
            </span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Botonera de resultados */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">
              Resultado de la llamada
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r.valor}
                  type="button"
                  onClick={() => setResultadoSeleccionado(r.valor)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    resultadoSeleccionado === r.valor
                      ? `${r.color} text-white ring-2 ring-white ring-offset-2 ring-offset-black`
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Nota opcional */}
          <div>
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota opcional..."
              rows={2}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500"
            />
          </div>

          {/* Botón siguiente */}
          <button
            type="button"
            onClick={registrarResultado}
            disabled={!resultadoSeleccionado || guardando}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-black text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            {guardando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
