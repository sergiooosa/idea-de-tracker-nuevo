"use client";

import { useState, useMemo } from 'react';
import { Trophy, AlertTriangle, Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { ReportV2RankingAsesores, ReportV2AsesorTabla } from '@/types/report-v2';
import ReportSection from './ReportSection';

type SortKey = keyof Pick<
  ReportV2AsesorTabla,
  'leads' | 'seguimiento' | 'llamadas' | 'contactoPct' | 'spdLead' | 'intProm' | 'dosIntPct' | 'citas' | 'asistieron' | 'score'
>;

const COLUMNS: Array<{ key: SortKey; label: string; align: 'right' }> = [
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'seguimiento', label: 'Seg.', align: 'right' },
  { key: 'llamadas', label: 'Llam.', align: 'right' },
  { key: 'contactoPct', label: 'Contact%', align: 'right' },
  { key: 'spdLead', label: 'Spd', align: 'right' },
  { key: 'intProm', label: 'Int.', align: 'right' },
  { key: 'dosIntPct', label: '2+Int%', align: 'right' },
  { key: 'citas', label: 'Citas', align: 'right' },
  { key: 'asistieron', label: 'Asist.', align: 'right' },
  { key: 'score', label: 'Score', align: 'right' },
];

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

function SortIcon({ active, asc }: { active: boolean; asc: boolean }) {
  if (!active) return null;
  return asc
    ? <ChevronUp className="w-3 h-3 inline ml-0.5" />
    : <ChevronDown className="w-3 h-3 inline ml-0.5" />;
}

function sortValue(row: ReportV2AsesorTabla, key: SortKey): number {
  const v = row[key];
  if (v === null) return -Infinity;
  return v;
}

export default function SectionRankingAsesores({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data.tabla].sort((a, b) => {
      const diff = sortValue(b, sortKey) - sortValue(a, sortKey);
      return sortAsc ? -diff : diff;
    });
  }, [data, sortKey, sortAsc]);

  if (!data) return null;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <ReportSection
      icon={Trophy}
      title="Ranking de Asesores"
      helpTitulo="Ranking de Asesores"
      helpContenido="Clasificación de asesores con score compuesto (0-100) basado en volumen, tasa de contacto, velocidad de respuesta, seguimiento y citas. Haz clic en cualquier columna para ordenar por esa métrica."
    >
      {/* Destacados */}
      {data.destacados.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.destacados.map((d) => (
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
      {sorted.length > 0 && (
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1E2B40]">
                <th className="text-left px-3 py-2.5 text-[#5F7288] font-medium">Asesor</th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="text-right px-2 py-2.5 font-medium cursor-pointer select-none transition-colors hover:text-[#E7EFF8] text-[#5F7288]"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    <SortIcon active={sortKey === col.key} asc={sortAsc} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
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
