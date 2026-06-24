"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Phone, Loader2, Timer, BarChart3, TrendingUp, Maximize, AlertTriangle, ChevronDown } from "lucide-react";
import { useUserFilter } from "@/contexts/UserFilterContext";

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
  poll_intervalo_seg?: number;
}

interface MetricasEnfoque {
  trabajadosHoy: number;
  contactados: number;
  tasaContacto: number;
  resumen: Array<{ resultado: string; cantidad: number }>;
  duracionPromedio: number;
}

type EstadoFlujo = "idle" | "marcando" | "llamando" | "fallback";

const RESULTADOS_FALLBACK = [
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

const RESULTADO_LABELS: Record<string, string> = Object.fromEntries(
  RESULTADOS_FALLBACK.map((r) => [r.valor, r.label]),
);

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function EnfoquePantalla() {
  const { session } = useUserFilter();
  const esKiosko = session?.tipoUsuario === "enfoque";
  const [fullscreenActivo, setFullscreenActivo] = useState(false);
  const [mostrarPromptFS, setMostrarPromptFS] = useState(false);

  useEffect(() => {
    if (!esKiosko) return;
    const isFS = !!document.fullscreenElement;
    setFullscreenActivo(isFS);
    if (!isFS) setMostrarPromptFS(true);

    const handleChange = () => {
      const fs = !!document.fullscreenElement;
      setFullscreenActivo(fs);
      if (!fs) setMostrarPromptFS(true);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [esKiosko]);

  const entrarFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setMostrarPromptFS(false);
      setFullscreenActivo(true);
    } catch {
      setMostrarPromptFS(false);
    }
  }, []);

  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [completados, setCompletados] = useState(0);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [sinSesion, setSinSesion] = useState(false);
  const [sinLeads, setSinLeads] = useState(false);

  const [estadoFlujo, setEstadoFlujo] = useState<EstadoFlujo>("idle");
  const [timerSeg, setTimerSeg] = useState(0);
  const [autoAvanceMsg, setAutoAvanceMsg] = useState<string | null>(null);
  const [metricas, setMetricas] = useState<MetricasEnfoque | null>(null);
  const [mostrarFallback, setMostrarFallback] = useState(false);
  const [resultadoFallback, setResultadoFallback] = useState<string | null>(null);
  const [notaFallback, setNotaFallback] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const procesandoRef = useRef(false);
  const sesionRef = useRef<SesionActiva | null>(null);
  const leadRef = useRef<Lead | null>(null);
  const timerSegRef = useRef(0);
  const notaFallbackRef = useRef("");

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { sesionRef.current = sesion; }, [sesion]);
  useEffect(() => { leadRef.current = lead; }, [lead]);
  useEffect(() => { notaFallbackRef.current = notaFallback; }, [notaFallback]);

  const limpiarIntervalos = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const resetLeadState = useCallback(() => {
    setEstadoFlujo("idle");
    setTimerSeg(0);
    timerSegRef.current = 0;
    setAutoAvanceMsg(null);
    setMostrarFallback(false);
    setResultadoFallback(null);
    setNotaFallback("");
    procesandoRef.current = false;
    limpiarIntervalos();
  }, [limpiarIntervalos]);

  const cargarMetricas = useCallback(async (idSesion: string) => {
    try {
      const res = await fetch(`/api/enfoque/metricas?sesion=${encodeURIComponent(idSesion)}`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setMetricas(data);
      }
    } catch { /* non-critical */ }
  }, []);

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

  const iniciarPolling = useCallback((leadActual: Lead, idSesion: string) => {
    setEstadoFlujo("llamando");
    setTimerSeg(0);
    timerSegRef.current = 0;

    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        setTimerSeg((prev) => {
          timerSegRef.current = prev + 1;
          return prev + 1;
        });
      }
    }, 1000);

    const pollMs = Math.max(2000, (sesionRef.current?.poll_intervalo_seg ?? 4) * 1000);

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current || procesandoRef.current) return;
      try {
        const pollRes = await fetch(
          `/api/enfoque/estado-lead?id_registro=${leadActual.id_registro}&id_sesion=${encodeURIComponent(idSesion)}`,
        );
        const pollData = await pollRes.json();

        if (pollData.resuelto && pollData.estado === "resuelto") {
          procesandoRef.current = true;
          limpiarIntervalos();
          const label = RESULTADO_LABELS[pollData.resultado_canonico] ?? pollData.resultado_canonico;
          if (mountedRef.current) {
            setAutoAvanceMsg(`Auto-detectado: ${label}`);
            setGuardando(true);
          }
          await new Promise((r) => setTimeout(r, 1200));
          if (!mountedRef.current) return;

          resetLeadState();
          setLead(pollData.siguiente_lead ?? null);
          setCompletados((prev) => prev + 1);
          setGuardando(false);
          if (!pollData.siguiente_lead) {
            setSinLeads(true);
            cargarMetricas(idSesion);
          }
        }
      } catch { /* poll failed, retry */ }
    }, pollMs);
  }, [limpiarIntervalos, resetLeadState, cargarMetricas]);

  const cargarSiguiente = useCallback(async (idSesion: string) => {
    try {
      const res = await fetch(`/api/enfoque/siguiente?sesion=${encodeURIComponent(idSesion)}`);
      const data = await res.json();
      setLead(data.lead ?? null);
      setCompletados(data.completados ?? 0);
      if (!data.lead) {
        setSinLeads(true);
        cargarMetricas(idSesion);
      } else if (data.reconexion) {
        iniciarPolling(data.lead, idSesion);
      }
    } catch {
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [cargarMetricas, iniciarPolling]);

  useEffect(() => {
    (async () => {
      const s = await cargarSesion();
      if (s) await cargarSiguiente(s.id);
    })();
  }, [cargarSesion, cargarSiguiente]);

  useEffect(() => {
    return () => limpiarIntervalos();
  }, [limpiarIntervalos]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const s = sesionRef.current;
      const l = leadRef.current;
      if (!s || !l) return;
      const payload = new Blob(
        [JSON.stringify({ id_sesion: s.id, id_registro: l.id_registro })],
        { type: "application/json" },
      );
      navigator.sendBeacon("/api/enfoque/liberar", payload);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const marcarYLlamar = useCallback(async () => {
    if (!lead || !sesion || procesandoRef.current) return;
    procesandoRef.current = true;
    setEstadoFlujo("marcando");
    setGuardando(true);

    try {
      const res = await fetch("/api/enfoque/marcar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesion: sesion.id,
          id_registro: lead.id_registro,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        if (data.error === "lock_race") {
          resetLeadState();
          await cargarSiguiente(sesion.id);
        } else {
          procesandoRef.current = false;
          setEstadoFlujo("idle");
        }
        return;
      }

      if (lead.phone) {
        window.location.href = `tel:${lead.phone}`;
      }

      procesandoRef.current = false;
      iniciarPolling(lead, sesion.id);
    } catch {
      procesandoRef.current = false;
      setEstadoFlujo("idle");
    } finally {
      if (mountedRef.current) setGuardando(false);
    }
  }, [lead, sesion, resetLeadState, cargarSiguiente, iniciarPolling]);

  const registrarFallback = useCallback(async () => {
    if (!resultadoFallback || !leadRef.current || !sesionRef.current) return;
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    setGuardando(true);

    const currentLead = leadRef.current;
    const currentSesion = sesionRef.current;
    const currentTimer = timerSegRef.current;

    try {
      const res = await fetch("/api/enfoque/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_sesion: currentSesion.id,
          id_registro: currentLead.id_registro,
          resultado: resultadoFallback,
          nota: notaFallbackRef.current.trim() || undefined,
          duracion_seg: currentTimer > 0 ? currentTimer : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (!mountedRef.current) return;
        resetLeadState();
        setLead(data.lead ?? null);
        setCompletados(data.completados ?? 0);
        if (!data.lead) {
          setSinLeads(true);
          cargarMetricas(currentSesion.id);
        }
      }
    } catch { /* user can retry */ }
    finally {
      if (mountedRef.current) {
        procesandoRef.current = false;
        setGuardando(false);
      }
    }
  }, [resultadoFallback, resetLeadState, cargarMetricas]);

  // --- Render ---

  if (esKiosko && mostrarPromptFS && !fullscreenActivo) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <Maximize className="w-16 h-16 text-accent-purple mx-auto" />
          <h1 className="text-2xl font-bold text-white">Modo Enfoque</h1>
          <p className="text-gray-400">
            Toca para entrar en pantalla completa y comenzar a trabajar.
          </p>
          <button
            type="button"
            onClick={entrarFullscreen}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-accent-purple hover:bg-accent-purple/80 text-white text-lg font-bold transition-colors"
          >
            <Maximize className="w-6 h-6" />
            Entrar en modo kiosko
          </button>
        </div>
      </div>
    );
  }

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

  if (sinLeads && completados === 0 && (!metricas || metricas.trabajadosHoy === 0)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Phone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">No tienes leads asignados</h1>
          <p className="text-gray-400">
            No hay leads disponibles en esta sesión para tu usuario.
            Consulta con tu administrador para verificar los filtros de la sesión o la asignación de leads.
          </p>
        </div>
      </div>
    );
  }

  if (sinLeads) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">¡No hay más leads — buen trabajo!</h1>
          <p className="text-gray-400 mb-6">
            Completaste {completados} lead{completados !== 1 ? "s" : ""} en esta sesión.
          </p>

          {metricas && metricas.trabajadosHoy > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Resumen del día</h2>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{metricas.trabajadosHoy}</p>
                  <p className="text-xs text-gray-500">Trabajados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{metricas.contactados}</p>
                  <p className="text-xs text-gray-500">Contactados</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <p className="text-2xl font-bold text-blue-400">{metricas.tasaContacto}%</p>
                  </div>
                  <p className="text-xs text-gray-500">Tasa contacto</p>
                </div>
              </div>

              {metricas.duracionPromedio > 0 && (
                <p className="text-sm text-gray-400 text-center">
                  Duración promedio: {formatTimer(metricas.duracionPromedio)}
                </p>
              )}

              {metricas.resumen.length > 0 && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {metricas.resumen.map((r) => (
                      <span
                        key={r.resultado}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 text-xs text-gray-300"
                      >
                        {RESULTADO_LABELS[r.resultado] ?? r.resultado}
                        <span className="font-bold text-white">{r.cantidad}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const esLlamando = estadoFlujo === "llamando";
  const esMarcando = estadoFlujo === "marcando";

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              esLlamando ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"
            }`}
          />
          <span className="text-sm text-gray-400 font-medium">{sesion?.nombre ?? "Enfoque"}</span>
          {esLlamando && (
            <span className="flex items-center gap-1 text-sm text-red-400 font-mono ml-2">
              <Timer className="w-3.5 h-3.5" />
              {formatTimer(timerSeg)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            <span className="text-white font-bold">{completados}</span> hoy
          </span>
        </div>
      </header>

      {/* Auto-avance notification */}
      {autoAvanceMsg && (
        <div className="px-4 py-3 bg-emerald-900/50 border-b border-emerald-800 text-center">
          <p className="text-sm text-emerald-300 font-medium">{autoAvanceMsg} — avanzando...</p>
        </div>
      )}

      {/* Lead card — single-click area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-8">
          {/* Order number / lead info */}
          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              Intento {(lead?.intentos_contacto ?? 0) + 1}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              {lead?.nombre_lead ?? "Sin nombre"}
            </h1>
            {lead?.creativo_origen && (
              <p className="text-gray-500 text-sm">{lead.creativo_origen}</p>
            )}
          </div>

          {/* Phone — the main CTA (tap to call + mark) */}
          {estadoFlujo === "idle" && lead?.phone && (
            <button
              type="button"
              onClick={marcarYLlamar}
              disabled={guardando}
              className="w-full flex items-center justify-center gap-4 px-8 py-6 rounded-3xl bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white text-3xl md:text-4xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
            >
              {guardando ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Phone className="w-8 h-8" />
                  {lead.phone}
                </>
              )}
            </button>
          )}

          {/* No phone — show fallback panel directly so closer is never stuck */}
          {estadoFlujo === "idle" && lead && !lead.phone && !mostrarFallback && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-900/40 border border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-300 font-medium">Sin teléfono registrado</span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFallback(true)}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 rounded-3xl bg-gray-700 hover:bg-gray-600 active:scale-[0.98] text-white text-xl font-bold transition-all shadow-lg"
              >
                Clasificar manual / Saltar
              </button>
            </div>
          )}

          {/* Marking state — brief transition */}
          {esMarcando && (
            <div className="w-full flex items-center justify-center gap-3 px-8 py-6 rounded-3xl bg-gray-800 text-gray-300 text-xl">
              <Loader2 className="w-6 h-6 animate-spin" />
              Conectando...
            </div>
          )}

          {/* In-call / waiting state */}
          {esLlamando && (
            <div className="space-y-6">
              {/* Phone display (non-interactive while calling) */}
              <div className="w-full flex items-center justify-center gap-4 px-8 py-6 rounded-3xl bg-gray-900 border-2 border-red-500/30 text-white text-3xl md:text-4xl font-bold">
                <Phone className="w-8 h-8 text-red-400" />
                {lead?.phone ?? "—"}
              </div>

              {/* Calling indicator */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-red-900/40 border border-red-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm text-red-300 font-medium">
                    Esperando resultado automático...
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  El sistema detectará el resultado de la llamada
                </p>
              </div>

              {/* Estado actual */}
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <span>
                  Estado: <span className="text-gray-300 font-medium">{lead?.estado ?? "—"}</span>
                </span>
                <span>
                  Timer: <span className="text-red-400 font-mono font-medium">{formatTimer(timerSeg)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Idle state — show context */}
          {estadoFlujo === "idle" && (
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span>
                Estado: <span className="text-gray-300 font-medium">{lead?.estado ?? "—"}</span>
              </span>
              <span>
                Intentos: <span className="text-gray-300 font-medium">{lead?.intentos_contacto ?? 0}</span>
              </span>
            </div>
          )}

          {/* F6 Safety net — discreet, only in "llamando" state */}
          {esLlamando && !mostrarFallback && (
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setMostrarFallback(true)}
                className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                No se detectó — marcar manual
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* F6 Fallback panel — manual classification */}
          {mostrarFallback && (
            <div className="space-y-4 pt-2 border-t border-gray-800/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider text-center">
                Clasificación manual
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RESULTADOS_FALLBACK.map((r) => (
                  <button
                    key={r.valor}
                    type="button"
                    onClick={() => setResultadoFallback(r.valor)}
                    disabled={guardando}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      resultadoFallback === r.valor
                        ? `${r.color} text-white ring-2 ring-white ring-offset-2 ring-offset-black`
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    } disabled:opacity-40`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <textarea
                value={notaFallback}
                onChange={(e) => setNotaFallback(e.target.value)}
                placeholder="Nota opcional..."
                rows={2}
                disabled={guardando}
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-gray-500 disabled:opacity-40"
              />

              <button
                type="button"
                onClick={registrarFallback}
                disabled={!resultadoFallback || guardando}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white text-black text-base font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
              >
                {guardando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Registrar y siguiente"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
