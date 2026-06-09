"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Users,
  Phone,
  TrendingUp,
  Activity,
  Loader2,
  RefreshCw,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";

interface AsesorEnVivo {
  closerMail: string;
  nombreCloser: string | null;
  idSesion: string;
  nombreSesion: string;
  leadActual: string | null;
  lockDesde: string;
}

interface MetricasAsesor {
  closerMail: string;
  nombreCloser: string | null;
  trabajadosHoy: number;
  contactados: number;
  tasaContacto: number;
  duracionPromedio: number;
  resumen: Array<{ resultado: string; cantidad: number }>;
}

interface TableroData {
  asesoresActivos: AsesorEnVivo[];
  metricasPorAsesor: MetricasAsesor[];
  sesionesActivas: number;
  totalTrabajadosHoy: number;
  totalContactados: number;
  tasaContactoGlobal: number;
}

const POLL_MS = 10_000;

const RESULTADO_LABELS: Record<string, string> = {
  contesto: "Contestó",
  no_contesto: "No contestó",
  buzon: "Buzón",
  seguimiento: "Seguimiento",
  interesado: "Interesado",
  programado: "Programado",
  calificada: "Calificada",
  no_calificada: "No calificada",
  cerrada: "Cerrada",
  no_interesado: "No interesado",
};

const RESULTADO_COLORS: Record<string, string> = {
  contesto: "bg-green-500/20 text-green-400",
  no_contesto: "bg-red-500/20 text-red-400",
  buzon: "bg-orange-500/20 text-orange-400",
  seguimiento: "bg-blue-500/20 text-blue-400",
  interesado: "bg-emerald-500/20 text-emerald-400",
  programado: "bg-cyan-500/20 text-cyan-400",
  calificada: "bg-purple-500/20 text-purple-400",
  no_calificada: "bg-amber-500/20 text-amber-400",
  cerrada: "bg-teal-500/20 text-teal-400",
  no_interesado: "bg-gray-500/20 text-gray-400",
};

function formatDuration(seg: number): string {
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function tiempoDesde(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const m = Math.floor(diff / 60);
  return `${m}m`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-surface-800/80 border border-surface-500/60 p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function TableroEnfoque() {
  const [data, setData] = useState<TableroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/enfoque/tablero");
      if (!res.ok) throw new Error();
      const json = (await res.json()) as TableroData;
      if (mountedRef.current) {
        setData(json);
        setError(false);
      }
    } catch {
      if (mountedRef.current) setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();
    pollRef.current = setInterval(fetchData, POLL_MS);
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <p>No se pudo cargar el tablero</p>
        <button
          type="button"
          onClick={() => { setLoading(true); void fetchData(); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-700 hover:bg-surface-600 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-glow-cyan">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Tablero de operación</h1>
            <p className="text-xs text-gray-400">Actividad en vivo del modo enfoque</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Actualización cada 10s
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Asesores activos"
          value={data.asesoresActivos.length}
          icon={Users}
          accent="bg-accent-cyan/20 text-accent-cyan"
        />
        <StatCard
          label="Leads trabajados hoy"
          value={data.totalTrabajadosHoy}
          icon={Phone}
          accent="bg-accent-purple/20 text-accent-purple"
        />
        <StatCard
          label="Contactados"
          value={data.totalContactados}
          icon={TrendingUp}
          accent="bg-green-500/20 text-green-400"
        />
        <StatCard
          label="Tasa de contacto"
          value={`${data.tasaContactoGlobal}%`}
          icon={BarChart3}
          accent="bg-accent-amber/20 text-accent-amber"
        />
      </div>

      {/* Asesores en vivo */}
      <div className="rounded-2xl bg-surface-800/80 border border-surface-500/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-500/60 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent-cyan" />
          <h2 className="text-sm font-semibold text-white">En modo enfoque ahora</h2>
          {data.asesoresActivos.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{data.asesoresActivos.length} asesor{data.asesoresActivos.length !== 1 ? "es" : ""}</span>
          )}
        </div>
        {data.asesoresActivos.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            Ningún asesor está en modo enfoque en este momento
          </div>
        ) : (
          <div className="divide-y divide-surface-500/40">
            {data.asesoresActivos.map((a) => (
              <div key={`${a.closerMail}-${a.idSesion}`} className="px-5 py-3 flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-accent-cyan/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-accent-cyan">
                    {(a.nombreCloser ?? a.closerMail).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {a.nombreCloser ?? a.closerMail}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {a.nombreSesion} — {a.leadActual ? `trabajando: ${a.leadActual}` : "seleccionando lead..."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {tiempoDesde(a.lockDesde)}
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Métricas por asesor */}
      <div className="rounded-2xl bg-surface-800/80 border border-surface-500/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-500/60 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-accent-purple" />
          <h2 className="text-sm font-semibold text-white">Rendimiento por asesor — hoy</h2>
        </div>
        {data.metricasPorAsesor.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-500 text-sm">
            Sin actividad registrada hoy
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-surface-500/40">
                  <th className="text-left px-5 py-3 font-medium">Asesor</th>
                  <th className="text-center px-3 py-3 font-medium">Trabajados</th>
                  <th className="text-center px-3 py-3 font-medium">Contactados</th>
                  <th className="text-center px-3 py-3 font-medium">Tasa</th>
                  <th className="text-center px-3 py-3 font-medium">Duración prom.</th>
                  <th className="text-left px-5 py-3 font-medium">Desglose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-500/30">
                {data.metricasPorAsesor.map((m) => {
                  const isActive = data.asesoresActivos.some((a) => a.closerMail === m.closerMail);
                  return (
                    <tr key={m.closerMail} className="hover:bg-surface-700/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          {isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />}
                          <div>
                            <p className="font-medium text-white truncate max-w-[180px]">
                              {m.nombreCloser ?? m.closerMail}
                            </p>
                            {m.nombreCloser && (
                              <p className="text-xs text-gray-500 truncate max-w-[180px]">{m.closerMail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3 font-semibold text-white">{m.trabajadosHoy}</td>
                      <td className="text-center px-3 py-3 font-semibold text-green-400">{m.contactados}</td>
                      <td className="text-center px-3 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                          m.tasaContacto >= 50
                            ? "bg-green-500/20 text-green-400"
                            : m.tasaContacto >= 25
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                        }`}>
                          {m.tasaContacto}%
                        </span>
                      </td>
                      <td className="text-center px-3 py-3 text-gray-300">{formatDuration(m.duracionPromedio)}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {m.resumen
                            .sort((a, b) => b.cantidad - a.cantidad)
                            .slice(0, 5)
                            .map((r) => (
                            <span
                              key={r.resultado}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${RESULTADO_COLORS[r.resultado] ?? "bg-gray-500/20 text-gray-400"}`}
                            >
                              {RESULTADO_LABELS[r.resultado] ?? r.resultado}
                              <span className="font-bold">{r.cantidad}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
