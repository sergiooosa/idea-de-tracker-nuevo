// AUT-387 — Bloque 5: Funnel de Leads
// Árbol/embudo visual con números y porcentajes

import { Users } from 'lucide-react';
import type { ReportLeadFunnelData, ReportFunnelStage } from '@/types/report';

interface Props {
  data: ReportLeadFunnelData | null;
}

const stageColorMap: Record<ReportFunnelStage['color'], { bar: string; bg: string; text: string; border: string }> = {
  cyan: {
    bar: 'bg-accent-cyan',
    bg: 'bg-accent-cyan/10',
    text: 'text-accent-cyan',
    border: 'border-accent-cyan/30',
  },
  green: {
    bar: 'bg-accent-green',
    bg: 'bg-accent-green/10',
    text: 'text-accent-green',
    border: 'border-accent-green/30',
  },
  amber: {
    bar: 'bg-accent-amber',
    bg: 'bg-accent-amber/10',
    text: 'text-accent-amber',
    border: 'border-accent-amber/30',
  },
  red: {
    bar: 'bg-accent-red',
    bg: 'bg-accent-red/10',
    text: 'text-accent-red',
    border: 'border-accent-red/30',
  },
  purple: {
    bar: 'bg-accent-purple',
    bg: 'bg-accent-purple/10',
    text: 'text-accent-purple',
    border: 'border-accent-purple/30',
  },
  blue: {
    bar: 'bg-accent-blue',
    bg: 'bg-accent-blue/10',
    text: 'text-accent-blue',
    border: 'border-accent-blue/30',
  },
};

function FunnelStageRow({ stage, totalLeads }: { stage: ReportFunnelStage; totalLeads: number }) {
  const colors = stageColorMap[stage.color];
  const widthPct = totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3 space-y-2`}>
      {/* Label + count */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-200">{stage.label}</span>
          {stage.sublabel && (
            <span className="text-xs text-gray-500 ml-1.5">({stage.sublabel})</span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className={`text-xl font-bold ${colors.text}`}>{stage.count.toLocaleString('es')}</span>
          <span className="text-xs text-gray-500">{Math.round(stage.pct * 100)}%</span>
        </div>
      </div>

      {/* Barra */}
      <div className="h-2 rounded-full bg-surface-600/60 overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
}

export default function ReportLeadFunnel({ data }: Props) {
  if (data === null) return null;

  // Find the widest stage for funnel visual proportions
  const maxCount = Math.max(...data.stages.map((s) => s.count), 1);

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent-blue shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Funnel de Leads
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          <span className="text-gray-300 font-semibold">{data.totalLeads.toLocaleString('es')}</span> leads totales
        </span>
      </div>

      {/* Funnel visual */}
      <div className="space-y-2">
        {data.stages.map((stage, i) => {
          // Funnel shape: each stage is narrower than the previous
          const funnelWidth = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 20) : 100;
          return (
            <div key={stage.id} className="flex flex-col items-center gap-0">
              <div style={{ width: `${funnelWidth}%`, minWidth: '260px', maxWidth: '100%' }}>
                <FunnelStageRow stage={stage} totalLeads={data.totalLeads} />
              </div>
              {/* Connector arrow */}
              {i < data.stages.length - 1 && (
                <div className="text-gray-600 text-xs leading-none my-0.5">▼</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Análisis narrativo */}
      {data.analisis !== null && (
        <div className="rounded-lg bg-surface-700/40 border border-surface-500/30 px-4 py-3">
          <p className="text-xs text-gray-400 leading-relaxed">{data.analisis}</p>
        </div>
      )}
    </section>
  );
}
