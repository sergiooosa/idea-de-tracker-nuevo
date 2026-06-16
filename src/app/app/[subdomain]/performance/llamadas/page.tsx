"use client";

import { useState, useMemo, useEffect, Fragment } from 'react';
import { useT } from '@/contexts/LocaleContext';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { format, subDays } from 'date-fns';
import { FileText, Pencil, Phone, PhoneCall, PhoneOff, PhoneMissed, PhoneForwarded, Search, Sparkles, User, X, Plus } from 'lucide-react';
import NuevoRegistroModal from '@/components/dashboard/NuevoRegistroModal';
import { matchesLeadSearch } from '@/lib/performance-search';
import { toast } from 'sonner';
import EditRecordSheet from '@/components/dashboard/EditRecordSheet';
import type { LlamadasResponse, ApiLlamadaLog, LlamadaLead } from '@/types';

const minFmt = (m: number | null | undefined) => {
  if (m == null || m === undefined) return '—';
  return m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`;
};
/** Speed to lead: si estado es PDTE no se ha llamado aún → "—"; si no, valor de DB o 0 */
function speedDisplay(lead: LlamadaLead): string {
  const esPendiente = lead.estado?.toUpperCase() === 'PDTE';
  if (esPendiente) return '—';
  return minFmt(lead.speed_to_lead_min ?? 0);
}
const pct = (n: number) => `${n.toFixed(1)}%`;

const TIPO_PDTE = 'pdte';

/** Solo dígitos para comparar teléfonos entre formatos (+52… vs 52…) */
function phoneDigits(p: string | null | undefined): string {
  if (!p?.trim()) return '';
  return p.replace(/\D/g, '');
}

/** Llamadas efectivas (contestadas): muestran botones de acción */
function isAnswered(c: ApiLlamadaLog) {
  return c.tipoEvento?.startsWith('efectiva_') ?? false;
}

type ResultadoFiltro = 'todos' | 'contestadas' | 'no_contestaron' | 'no_interesadas' | 'interesadas';

const ESTADOS_NO_CONTESTARON = new Set([
  'no_contestado', 'buzon_voz', 'no_contesto', 'no_contestada',
]);
const ESTADOS_NO_INTERESADAS = new Set([
  'no_interesado', 'no_calificada', 'no_elegible',
]);
const ESTADOS_INTERESADAS = new Set([
  'calificada', 'interesado', 'programado', 'seguimiento', 'reagendado',
]);

function categoriaResultado(estado: string | null): ResultadoFiltro | null {
  // Normalizar: trim, lowercase, quitar llaves de valores serializados desde JSONB
  // (p.ej. "{seguimiento}") y unificar espacios con guion bajo ("no interesado" → "no_interesado").
  const s = (estado ?? '').trim().toLowerCase().replace(/^\{+|\}+$/g, '').replace(/\s+/g, '_');
  if (!s || s === 'pdte') return null;
  // Variantes de seguimiento por tenant: seguimiento_1, seguimiento_2 … seguimiento_10 = interesadas.
  if (s.startsWith('seguimiento')) return 'interesadas';
  if (ESTADOS_NO_CONTESTARON.has(s) || s === 'nocontest') return 'no_contestaron';
  if (ESTADOS_NO_INTERESADAS.has(s)) return 'no_interesadas';
  if (ESTADOS_INTERESADAS.has(s)) return 'interesadas';
  return null;
}

const RESULTADO_FILTROS: { key: ResultadoFiltro; label: string; icon: typeof Phone; active: string; inactive: string; badge: string }[] = [
  { key: 'todos', label: 'Todos', icon: Phone, active: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50', inactive: 'hover:border-accent-cyan/30', badge: 'bg-accent-cyan/30' },
  { key: 'contestadas', label: 'Contestadas', icon: PhoneCall, active: 'bg-teal-400/20 text-teal-400 border-teal-400/50', inactive: 'hover:border-teal-400/30', badge: 'bg-teal-400/30' },
  { key: 'no_contestaron', label: 'No contestaron', icon: PhoneMissed, active: 'bg-accent-amber/20 text-accent-amber border-accent-amber/50', inactive: 'hover:border-accent-amber/30', badge: 'bg-accent-amber/30' },
  { key: 'no_interesadas', label: 'No interesadas', icon: PhoneOff, active: 'bg-red-400/20 text-red-400 border-red-400/50', inactive: 'hover:border-red-400/30', badge: 'bg-red-400/30' },
  { key: 'interesadas', label: 'Interesadas', icon: PhoneForwarded, active: 'bg-emerald-400/20 text-emerald-400 border-emerald-400/50', inactive: 'hover:border-emerald-400/30', badge: 'bg-emerald-400/30' },
];

export default function PerformanceLlamadasPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedAdvisorId, setExpandedAdvisorId] = useState<string | null>(null);
  const [modalSelectorCalls, setModalSelectorCalls] = useState<ApiLlamadaLog[] | null>(null);
  const [modalCall, setModalCall] = useState<ApiLlamadaLog | null>(null);
  const [editingRecord, setEditingRecord] = useState<{
    id?: number;
    id_registro?: number;
    nombre_lead?: string | null;
    mail_lead?: string | null;
    phone?: string | null;
    closer?: string | null;
    estado?: string | null;
    id_user_ghl?: string | null;
  } | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [resultadoFiltro, setResultadoFiltro] = useState<ResultadoFiltro>('todos');

  const { data, loading, refetch } = useApiData<LlamadasResponse>('/api/data/llamadas', { from: dateFrom, to: dateTo });

  const contestadasLeadIds = useMemo(() => {
    const ids = new Set<number>();
    if (!data?.leads || !data?.registros) return ids;
    for (const lead of data.leads) {
      const leadPhone = phoneDigits(lead.phone);
      const leadMail = lead.mail_lead?.trim().toLowerCase() ?? '';
      const leadCloser = lead.closer_mail?.trim().toLowerCase() ?? '';
      const hasAnswered = data.registros.some((c) => {
        if (c.tipoEvento === TIPO_PDTE || c.outcome !== 'answered') return false;
        const rid = c.id_registro;
        if (rid != null && rid > 0) return rid === lead.id_registro;
        const cPhone = phoneDigits(c.phone);
        if (!leadPhone || cPhone !== leadPhone) return false;
        if (leadMail) return (c.leadEmail?.trim().toLowerCase() ?? '') === leadMail;
        return leadCloser !== '' && (c.closerMail?.trim().toLowerCase() ?? '') === leadCloser;
      });
      if (hasAnswered) ids.add(lead.id_registro);
    }
    return ids;
  }, [data?.leads, data?.registros]);

  const resultadoCounts = useMemo(() => {
    const counts: Record<ResultadoFiltro, number> = { todos: 0, contestadas: 0, no_contestaron: 0, no_interesadas: 0, interesadas: 0 };
    if (!data?.leads) return counts;
    for (const l of data.leads) {
      counts.todos++;
      const cat = categoriaResultado(l.estado);
      if (cat) counts[cat]++;
      if (contestadasLeadIds.has(l.id_registro)) counts.contestadas++;
    }
    return counts;
  }, [data?.leads, contestadasLeadIds]);

  const leadsFiltered = useMemo(() => {
    if (!data?.leads || resultadoFiltro === 'todos') return data?.leads ?? [];
    if (resultadoFiltro === 'contestadas') return data.leads.filter((l) => contestadasLeadIds.has(l.id_registro));
    return data.leads.filter((l) => categoriaResultado(l.estado) === resultadoFiltro);
  }, [data?.leads, resultadoFiltro, contestadasLeadIds]);

  /** Leads agrupados por asesor (closer_mail); el listado expandido muestra esto */
  const leadsByAdvisor = useMemo(() => {
    if (!leadsFiltered.length) return {} as Record<string, LlamadaLead[]>;
    const map: Record<string, LlamadaLead[]> = {};
    for (const l of leadsFiltered) {
      const email = l.closer_mail?.trim().toLowerCase();
      const nombre = (l as { nombre_closer?: string | null }).nombre_closer?.trim().toLowerCase();
      const key = email || nombre || 'sin asignar';
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return map;
  }, [leadsFiltered]);

  /** Leads pendientes por llamar — estado PDTE, nunca contactados en el rango de fechas */
  const leadsPendientes = useMemo(() => {
    return data?.pendingLeads ?? [] as LlamadaLead[];
  }, [data?.pendingLeads]);

  const leadsPendientesFiltrados = useMemo(() => {
    const q = leadSearch.trim().toLowerCase();
    if (!q) return leadsPendientes;
    return leadsPendientes.filter((l) =>
      matchesLeadSearch(leadSearch.trim(), [l.nombre_lead, l.mail_lead, l.phone, l.closer_mail, String(l.id_registro)])
    );
  }, [leadsPendientes, leadSearch]);

  const filteredAdvisorMetrics = useMemo(() => {
    if (resultadoFiltro === 'todos' || !data?.registros) return null;
    const metrics: Record<string, { advisorName: string; advisorEmail: string; leadsAsignados: number; llamadas: number; contestadas: number; pctContestacion: number; tiempoAlLead: number | null }> = {};
    for (const [advisorKey, leads] of Object.entries(leadsByAdvisor)) {
      let totalCalls = 0;
      let answered = 0;
      const speedValues: number[] = [];
      for (const lead of leads) {
        const leadPhone = phoneDigits(lead.phone);
        const leadMail = lead.mail_lead?.trim().toLowerCase() ?? '';
        const leadCloser = lead.closer_mail?.trim().toLowerCase() ?? '';
        const calls = data.registros.filter((c) => {
          if (c.tipoEvento === TIPO_PDTE) return false;
          const rid = c.id_registro;
          if (rid != null && rid > 0) return rid === lead.id_registro;
          const cPhone = phoneDigits(c.phone);
          if (!leadPhone || cPhone !== leadPhone) return false;
          if (leadMail) return (c.leadEmail?.trim().toLowerCase() ?? '') === leadMail;
          return leadCloser !== '' && (c.closerMail?.trim().toLowerCase() ?? '') === leadCloser;
        });
        totalCalls += calls.length;
        answered += calls.filter((c) => c.outcome === 'answered').length;
        if (lead.speed_to_lead_min != null && lead.estado?.toUpperCase() !== 'PDTE') {
          speedValues.push(lead.speed_to_lead_min);
        }
      }
      const serverMetrics = data.advisorMetrics[advisorKey];
      metrics[advisorKey] = {
        advisorName: serverMetrics?.advisorName ?? advisorKey,
        advisorEmail: serverMetrics?.advisorEmail ?? advisorKey,
        leadsAsignados: leads.length,
        llamadas: totalCalls,
        contestadas: answered,
        pctContestacion: totalCalls > 0 ? (answered / totalCalls) * 100 : 0,
        tiempoAlLead: speedValues.length > 0 ? speedValues.reduce((a, b) => a + b, 0) / speedValues.length : null,
      };
    }
    return metrics;
  }, [resultadoFiltro, leadsByAdvisor, data?.registros, data?.advisorMetrics]);

  const leadsByAdvisorFiltered = useMemo(() => {
    const q = leadSearch.trim();
    if (!q) return leadsByAdvisor;
    const out: Record<string, LlamadaLead[]> = {};
    for (const [k, arr] of Object.entries(leadsByAdvisor)) {
      const f = arr.filter((l) =>
        matchesLeadSearch(q, [
          l.nombre_lead,
          l.mail_lead,
          l.phone,
          l.id_user_ghl,
          String(l.id_registro),
          l.closer_mail,
        ]),
      );
      if (f.length) out[k] = f;
    }
    return out;
  }, [leadsByAdvisor, leadSearch]);

  useEffect(() => {
    const q = leadSearch.trim();
    if (!q) return;
    const keys = Object.keys(leadsByAdvisorFiltered);
    if (keys.length === 1) setExpandedAdvisorId(keys[0]);
  }, [leadSearch, leadsByAdvisorFiltered]);

  /**
   * Llamadas del lead: por id_registro en log (correcto). Sin id_registro en log (legacy):
   * mismo teléfono + (mismo email del lead si existe, si no mismo closer).
   * Nunca por includes(nombre): "Eli" mezclaba Elizabeth, Araceli, etc.
   */
  const getCallsForLead = (lead: LlamadaLead): ApiLlamadaLog[] => {
    if (!data?.registros) return [];
    const leadPhone = phoneDigits(lead.phone);
    const leadMail = lead.mail_lead?.trim().toLowerCase() ?? '';
    const leadCloser = lead.closer_mail?.trim().toLowerCase() ?? '';

    return data.registros.filter((c) => {
      if (c.tipoEvento === TIPO_PDTE) return false;

      const rid = c.id_registro;
      if (rid != null && rid > 0) {
        return rid === lead.id_registro;
      }

      const cPhone = phoneDigits(c.phone);
      if (!leadPhone || cPhone !== leadPhone) return false;
      if (leadMail) {
        return (c.leadEmail?.trim().toLowerCase() ?? '') === leadMail;
      }
      return leadCloser !== '' && (c.closerMail?.trim().toLowerCase() ?? '') === leadCloser;
    });
  };

  /** Resumen de tipos de llamada del lead (sin pdte) para mostrar en la fila */
  const getResumenLlamadas = (lead: LlamadaLead): string => {
    const calls = getCallsForLead(lead);
    if (calls.length === 0) return '—';
    return calls.map((c) => c.tipoEvento).join(', ');
  };

  const openLogsForLead = (lead: LlamadaLead) => {
    const calls = getCallsForLead(lead);
    if (calls.length === 0) {
      toast.info('No hay llamadas con transcripción para este lead (pendientes no se muestran).');
      return;
    }
    if (calls.length === 1) {
      setModalCall(calls[0]);
      setModalSelectorCalls(null);
    } else {
      setModalSelectorCalls(calls);
      setModalCall(null);
    }
  };

  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 7);
  const agg = data?.agg ?? { totalLeads: 0, totalCalls: 0, answered: 0, speedAvg: 0, attemptsAvg: 0, firstContactAttempts: 0, answerRate: 0 };
  const kpiCompact = "[&>p:nth-child(2)]:text-base [&>p:first-child]:text-[9px] [&>p:first-child]:mt-1 rounded-lg pl-3";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-gray-400 text-sm animate-pulse">Cargando datos de llamadas...</div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 space-y-3 text-sm min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-0">
        <button
          type="button"
          onClick={() => setShowNuevoModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-cyan text-black text-xs font-semibold hover:bg-accent-cyan/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva entrada
        </button>
        <span className="text-xs text-gray-400">Rango de fechas (actividad):</span>
        <DateRangePicker
          dateFrom={dateFrom}
          dateTo={dateTo}
          onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
          defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
          defaultTo={format(defaultTo, 'yyyy-MM-dd')}
        />
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          <input
            type="search"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
            placeholder="Buscar lead: nombre, teléfono, email, ID registro, ID GHL…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-700 border border-surface-500 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-cyan"
            aria-label="Buscar leads en llamadas"
          />
        </div>
      </div>
      {leadSearch.trim() && (
        <p className="text-[10px] text-gray-500">
          {Object.values(leadsByAdvisorFiltered).reduce((n, a) => n + a.length, 0)} lead(s) coinciden
          {Object.keys(leadsByAdvisorFiltered).length === 0 ? ' — prueba otro término' : ''}
        </p>
      )}
      <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
        <KPICard label={t.performance.llamadas.kpis.leads} value={agg.totalLeads} color="blue" className={kpiCompact} tooltip={{ significado: 'Leads únicos con al menos una llamada.', calculo: 'Distintos mail_lead en el rango.' }} />
        <KPICard label={t.performance.llamadas.kpis.total} value={agg.totalCalls} color="cyan" className={kpiCompact} tooltip={{ significado: 'Todas las llamadas en el rango.', calculo: 'Suma de eventos.' }} />
        <KPICard label={t.performance.llamadas.kpis.tiempoLead} value={minFmt(agg.speedAvg)} color="purple" className={kpiCompact} tooltip={{ significado: 'Tiempo promedio en contactar al lead.', calculo: 'Promedio de speed_to_lead.' }} />
        <KPICard label={t.performance.llamadas.kpis.intentosProm} value={agg.attemptsAvg.toFixed(1)} color="amber" className={kpiCompact} tooltip={{ significado: 'Intentos promedios por lead.', calculo: 'Total llamadas / leads únicos.' }} />
        <KPICard label={t.performance.llamadas.kpis.intentosPrimerContacto} value={agg.firstContactAttempts.toFixed(1)} color="purple" className={kpiCompact} tooltip={{ significado: 'Llamadas hasta que el lead contesta.', calculo: 'Promedio de intentos por lead.' }} />
        <KPICard label="Tasa de contestación" value={pct(agg.answerRate * 100)} color="green" className={kpiCompact} tooltip={{ significado: '% de llamadas contestadas.', calculo: '(Contestadas / Total) × 100.' }} />
      </div>

      {/* ── Filtro por resultado ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Resultado:</span>
        {RESULTADO_FILTROS.map(({ key, label, icon: Icon, active, inactive, badge }) => {
          const count = resultadoCounts[key];
          const isActive = resultadoFiltro === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setResultadoFiltro(key)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? active
                  : `bg-surface-700 text-gray-400 border-surface-500 ${inactive} hover:text-gray-300`
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1 text-[10px] ${isActive ? badge : 'bg-surface-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        {resultadoFiltro !== 'todos' && (
          <span className="text-[11px] text-gray-500 ml-1">
            Mostrando {leadsFiltered.length} de {resultadoCounts.todos} leads
          </span>
        )}
      </div>

      {/* ── Leads pendientes por llamar ─────────────────────────────────────── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-accent-amber" />
          Pendientes por llamar
          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${leadsPendientes.length > 0 ? 'bg-accent-amber/20 border-accent-amber/30 text-accent-amber' : 'bg-surface-600 border-surface-500 text-gray-500'}`}>
            {leadsPendientes.length}
          </span>
        </h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-700">
                <tr className="text-left text-gray-400">
                  <th className="px-2 py-2 font-medium">Lead</th>
                  <th className="px-2 py-2 font-medium">Teléfono</th>
                  <th className="px-2 py-2 font-medium">Asesor</th>
                  <th className="px-2 py-2 font-medium">Llegó</th>
                </tr>
              </thead>
              <tbody>
                {leadsPendientes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Sin leads pendientes en este rango de fechas.
                    </td>
                  </tr>
                ) : leadsPendientesFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-center text-gray-500 text-xs">
                      Ningún lead pendiente coincide con la búsqueda.
                    </td>
                  </tr>
                ) : leadsPendientesFiltrados.map((lead) => (
                  <tr key={lead.id_registro} className="border-t border-surface-500 hover:bg-surface-700/50">
                    <td className="px-2 py-1.5">
                      <span className="text-white font-medium text-[11px]">
                        {lead.nombre_lead ?? '—'}
                      </span>
                      {lead.mail_lead && (
                        <div className="text-[10px] text-gray-500 truncate max-w-[160px]">{lead.mail_lead}</div>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-accent-cyan transition-colors font-mono"
                        >
                          <Phone className="w-3 h-3 shrink-0" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-400">
                      {lead.closer_mail ?? <span className="text-gray-600">Sin asignar</span>}
                    </td>
                    <td className="px-2 py-1.5 text-[10px] text-gray-500">
                      {lead.fecha_evento ? format(new Date(lead.fecha_evento), 'dd/MM HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.performance.llamadas.titulo}</h3>
        <div className="rounded-lg border border-surface-500 overflow-hidden">
          {Object.keys(leadsByAdvisor).length === 0 && Object.keys(data?.advisorMetrics ?? {}).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">{t.performance.llamadas.noData}</div>
          ) : leadSearch.trim() && Object.keys(leadsByAdvisorFiltered).length === 0 ? (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">Ningún lead coincide con «{leadSearch.trim()}».</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium w-6" />
                    <th className="px-2 py-2 font-medium">{t.performance.llamadas.lead}</th>
                    <th className="px-2 py-2 font-medium">{t.asesor.kpis.leadsAsignados}</th>
                    <th className="px-2 py-2 font-medium">{t.performance.llamadas.titulo}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.contestadas}</th>
                    <th className="px-2 py-2 font-medium">{t.dashboard.kpis.tasaContacto}</th>
                    <th className="px-2 py-2 font-medium">{t.performance.llamadas.speedToLead}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = leadSearch.trim();
                    const isFiltered = resultadoFiltro !== 'todos';
                    const advisorKeys = q
                      ? [...Object.keys(leadsByAdvisorFiltered)].sort((a, b) => a.localeCompare(b))
                      : isFiltered
                        ? [...Object.keys(leadsByAdvisor)].sort((a, b) => a.localeCompare(b))
                        : [...new Set([...Object.keys(leadsByAdvisor), ...Object.keys(data?.advisorMetrics ?? {})])].sort((a, b) => a.localeCompare(b));
                    if (isFiltered && !q && advisorKeys.length === 0) {
                      return (
                        <tr key="__empty">
                          <td colSpan={7} className="px-3 py-4 text-center text-gray-500 text-xs">
                            0 asesores con leads en esta categoría.
                          </td>
                        </tr>
                      );
                    }
                    return advisorKeys.map((advisorKey) => {
                      const isExpanded = expandedAdvisorId === advisorKey;
                      const metrics = isFiltered && filteredAdvisorMetrics ? filteredAdvisorMetrics[advisorKey] : data?.advisorMetrics[advisorKey];
                      const advisorLeads = (q ? leadsByAdvisorFiltered[advisorKey] : leadsByAdvisor[advisorKey]) ?? [];
                      return (
                        <Fragment key={advisorKey}>
                          <tr className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer" onClick={() => setExpandedAdvisorId(isExpanded ? null : advisorKey)}>
                            <td className="px-1 py-2 text-gray-400">
                              <span className="inline-block transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>˅</span>
                            </td>
                            <td className="px-2 py-2">
                              <span className="flex items-center gap-1.5 text-white font-medium">
                                <User className="w-3.5 h-3.5 text-accent-cyan" />
                                {metrics?.advisorName ?? advisorKey}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-gray-300">{metrics?.leadsAsignados ?? 0}</td>
                            <td className="px-2 py-2 text-accent-cyan">{metrics?.llamadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics?.contestadas ?? 0}</td>
                            <td className="px-2 py-2 text-accent-green">{metrics != null ? pct(metrics.pctContestacion) : '—'}</td>
                            <td className="px-2 py-2 text-gray-300">{minFmt(metrics?.tiempoAlLead ?? null)}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-surface-800/90">
                              <td colSpan={7} className="p-0">
                                <div className="px-3 py-2 border-t border-surface-500">
                                  <div className="text-[10px] text-gray-400 mb-1.5">Leads (registros) de {metrics?.advisorName ?? advisorKey} — clic en la fila abre las llamadas</div>
                                  <div className="rounded-lg border border-surface-500 overflow-x-auto max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-xs">
                                      <thead className="sticky top-0 bg-surface-700">
                                        <tr className="text-left text-gray-400">
                                          <th className="px-2 py-2 font-medium">Nombre</th>
                                          <th className="px-2 py-2 font-medium">Estado</th>
                                          <th className="px-2 py-2 font-medium">Llamadas realizadas</th>
                                          <th className="px-2 py-2 font-medium">Llamadas (tipo)</th>
                                          <th className="px-2 py-2 font-medium">Speed to lead</th>
                                          <th className="px-2 py-2 font-medium w-16" />
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {advisorLeads.length === 0 ? (
                                          <tr>
                                            <td colSpan={7} className="px-2 py-4 text-center text-gray-500 text-xs">No hay registros de leads en este rango para este asesor.</td>
                                          </tr>
                                        ) : advisorLeads.map((lead) => (
                                          <tr
                                            key={lead.id_registro}
                                            className="border-t border-surface-500 hover:bg-surface-600/50 cursor-pointer"
                                            onClick={() => openLogsForLead(lead)}
                                          >
                                            <td className="px-2 py-2 text-white">
                                              <div className="flex flex-col gap-0.5">
                                                <span>{lead.nombre_lead ?? lead.mail_lead ?? '—'}</span>
                                                {lead.phone && <span className="text-[10px] text-gray-400">{lead.phone}</span>}
                                                {lead.id_user_ghl && <span className="text-[10px] text-gray-500">ID GHL: {lead.id_user_ghl}</span>}
                                              </div>
                                            </td>
                                            <td className="px-2 py-2 text-gray-300">{lead.estado ?? '—'}</td>
                                            <td className="px-2 py-2 text-accent-cyan font-medium">{getCallsForLead(lead).length}</td>
                                            <td className="px-2 py-2 text-gray-400" title={getResumenLlamadas(lead)}>{getResumenLlamadas(lead)}</td>
                                            <td className="px-2 py-2 text-gray-400">{speedDisplay(lead)}</td>
                                            <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
                                              <button
                                                type="button"
                                                onClick={() => setEditingRecord({
                                                  id_registro: lead.id_registro,
                                                  nombre_lead: lead.nombre_lead,
                                                  mail_lead: lead.mail_lead,
                                                  phone: lead.phone,
                                                  closer: lead.closer_mail,
                                                  estado: lead.estado,
                                                  id_user_ghl: lead.id_user_ghl,
                                                })}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-accent-cyan hover:bg-accent-cyan/10 border border-transparent hover:border-accent-cyan/30 transition-colors"
                                                title="Editar registro"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {modalSelectorCalls && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalSelectorCalls(null)} aria-hidden />
          <div className="relative w-full max-w-md rounded-xl bg-surface-800 border border-surface-500 shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm">Seleccione la llamada a ver</h3>
              <button type="button" onClick={() => setModalSelectorCalls(null)} className="p-1 rounded text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {modalSelectorCalls.map((call) => (
                <li key={call.id}>
                  <button type="button" onClick={() => { setModalCall(call); setModalSelectorCalls(null); }} className="w-full text-left px-3 py-2 rounded-lg bg-surface-700 hover:bg-surface-600 text-gray-200 text-sm flex flex-col gap-0.5">
                    <span>{format(new Date(call.datetime), "dd/MM/yyyy 'a las' HH:mm")}</span>
                    <span className="text-[10px] text-gray-400">Estado: {call.tipoEvento}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {editingRecord && (
        <EditRecordSheet
          type="llamada"
          record={editingRecord}
          advisors={data?.advisors?.map(a => ({ name: a.name, email: a.email })) ?? []}
          embudoEtapas={data?.embudoEtapas?.map(e => ({ nombre: e.nombre })) ?? []}
          onClose={() => setEditingRecord(null)}
          onSaved={() => { setEditingRecord(null); refetch(); }}
        />
      )}
      {modalCall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalCall(null)} aria-hidden />
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-xl bg-surface-800 border border-accent-cyan/30 shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0 bg-surface-700/50">
              <h3 className="font-semibold text-white">{format(new Date(modalCall.datetime), "dd/MM/yyyy 'a las' HH:mm")} · {modalCall.tipoEvento}</h3>
              <div className="flex items-center gap-2">
                {isAnswered(modalCall) && (
                  <button
                    type="button"
                    onClick={() => { setEditingRecord({ id: modalCall.id, nombre_lead: modalCall.leadName ?? undefined, closer: modalCall.closerMail ?? undefined, estado: modalCall.tipoEvento ?? undefined }); setModalCall(null); }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-accent-amber/20 text-accent-amber border border-accent-amber/30 hover:bg-accent-amber/30"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                )}
                <button type="button" onClick={() => setModalCall(null)} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {modalCall.transcripcion && (
                <div>
                  <h4 className="text-xs font-semibold text-accent-cyan mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Transcripción</h4>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface-700/50 rounded-lg p-3">{modalCall.transcripcion}</div>
                </div>
              )}
              {modalCall.iaDescripcion && (
                <div>
                  <h4 className="text-xs font-semibold text-accent-purple mb-1 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Análisis IA</h4>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed bg-surface-700/50 rounded-lg p-3">{modalCall.iaDescripcion}</div>
                </div>
              )}
              {!modalCall.transcripcion && !modalCall.iaDescripcion && (
                <p className="text-gray-500 text-sm">No hay transcripción ni análisis IA disponible para este evento.</p>
              )}
            </div>
          </div>
        </div>
      )}
      <NuevoRegistroModal
        open={showNuevoModal}
        onClose={() => setShowNuevoModal(false)}
        onSuccess={() => refetch()}
        tipo="llamada"
      />
    </div>
  );
}
