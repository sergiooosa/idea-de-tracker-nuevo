"use client";

import { BarChart3 } from 'lucide-react';
import type { ReportV2KPIs } from '@/types/report-v2';
import ReportSection from './ReportSection';

interface Props {
  data: ReportV2KPIs | null;
  companyName: string;
  periodo: string;
}

function KpiCard({ label, value, suffix, color }: {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  const formatted = suffix === '%'
    ? `${Math.round(value * 100)}%`
    : value.toLocaleString('es');

  return (
    <div className="rounded-lg bg-[#0E1626] border border-[#1E2B40] p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-[#5F7288] mb-1.5">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{formatted}</p>
    </div>
  );
}

export default function SectionPortadaKPIs({ data, companyName, periodo }: Props) {
  if (!data) return null;

  return (
    <ReportSection
      icon={BarChart3}
      title="KPIs del Periodo"
      helpTitulo="KPIs del Periodo"
      helpContenido="Métricas principales del periodo seleccionado: leads analizados, nuevos, reactivados, citas agendadas, citas realizadas y show rate."
      rightSlot={
        <div className="text-right">
          <p className="text-xs font-semibold text-[#E7EFF8]">{companyName}</p>
          <p className="text-[10px] text-[#5F7288]">{periodo}</p>
        </div>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Leads analizados" value={data.leadsAnalizados} color="text-accent-cyan" />
        <KpiCard label="Nuevos" value={data.nuevos} color="text-accent-blue" />
        <KpiCard label="Reactivados" value={data.reactivados} color="text-[#A78BFA]" />
        <KpiCard label="Citas agendadas" value={data.citasAgendadas} color="text-accent-amber" />
        <KpiCard label="Citas realizadas" value={data.citasRealizadas} color="text-accent-green" />
        <KpiCard label="Show rate" value={data.showRate} suffix="%" color="text-accent-green" />
      </div>
    </ReportSection>
  );
}
