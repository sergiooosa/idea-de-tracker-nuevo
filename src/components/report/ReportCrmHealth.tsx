// AUT-387 — Bloque 6: Higiene CRM
// Porcentaje de higiene, leads en limbo, leads sin estado

'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, User, Clock, HelpCircle } from 'lucide-react';
import type { ReportCrmHealthData, ReportCrmHealthLeadDetalle } from '@/types/report';

interface Props {
  data: ReportCrmHealthData | null;
}

// Semáforo higiene: verde >= 80, amarillo >= 60, rojo < 60
function higieneColor(score: number): { text: string; ring: string; label: string } {
  if (score >= 80) return { text: 'text-accent-green', ring: 'ring-accent-green/30', label: 'Buena' };
  if (score >= 60) return { text: 'text-accent-amber', ring: 'ring-accent-amber/30', label: 'Regular' };
  return { text: 'text-accent-red', ring: 'ring-accent-red/30', label: 'Crítica' };
}

function HigieneGauge({ score }: { score: number }) {
  const { text, ring, label } = higieneColor(score);
  // Simple circular-ish gauge using a clip path approach with a progress arc
  const circumference = 2 * Math.PI * 36; // radius = 36
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative w-24 h-24 rounded-full ring-4 ${ring} bg-surface-700/60 flex items-center justify-center`}>
        {/* SVG arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#1e2a3a" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            stroke={score >= 80 ? '#00e676' : score >= 60 ? '#ffb300' : '#ff1744'}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="relative text-center">
          <p className={`text-2xl font-bold ${text}`}>{score}</p>
          <p className="text-[10px] text-gray-500 -mt-0.5">/ 100</p>
        </div>
      </div>
      <div className={`text-xs font-semibold ${text}`}>Higiene {label}</div>
    </div>
  );
}

function LeadsTooltip({ leads }: { leads: ReportCrmHealthLeadDetalle[] }) {
  const [open, setOpen] = useState(false);

  if (leads.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex items-center justify-center w-4 h-4 rounded-full text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Ver contactos sin acción"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-6 z-50 w-72 rounded-lg border border-surface-500/60 bg-surface-800 shadow-xl p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Sin contactar ({leads.length}{leads.length === 10 ? '+' : ''})
          </p>
          {leads.map((lead, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-white truncate">{lead.nombre}</p>
                {lead.asesor && (
                  <p className="text-[10px] text-gray-500 truncate">{lead.asesor}</p>
                )}
              </div>
              <span className="text-[10px] text-accent-amber shrink-0 font-semibold whitespace-nowrap">
                {lead.diasSinActividad}d
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  icon: Icon,
  label,
  count,
  suffix,
  severity,
  leads,
}: {
  icon: React.ElementType;
  label: string;
  count: number;
  suffix?: string;
  severity: 'ok' | 'warning' | 'critical';
  leads?: ReportCrmHealthLeadDetalle[];
}) {
  const color =
    severity === 'ok'
      ? 'text-accent-green'
      : severity === 'warning'
      ? 'text-accent-amber'
      : 'text-accent-red';
  const bg =
    severity === 'ok'
      ? 'bg-green-900/10 border-green-800/20'
      : severity === 'warning'
      ? 'bg-amber-900/10 border-amber-800/20'
      : 'bg-red-900/20 border-red-800/30';

  return (
    <div className={`flex items-center gap-3 rounded-lg border ${bg} px-3 py-2.5`}>
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <span className="text-xs text-gray-300 flex-1">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`text-base font-bold ${color}`}>{count.toLocaleString('es')}</span>
        {suffix && <span className="text-[10px] text-gray-500">{suffix}</span>}
      </div>
      {leads && leads.length > 0 && <LeadsTooltip leads={leads} />}
    </div>
  );
}

export default function ReportCrmHealth({ data }: Props) {
  if (data === null) return null;

  const { label } = higieneColor(data.puntajeHigiene);

  // Determine severity for each issue
  const limboSeverity = data.leadsEnLimbo === 0 ? 'ok' : data.leadsEnLimbo <= 10 ? 'warning' : 'critical';
  const sinEstadoSeverity = data.leadsSinEstado === 0 ? 'ok' : data.leadsSinEstado <= 5 ? 'warning' : 'critical';
  const sinAccionSeverity = data.asignadosSinAccion === 0 ? 'ok' : data.asignadosSinAccion <= 5 ? 'warning' : 'critical';

  return (
    <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-accent-cyan shrink-0" />
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Higiene CRM
        </h3>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Gauge */}
        <HigieneGauge score={data.puntajeHigiene} />

        {/* Issues */}
        <div className="flex-1 space-y-2 w-full">
          <IssueRow
            icon={Clock}
            label={`Leads en limbo (sin actividad > ${data.diasLimboUmbral} días)`}
            count={data.leadsEnLimbo}
            suffix="leads"
            severity={limboSeverity}
          />
          <IssueRow
            icon={AlertTriangle}
            label="Leads sin estado definido"
            count={data.leadsSinEstado}
            suffix="leads"
            severity={sinEstadoSeverity}
          />
          <IssueRow
            icon={User}
            label="Asignados sin ninguna acción"
            count={data.asignadosSinAccion}
            suffix="leads"
            severity={sinAccionSeverity}
            leads={data.leadsSinAccionDetalle}
          />
        </div>
      </div>

      {/* Asesor con más leads en limbo */}
      {data.asesorMasLimbo !== null && data.leadsEnLimbo > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-700/40 border border-surface-500/30 px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0" />
          <span className="text-xs text-gray-400">Más leads en limbo:</span>
          <span className="text-xs font-semibold text-white">{data.asesorMasLimbo.nombre}</span>
          <span className="text-xs text-accent-amber font-semibold ml-auto">
            {data.asesorMasLimbo.count} leads
          </span>
        </div>
      )}

      {/* Score = 100 estado */}
      {data.puntajeHigiene >= 80 && data.leadsEnLimbo === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-green-900/20 border border-green-800/40 px-3 py-2">
          <Shield className="w-3.5 h-3.5 text-accent-green shrink-0" />
          <span className="text-xs text-green-300">CRM en excelente estado. Sin leads en limbo.</span>
        </div>
      )}
    </section>
  );
}
