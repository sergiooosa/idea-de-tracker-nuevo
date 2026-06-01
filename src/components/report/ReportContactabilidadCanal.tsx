// AUT-493 — Bloque: Desglose por Canal de Contactabilidad
// WhatsApp vs llamada: contestó/no contestó, calificó/no calificó

import { Phone, MessageSquare, TrendingUp, Users } from 'lucide-react';
import type { ReportContactabilidadCanalData, ReportCanalContactabilidad } from '@/types/report';

interface Props {
  data: ReportContactabilidadCanalData | null;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function BarSegment({
  value,
  total,
  colorClass,
  label,
}: {
  value: number;
  total: number;
  colorClass: string;
  label: string;
}) {
  const width = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-24 text-gray-400 shrink-0 text-right">{label}</div>
      <div className="flex-1 bg-surface-700/60 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="w-10 text-right font-semibold text-white">{value.toLocaleString('es')}</div>
      <div className="w-10 text-right text-gray-500">{pct(total > 0 ? value / total : 0)}</div>
    </div>
  );
}

function CanalCard({ canal }: { canal: ReportCanalContactabilidad }) {
  const isLlamadas = canal.canal === 'llamadas';
  const Icon = isLlamadas ? Phone : MessageSquare;
  const accentColor = isLlamadas ? 'text-accent-cyan' : 'text-accent-purple';
  const borderColor = isLlamadas ? 'border-accent-cyan/20' : 'border-accent-purple/20';
  const bgColor = isLlamadas ? 'bg-cyan-900/10' : 'bg-purple-900/10';
  const barContesto = isLlamadas ? 'bg-accent-cyan' : 'bg-accent-purple';
  const barCalifco = isLlamadas ? 'bg-green-500' : 'bg-green-400';
  const canalLabel = isLlamadas ? 'Llamadas' : 'WhatsApp / Chats';

  return (
    <div className={`rounded-xl p-4 border ${borderColor} ${bgColor} space-y-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accentColor} shrink-0`} />
          <span className={`text-sm font-semibold ${accentColor}`}>{canalLabel}</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-bold text-white text-sm">{canal.total.toLocaleString('es')}</span>
          {' '}total
        </div>
      </div>

      {/* KPI pills */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-700/60 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tasa respuesta</p>
          <p className={`text-xl font-bold ${accentColor}`}>{pct(canal.tasaRespuesta)}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Tasa calificación</p>
          <p className="text-xl font-bold text-accent-green">{pct(canal.tasaCalificacion)}</p>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        <BarSegment
          value={canal.contesto}
          total={canal.total}
          colorClass={barContesto}
          label="Contestó"
        />
        <BarSegment
          value={canal.noContesto}
          total={canal.total}
          colorClass="bg-red-500/70"
          label="No contestó"
        />
        <BarSegment
          value={canal.califico}
          total={canal.total}
          colorClass={barCalifco}
          label="Calificó"
        />
        <BarSegment
          value={canal.noCalifco}
          total={canal.total}
          colorClass="bg-amber-500/70"
          label="No calificó"
        />
      </div>
    </div>
  );
}

export default function ReportContactabilidadCanal({ data }: Props) {
  if (data === null) return null;
  if (data.canales.length === 0) return null;

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent-cyan shrink-0" />
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Contactabilidad por Canal
          </h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3.5 h-3.5" />
          <span>{data.totalGeneral.toLocaleString('es')} contactos totales</span>
        </div>
      </div>

      {/* Global summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/30 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total contactos</p>
          <p className="text-xl font-bold text-white">{data.totalGeneral.toLocaleString('es')}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/30 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Contestaron</p>
          <p className="text-xl font-bold text-accent-cyan">{data.contestoGeneral.toLocaleString('es')}</p>
          <p className="text-[10px] text-accent-cyan/70">{pct(data.tasaRespuestaGlobal)}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/30 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Calificaron</p>
          <p className="text-xl font-bold text-accent-green">{data.calificoGeneral.toLocaleString('es')}</p>
          <p className="text-[10px] text-accent-green/70">{pct(data.tasaCalificacionGlobal)}</p>
        </div>
        <div className="rounded-lg bg-surface-700/60 border border-surface-500/30 px-3 py-2 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Canales activos</p>
          <p className="text-xl font-bold text-accent-amber">{data.canales.length}</p>
        </div>
      </div>

      {/* Canal cards */}
      <div className={`grid gap-4 ${data.canales.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {data.canales.map((canal) => (
          <CanalCard key={canal.canal} canal={canal} />
        ))}
      </div>
    </section>
  );
}
