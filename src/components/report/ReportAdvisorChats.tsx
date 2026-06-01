// AUT-387 — Bloque 3: Asesores Chats
// Tarjetas por asesor con métricas de chat

import { MessageSquare, Clock, AlertTriangle, Info } from 'lucide-react';
import { formatPct, formatMinutes } from '@/lib/format';
import type { ReportAdvisorChatsData, ReportAsesorChats } from '@/types/report';
import AdvisorCard, { type AdvisorSemaforo } from '@/components/report/AdvisorCard';

interface Props {
  data: ReportAdvisorChatsData | null;
}

function speedColor(minutos: number, umbral: number) {
  if (minutos <= umbral) return 'text-accent-green';
  if (minutos <= umbral * 3) return 'text-accent-amber';
  return 'text-accent-red';
}

function respuestaColor(tasa: number) {
  if (tasa >= 0.8) return 'text-accent-green';
  if (tasa >= 0.5) return 'text-accent-amber';
  return 'text-accent-red';
}

function respuestaToSemaforo(tasa: number): AdvisorSemaforo {
  if (tasa >= 0.8) return 'verde';
  if (tasa >= 0.5) return 'amarillo';
  return 'rojo';
}

function ChatsAdvisorCard({
  asesor,
  rank,
  speedUmbral,
}: {
  asesor: ReportAsesorChats;
  rank: number;
  speedUmbral: number;
}) {
  const total =
    asesor.categorias.cerrada +
    asesor.categorias.noCalificada +
    asesor.categorias.enSeguimiento +
    asesor.categorias.sinCategoria;

  const categoriasConDatos: { label: string; count: number; colorClass: string }[] = [
    { label: 'Cerrados', count: asesor.categorias.cerrada, colorClass: 'bg-accent-green' },
    {
      label: 'En seguimiento',
      count: asesor.categorias.enSeguimiento,
      colorClass: 'bg-accent-amber',
    },
    {
      label: 'No calificados',
      count: asesor.categorias.noCalificada,
      colorClass: 'bg-accent-red/70',
    },
    { label: 'Sin categoría', count: asesor.categorias.sinCategoria, colorClass: 'bg-surface-500' },
  ].filter((c) => c.count > 0);

  return (
    <AdvisorCard
      nombre={asesor.nombre}
      channel="chats"
      rank={rank}
      semaforo={respuestaToSemaforo(asesor.tasaRespuesta)}
      metrics={[
        {
          label: 'Chats',
          value: asesor.chats,
          colorClass: 'text-accent-cyan',
        },
        {
          label: 'Leads únicos',
          value: asesor.leadsUnicos,
          colorClass: 'text-accent-blue',
        },
        {
          label: 'Tasa respuesta',
          value: formatPct(asesor.tasaRespuesta),
          colorClass: respuestaColor(asesor.tasaRespuesta),
        },
      ]}
      footer={
        <>
          {asesor.speedToLeadAvgMin !== null && (
            <div className="flex items-center gap-2 rounded-lg bg-surface-600/40 px-3 py-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs text-gray-400">Primera respuesta:</span>
              <span
                className={`text-xs font-semibold ${speedColor(asesor.speedToLeadAvgMin, speedUmbral)}`}
              >
                {formatMinutes(asesor.speedToLeadAvgMin)} — rec. &lt;{formatMinutes(speedUmbral)}
              </span>
              {asesor.speedToLeadAvgMin > speedUmbral * 3 && (
                <AlertTriangle className="w-3 h-3 text-accent-red shrink-0 ml-auto" />
              )}
            </div>
          )}

          {/* Distribución de categorías */}
          {categoriasConDatos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-500 uppercase tracking-tight">
                Resultado de chats
              </p>
              {categoriasConDatos.map(({ label, count, colorClass }) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-surface-600 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">
                      {count} ({Math.round(pct)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      }
    />
  );
}

export default function ReportAdvisorChats({ data }: Props) {
  if (data === null) return null;

  // Sort by tasa respuesta desc
  const sorted = [...data.asesores].sort((a, b) => b.tasaRespuesta - a.tasaRespuesta);

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Asesores · Chats / WhatsApp
          </h3>
        </div>
        <div className="text-xs text-gray-500">
          <span className="text-gray-300">{data.totalChats.toLocaleString('es')}</span> chats
          <span className="text-gray-600 mx-1">·</span>
          Respuesta equipo:{' '}
          <span className={`font-semibold ${respuestaColor(data.tasaRespuestaEquipo)}`}>
            {formatPct(data.tasaRespuestaEquipo)}
          </span>
        </div>
      </div>

      {/* Advertencia fill rate */}
      {data.advertencia !== null && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-900/20 border border-amber-800/40 px-3 py-2">
          <Info className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
          <span className="text-xs text-amber-300">{data.advertencia}</span>
        </div>
      )}

      {/* Tarjetas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((asesor, i) => (
          <ChatsAdvisorCard
            key={asesor.nombre}
            asesor={asesor}
            rank={i}
            speedUmbral={data.speedToLeadUmbral}
          />
        ))}
      </div>

      {/* Sin asesor asignado */}
      {data.sinAsignar !== null && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-600/30 border border-surface-500/40 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0" />
          <span className="text-xs text-gray-400">
            Sin asesor asignado:{' '}
            <span className="font-semibold text-gray-200">
              {data.sinAsignar.chats.toLocaleString('es')} leads
            </span>{' '}
            sin asesor asignado
          </span>
        </div>
      )}
    </section>
  );
}
