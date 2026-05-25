// AUT-387 — Bloque 2: Asesores Llamadas
// Ranking + tarjetas por asesor con métricas de llamadas

import { Phone, AlertTriangle, Clock } from 'lucide-react';
import { formatPct, formatMinutes } from '@/lib/format';
import type { ReportAdvisorCallsData, ReportAsesorCalls } from '@/types/report';
import AdvisorCard from '@/components/report/AdvisorCard';

interface Props {
  data: ReportAdvisorCallsData | null;
}

// Semáforo tasa de contacto (para tabla resumen)
function contactoColor(tasa: number) {
  if (tasa >= 0.6) return 'text-accent-green';
  if (tasa >= 0.4) return 'text-accent-amber';
  return 'text-accent-red';
}

// Semáforo score (para tabla resumen)
function scoreTextColor(score: number) {
  if (score >= 70) return 'text-accent-green';
  if (score >= 40) return 'text-accent-amber';
  return 'text-accent-red';
}

// Semáforo speed-to-lead
function speedColor(minutos: number, umbral: number) {
  if (minutos <= umbral) return 'text-accent-green';
  if (minutos <= umbral * 2) return 'text-accent-amber';
  return 'text-accent-red';
}

function CallsAdvisorCard({
  asesor,
  rank,
  speedUmbral,
}: {
  asesor: ReportAsesorCalls;
  rank: number;
  speedUmbral: number;
}) {
  return (
    <AdvisorCard
      nombre={asesor.nombre}
      channel="llamadas"
      rank={rank}
      score={asesor.score}
      metrics={[
        {
          label: 'Llamadas',
          value: asesor.llamadas,
          colorClass: 'text-accent-cyan',
          sublabel: `${asesor.leads} leads`,
        },
        {
          label: 'Contacto',
          value: formatPct(asesor.tasaContacto),
          colorClass: contactoColor(asesor.tasaContacto),
          sublabel: `${asesor.contestadas} contest.`,
        },
        {
          label: 'Agendadas',
          value: asesor.agendadas,
          colorClass: 'text-accent-purple',
          sublabel: formatPct(asesor.tasaAgendamiento),
        },
      ]}
      footer={
        <>
          {asesor.speedToLeadAvgMin !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-600/60 px-3 py-2">
              <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-400">Tiempo al lead:</span>
              <span
                className={`text-xs font-semibold ${speedColor(asesor.speedToLeadAvgMin, speedUmbral)}`}
              >
                {formatMinutes(asesor.speedToLeadAvgMin)} — rec. &lt;{formatMinutes(speedUmbral)}
              </span>
              {asesor.speedToLeadAvgMin > speedUmbral * 2 && (
                <AlertTriangle className="w-3.5 h-3.5 text-accent-red shrink-0 ml-auto" />
              )}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Phone className="w-3 h-3 shrink-0" />
            <span>
              Intentos promedio por lead:{' '}
              <span className="text-gray-300 font-medium">
                {asesor.intentosPromedio.toFixed(1)}
              </span>
            </span>
          </div>
        </>
      }
    />
  );
}

export default function ReportAdvisorCalls({ data }: Props) {
  if (data === null) return null;

  // Sort by score descending (already sorted from API, but defensive)
  const sorted = [...data.asesores].sort((a, b) => b.score - a.score);

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Asesores · Llamadas
          </h3>
        </div>
        <div className="text-xs text-gray-500">
          Equipo:{' '}
          <span className={`font-semibold ${contactoColor(data.tasaContactoEquipo)}`}>
            {formatPct(data.tasaContactoEquipo)}
          </span>{' '}
          contacto
          <span className="text-gray-600 mx-1">·</span>
          <span className="text-gray-300">{data.totalLlamadas.toLocaleString('es')}</span> llamadas totales
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="overflow-x-auto rounded-lg border border-surface-500/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-700/60 text-left text-gray-400">
              {['#', 'Asesor', 'Leads', 'Llamadas', 'Contacto%', 'Agend.', 'Agend.%', 'Speed-to-lead', 'Score'].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr
                key={a.nombre}
                className="border-t border-surface-500/40 hover:bg-surface-700/40 transition-colors"
              >
                <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                <td className="px-3 py-2 text-white font-medium whitespace-nowrap">{a.nombre}</td>
                <td className="px-3 py-2 text-accent-blue">{a.leads}</td>
                <td className="px-3 py-2 text-accent-cyan">{a.llamadas}</td>
                <td className={`px-3 py-2 font-medium ${contactoColor(a.tasaContacto)}`}>
                  {formatPct(a.tasaContacto)}
                </td>
                <td className="px-3 py-2 text-accent-purple">{a.agendadas}</td>
                <td className="px-3 py-2 text-gray-300">{formatPct(a.tasaAgendamiento)}</td>
                <td className="px-3 py-2 text-gray-300">
                  {a.speedToLeadAvgMin !== null ? formatMinutes(a.speedToLeadAvgMin) : '—'}
                </td>
                <td className={`px-3 py-2 font-semibold ${scoreTextColor(a.score)}`}>{a.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tarjetas individuales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((asesor, i) => (
          <CallsAdvisorCard
            key={asesor.nombre}
            asesor={asesor}
            rank={i}
            speedUmbral={data.speedToLeadUmbral}
          />
        ))}
      </div>
    </section>
  );
}
