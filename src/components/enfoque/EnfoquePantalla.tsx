"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, ChevronRight, Loader2, PhoneCall, Timer } from "lucide-react";

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

type ModoLead = "idle" | "en_llamada";

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

const POLL_INTERVAL_MS = 4000;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

  const [modo, setModo] = useState<ModoLead>("idle");
  const [timerSeg, setTimerSeg] = useState(0);
  const [autoAvanceMsg, setAutoAvanceMsg] = useState<string | null>(null);

  const estadoSnapshotRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const procesandoRef = useRef(false);
  const notaRef = useRef("");

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    notaRef.current = nota;
  }, [nota]);

  const limpiarIntervalos = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetLeadState = useCallback(() => {
    setModo("idle");
    setTimerSeg(0);
    setNota("");
    setResultadoSeleccionado(null);
    setAutoAvanceMsg(null);
    estadoSnapshotRef.current = null;
    procesandoRef.current = false;
    limpiarIntervalos();
  }, [limpiarIntervalos]);

  const cargarSesion = useCallback(async () => {
    try {
      const res = await fetch("/api/enfoque/sesion-activa");
      const data = await res.json();
      if (!data.sesion) {
        setSinSesion(true);
        setLoading(false);
        return null;
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

  useEffect(() => {
    return () => limpiarIntervalos();
  }, [limpiarIntervalos]);

  const avanzarConResultado = useCallback(async (resultado: string, esAutoAvance: boolean) => {
    if (procesandoRef.current) return;
    if (!lead || !sesion) return;
    procesandoRef.current = true;
    setGuardando(true);
    limpiarIntervalos();

    if (esAutoAvance) {
      setAutoAvanceMsg(`Auto-detectado: ${RESULTADOS.find((r) => r.valor === resultado)?.label ?? resultado}`);
    }

    try {
      const res = await fetch("/api/enfoque/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesion: sesion.id,
          id_registro: lead.id_registro,
          resultado,
          nota: notaRef.current.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (esAutoAvance) {
          await new Promise((r) => setTimeout(r, 1200));
        }
        if (!mountedRef.current) return;
        resetLeadState();
        setLead(data.lead ?? null);
        setCompletados(data.completados ?? 0);
        if (!data.lead) setSinLeads(true);
      }
    } catch {
      // user can retry
    } finally {
      if (mountedRef.current) {
        procesandoRef.current = false;
        setGuardando(false);
      }
    }
  }, [lead, sesion, limpiarIntervalos, resetLeadState]);

  const iniciarLlamada = useCallback(async () => {
    if (!lead || !sesion) return;

    setGuardando(true);
    try {
      const res = await fetch("/api/enfoque/tomar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_sesion: sesion.id }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (data.error === "lock_race") {
          await cargarSiguiente(sesion.id);
        }
        return;
      }

      const snapshotRes = await fetch(
        `/api/enfoque/estado-lead?id_registro=${lead.id_registro}`,
      );
      const snapshotData = await snapshotRes.json();
      estadoSnapshotRef.current = snapshotData.estado_canonico ?? null;

      setModo("en_llamada");
      setTimerSeg(0);

      timerRef.current = setInterval(() => {
        if (mountedRef.current) {
          setTimerSeg((prev) => prev + 1);
        }
      }, 1000);

      pollingRef.current = setInterval(async () => {
        if (!mountedRef.current) return;
        try {
          const pollRes = await fetch(
            `/api/enfoque/estado-lead?id_registro=${lead.id_registro}`,
          );
          const pollData = await pollRes.json();
          const nuevoCanonico: string | null = pollData.estado_canonico ?? null;
          const snapshotActual = estadoSnapshotRef.current;

          if (nuevoCanonico !== null && nuevoCanonico !== snapshotActual) {
            avanzarConResultado(nuevoCanonico, true);
          }
        } catch {
          // poll failed, retry on next tick
        }
      }, POLL_INTERVAL_MS);
    } catch {
      // network error
    } finally {
      if (mountedRef.current) {
        setGuardando(false);
      }
    }
  }, [lead, sesion, cargarSiguiente, avanzarConResultado]);

  const registrarManual = useCallback(async () => {
    if (!resultadoSeleccionado) return;
    await avanzarConResultado(resultadoSeleccionado, false);
  }, [resultadoSeleccionado, avanzarConResultado]);

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
          <div
            className={`w-2 h-2 rounded-full ${
              modo === "en_llamada" ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"
            }`}
          />
          <span className="text-sm text-gray-400 font-medium">{sesion?.nombre ?? "Enfoque"}</span>
          {modo === "en_llamada" && (
            <span className="flex items-center gap-1 text-sm text-red-400 font-mono ml-2">
              <Timer className="w-3.5 h-3.5" />
              {formatTimer(timerSeg)}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {completados} completado{completados !== 1 ? "s" : ""}
        </div>
      </header>

      {/* Auto-avance notification */}
      {autoAvanceMsg && (
        <div className="px-4 py-2 bg-emerald-900/50 border-b border-emerald-800 text-center">
          <p className="text-sm text-emerald-300 font-medium">{autoAvanceMsg} — avanzando...</p>
        </div>
      )}

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

          {/* Botón "Estoy llamando" — visible solo en idle */}
          {modo === "idle" && (
            <button
              type="button"
              onClick={iniciarLlamada}
              disabled={guardando}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-lg font-bold transition-colors disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <PhoneCall className="w-6 h-6" />
                  Estoy llamando
                </>
              )}
            </button>
          )}

          {/* En llamada: escucha activa indicator */}
          {modo === "en_llamada" && (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/40 border border-red-800">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-300 font-medium">
                  En llamada — escuchando cambios...
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-800" />

          {/* Botonera de resultados — siempre visible como fallback */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">
              {modo === "en_llamada"
                ? "Marcar resultado manual (o espera auto-detección)"
                : "Resultado de la llamada"}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RESULTADOS.map((r) => (
                <button
                  key={r.valor}
                  type="button"
                  onClick={() => setResultadoSeleccionado(r.valor)}
                  disabled={guardando}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    resultadoSeleccionado === r.valor
                      ? `${r.color} text-white ring-2 ring-white ring-offset-2 ring-offset-black`
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  } disabled:opacity-40`}
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
              disabled={guardando}
              className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500 disabled:opacity-40"
            />
          </div>

          {/* Botón siguiente — registrar manual */}
          <button
            type="button"
            onClick={registrarManual}
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
