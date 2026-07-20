// AUT-387 — Bloque 4: Asesores Videollamadas
// Tarjetas por asesor con métricas de video (citas, no-shows, cierres)

import { Video, AlertTriangle } from 'lucide-react';
import { formatPct } from '@/lib/format';
import type { ReportAdvisorVideocallsData, ReportAsesorVideocalls } from '@/types/report';
import AdvisorCard, { type AdvisorSemaforo } from '@/components/report/AdvisorCard';

interface Props {
  data: ReportAdvisorVideocallsData | null;
}

// Semáforo tasa de cierre
function cierreColor(tasa: number) {
  if (tasa >= 0.35) return 'text-accent-green';
  if (tasa >= 0.2) return 'text-accent-amber';
  return 'text-accent-red';
}

function cierreToSemaforo(tasa: number): AdvisorSemaforo {
  if (tasa >= 0.35) return 'verde';
  if (tasa >= 0.2) return 'amarillo';
  return 'rojo';
}

// Semáforo no-shows
function noShowColor(tasa: number) {
  if (tasa <= 0.1) return 'text-accent-green';
  if (tasa <= 0.25) return 'text-accent-amber';
  return 'text-accent-red';
}

function VideoAdvisorCard({
  asesor,
  rank,
}: {
  asesor: ReportAsesorVideocalls;
  rank: number;
}) {
  const altaNoShow = asesor.tasaNoShow > 0.25;

  const citasBar = asesor.citas > 0 ? (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-500 uppercase tracking-tight">
        {asesor.citas} citas agendadas
      </p>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {asesor.cerradas > 0 && (
          <div
            className="bg-accent-green h-full rounded-sm"
            style={{ width: `${(asesor.cerradas / asesor.citas) * 100}%` }}
            title={`Cerradas: ${asesor.cerradas}`}
          />
        )}
        {asesor.asistidas - asesor.cerradas > 0 && (
          <div
            className="bg-accent-blue/60 h-full rounded-sm"
            style={{ width: `${((asesor.asistidas - asesor.cerradas) / asesor.citas) * 100}%` }}
            title={`Asistidas sin cerrar: ${asesor.asistidas - asesor.cerradas}`}
          />
        )}
        {asesor.noShows > 0 && (
          <div
            className={`h-full rounded-sm ${altaNoShow ? 'bg-accent-red' : 'bg-accent-amber/60'}`}
            style={{ width: `${(asesor.noShows / asesor.citas) * 100}%` }}
            title={`No-shows: ${asesor.noShows}`}
          />
        )}
        {asesor.canceladas > 0 && (
          <div
            className="bg-surface-500 h-full rounded-sm"
            style={{ width: `${(asesor.canceladas / asesor.citas) * 100}%` }}
            title={`Canceladas: ${asesor.canceladas}`}
          />
        )}
      </div>
      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {asesor.cerradas > 0 && (
          <span className="text-[10px] text-accent-green">✓ {asesor.cerradas} cerradas</span>
        )}
        {asesor.asistidas - asesor.cerradas > 0 && (
          <span className="text-[10px] text-accent-blue/70">
            ● {asesor.asistidas - asesor.cerradas} asist. s/cierre
          </span>
        )}
        {asesor.noShows > 0 && (
          <span className={`text-[10px] ${altaNoShow ? 'text-accent-red' : 'text-accent-amber'}`}>
            ✗ {asesor.noShows} no-show
          </span>
        )}
        {asesor.canceladas > 0 && (
          <span className="text-[10px] text-gray-500">— {asesor.canceladas} cancel.</span>
        )}
      </div>
    </div>
  ) : null;

  return (
    <AdvisorCard
      nombre={asesor.nombre}
      channel="videollamadas"
      rank={rank}
      semaforo={cierreToSemaforo(asesor.tasaCierre)}
      metrics={[
        {
          label: 'Tasa cierre',
          value: formatPct(asesor.tasaCierre),
          colorClass: cierreColor(asesor.tasaCierre),
          sublabel: `${asesor.cerradas}/${asesor.asistidas} asist.`,
        },
        {
          label: 'No-shows',
          value: formatPct(asesor.tasaNoShow),
          colorClass: noShowColor(asesor.tasaNoShow),
          sublabel: `${asesor.noShows} de ${asesor.citas}`,
        },
      ]}
      footer={
        <>
          {altaNoShow && (
            <div className="flex items-center gap-1 text-[10px] text-accent-red">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              No-shows altos — revisar seguimiento
            </div>
          )}
          {citasBar}
        </>
      }
    />
  );
}

export default function ReportAdvisorVideocalls({ data }: Props) {
  if (data === null) return null;
  // AUT-484 — Ocultar sección si no hay videollamadas en el período
  if (data.totalCitas === 0) return null;

  // Sort by cierres desc
  const sorted = [...data.asesores].sort((a, b) => b.cerradas - a.cerradas);

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-accent-purple shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Asesores · Citas
          </h3>
        </div>
        <div className="text-xs text-gray-500">
          <span className="text-gray-300">{data.totalCitas}</span> citas
          <span className="text-gray-600 mx-1">·</span>
          Cierre equipo:{' '}
          <span className={`font-semibold ${cierreColor(data.tasaCierreEquipo)}`}>
            {formatPct(data.tasaCierreEquipo)}
          </span>
          <span className="text-gray-600 mx-1">·</span>
          No-shows:{' '}
          <span
            className={`font-semibold ${noShowColor(data.totalNoShows / Math.max(data.totalCitas, 1))}`}
          >
            {data.totalNoShows}
          </span>
        </div>
      </div>

      {/* Resumen equipo */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Citas', value: data.totalCitas, colorClass: 'text-accent-blue' },
          { label: 'Asistidas', value: data.totalAsistidas, colorClass: 'text-accent-cyan' },
          {
            label: 'No-shows',
            value: data.totalNoShows,
            colorClass: noShowColor(data.totalNoShows / Math.max(data.totalCitas, 1)),
          },
          { label: 'Cierres', value: data.totalCerradas, colorClass: 'text-accent-green' },
        ].map(({ label, value, colorClass }) => (
          <div
            key={label}
            className="rounded-lg bg-surface-700/60 border border-surface-500/40 p-3 text-center"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-tight mb-1">{label}</p>
            <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((asesor, i) => (
          <VideoAdvisorCard key={asesor.nombre} asesor={asesor} rank={i} />
        ))}
      </div>
    </section>
  );
}
