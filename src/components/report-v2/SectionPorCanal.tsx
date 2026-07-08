"use client";

import { Phone, MessageSquare, Video } from 'lucide-react';
import type { ReportV2CanalLlamadas, ReportV2CanalChats, ReportV2CanalVideo } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  llamadas: ReportV2CanalLlamadas | null;
  chats: ReportV2CanalChats | null;
  video: ReportV2CanalVideo | null;
}

function Stat({ label, value, suffix, color }: {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1">{label}</p>
      <p className={`text-lg font-bold ${color ?? 'text-[#E7EFF8]'}`}>
        {typeof value === 'number' ? value.toLocaleString('es') : value}
        {suffix && <span className="text-xs font-normal text-[#5F7288] ml-0.5">{suffix}</span>}
      </p>
    </div>
  );
}

function LlamadasBlock({ data }: { data: ReportV2CanalLlamadas }) {
  return (
    <ReportSection
      icon={Phone}
      title="Canal: Llamadas"
      helpTitulo="Desglose de Llamadas"
      helpContenido="Métricas detalladas del canal de llamadas: total realizadas, tasa de contacto, velocidad de respuesta (speed-to-lead), duración promedio de llamadas contestadas y mejor franja horaria."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Realizadas" value={data.realizadas} color="text-accent-cyan" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Leads llamados" value={data.leadsLlamados} color="text-accent-blue" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Contestaron" value={data.contestaronPorLead} color="text-accent-green" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Calificados" value={data.calificados} color="text-accent-green" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="No calificados" value={data.noCalificados} color="text-accent-amber" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Intentos prom." value={data.intentosProm.toFixed(1)} />
        </div>
        {data.speedToLeadProm !== null && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
            <Stat
              label="Speed-to-lead"
              value={`${data.speedToLeadProm}`}
              suffix="min"
              color={data.speedToLeadProm <= 15 ? 'text-accent-green' : 'text-accent-amber'}
            />
          </div>
        )}
        {data.duracionPromContestadas !== null && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
            <Stat label="Duración prom." value={`${data.duracionPromContestadas}`} suffix="min" />
          </div>
        )}
        {data.mejorFranja && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
            <Stat label="Mejor franja" value={data.mejorFranja} color="text-accent-cyan" />
          </div>
        )}
      </div>
    </ReportSection>
  );
}

function ChatsBlock({ data }: { data: ReportV2CanalChats }) {
  return (
    <ReportSection
      icon={MessageSquare}
      title="Canal: Chats"
      helpTitulo="Desglose de Chats"
      helpContenido="Métricas del canal de chats: conversaciones activas, mensajes enviados, tasa de respuesta, tiempo de primera respuesta, interacciones con bot y escalamientos a humano."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Conversaciones" value={data.conversaciones} color="text-accent-cyan" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Mensajes" value={data.mensajes} color="text-accent-blue" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Respondieron" value={data.respondieron} color="text-accent-green" />
        </div>
        {data.tPrimeraRespuesta !== null && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
            <Stat label="1ra respuesta" value={`${data.tPrimeraRespuesta}`} suffix="min" />
          </div>
        )}
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Con bot" value={data.conBot} color="text-[#A78BFA]" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Escaladas" value={data.escaladas} color="text-accent-amber" />
        </div>
      </div>
    </ReportSection>
  );
}

function VideoBlock({ data }: { data: ReportV2CanalVideo }) {
  return (
    <ReportSection
      icon={Video}
      title="Canal: Videollamadas"
      helpTitulo="Desglose de Videollamadas"
      helpContenido="Métricas del canal de video: citas agendadas vs realizadas, show rate, reagendamientos, no-shows, duración promedio y cuántos avanzaron en el proceso."
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Agendadas" value={data.agendadas} color="text-accent-cyan" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Realizadas" value={data.realizadas} color="text-accent-green" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat
            label="Show rate"
            value={`${Math.round(data.showRate * 100)}%`}
            color={data.showRate >= 0.7 ? 'text-accent-green' : 'text-accent-amber'}
          />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Calificados" value={data.calificados} color="text-accent-green" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="No calificados" value={data.noCalificados} color="text-accent-amber" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="No-show" value={data.noShow} color="text-accent-red" />
        </div>
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Reagendadas" value={data.reagendadas} color="text-accent-amber" />
        </div>
        {data.duracionProm !== null && (
          <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
            <Stat label="Duración prom." value={`${data.duracionProm}`} suffix="min" />
          </div>
        )}
        <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-3">
          <Stat label="Avanzaron" value={data.avanzaron} color="text-accent-green" />
        </div>
      </div>
    </ReportSection>
  );
}

export default function SectionPorCanal({ llamadas, chats, video }: Props) {
  if (!llamadas && !chats && !video) return null;

  return (
    <>
      {llamadas && <LlamadasBlock data={llamadas} />}
      {chats && <ChatsBlock data={chats} />}
      {video && <VideoBlock data={video} />}
    </>
  );
}
