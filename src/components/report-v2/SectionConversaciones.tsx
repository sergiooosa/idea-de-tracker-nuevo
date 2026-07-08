"use client";

import { MessageCircle } from 'lucide-react';
import type { ReportV2ConversacionesCanal, ReportV2ConversacionDistribucion } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  llamadas: ReportV2ConversacionesCanal | null;
  chats: ReportV2ConversacionesCanal | null;
  video: ReportV2ConversacionesCanal | null;
}

const DIMENSION_LABELS: Record<string, string> = {
  recepcionTono: 'Recepción / Tono',
  entendiaContexto: '¿Entendía el contexto?',
  aceptacion: 'Aceptación',
  engagement: 'Engagement',
  calidadCierre: 'Calidad de cierre',
};

const DIST_COLORS: Record<string, string> = {
  Positivo: 'bg-accent-green',
  Alto: 'bg-accent-green',
  Alta: 'bg-accent-green',
  Bueno: 'bg-accent-green',
  Sí: 'bg-accent-green',
  Neutral: 'bg-accent-amber',
  Medio: 'bg-accent-amber',
  Media: 'bg-accent-amber',
  Regular: 'bg-accent-amber',
  Parcial: 'bg-accent-amber',
  Negativo: 'bg-accent-red',
  Bajo: 'bg-accent-red',
  Baja: 'bg-accent-red',
  Malo: 'bg-accent-red',
  No: 'bg-accent-red',
};

function DistBar({ items }: { items: ReportV2ConversacionDistribucion[] }) {
  return (
    <div className="flex rounded-full overflow-hidden h-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`${DIST_COLORS[item.label] ?? 'bg-[#5F7288]'} transition-all`}
          style={{ width: `${item.pct * 100}%` }}
          title={`${item.label}: ${Math.round(item.pct * 100)}%`}
        />
      ))}
    </div>
  );
}

function DistLegend({ items }: { items: ReportV2ConversacionDistribucion[] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1 text-[10px] text-[#8DA2B8]">
          <span className={`w-2 h-2 rounded-full ${DIST_COLORS[item.label] ?? 'bg-[#5F7288]'}`} />
          {item.label}: {Math.round(item.pct * 100)}%
        </span>
      ))}
    </div>
  );
}

function CanalBlock({ data }: { data: ReportV2ConversacionesCanal }) {
  const canalLabel = data.canal === 'llamadas'
    ? 'Llamadas'
    : data.canal === 'chats'
      ? 'Chats'
      : 'Videollamadas';

  const dimensions: [string, ReportV2ConversacionDistribucion[]][] = [
    ['recepcionTono', data.recepcionTono],
    ['entendiaContexto', data.entendiaContexto],
    ['aceptacion', data.aceptacion],
    ['engagement', data.engagement],
    ['calidadCierre', data.calidadCierre],
  ];

  return (
    <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40]/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#E7EFF8]">{canalLabel}</p>
        <span className="text-[10px] text-[#5F7288]">
          n = {data.totalAnalizadas}
        </span>
      </div>

      <div className="space-y-3">
        {dimensions.map(([key, items]) => (
          <div key={key} className="space-y-1.5">
            <p className="text-[10px] text-[#5F7288]">{DIMENSION_LABELS[key] ?? key}</p>
            <DistBar items={items} />
            <DistLegend items={items} />
          </div>
        ))}
      </div>

      {data.narrativa && (
        <div className="rounded-lg bg-[#152238] border border-[#1E2B40] px-4 py-3">
          <p className="text-xs text-[#8DA2B8] leading-relaxed">{data.narrativa}</p>
        </div>
      )}
    </div>
  );
}

export default function SectionConversaciones({ llamadas, chats, video }: Props) {
  if (!llamadas && !chats && !video) return null;

  return (
    <ReportSection
      icon={MessageCircle}
      title="Análisis de Conversaciones por Canal"
      helpTitulo="Análisis de Conversaciones"
      helpContenido="Evaluación IA de las conversaciones en cada canal: tono de recepción, comprensión del contexto, nivel de aceptación, engagement del lead y calidad de cierre del asesor. Las barras muestran la distribución porcentual."
    >
      <div className="space-y-4">
        {llamadas && <CanalBlock data={llamadas} />}
        {chats && <CanalBlock data={chats} />}
        {video && <CanalBlock data={video} />}
      </div>
    </ReportSection>
  );
}
