"use client";

import { useState, useMemo } from 'react';
import { useT } from '@/contexts/LocaleContext';
import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from '@/components/dashboard/PageHeader';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { useUserFilter } from '@/contexts/UserFilterContext';
import type {
  AsesorResponse,
  AsesorLeadCRM,
  AsesorVideollamada,
  AsesorChat,
  AsesorMetricaCustom,
  AsesorKpis,
} from '@/types';
import {
  Phone,
  Video,
  MessageSquare,
  Zap,
  ChevronDown,
  ChevronUp,
  Target,
  User,
  ExternalLink,
  Plus,
  X,
  Search,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

// ──────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ──────────────────────────────────────────────────────────────────────────────

type TabType = 'llamadas' | 'videollamadas' | 'chats' | 'personalizadas';

type EstadoPipeline = 'pendiente' | 'no_contesto' | 'buzon' | 'seguimiento' | 'interesado' | 'programado' | 'calificada' | 'cerrada' | 'no_interesado';

interface PipelineEstadoConfig {
  id: EstadoPipeline;
  icon: string;
  color: string;
  label: string;
}

const PIPELINE_ESTADOS: PipelineEstadoConfig[] = [
  { id: 'pendiente', icon: '⏳', color: 'gray', label: 'Pendiente' },
  { id: 'no_contesto', icon: '📵', color: 'amber', label: 'No contestó' },
  { id: 'buzon', icon: '📬', color: 'amber', label: 'Buzón' },
  { id: 'seguimiento', icon: '🔄', color: 'cyan', label: 'Seguimiento' },
  { id: 'interesado', icon: '⭐', color: 'blue', label: 'Interesado' },
  { id: 'programado', icon: '📅', color: 'blue', label: 'Programado' },
  { id: 'calificada', icon: '✅', color: 'green', label: 'Calificada' },
  { id: 'cerrada', icon: '🏆', color: 'green', label: 'Cerrada' },
  { id: 'no_interesado', icon: '❌', color: 'red', label: 'No interesado' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Componentes auxiliares
// ──────────────────────────────────────────────────────────────────────────────

function SectionInfo({ text }: { text: string }) {
  return (
    <span className="relative group/info inline-flex ml-1 align-middle">
      <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-accent-cyan cursor-help transition-colors" />
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-60 rounded-lg bg-surface-700 border border-surface-500 shadow-xl px-2.5 py-2 text-[10px] leading-relaxed text-gray-300 opacity-0 group-hover/info:opacity-100 transition-opacity duration-200 whitespace-normal text-left font-normal normal-case tracking-normal">
        {text}
      </span>
    </span>
  );
}

function CRMCard({ lead, ghlLocationId }: { lead: AsesorLeadCRM; ghlLocationId?: string | null }) {
  const [showNotas, setShowNotas] = useState(false);
  const hasNotas = lead.notasLlamadas.length > 0 || (lead.leadNote?.trim()?.length ?? 0) > 0;

  return (
    <div className="group rounded-lg border border-surface-500/80 bg-surface-700/60 hover:bg-surface-700/80 hover:border-accent-cyan/30 pl-2.5 pr-2 py-1.5 text-xs transition-all duration-200 border-l-[3px] border-l-accent-cyan/50 shadow-sm">
      <div className="font-medium text-white text-[11px] leading-tight truncate" title={lead.name}>
        {lead.name}
      </div>
      <div className="flex items-center gap-2 mt-1 text-[10px]">
        <span className="inline-flex items-center gap-0.5 text-accent-cyan font-medium">
          <span className="text-gray-500 font-normal">#</span>
          {lead.intentosContacto}
        </span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{lead.speedToLead}</span>
      </div>
      {(lead.phone || lead.ghlContactId) && (
        <div className="flex items-center gap-2 mt-1">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-accent-cyan transition-colors"
              title={`Llamar: ${lead.phone}`}
            >
              <Phone className="w-3 h-3 shrink-0" />
              <span className="font-mono truncate max-w-[110px]">{lead.phone}</span>
            </a>
          )}
          {lead.ghlContactId && ghlLocationId && (
            <a
              href={`https://app.gohighlevel.com/v2/location/${ghlLocationId}/contacts/detail/${lead.ghlContactId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-accent-cyan transition-colors ml-auto"
              title="Ver en GHL"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span>GHL</span>
            </a>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowNotas(!showNotas)}
        className="mt-1 flex items-center gap-1 text-[10px] text-gray-500 hover:text-accent-cyan w-full text-left transition-colors"
      >
        <FileText className="w-3 h-3 shrink-0 opacity-70" />
        <span className="truncate">{hasNotas ? 'Ver notas' : 'Sin notas'}</span>
        {hasNotas && (showNotas ? <ChevronUp className="w-3 h-3 shrink-0" /> : <ChevronDown className="w-3 h-3 shrink-0" />)}
      </button>
      {showNotas && hasNotas && (
        <div className="mt-1.5 pt-1.5 border-t border-surface-500/60 space-y-1 text-[10px] text-gray-400">
          {lead.leadNote?.trim() && (
            <p className="leading-snug">
              <span className="text-gray-500">Lead:</span> {lead.leadNote}
            </p>
          )}
          {lead.notasLlamadas.map((n, i) => (
            <p key={i} className="leading-snug">
              <span className="text-gray-500">
                {n.date ? format(new Date(n.date), 'dd/MM HH:mm') : ''}:
              </span>
              {' '}
              {n.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function AdvisorCombobox({
  advisors,
  value,
  onChange,
  disabled,
}: {
  advisors: { id: string; name: string; email?: string }[];
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return advisors;
    const q = search.toLowerCase();
    return advisors.filter((a) =>
      a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q)
    );
  }, [advisors, search]);

  const selectedLabel = value
    ? advisors.find((a) => (a.email ?? a.id) === value)?.name ?? value
    : 'Todos los asesores';

  if (disabled) {
    return (
      <div className="rounded-lg bg-surface-700/60 border border-surface-500/50 px-3 py-1.5 text-xs text-gray-400 cursor-not-allowed">
        {selectedLabel}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-surface-700 border border-surface-500 px-3 py-1.5 text-xs text-white hover:border-accent-cyan/50 transition-colors min-w-[180px]"
      >
        <User className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
        <span className="truncate flex-1 text-left">{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="p-2 border-b border-surface-500">
              <div className="flex items-center gap-2 rounded-lg bg-surface-700 px-2 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar asesor..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
                className="w-full px-3 py-2 text-xs text-left hover:bg-surface-700 text-gray-300 transition-colors"
              >
                Todos los asesores
              </button>
              {filtered.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onChange(a.email ?? a.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2 text-xs text-left hover:bg-surface-700 transition-colors ${
                    value === (a.email ?? a.id) ? 'text-accent-cyan bg-accent-cyan/10' : 'text-white'
                  }`}
                >
                  <div className="font-medium">{a.name}</div>
                  {a.email && <div className="text-[10px] text-gray-500">{a.email}</div>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Llamadas
// ──────────────────────────────────────────────────────────────────────────────

function TabLlamadas({
  kpis,
  leads,
  ghlLocationId,
  metaLlamadasDiarias,
  metaLlamadasPeriodo,
  diasPeriodo,
  systemPath,
  expandedKpi,
  setExpandedKpi,
  breakdown,
}: {
  kpis: AsesorKpis;
  leads: AsesorLeadCRM[];
  ghlLocationId?: string | null;
  metaLlamadasDiarias: number;
  metaLlamadasPeriodo: number;
  diasPeriodo: number;
  systemPath: string;
  expandedKpi: string | null;
  setExpandedKpi: (val: string | null) => void;
  breakdown?: any;
}) {
  const t = useT();

  // Agrupar leads por estadoNormalizado
  const leadsByEstado = useMemo(() => {
    const map: Record<string, AsesorLeadCRM[]> = {};
    for (const estado of PIPELINE_ESTADOS) {
      map[estado.id] = leads.filter((l) => l.estadoNormalizado === estado.id);
    }
    return map;
  }, [leads]);

  // Filtrar solo estados con leads (o primeros 4 si todos están vacíos)
  const estadosConLeads = useMemo(() => {
    const withLeads = PIPELINE_ESTADOS.filter((e) => leadsByEstado[e.id].length > 0);
    if (withLeads.length === 0) return PIPELINE_ESTADOS.slice(0, 4);
    return withLeads;
  }, [leadsByEstado]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          KPIs del período
          <SectionInfo text="Métricas de llamadas del asesor seleccionado." />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 [grid-auto-rows:minmax(64px,auto)]">
          <KPICard
            label={t.asesor.kpis.leadsAsignados}
            value={kpis.leadsAsignados}
            color="blue"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
            tooltip={{
              significado: 'Leads únicos con actividad en llamadas.',
              calculo: 'Correos distintos en el log del período.',
            }}
            onClick={breakdown ? () => setExpandedKpi('leadsAsignados') : undefined}
          />
          <KPICard
            label={t.asesor.kpis.llamadasRealizadas}
            value={kpis.llamadasRealizadas}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
            tooltip={{
              significado: 'Total de eventos en el log de llamadas.',
              calculo: 'Cuenta de filas en log_llamadas.',
            }}
            onClick={breakdown ? () => setExpandedKpi('llamadasRealizadas') : undefined}
          />
          <KPICard
            label={t.asesor.kpis.llamadasContestadas}
            value={kpis.llamadasContestadas}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
            tooltip={{
              significado: 'Llamadas con respuesta efectiva.',
              calculo: 'Eventos tipo efectiva_*.',
            }}
            onClick={breakdown ? () => setExpandedKpi('llamadasContestadas') : undefined}
          />
          <KPICard
            label={t.asesor.kpis.tasaContacto}
            value={`${kpis.tasaContacto.toFixed(1)}%`}
            color="green"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
            tooltip={{
              significado: 'Tasa de contacto.',
              calculo: '(Contestadas ÷ Realizadas) × 100.',
            }}
          />
        </div>
      </section>

      {/* Metas */}
      <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-accent-cyan" /> Metas de llamadas
          <SectionInfo text="Meta diaria de llamadas establecida en Sistema → Paso 6." />
        </h2>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            Meta diaria: <strong className="text-accent-cyan">{metaLlamadasDiarias}</strong> llamadas · Meta del período (
            {diasPeriodo}d): <strong className="text-accent-cyan">{metaLlamadasPeriodo}</strong>
          </p>
          <p className="text-[11px] text-gray-500">
            Para cambiar estas metas: menú lateral →{' '}
            <Link href={systemPath} className="font-semibold text-accent-cyan hover:underline">
              Configuración del sistema
            </Link>
            .
          </p>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Progreso actual</span>
            <span className={kpis.llamadasRealizadas >= metaLlamadasPeriodo ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
              {kpis.llamadasRealizadas} / {metaLlamadasPeriodo}
            </span>
          </div>
          <div className="h-3 rounded-full bg-surface-600 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, metaLlamadasPeriodo > 0 ? (kpis.llamadasRealizadas / metaLlamadasPeriodo) * 100 : 0)}%`,
                backgroundColor: kpis.llamadasRealizadas >= metaLlamadasPeriodo ? 'var(--accent-green)' : 'var(--accent-amber)',
              }}
            />
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          Pipeline de llamadas
          <SectionInfo text="Leads agrupados por estado del pipeline." />
        </h2>
        {leads.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs">
            No hay leads en el rango seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-min md:min-w-full">
              {estadosConLeads.map((estado) => (
                <div
                  key={estado.id}
                  className="flex-shrink-0 w-72 rounded-xl border border-surface-500/80 overflow-hidden flex flex-col section-futuristic"
                >
                  <div className="bg-surface-700/90 px-2.5 py-1.5 flex flex-col gap-0.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-base">{estado.icon}</span>
                        <span className="text-[11px] font-medium text-white">{estado.label}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-accent-${estado.color}/20 border border-accent-${estado.color}/30 text-accent-${estado.color} text-[10px] font-medium bg-accent-${estado.color}/10`}>
                        {leadsByEstado[estado.id].length}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 flex-1 overflow-y-auto max-h-[380px] space-y-1">
                    {leadsByEstado[estado.id].length === 0 ? (
                      <p className="text-[10px] text-gray-500 py-3 text-center">Ninguno</p>
                    ) : (
                      leadsByEstado[estado.id].map((lead) => <CRMCard key={lead.id} lead={lead} ghlLocationId={ghlLocationId} />)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Breakdown Modal */}
      {expandedKpi && breakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Desglose por canal">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setExpandedKpi(null)} />
          <div className="relative rounded-xl border border-surface-500 bg-surface-800 shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white">
                {expandedKpi === 'leadsAsignados' && 'Desglose: Leads asignados'}
                {expandedKpi === 'llamadasRealizadas' && 'Desglose: Llamadas realizadas'}
                {expandedKpi === 'llamadasContestadas' && 'Desglose: Llamadas contestadas'}
              </h3>
              <button
                type="button"
                onClick={() => setExpandedKpi(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-sm">
              {expandedKpi === 'leadsAsignados' && (
                <ul className="space-y-2 text-gray-300">
                  <li className="flex justify-between">
                    <span>Desde log de llamadas</span>
                    <strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeLlamadas}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Desde agendas</span>
                    <strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeAgendas}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Desde registros (CRM)</span>
                    <strong className="text-accent-cyan">{breakdown.leadsAsignados.desdeRegistros ?? 0}</strong>
                  </li>
                  <li className="border-t border-surface-500 pt-2 mt-2 flex justify-between">
                    <span>Solo llamadas</span>
                    <strong>{breakdown.leadsAsignados.soloLlamadas}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Solo agendas</span>
                    <strong>{breakdown.leadsAsignados.soloAgendas}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Solo registros (CRM)</span>
                    <strong>{breakdown.leadsAsignados.soloRegistros ?? 0}</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>En llamadas y agendas</span>
                    <strong>{breakdown.leadsAsignados.enAmbos}</strong>
                  </li>
                </ul>
              )}
              {expandedKpi === 'llamadasRealizadas' && (
                <div>
                  <p className="text-gray-400 text-xs mb-2">Por tipo de evento:</p>
                  <ul className="space-y-1.5 text-gray-300">
                    {Object.entries(breakdown.llamadasRealizadas.porTipo)
                      .sort((a, b) => (b[1] as number) - (a[1] as number))
                      .map(([tipo, count]: [string, unknown]) => (
                        <li key={tipo} className="flex justify-between">
                          <span className="truncate mr-2">{tipo}</span>
                          <strong className="text-accent-cyan shrink-0">{count as number}</strong>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {expandedKpi === 'llamadasContestadas' && (
                <p className="text-gray-300">
                  Total de llamadas con respuesta efectiva:{' '}
                  <strong className="text-accent-cyan">{breakdown.llamadasContestadas.total}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Videollamadas
// ──────────────────────────────────────────────────────────────────────────────

function TabVideollamadas({
  kpis,
  videollamadas,
  embudoEtapas,
}: {
  kpis: AsesorKpis;
  videollamadas: AsesorVideollamada[];
  embudoEtapas: Array<{ id: string; nombre: string; color: string }>;
}) {
  const t = useT();

  // Agrupar videollamadas por categoría (etapa del embudo)
  const videosByEtapa = useMemo(() => {
    const map: Record<string, AsesorVideollamada[]> = {};
    for (const etapa of embudoEtapas) {
      map[etapa.id] = videollamadas.filter((v) => v.categoria === etapa.id);
    }
    return map;
  }, [videollamadas, embudoEtapas]);

  // Filtrar solo etapas con videollamadas
  const etapasConVideos = useMemo(() => {
    return embudoEtapas.filter((e) => videosByEtapa[e.id].length > 0);
  }, [embudoEtapas, videosByEtapa]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          KPIs del período
          <SectionInfo text="Métricas de videollamadas del asesor seleccionado." />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 [grid-auto-rows:minmax(64px,auto)]">
          <KPICard
            label="Agendadas"
            value={kpis.reunionesAgendadas}
            color="blue"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Asistidas"
            value={kpis.reunionesAsistidas}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Calificadas"
            value={kpis.reunionesCalificadas}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Cerradas"
            value={kpis.reunionesCerradas}
            color="green"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="No show"
            value={kpis.reunionesNoShow}
            color="red"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
        </div>
      </section>

      {/* Pipeline */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          Pipeline de videollamadas
          <SectionInfo text="Videollamadas agrupadas por etapa del embudo." />
        </h2>
        {videollamadas.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs">
            No hay videollamadas en el rango seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-min md:min-w-full">
              {etapasConVideos.map((etapa) => (
                <div
                  key={etapa.id}
                  className="flex-shrink-0 w-72 rounded-xl border border-surface-500/80 overflow-hidden flex flex-col section-futuristic"
                >
                  <div className="bg-surface-700/90 px-2.5 py-1.5 flex flex-col gap-0.5 shrink-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-white">{etapa.nombre}</span>
                      <span className={`px-1.5 py-0.5 rounded-full bg-${etapa.color}/20 border border-${etapa.color}/30 text-${etapa.color} text-[10px] font-medium`}>
                        {videosByEtapa[etapa.id].length}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 flex-1 overflow-y-auto max-h-[380px] space-y-1">
                    {videosByEtapa[etapa.id].length === 0 ? (
                      <p className="text-[10px] text-gray-500 py-3 text-center">Ninguna</p>
                    ) : (
                      videosByEtapa[etapa.id].map((video) => (
                        <div
                          key={video.id}
                          className="group rounded-lg border border-surface-500/80 bg-surface-700/60 hover:bg-surface-700/80 hover:border-accent-cyan/30 pl-2.5 pr-2 py-1.5 text-xs transition-all duration-200 border-l-[3px] border-l-accent-cyan/50 shadow-sm"
                        >
                          <div className="font-medium text-white text-[11px] leading-tight truncate" title={video.leadName ?? ''}>
                            {video.leadName ?? 'Sin nombre'}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                            {video.fechaReunion && (
                              <span>{format(new Date(video.fechaReunion), 'dd/MM HH:mm')}</span>
                            )}
                          </div>
                          {video.facturacion > 0 && (
                            <div className="mt-1 text-[10px] text-accent-green font-medium">
                              ${video.facturacion.toLocaleString()}
                            </div>
                          )}
                          {video.fathomUrl && (
                            <a
                              href={video.fathomUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-accent-cyan transition-colors"
                              title="Ver grabación"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span>Grabación</span>
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Chats
// ──────────────────────────────────────────────────────────────────────────────

function TabChats({
  kpis,
  chats,
}: {
  kpis: AsesorKpis;
  chats: AsesorChat[];
}) {
  const t = useT();

  // Agrupar chats por estado
  const chatsByEstado = useMemo(() => {
    const map: Record<string, AsesorChat[]> = {};
    for (const chat of chats) {
      const estado = chat.estado || 'sin_estado';
      if (!map[estado]) map[estado] = [];
      map[estado].push(chat);
    }
    return map;
  }, [chats]);

  const formatSpeedToLead = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(seconds / 3600);
    if (seconds < 3600) return `${minutes}m`;
    return `${hours}h`;
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          KPIs del período
          <SectionInfo text="Métricas de chats del asesor seleccionado." />
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 [grid-auto-rows:minmax(64px,auto)]">
          <KPICard
            label="Total chats"
            value={kpis.totalChats}
            color="blue"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Con respuesta"
            value={kpis.chatsConRespuesta}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Tasa respuesta"
            value={`${kpis.tasaRespuestaChats.toFixed(1)}%`}
            color="green"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
          <KPICard
            label="Speed to lead"
            value={formatSpeedToLead(kpis.speedToLeadChatsAvg)}
            color="cyan"
            className="[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3"
          />
        </div>
      </section>

      {/* Lista de chats */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          Lista de chats
          <SectionInfo text="Chats agrupados por estado." />
        </h2>
        {chats.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs">
            No hay chats en el rango seleccionado.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(chatsByEstado).map(([estado, chatsEnEstado]) => (
              <div key={estado} className="space-y-1.5">
                <h3 className="text-xs font-medium text-gray-400 px-2 py-1">
                  <span className="inline-block px-1.5 py-0.5 rounded-full bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan text-[10px] mr-2">
                    {chatsEnEstado.length}
                  </span>
                  {estado}
                </h3>
                <div className="space-y-1">
                  {chatsEnEstado.map((chat) => (
                    <div
                      key={chat.chatId}
                      className="rounded-lg border border-surface-500/80 bg-surface-700/60 hover:bg-surface-700/80 p-2.5 text-xs transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white text-[11px] truncate" title={chat.leadName ?? ''}>
                            {chat.leadName ?? 'Sin nombre'}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {chat.leadEmail || 'Sin email'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {chat.respondido ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/30 text-accent-green text-[9px] font-medium whitespace-nowrap">
                              ✓ Respondido
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-[9px] font-medium whitespace-nowrap">
                              ⏳ Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500">
                        <span>
                          {chat.fechaUltimoMensaje
                            ? format(new Date(chat.fechaUltimoMensaje), 'dd/MM HH:mm')
                            : 'N/A'}
                        </span>
                        {chat.speedToLeadSeg && (
                          <>
                            <span>·</span>
                            <span className="text-accent-cyan font-medium">
                              {formatSpeedToLead(chat.speedToLeadSeg)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tab: Métricas Personalizadas
// ──────────────────────────────────────────────────────────────────────────────

function TabPersonalizadas({
  metricasCustom,
}: {
  metricasCustom: AsesorMetricaCustom[];
}) {
  const formatMetrica = (valor: number, formato: string) => {
    switch (formato) {
      case 'moneda':
        return `$${valor.toLocaleString()}`;
      case 'porcentaje':
        return `${valor.toFixed(1)}%`;
      case 'decimal':
        return valor.toFixed(2);
      default:
        return valor.toLocaleString();
    }
  };

  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent-cyan" /> Métricas personalizadas
          <SectionInfo text="Métricas custom definidas en la configuración del sistema." />
        </h2>
        {metricasCustom.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs">
            No hay métricas personalizadas configuradas.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {metricasCustom.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border bg-${m.color}/10 border-${m.color}/30 p-3 space-y-1`}
              >
                <div className="text-[10px] text-gray-400 font-medium">{m.nombre}</div>
                <div className={`text-xl font-semibold text-${m.color}`}>
                  {formatMetrica(m.valor, m.formato)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────────────────────────────────────────

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

export default function AsesorPage() {
  const t = useT();
  const pathname = usePathname();
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState<TabType>('llamadas');
  const [expandedKpi, setExpandedKpi] = useState<string | null>(null);

  const { canViewAll, session, sessionLoading, asesorSeleccionado, setAsesorSeleccionado, asesores: asesoresContext } = useUserFilter();

  const { data: metasData } = useApiData<{ meta_llamadas_diarias: number }>('/api/data/metas');
  const metaLlamadasDiarias = metasData?.meta_llamadas_diarias ?? 50;

  const diasPeriodo = Math.max(
    1,
    Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const metaLlamadasPeriodo = metaLlamadasDiarias * diasPeriodo;

  const apiParams = useMemo(() => {
    const base: Record<string, string> = { from: dateFrom, to: dateTo };
    if (canViewAll) {
      if (asesorSeleccionado) base.advisorEmail = asesorSeleccionado;
      else base.allAdvisors = '1';
    }
    return base;
  }, [dateFrom, dateTo, canViewAll, asesorSeleccionado]);

  const { data, loading } = useApiData<AsesorResponse>('/api/data/asesor', apiParams);

  const kpis = data?.kpis ?? {
    leadsAsignados: 0,
    llamadasRealizadas: 0,
    llamadasContestadas: 0,
    tasaContacto: 0,
    reunionesAgendadas: 0,
    reunionesAsistidas: 0,
    reunionesCalificadas: 0,
    reunionesCerradas: 0,
    reunionesNoShow: 0,
    reunionesCanceladas: 0,
    tasaAgendamiento: 0,
    totalChats: 0,
    chatsConRespuesta: 0,
    tasaRespuestaChats: 0,
    speedToLeadChatsAvg: null,
  };

  const leads = data?.leads ?? [];
  const videollamadas = data?.videollamadas ?? [];
  const chats = data?.chats ?? [];
  const metricasCustom = data?.metricasCustom ?? [];
  const embudoEtapas = data?.embudoEtapas ?? [];
  const canales = data?.canales ?? { llamadas: false, videollamadas: false, chats: false, metricasCustom: false };
  const breakdown = data?.breakdown;
  const advisorsList = data?.advisorsList ?? data?.advisors ?? asesoresContext;

  const systemPath = pathname.split('/asesor')[0] + '/system';

  // Determinar primer tab disponible
  const availableTabs = useMemo(() => {
    const tabs: TabType[] = [];
    if (canales.llamadas) tabs.push('llamadas');
    if (canales.videollamadas) tabs.push('videollamadas');
    if (canales.chats) tabs.push('chats');
    if (canales.metricasCustom) tabs.push('personalizadas');
    return tabs;
  }, [canales]);

  // Si el tab activo no está disponible, seleccionar el primero
  const validActiveTab = useMemo(() => {
    if (!availableTabs.includes(activeTab) && availableTabs.length > 0) {
      return availableTabs[0];
    }
    return activeTab;
  }, [activeTab, availableTabs]);

  return (
    <>
      <PageHeader
        title={t.asesor.titulo}
        subtitle="Métricas y leads del asesor"
        action={
          <div className="flex items-center gap-2">
            {!sessionLoading && advisorsList.length > 0 && (
              <AdvisorCombobox
                advisors={advisorsList}
                value={canViewAll ? asesorSeleccionado : (session?.email ?? '')}
                onChange={setAsesorSeleccionado}
                disabled={!canViewAll}
              />
            )}
          </div>
        }
      />
      <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
        {/* Date Range Picker */}
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Período:</span>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
        </section>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-gray-400 text-sm animate-pulse">Cargando...</div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            {availableTabs.length > 0 && (
              <section className="flex items-center gap-1 overflow-x-auto pb-1 -mx-3 md:-mx-4 px-3 md:px-4">
                {availableTabs.map((tab) => {
                  const isActive = tab === validActiveTab;
                  const getIcon = (t: TabType): React.ReactNode => {
                    switch (t) {
                      case 'llamadas':
                        return <Phone className="w-4 h-4" />;
                      case 'videollamadas':
                        return <Video className="w-4 h-4" />;
                      case 'chats':
                        return <MessageSquare className="w-4 h-4" />;
                      case 'personalizadas':
                        return <Zap className="w-4 h-4" />;
                      default:
                        return null;
                    }
                  };
                  const getLabel = (t: TabType): string => {
                    switch (t) {
                      case 'llamadas':
                        return 'Llamadas';
                      case 'videollamadas':
                        return 'Videollamadas';
                      case 'chats':
                        return 'Chats';
                      case 'personalizadas':
                        return 'Personalizadas';
                      default:
                        return '';
                    }
                  };

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                        isActive
                          ? 'bg-accent-cyan text-surface-900'
                          : 'bg-surface-700 text-gray-400 hover:text-white hover:bg-surface-600'
                      }`}
                      title={getLabel(tab)}
                    >
                      {getIcon(tab)}
                      <span>{getLabel(tab)}</span>
                    </button>
                  );
                })}
              </section>
            )}

            {/* Content */}
            <section className="space-y-4">
              {validActiveTab === 'llamadas' && (
                <TabLlamadas
                  kpis={kpis}
                  leads={leads}
                  ghlLocationId={data?.ghlLocationId}
                  metaLlamadasDiarias={metaLlamadasDiarias}
                  metaLlamadasPeriodo={metaLlamadasPeriodo}
                  diasPeriodo={diasPeriodo}
                  systemPath={systemPath}
                  expandedKpi={expandedKpi}
                  setExpandedKpi={setExpandedKpi}
                  breakdown={breakdown}
                />
              )}
              {validActiveTab === 'videollamadas' && (
                <TabVideollamadas
                  kpis={kpis}
                  videollamadas={videollamadas}
                  embudoEtapas={embudoEtapas}
                />
              )}
              {validActiveTab === 'chats' && (
                <TabChats
                  kpis={kpis}
                  chats={chats}
                />
              )}
              {validActiveTab === 'personalizadas' && (
                <TabPersonalizadas
                  metricasCustom={metricasCustom}
                />
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
