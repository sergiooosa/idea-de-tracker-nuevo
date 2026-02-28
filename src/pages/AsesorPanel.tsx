import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import KPICard from '@/components/KPICard';
import InsightsChat from '@/components/InsightsChat';
import {
  calls,
  getLeadsByAdvisor,
  getCallsByLead,
  getCallsByLeadInRange,
} from '@/data/mockData';
import { CheckCircle2, AlertCircle, Phone, MessageSquare, Users, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import KpiTooltip from '@/components/KpiTooltip';
import { format, subDays } from 'date-fns';
import type { Lead } from '@/types';

const advisorId = 'adv-1'; // Sergio como asesor logueado (mock)
const myCalls = calls.filter((c) => c.advisorId === advisorId);

type PeriodFilter = 'all' | '7' | '15' | '30';
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'Todo el tiempo',
  '7': 'Últimos 7 días',
  '15': 'Últimos 15 días',
  '30': 'Último mes',
};

const goals = [
  {
    id: '1',
    label: 'Llamar 3 veces al lead el primer día',
    done: 12,
    total: 15,
    unit: 'leads',
  },
  {
    id: '2',
    label: 'Speed to lead < 15 min',
    done: true,
    broken: false,
  },
  {
    id: '3',
    label: 'Seguimiento a leads sin contacto en 24h',
    done: 5,
    total: 5,
    unit: 'leads',
  },
];

const pendingActions = [
  { type: 'llamadas_restantes', label: 'Leads que requieren llamadas restantes hoy', count: 4 },
  { type: 'sin_primer_contacto', label: 'Leads sin primer contacto', count: 2 },
  { type: 'reunion_proxima', label: 'Leads con reunión agendada próxima', count: 3 },
];

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
    <div className="rounded-lg border border-surface-500 bg-surface-700/80 p-3 text-sm">
      <div className="font-medium text-white mb-2">{lead.name}</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <span className="text-gray-500"># Llamadas</span>
        <span className="text-accent-cyan font-medium">{numLlamadas}</span>
        <span className="text-gray-500">Speed to lead</span>
        <span className="text-gray-300">{speedToLead}</span>
      </div>
      <div className="mt-2 pt-2 border-t border-surface-500">
        <button
          type="button"
          onClick={() => setShowNotas(!showNotas)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent-cyan w-full text-left"
        >
          <FileText className="w-3.5 h-3.5" />
          {hasNotas ? 'Qué se habló (notas)' : 'Sin notas'}
          {hasNotas && (showNotas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
        </button>
        {showNotas && hasNotas && (
          <div className="mt-1.5 space-y-1.5 text-xs text-gray-400">
            {leadNote?.trim() && (
              <p><span className="text-gray-500">Lead:</span> {leadNote}</p>
            )}
            {notasLlamadas.map((n, i) => (
              <p key={i}>
                <span className="text-gray-500">{format(new Date(n.date), 'dd/MM HH:mm')}:</span> {n.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AsesorPanel() {
  const [chatOpen, setChatOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const { dateFrom, dateTo } = useMemo(() => {
    const to = new Date();
    if (period === 'all') return { dateFrom: '2000-01-01', dateTo: format(to, 'yyyy-MM-dd') };
    const days = period === '30' ? 30 : period === '15' ? 15 : 7;
    return {
      dateFrom: format(subDays(to, days), 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd'),
    };
  }, [period]);

  const myLeads = useMemo(() => getLeadsByAdvisor(advisorId), []);

  // Llamadas del asesor por lead (para número de llamadas, speed to lead y notas)
  const leadsWithStats = useMemo(() => {
    return myLeads.map((lead) => {
      const allCallsForLead = getCallsByLead(lead.id);
      const callsDelAsesor = allCallsForLead.filter((c) => c.advisorId === advisorId);
      const callsInRange =
        period === 'all'
          ? callsDelAsesor
          : callsDelAsesor.filter(
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
  }, [myLeads, period, dateFrom, dateTo]);

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

  const kpis = {
    llamadasHoy: myCalls.filter((c) => new Date(c.datetime).toDateString() === new Date().toDateString()).length,
    reunionesHoy: 4,
    contactRate: 0.85,
    revenue: 19746,
  };

  return (
    <>
      <PageHeader
        title="Panel asesor"
        subtitle="Metas y alertas"
        action={
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-700 border border-surface-500 text-sm text-gray-300 hover:bg-surface-600 hover:text-white"
          >
            <MessageSquare className="w-4 h-4 text-accent-cyan" />
            Resumen
          </button>
        }
      />
      <div className="p-4 md:p-6 space-y-6">
        {/* Filtro de período: todo el tiempo o rango */}
        <section className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-400">Período:</span>
          <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500">
            {(['all', '7', '15', '30'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  period === p ? 'bg-accent-cyan text-white' : 'text-gray-300 hover:bg-surface-600 hover:text-white'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            KPIs personales (hoy / semana)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Llamadas hoy" value={kpis.llamadasHoy} color="cyan" tooltip={{ significado: 'Llamadas realizadas hoy.', calculo: 'Conteo de llamadas con fecha de hoy.' }} />
            <KPICard label="Reuniones hoy" value={kpis.reunionesHoy} color="purple" tooltip={{ significado: 'Reuniones agendadas o tenidas hoy.', calculo: 'Reuniones con fecha de hoy.' }} />
            <KPICard label="Tasa de contacto" value={`${(kpis.contactRate * 100).toFixed(1)}%`} color="green" tooltip={{ significado: 'Porcentaje de llamadas contestadas.', calculo: '(Llamadas contestadas / Total llamadas) × 100.' }} />
            <KPICard label="Facturación semana" value={`$${kpis.revenue.toLocaleString('es-CO')}`} color="green" tooltip={{ significado: 'Ingresos por ventas en la semana.', calculo: 'Suma del revenue de reuniones cerradas en la semana.' }} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Metas (checklist + progreso)
          </h2>
          <div className="rounded-xl border border-surface-500 divide-y divide-surface-500">
            {goals.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-surface-700/50"
              >
                <div className="flex items-center gap-3">
                  {'total' in g ? (
                    <div className="w-8 h-8 rounded-full bg-surface-600 flex items-center justify-center text-sm font-medium text-accent-cyan">
                      {g.done}/{g.total}
                    </div>
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        g.broken ? 'bg-accent-red/20' : 'bg-accent-green/20'
                      }`}
                    >
                      {g.broken ? (
                        <AlertCircle className="w-4 h-4 text-accent-red" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-accent-green" />
                      )}
                    </div>
                  )}
                  <span className="text-white">{g.label}</span>
                </div>
                {'unit' in g && (
                  <span className="text-sm text-gray-400">
                    {g.done} / {g.total} {g.unit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Acciones pendientes
          </h2>
          <ul className="space-y-2">
            {pendingActions.map((a) => (
              <li
                key={a.type}
                className="flex items-center justify-between rounded-xl border border-surface-500 bg-surface-800 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent-amber/20">
                    <Phone className="w-4 h-4 text-accent-amber" />
                  </span>
                  <span className="text-white">{a.label}</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-accent-amber/20 text-accent-amber text-sm font-medium">
                  {a.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* CRM: Primera llamada, Seguimiento, Interesados, No interesados — se mueve solo por llamadas y estado */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-cyan" />
            CRM — Mis leads por categoría
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            Los leads se ubican solos en cada columna según si se llamó o no y su estado. Cada tarjeta muestra número de llamadas, speed to lead y notas (qué se habló).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {CRM_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-surface-500 bg-surface-800 overflow-hidden flex flex-col min-h-[200px]"
              >
                <div className="bg-surface-700 px-3 py-2 flex items-center justify-between shrink-0">
                  <span className="text-sm font-medium text-white">{cat.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan text-xs font-medium">
                    {leadsByCategory[cat.id].length}
                  </span>
                </div>
                <div className="p-2 flex-1 overflow-y-auto max-h-[420px] space-y-2">
                  {leadsByCategory[cat.id].length === 0 ? (
                    <p className="text-xs text-gray-500 py-4 text-center">Ninguno</p>
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
            <div className="rounded-xl border border-surface-500 px-4 py-6 text-center text-gray-500 text-sm mt-3">
              No tienes leads asignados.
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Progreso del día
          </h2>
          <div className="rounded-xl border border-surface-500 p-4 space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Llamadas realizadas</span>
                <span className="text-accent-cyan font-medium">8 / 15</span>
              </div>
              <div className="h-2 rounded-full bg-surface-600 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-cyan transition-all"
                  style={{ width: '53%' }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Seguimientos pendientes</span>
                <span className="text-accent-amber font-medium">4</span>
              </div>
              <div className="h-2 rounded-full bg-surface-600 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent-amber transition-all"
                  style={{ width: '27%' }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {chatOpen && (
        <InsightsChat onClose={() => setChatOpen(false)} />
      )}
    </>
  );
}
