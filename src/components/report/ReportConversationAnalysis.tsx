// AUT-387 — Bloque 7: Análisis de Conversaciones
// Objeciones, patrones frecuentes, hallazgos, alertas

import { MessageCircle, TrendingDown, TrendingUp, Minus, AlertTriangle, Lightbulb, Database } from 'lucide-react';
import type { ReportConversationAnalysisData, ReportHallazgo } from '@/types/report';

interface Props {
  data: ReportConversationAnalysisData | null;
}

function HallazgoRow({ hallazgo }: { hallazgo: ReportHallazgo }) {
  const config = {
    positivo: {
      icon: TrendingUp,
      colorClass: 'text-accent-green',
      bg: 'bg-green-900/10 border-green-800/20',
    },
    negativo: {
      icon: TrendingDown,
      colorClass: 'text-accent-red',
      bg: 'bg-red-900/10 border-red-800/20',
    },
    neutro: {
      icon: Minus,
      colorClass: 'text-gray-400',
      bg: 'bg-surface-700/40 border-surface-500/30',
    },
  }[hallazgo.tipo];

  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border ${config.bg} px-3 py-2`}>
      <Icon className={`w-3.5 h-3.5 ${config.colorClass} shrink-0 mt-0.5`} />
      <span className="text-xs text-gray-200 leading-relaxed">{hallazgo.texto}</span>
    </div>
  );
}

export default function ReportConversationAnalysis({ data }: Props) {
  if (data === null) return null;

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-accent-purple shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Análisis de Conversaciones
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          <span className="text-gray-300 font-semibold">{data.totalAnalizadas.toLocaleString('es')}</span> conv. analizadas
        </span>
      </div>

      {/* Fuentes de datos */}
      {data.fuentesDatos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.fuentesDatos.map((fuente) => (
            <div
              key={fuente}
              className="flex items-center gap-1 rounded-full bg-surface-700/60 border border-surface-500/40 px-2.5 py-1 text-[10px] text-gray-400"
            >
              <Database className="w-2.5 h-2.5 text-gray-500" />
              {fuente}
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="space-y-1.5">
          {data.alertas.map((alerta) => (
            <div
              key={alerta}
              className="flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-accent-red shrink-0 mt-0.5" />
              <span className="text-xs text-red-300">{alerta}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top objeciones */}
        {data.topObjeciones.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Top objeciones</p>
            <div className="space-y-2">
              {data.topObjeciones.map((obj, i) => (
                <div key={obj.nombre} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4 shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs text-gray-300 truncate">{obj.nombre}</span>
                      <span className="text-xs text-gray-500 shrink-0">
                        {obj.count} ({Math.round(obj.pct * 100)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-600 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent-purple/70"
                        style={{ width: `${obj.pct * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patrones frecuentes */}
        {data.patronesFrecuentes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Patrones detectados</p>
            <div className="space-y-1.5">
              {data.patronesFrecuentes.map((patron) => (
                <div
                  key={patron}
                  className="flex items-start gap-2 rounded-lg bg-surface-700/40 border border-surface-500/30 px-3 py-2"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-300 leading-relaxed">{patron}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hallazgos */}
      {data.hallazgos.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">Hallazgos del período</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {data.hallazgos.map((h, i) => (
              <HallazgoRow key={i} hallazgo={h} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
