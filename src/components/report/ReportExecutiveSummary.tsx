// AUT-387 — Bloque 0: Resumen Ejecutivo
// Texto generado por IA + alertas críticas. Sin tablas.

import { AlertTriangle, Sparkles, User, Megaphone, Users } from 'lucide-react';
import type { ReportExecutiveSummaryData } from '@/types/report';

interface Props {
  data: ReportExecutiveSummaryData | null;
}

export default function ReportExecutiveSummary({ data }: Props) {
  if (data === null) return null;

  const contactoPct = data.totalLeads > 0
    ? Math.round((data.contactados / data.totalLeads) * 100)
    : 0;
  const sinContactoPct = 100 - contactoPct;

  const higieneColor =
    sinContactoPct >= 40
      ? 'text-accent-red'
      : sinContactoPct >= 20
      ? 'text-accent-amber'
      : 'text-accent-green';

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent-cyan shrink-0" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Resumen Ejecutivo
        </h3>
      </div>

      {/* Alertas críticas */}
      {data.alertasCriticas.length > 0 && (
        <div className="space-y-1.5">
          {data.alertasCriticas.map((alerta) => (
            <div
              key={alerta}
              className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/40 px-3 py-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-accent-red shrink-0 mt-0.5" />
              <span className="text-xs text-red-300">{alerta}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats de cobertura */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Total leads</p>
          <p className="text-xl font-bold text-accent-blue">{data.totalLeads.toLocaleString('es')}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Contactados</p>
          <p className="text-xl font-bold text-accent-green">{contactoPct}%</p>
          <p className="text-[10px] text-gray-500">{data.contactados.toLocaleString('es')}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Sin contacto</p>
          <p className={`text-xl font-bold ${higieneColor}`}>{sinContactoPct}%</p>
          <p className="text-[10px] text-gray-500">{data.sinContacto.toLocaleString('es')}</p>
        </div>
      </div>

      {/* Texto IA */}
      {data.texto && (
        <div className="rounded-lg bg-surface-700/40 border border-surface-500/30 px-4 py-3">
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{data.texto}</p>
        </div>
      )}

      {/* Mejor asesor / mejor anuncio */}
      {(data.mejorAsesor !== null || data.mejorAnuncio !== null) && (
        <div className="flex flex-wrap gap-2">
          {data.mejorAsesor !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-surface-600/80 border border-surface-500 px-3 py-1.5 text-xs text-gray-200">
              <User className="w-3 h-3 text-accent-cyan shrink-0" />
              <span className="text-gray-400">Mejor asesor:</span>
              <span className="font-semibold text-white">{data.mejorAsesor}</span>
            </div>
          )}
          {data.mejorAnuncio !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-surface-600/80 border border-surface-500 px-3 py-1.5 text-xs text-gray-200">
              <Megaphone className="w-3 h-3 text-accent-amber shrink-0" />
              <span className="text-gray-400">Mejor anuncio:</span>
              <span className="font-semibold text-white">{data.mejorAnuncio}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
