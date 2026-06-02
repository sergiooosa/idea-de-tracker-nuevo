"use client";

// AUT-487 — Reporte Comercial Narrativo
// Genera un resumen ejecutivo en lenguaje natural usando GPT-4o-mini.
// Incluye métricas clave del período y opción de regenerar.

import { useState, useCallback } from "react";
import { FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface RankingAsesor {
  nombre: string;
  totalChats: number;
  totalLlamadas: number;
}

interface TopObjecion {
  objecion: string;
  categoria: string;
  count: number;
}

interface ReporteNarrativoData {
  periodo: string;
  from: string;
  to: string;
  totalChats: number;
  totalLlamadas: number;
  contactadosPorChat: number;
  contactadosPorLlamada: number;
  sinContacto: number;
  categorias: Record<string, number>;
  topObjeciones: TopObjecion[];
  rankingAsesores: RankingAsesor[];
  narrativa: string;
  generadoAt: string;
  desdeCaché: boolean;
}

type Periodo = "7d" | "30d";

const PERIODO_LABELS: Record<Periodo, string> = {
  "7d": "7 días",
  "30d": "30 días",
};

export default function ReportNarrativoEjecutivo() {
  const [periodo, setPeriodo] = useState<Periodo>("30d");
  const [data, setData] = useState<ReporteNarrativoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNarrativo = useCallback(async (p: Periodo, regenerar = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ periodo: p });
      if (regenerar) qs.set("regenerar", "1");
      const res = await fetch(`/api/data/reporte-narrativo?${qs.toString()}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const json = (await res.json()) as ReporteNarrativoData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerar = () => {
    void fetchNarrativo(periodo);
  };

  const handleRegerar = () => {
    void fetchNarrativo(periodo, true);
  };

  const handlePeriodoChange = (p: Periodo) => {
    setPeriodo(p);
    setData(null);
    setError(null);
  };

  const totalContactados = (data?.contactadosPorChat ?? 0) + (data?.contactadosPorLlamada ?? 0);
  const totalActividad = (data?.totalChats ?? 0) + (data?.totalLlamadas ?? 0);
  const tasaContacto = totalActividad > 0 ? Math.round((totalContactados / totalActividad) * 100) : 0;

  const topCategorias = data
    ? Object.entries(data.categorias)
        .filter(([k]) => k !== "sin_categoria" && k !== "null")
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Reporte Ejecutivo Narrativo
          </h3>
        </div>

        {/* Selector de período */}
        <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500 text-xs">
          {(["7d", "30d"] as Periodo[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodoChange(p)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                periodo === p
                  ? "bg-accent-cyan text-black"
                  : "text-gray-300 hover:text-white hover:bg-surface-600"
              }`}
            >
              {PERIODO_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Estado inicial — mostrar botón de generar */}
      {!data && !loading && !error && (
        <div className="flex flex-col items-center gap-4 py-6">
          <p className="text-sm text-gray-400 text-center max-w-xs">
            Genera un resumen comercial en lenguaje natural con los datos de los últimos{" "}
            <span className="text-white font-medium">{PERIODO_LABELS[periodo]}</span>.
          </p>
          <button
            type="button"
            onClick={handleGenerar}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-glow-cyan transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Generar Reporte Ejecutivo
          </button>
        </div>
      )}

      {/* Cargando */}
      {loading && (
        <div className="flex items-center gap-3 py-6 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 text-accent-cyan animate-spin shrink-0" />
          Analizando datos y generando narrativa con IA...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-300">
          {error}
          <button
            type="button"
            onClick={handleGenerar}
            className="ml-3 underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Datos cargados */}
      {data && !loading && (
        <>
          {/* Métricas clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.totalChats > 0 && (
              <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Chats</p>
                <p className="text-xl font-bold text-accent-blue">{data.totalChats.toLocaleString("es")}</p>
              </div>
            )}
            {data.totalLlamadas > 0 && (
              <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Llamadas</p>
                <p className="text-xl font-bold text-accent-blue">{data.totalLlamadas.toLocaleString("es")}</p>
              </div>
            )}
            <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Contactados</p>
              <p className="text-xl font-bold text-accent-green">{tasaContacto}%</p>
              <p className="text-[10px] text-gray-500">{totalContactados.toLocaleString("es")}</p>
            </div>
            {data.sinContacto > 0 && (
              <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sin contacto</p>
                <p className={`text-xl font-bold ${data.sinContacto > data.totalChats * 0.4 ? "text-accent-red" : data.sinContacto > data.totalChats * 0.2 ? "text-accent-amber" : "text-accent-green"}`}>
                  {data.sinContacto.toLocaleString("es")}
                </p>
              </div>
            )}
          </div>

          {/* Categorías */}
          {topCategorias.length > 0 && (
            <div className="rounded-lg bg-surface-700/40 border border-surface-500/30 px-4 py-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Distribución de chats</p>
              <div className="flex flex-wrap gap-2">
                {topCategorias.map(([cat, count]) => (
                  <span
                    key={cat}
                    className="rounded-full bg-surface-600/80 border border-surface-500 px-2.5 py-1 text-xs text-gray-200"
                  >
                    <span className="text-gray-400">{cat.replace(/_/g, " ")}: </span>
                    <span className="font-semibold">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ranking de asesores */}
          {data.rankingAsesores.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Ranking de asesores</p>
              <div className="space-y-1">
                {data.rankingAsesores.slice(0, 5).map((asesor) => {
                  const total = asesor.totalChats + asesor.totalLlamadas;
                  const max = (data.rankingAsesores[0]?.totalChats ?? 0) + (data.rankingAsesores[0]?.totalLlamadas ?? 0);
                  const pct = max > 0 ? (total / max) * 100 : 0;
                  return (
                    <div key={asesor.nombre} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-300 min-w-[120px] truncate">{asesor.nombre}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-surface-600">
                        <div
                          className="h-full rounded-full bg-accent-cyan"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-400 text-[10px] min-w-[40px] text-right">
                        {total.toLocaleString("es")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Narrativa IA */}
          {data.narrativa && (
            <div className="rounded-lg bg-surface-700/40 border border-accent-cyan/20 px-4 py-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-accent-cyan shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-accent-cyan">Análisis IA</span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{data.narrativa}</p>
            </div>
          )}

          {/* Footer — timestamp + botón regenerar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1">
              {data.desdeCaché && (
                <span className="text-[10px] text-gray-500">
                  Desde caché ·{" "}
                </span>
              )}
              <span className="text-[10px] text-gray-500">
                Generado: {new Date(data.generadoAt).toLocaleString("es", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRegerar}
              className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerar
            </button>
          </div>
        </>
      )}
    </section>
  );
}
