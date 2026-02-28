import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import KPICard from '@/components/KPICard';
import InsightsChat from '@/components/InsightsChat';
import DateRangePicker from '@/components/DateRangePicker';
import {
  calls,
  advisors,
  getLeadsByAdvisor,
  getCallsByLead,
  getCallsInRange,
  getMeetingsInRange,
  getAdvisorById,
} from '@/data/mockData';
import { getMetasFromStorage } from '@/utils/metasStorage';
import { MessageSquare, Users, FileText, ChevronDown, ChevronUp, Target, Eye, User, Phone, X } from 'lucide-react';
import KpiTooltip from '@/components/KpiTooltip';
import { format, subDays, isSameDay } from 'date-fns';
import type { Lead } from '@/types';

const advisorId = 'adv-1'; // Sergio como asesor logueado (mock)
const myCalls = calls.filter((c) => c.advisorId === advisorId);

const ROLES_VISION_GENERAL: string[] = ['admin', 'gerente', 'director_comercial'];

const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

// Categorías del CRM: el lead se mueve solo según si se llamó o no y su estado
type CrmCategory = 'primera_llamada' | 'seguimiento' | 'interesados' | 'no_interesados';

const CRM_CATEGORIES: { id: CrmCategory; label: string }[] = [
  { id: 'primera_llamada', label: 'Primera llamada' },
  { id: 'seguimiento', label: 'Seguimiento' },
  { id: 'interesados', label: 'Interesados' },
  { id: 'no_interesados', label: 'No interesados' },
];

function getCrmCategory(
  numLlamadasDelAsesor: number,
  status: string
): CrmCategory {
  if (numLlamadasDelAsesor === 0) return 'primera_llamada';
  if (status === 'no_interesado') return 'no_interesados';
  if (['interesado', 'agendado', 'asistio', 'cerrado'].includes(status)) return 'interesados';
  return 'seguimiento';
}

function CRMCard({
  lead,
  numLlamadas,
  speedToLead,
  notasLlamadas,
  leadNote,
}: {
  lead: Lead;
  numLlamadas: number;
  speedToLead: string;
  notasLlamadas: { date: string; text: string }[];
  leadNote?: string;
}) {
  const [showNotas, setShowNotas] = useState(false);
  const hasNotas = notasLlamadas.length > 0 || (leadNote?.trim()?.length ?? 0) > 0;
  return (
    <div className="group rounded-lg border border-surface-500/80 bg-surface-700/60 hover:bg-surface-700/80 hover:border-accent-cyan/30 pl-2.5 pr-2 py-1.5 text-xs transition-all duration-200 border-l-[3px] border-l-accent-cyan/50 shadow-sm">
      <div className="font-medium text-white text-[11px] leading-tight truncate" title={lead.name}>{lead.name}</div>
      <div className="flex items-center gap-2 mt-1 text-[10px]">
        <span className="inline-flex items-center gap-0.5 text-accent-cyan font-medium">
          <span className="text-gray-500 font-normal">#</span>{numLlamadas}
        </span>
        <span className="text-gray-500">·</span>
        <span className="text-gray-400">{speedToLead}</span>
      </div>
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
          {leadNote?.trim() && (
            <p className="leading-snug"><span className="text-gray-500">Lead:</span> {leadNote}</p>
          )}
          {notasLlamadas.map((n, i) => (
            <p key={i} className="leading-snug">
              <span className="text-gray-500">{format(new Date(n.date), 'dd/MM HH:mm')}:</span> {n.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

type ViewMode = 'general' | 'por_usuario';

export default function AsesorPanel() {
  const [chatOpen, setChatOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('general');
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(advisorId);
  const [leadsListModal, setLeadsListModal] = useState<'hoy' | 'ayer' | 'antier' | null>(null);

  // Metas: se leen de localStorage (configuración en menú "Establecer metas")
  const metas = getMetasFromStorage();
  const { metaLlamadasDiarias, leadsNuevosDia1, leadsNuevosDia2, leadsNuevosDia3 } = metas;

  const currentAdvisor = getAdvisorById(advisorId);
  const canViewGeneral = currentAdvisor != null && ROLES_VISION_GENERAL.includes(currentAdvisor.role);
  const isVerTodos = canViewGeneral && viewMode === 'general';
  const effectiveAdvisorId = canViewGeneral && viewMode === 'por_usuario' ? selectedAdvisorId : advisorId;

  const myLeads = useMemo(
    () => (isVerTodos ? advisors.flatMap((a) => getLeadsByAdvisor(a.id)) : getLeadsByAdvisor(effectiveAdvisorId)),
    [effectiveAdvisorId, isVerTodos]
  );

  // Llamadas del asesor por lead (para número de llamadas, speed to lead y notas). En "Ver todos", por cada lead se usa su asesor asignado.
  const leadsWithStats = useMemo(() => {
    return myLeads.map((lead) => {
      const allCallsForLead = getCallsByLead(lead.id);
      const advisorIdForLead = isVerTodos ? lead.assignedAdvisorId : effectiveAdvisorId;
      const callsDelAsesor = allCallsForLead.filter((c) => c.advisorId === advisorIdForLead);
      const callsInRange = callsDelAsesor.filter(
        (c) => c.datetime >= dateFrom && c.datetime <= dateTo + 'T23:59:59'
      );
      const numLlamadas = callsDelAsesor.length;
      const firstCallWithSpeed = callsDelAsesor.find((c) => c.speedToLeadSeconds != null);
      const speedToLead = firstCallWithSpeed?.speedToLeadSeconds;
      const notasLlamadas = callsDelAsesor
        .filter((c) => c.notes?.trim())
        .map((c) => ({ date: c.datetime, text: c.notes! }));
      const categoria = getCrmCategory(numLlamadas, lead.status);
      return {
        lead,
        numLlamadas,
        speedToLead: speedToLead != null ? min(speedToLead) : '—',
        notasLlamadas,
        leadNote: lead.notes,
        categoria,
      };
    });
  }, [myLeads, dateFrom, dateTo, effectiveAdvisorId, isVerTodos]);

  const leadsByCategory = useMemo(() => {
    const map: Record<CrmCategory, typeof leadsWithStats> = {
      primera_llamada: [],
      seguimiento: [],
      interesados: [],
      no_interesados: [],
    };
    leadsWithStats.forEach((item) => map[item.categoria].push(item));
    return map;
  }, [leadsWithStats]);

  // KPIs en el período de tiempo seleccionado (del asesor efectivo: yo o el seleccionado)
  const kpisPeriodo = useMemo(() => {
    const callsEnRango = getCallsInRange(dateFrom, dateTo).filter((c) => c.advisorId === effectiveAdvisorId);
    const meetingsEnRango = getMeetingsInRange(dateFrom, dateTo).filter((m) => m.advisorId === effectiveAdvisorId);
    const contestadas = callsEnRango.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
    const leadsEnRango = new Set([...callsEnRango.map((c) => c.leadId), ...meetingsEnRango.map((m) => m.leadId)]).size;
    return {
      leadsAsignadosEnRango: leadsEnRango,
      llamadasRealizadas: callsEnRango.length,
      llamadasContestadas: contestadas,
      reunionesAgendadas: meetingsEnRango.length,
      tasaContacto: callsEnRango.length > 0 ? (contestadas / callsEnRango.length) * 100 : 0,
      tasaAgendamiento: contestadas > 0 ? (meetingsEnRango.length / contestadas) * 100 : 0,
    };
  }, [dateFrom, dateTo, effectiveAdvisorId]);

  // KPIs visión general (todos los asesores agregados) — solo para admin/gerente/director
  const kpisGeneral = useMemo(() => {
    const callsEnRango = getCallsInRange(dateFrom, dateTo);
    const meetingsEnRango = getMeetingsInRange(dateFrom, dateTo);
    const contestadas = callsEnRango.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
    const leadsEnRango = new Set([...callsEnRango.map((c) => c.leadId), ...meetingsEnRango.map((m) => m.leadId)]).size;
    return {
      leadsConActividad: leadsEnRango,
      llamadasRealizadas: callsEnRango.length,
      llamadasContestadas: contestadas,
      reunionesAgendadas: meetingsEnRango.length,
      tasaContacto: callsEnRango.length > 0 ? (contestadas / callsEnRango.length) * 100 : 0,
      tasaAgendamiento: contestadas > 0 ? (meetingsEnRango.length / contestadas) * 100 : 0,
    };
  }, [dateFrom, dateTo]);

  const kpiCompact = "[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3";

  // Progreso vs metas diaria, semanal, mensual. En "Ver todos": total equipo y meta = 50 por asesor (meta × N asesores).
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const monthStart = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const numAsesores = advisors.length;
  const progresoMetas = useMemo(() => {
    if (isVerTodos) {
      const callsHoy = getCallsInRange(todayStr, todayStr).length;
      const callsSemana = getCallsInRange(weekStart, todayStr).length;
      const callsMes = getCallsInRange(monthStart, todayStr).length;
      const metaDiariaTotal = metaLlamadasDiarias * numAsesores;
      const metaSemanal = metaDiariaTotal * 7;
      const metaMensual = metaDiariaTotal * 30;
      return {
        llamadasHoy: callsHoy,
        llamadasSemana: callsSemana,
        llamadasMes: callsMes,
        metaDiaria: metaDiariaTotal,
        metaSemanal,
        metaMensual,
        pctHoy: metaDiariaTotal > 0 ? Math.min(100, (callsHoy / metaDiariaTotal) * 100) : 0,
        pctSemana: metaSemanal > 0 ? Math.min(100, (callsSemana / metaSemanal) * 100) : 0,
        pctMes: metaMensual > 0 ? Math.min(100, (callsMes / metaMensual) * 100) : 0,
      };
    }
    const allCalls = getCallsInRange(todayStr, todayStr).filter((c) => c.advisorId === effectiveAdvisorId);
    const callsHoy = allCalls.length;
    const callsSemana = getCallsInRange(weekStart, todayStr).filter((c) => c.advisorId === effectiveAdvisorId).length;
    const callsMes = getCallsInRange(monthStart, todayStr).filter((c) => c.advisorId === effectiveAdvisorId).length;
    const metaSemanal = metaLlamadasDiarias * 7;
    const metaMensual = metaLlamadasDiarias * 30;
    return {
      llamadasHoy: callsHoy,
      llamadasSemana: callsSemana,
      llamadasMes: callsMes,
      metaDiaria: metaLlamadasDiarias,
      metaSemanal,
      metaMensual,
      pctHoy: metaLlamadasDiarias > 0 ? Math.min(100, (callsHoy / metaLlamadasDiarias) * 100) : 0,
      pctSemana: metaSemanal > 0 ? Math.min(100, (callsSemana / metaSemanal) * 100) : 0,
      pctMes: metaMensual > 0 ? Math.min(100, (callsMes / metaMensual) * 100) : 0,
    };
  }, [effectiveAdvisorId, todayStr, weekStart, monthStart, metaLlamadasDiarias, isVerTodos, numAsesores]);

  // Llamadas a leads nuevos por día de asignación (hoy, ayer, antier) — distinto a la meta diaria de llamadas
  const hoy = new Date();
  const ayer = subDays(hoy, 1);
  const antier = subDays(hoy, 2);
  const llamadasPorDiaAsignacion = useMemo(() => {
    const leadsHoy = myLeads.filter((l) => isSameDay(new Date(l.createdAt), hoy));
    const leadsAyer = myLeads.filter((l) => isSameDay(new Date(l.createdAt), ayer));
    const leadsAntier = myLeads.filter((l) => isSameDay(new Date(l.createdAt), antier));
    const countCallsToLeads = (leadList: Lead[]) => {
      const ids = new Set(leadList.map((l) => l.id));
      if (isVerTodos) return calls.filter((c) => ids.has(c.leadId)).length;
      return calls.filter((c) => c.advisorId === effectiveAdvisorId && ids.has(c.leadId)).length;
    };
    const metaHoy = isVerTodos ? leadsNuevosDia1 * numAsesores : leadsNuevosDia1;
    const metaAyer = isVerTodos ? leadsNuevosDia2 * numAsesores : leadsNuevosDia2;
    const metaAntier = isVerTodos ? leadsNuevosDia3 * numAsesores : leadsNuevosDia3;
    return {
      hoy: { leads: leadsHoy, meta: metaHoy, hechas: countCallsToLeads(leadsHoy), restantes: Math.max(0, metaHoy - countCallsToLeads(leadsHoy)) },
      ayer: { leads: leadsAyer, meta: metaAyer, hechas: countCallsToLeads(leadsAyer), restantes: Math.max(0, metaAyer - countCallsToLeads(leadsAyer)) },
      antier: { leads: leadsAntier, meta: metaAntier, hechas: countCallsToLeads(leadsAntier), restantes: Math.max(0, metaAntier - countCallsToLeads(leadsAntier)) },
    };
  }, [myLeads, effectiveAdvisorId, leadsNuevosDia1, leadsNuevosDia2, leadsNuevosDia3, isVerTodos, numAsesores]);

  return (
    <>
      <PageHeader
        title="Panel asesor"
        subtitle={canViewGeneral ? (viewMode === 'general' ? 'Ver todos' : 'Ver solo 1 asesor') : 'Mis métricas y leads'}
        action={
          <div className="flex items-center gap-2">
            {canViewGeneral && (
              <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500">
                <button
                  type="button"
                  onClick={() => setViewMode('general')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'general' ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver todos
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('por_usuario')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'por_usuario' ? 'bg-accent-purple text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <User className="w-3.5 h-3.5" />
                  Ver solo 1 asesor
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-700 border border-surface-500 text-xs text-gray-300 hover:bg-surface-600 hover:text-white"
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent-cyan" />
              Resumen
            </button>
          </div>
        }
      />
      <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
        {/* Solo admins: filtro Ver todos / Ver solo 1 asesor */}
        {canViewGeneral && (
          <section className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400">Vista:</span>
            <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500">
              <button
                type="button"
                onClick={() => setViewMode('general')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'general' ? 'bg-accent-cyan text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <Eye className="w-3.5 h-3.5" />
                Ver todos
              </button>
              <button
                type="button"
                onClick={() => setViewMode('por_usuario')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'por_usuario' ? 'bg-accent-purple text-white' : 'text-gray-400 hover:text-white'}`}
              >
                <User className="w-3.5 h-3.5" />
                Ver solo 1 asesor
              </button>
            </div>
            {viewMode === 'por_usuario' && (
              <>
                <span className="text-xs text-gray-400">Asesor:</span>
                <select
                  value={selectedAdvisorId}
                  onChange={(e) => setSelectedAdvisorId(e.target.value)}
                  className="rounded-lg bg-surface-700 border border-surface-500 px-2 py-1.5 text-xs text-white"
                >
                  {advisors.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.team})</option>
                  ))}
                </select>
              </>
            )}
          </section>
        )}

        {/* Selector de período */}
        <section className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Período:</span>
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
        </section>

        {/* Misma vista para Ver todos y Ver solo 1 asesor: KPIs, Metas, Llamadas por día, CRM */}
        <>
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {isVerTodos
              ? 'KPIs en el período (todos los asesores)'
              : canViewGeneral && viewMode === 'por_usuario' && selectedAdvisorId !== advisorId
                ? `KPIs de ${getAdvisorById(selectedAdvisorId)?.name ?? selectedAdvisorId} en el período`
                : 'KPIs en el período de tiempo seleccionado'}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
            <KPICard label={isVerTodos ? 'Leads con actividad' : 'Leads asignados'} value={isVerTodos ? kpisGeneral.leadsConActividad : kpisPeriodo.leadsAsignadosEnRango} color="blue" className={kpiCompact} tooltip={{ significado: isVerTodos ? 'Leads con al menos una llamada o reunión.' : 'Leads con actividad en el período.', calculo: 'En el rango de fechas.' }} />
            <KPICard label="Llamadas realizadas" value={isVerTodos ? kpisGeneral.llamadasRealizadas : kpisPeriodo.llamadasRealizadas} color="cyan" className={kpiCompact} tooltip={{ significado: isVerTodos ? 'Total llamadas del equipo.' : 'Llamadas realizadas en el período.', calculo: 'En el rango de fechas.' }} />
            <KPICard label="Llamadas contestadas" value={isVerTodos ? kpisGeneral.llamadasContestadas : kpisPeriodo.llamadasContestadas} color="cyan" className={kpiCompact} tooltip={{ significado: 'Llamadas contestadas.', calculo: 'En el período.' }} />
            <KPICard label={isVerTodos ? 'Reuniones agendadas' : 'Reuniones o presentaciones agendadas'} value={isVerTodos ? kpisGeneral.reunionesAgendadas : kpisPeriodo.reunionesAgendadas} color="purple" className={kpiCompact} tooltip={{ significado: 'Reuniones/citas en el período.', calculo: 'En el rango.' }} />
            <KPICard label="Tasa de contacto" value={`${(isVerTodos ? kpisGeneral.tasaContacto : kpisPeriodo.tasaContacto).toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: 'Porcentaje de llamadas contestadas.', calculo: '(Contestadas / Total) × 100.' }} />
            <KPICard label="Tasa de agendamiento" value={`${(isVerTodos ? kpisGeneral.tasaAgendamiento : kpisPeriodo.tasaAgendamiento).toFixed(1)}%`} color="green" className={kpiCompact} tooltip={{ significado: 'Porcentaje que agendó.', calculo: '(Reuniones / Contestadas) × 100.' }} />
          </div>
        </section>

            {/* Metas: misma vista; en Ver todos la meta es "por asesor" y las barras son total equipo */}
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-accent-cyan" />
            {isVerTodos ? 'Metas de llamadas (equipo)' : effectiveAdvisorId === advisorId ? 'Metas de llamadas' : `Metas de llamadas — ${getAdvisorById(effectiveAdvisorId)?.name ?? effectiveAdvisorId}`}
          </h2>

          <div className="space-y-2 text-sm text-gray-300">
            <p>
              {isVerTodos ? (
                <>Meta diaria: <strong className="text-accent-cyan">{metaLlamadasDiarias}</strong> llamadas <strong>por asesor</strong> ({numAsesores} asesores → total {progresoMetas.metaDiaria} hoy). Leads nuevos por asesor: día 1 → <strong>{leadsNuevosDia1}</strong>, día 2 → <strong>{leadsNuevosDia2}</strong>, día 3 → <strong>{leadsNuevosDia3}</strong>.</>
              ) : (
                <>Meta diaria: <strong className="text-accent-cyan">{metaLlamadasDiarias}</strong> llamadas. Leads nuevos: día 1 → <strong>{leadsNuevosDia1}</strong>, día 2 → <strong>{leadsNuevosDia2}</strong>, día 3 → <strong>{leadsNuevosDia3}</strong> llamadas.</>
              )}
            </p>
            <p className="text-[11px] text-gray-500">Para cambiar estas metas: menú lateral → <Link to="/system" className="font-semibold text-accent-cyan hover:underline">Configuración del sistema</Link>.</p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Meta diaria (hoy)</span>
                <span className={progresoMetas.llamadasHoy >= progresoMetas.metaDiaria ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
                  {progresoMetas.llamadasHoy} / {progresoMetas.metaDiaria}
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-600 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progresoMetas.pctHoy)}%`,
                    backgroundColor: progresoMetas.pctHoy >= 100 ? 'var(--accent-green)' : progresoMetas.pctHoy > 0 ? 'var(--accent-amber)' : 'var(--accent-red)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Meta semanal (últimos 7 días)</span>
                <span className={progresoMetas.llamadasSemana >= progresoMetas.metaSemanal ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
                  {progresoMetas.llamadasSemana} / {progresoMetas.metaSemanal}
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-600 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progresoMetas.pctSemana)}%`,
                    backgroundColor: progresoMetas.pctSemana >= 100 ? 'var(--accent-green)' : progresoMetas.pctSemana > 0 ? 'var(--accent-amber)' : 'var(--accent-red)',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">Meta mensual (últimos 30 días)</span>
                <span className={progresoMetas.llamadasMes >= progresoMetas.metaMensual ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
                  {progresoMetas.llamadasMes} / {progresoMetas.metaMensual}
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-600 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progresoMetas.pctMes)}%`,
                    backgroundColor: progresoMetas.pctMes >= 100 ? 'var(--accent-green)' : progresoMetas.pctMes > 0 ? 'var(--accent-amber)' : 'var(--accent-red)',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            {effectiveAdvisorId === advisorId
              ? 'Verifica en "CRM — Mis leads por categoría" si estás cumpliendo las llamadas por lead nuevo (día 1, 2, 3).'
              : 'Progreso de este asesor frente a las metas configuradas.'}
          </p>
        </section>

        {/* Llamadas a leads nuevos por día de asignación (hoy, ayer, antier) — distinto a meta diaria */}
        <section className="rounded-xl border border-surface-500 bg-surface-800/80 p-4 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-accent-purple" />
            Llamadas a leads por día de asignación
          </h2>
          <p className="text-[11px] text-gray-500">
            {isVerTodos
              ? 'Llamadas del equipo a leads asignados hoy, ayer y antier. La meta por día es por asesor (Configuración del sistema). Haz clic en &quot;Ver nombres&quot; para ver los leads.'
              : 'Cuántas llamadas has hecho a los leads que se te asignaron hoy, ayer y antier. La meta por día viene de Configuración del sistema (día 1, 2, 3). Haz clic en &quot;Ver nombres&quot; para ver a quién llamar.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { key: 'hoy' as const, label: 'Leads asignados hoy', ...llamadasPorDiaAsignacion.hoy },
              { key: 'ayer' as const, label: 'Leads asignados ayer', ...llamadasPorDiaAsignacion.ayer },
              { key: 'antier' as const, label: 'Leads asignados antier', ...llamadasPorDiaAsignacion.antier },
            ].map(({ key, label, leads: list, meta, hechas, restantes }) => (
              <div key={key} className="rounded-lg border border-surface-500 bg-surface-700/60 p-3">
                <div className="text-xs font-medium text-gray-400 mb-1">{label}</div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-lg font-semibold text-white">{hechas}</span>
                  <span className="text-gray-500 text-xs">/ {meta} llamadas</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-500">{restantes} restantes</span>
                  <button
                    type="button"
                    onClick={() => setLeadsListModal(key)}
                    className="text-[11px] font-medium text-accent-cyan hover:underline"
                  >
                    Ver nombres
                  </button>
                </div>
                {list.length === 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">Sin leads asignados este día</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CRM */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent-cyan" />
            {isVerTodos ? 'CRM — Leads de todos los asesores por categoría' : effectiveAdvisorId === advisorId ? 'CRM — Mis leads por categoría' : `CRM — Leads de ${getAdvisorById(effectiveAdvisorId)?.name ?? effectiveAdvisorId} por categoría`}
          </h2>
          <p className="text-[10px] text-gray-500 mb-2">
            Los leads se ubican por categoría. Cada tarjeta muestra llamadas, speed to lead y notas. Verifica aquí qué te queda por hacer según tu norte.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {CRM_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl overflow-hidden flex flex-col min-h-[120px] section-futuristic border border-surface-500/80"
              >
                <div className="bg-surface-700/90 px-2.5 py-1.5 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-medium text-white">{cat.label}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-[10px] font-medium">
                    {leadsByCategory[cat.id].length}
                  </span>
                </div>
                <div className="p-1.5 flex-1 overflow-y-auto max-h-[380px] space-y-1">
                  {leadsByCategory[cat.id].length === 0 ? (
                    <p className="text-[10px] text-gray-500 py-3 text-center">Ninguno</p>
                  ) : (
                    leadsByCategory[cat.id].map(({ lead, numLlamadas, speedToLead, notasLlamadas, leadNote }) => (
                      <CRMCard
                        key={lead.id}
                        lead={lead}
                        numLlamadas={numLlamadas}
                        speedToLead={speedToLead}
                        notasLlamadas={notasLlamadas}
                        leadNote={leadNote}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
          {myLeads.length === 0 && (
            <div className="rounded-lg border border-surface-500 px-3 py-4 text-center text-gray-500 text-xs mt-2">
              {isVerTodos ? 'Ningún lead en el equipo.' : effectiveAdvisorId === advisorId ? 'No tienes leads asignados.' : 'Este usuario no tiene leads asignados.'}
            </div>
          )}
        </section>

        {/* Resumen por asesor (solo en Ver todos) */}
        {isVerTodos && (
          <section className="rounded-xl border border-surface-500 overflow-hidden">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3 pt-3">Resumen por asesor en el período</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th className="px-2 py-2 font-medium">Asesor</th>
                  <th className="px-2 py-2 font-medium">Llamadas</th>
                  <th className="px-2 py-2 font-medium">Contestadas</th>
                  <th className="px-2 py-2 font-medium">Reuniones</th>
                  <th className="px-2 py-2 font-medium">Tasa contacto</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((a) => {
                  const callsA = getCallsInRange(dateFrom, dateTo).filter((c) => c.advisorId === a.id);
                  const meetingsA = getMeetingsInRange(dateFrom, dateTo).filter((m) => m.advisorId === a.id);
                  const contestadas = callsA.filter((c) => c.outcome === 'answered' || c.outcome === 'completed').length;
                  const tasa = callsA.length > 0 ? (contestadas / callsA.length) * 100 : 0;
                  return (
                    <tr key={a.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                      <td className="px-2 py-2 text-white">{a.name}</td>
                      <td className="px-2 py-2 text-accent-cyan">{callsA.length}</td>
                      <td className="px-2 py-2">{contestadas}</td>
                      <td className="px-2 py-2 text-accent-purple">{meetingsA.length}</td>
                      <td className="px-2 py-2">{tasa.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}
          </>

      </div>

      {chatOpen && (
        <InsightsChat onClose={() => setChatOpen(false)} />
      )}

      {/* Modal: nombres de leads por día de asignación */}
      {leadsListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLeadsListModal(null)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-xl bg-surface-800 border border-surface-500 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-500">
              <h3 className="text-sm font-semibold text-white">
                {leadsListModal === 'hoy' && 'Leads asignados hoy'}
                {leadsListModal === 'ayer' && 'Leads asignados ayer'}
                {leadsListModal === 'antier' && 'Leads asignados antier'}
              </h3>
              <button type="button" onClick={() => setLeadsListModal(null)} className="p-1.5 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-4 space-y-1.5">
              {llamadasPorDiaAsignacion[leadsListModal].leads.length === 0 ? (
                <p className="text-xs text-gray-500">Ningún lead asignado este día.</p>
              ) : (
                llamadasPorDiaAsignacion[leadsListModal].leads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-2 py-1.5 text-sm text-white">
                    <span className="w-2 h-2 rounded-full bg-accent-cyan/60 shrink-0" />
                    {lead.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
