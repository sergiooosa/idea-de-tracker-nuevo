"use client";

import { Trophy, AlertTriangle, Star } from 'lucide-react';
import type { ReportV2RankingAsesores } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2RankingAsesores | null;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80
    ? 'bg-accent-green/20 text-accent-green border-accent-green/30'
    : score >= 60
      ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/30'
      : 'bg-accent-red/20 text-accent-red border-accent-red/30';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
      {score}
    </span>
  );
}

export default function SectionRankingAsesores({ data }: Props) {
  if (!data) return null;

  return (
    <ReportSection
      icon={Trophy}
      title="Ranking de Asesores"
      helpTitulo="Ranking de Asesores"
      helpContenido="Clasificación de asesores con score compuesto (0-100) basado en volumen, tasa de contacto, velocidad de respuesta, seguimiento y citas. Incluye destacados, tabla detallada y alertas de bajo rendimiento."
    >
      {/* Destacados */}
      {data.destacados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.destacados.map((d, i) => (
            <div
              key={`${d.nombre}-${d.razon}`}
              className="rounded-lg bg-accent-cyan/5 border border-accent-cyan/20 p-3 text-center"
            >
              <Star className="w-3.5 h-3.5 text-accent-cyan mx-auto mb-1" />
              <p className="text-[10px] text-[#5F7288] mb-0.5">{d.razon}</p>
              <p className="text-xs font-semibold text-[#E7EFF8]">{d.nombre}</p>
              <p className="text-sm font-bold text-accent-cyan mt-0.5">{d.valor}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {data.tabla.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1E2B40]">
                <th className="text-left px-3 py-2.5 text-[#5F7288] font-medium">Asesor</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Leads</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Seg.</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Llam.</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Contact%</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Spd</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Int.</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">2+Int%</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Citas</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Asist.</th>
                <th className="text-right px-2 py-2.5 text-[#5F7288] font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.tabla.map((a) => (
                <tr key={a.nombre} className="border-b border-[#1E2B40]/40 last:border-0 hover:bg-[#152238]/50">
                  <td className="px-3 py-2.5 text-[#E7EFF8] font-medium">{a.nombre}</td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.leads}</td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.seguimiento}</td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.llamadas}</td>
                  <td className="px-2 py-2.5 text-right text-[#E7EFF8]">
                    {Math.round(a.contactoPct * 100)}%
                  </td>
                  <td className={`px-2 py-2.5 text-right ${
                    a.spdLead !== null && a.spdLead <= 15 ? 'text-accent-green' : 'text-accent-amber'
                  }`}>
                    {a.spdLead !== null ? `${a.spdLead}m` : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.intProm.toFixed(1)}</td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">
                    {Math.round(a.dosIntPct * 100)}%
                  </td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.citas}</td>
                  <td className="px-2 py-2.5 text-right text-[#8DA2B8]">{a.asistieron}</td>
                  <td className="px-2 py-2.5 text-right">
                    <ScoreBadge score={a.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="space-y-1.5">
          {data.alertas.map((a) => {
            const isDanger = a.nivel === 'danger';
            return (
              <div
                key={`${a.nombre}-${a.alerta}`}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  isDanger
                    ? 'bg-accent-red/10 border border-accent-red/20 text-accent-red'
                    : 'bg-accent-amber/10 border border-accent-amber/20 text-accent-amber'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  <span className="font-semibold">{a.nombre}:</span> {a.alerta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ReportSection>
  );
}
