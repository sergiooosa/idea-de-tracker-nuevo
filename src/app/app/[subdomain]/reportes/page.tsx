"use client";

import { useState, useMemo } from 'react';
import {
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
} from 'date-fns';
import {
  Phone,
  MessageSquare,
  TrendingUp,
  Users,
  BarChart2,
  Target,
  Megaphone,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import PageHeader from '@/components/dashboard/PageHeader';
import KPICard from '@/components/dashboard/KPICard';
import { formatCurrency, formatPct, formatMinutes } from '@/lib/format';

// ─── Types ─────────────────────────────────────────────────────────────────

type PeriodType = 'hoy' | 'semana' | 'mes' | 'personalizado';

interface ReportKpis {
  totalLeads: number;
  callsMade: number;
  answerRate: number;
  meetingsBooked: number;
  meetingsAttended: number;
  meetingsClosed: number;
  tasaCierre: number;
  tasaAgendamiento: number;
  revenue: number;
  cashCollected: number;
  avgTicket: number;
  speedToLeadAvg: number;
  noShows: number;
}

interface ReportVolumeDay {
  date: string;
  llamadas: number;
  citas: number;
  cierres: number;
}

interface ReportAdvisorRow {
  nombre: string;
  email: string | null;
  leads: number;
  llamadas: number;
  agendadas: number;
  asistidas: number;
  cierres: number;
  revenue: number;
  tasaContacto: number;
  tasaAgendamiento: number;
}

interface ReportObjecion {
  name: string;
  count: number;
  percent: number;
}

interface ReportAds {
  gastoTotal: number;
  impresiones: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  plataformas: string[];
}

interface ReportChats {
  total: number;
  leadsUnicos: number;
  tasaRespuesta: number;
  speedToLeadAvg: number | null; // segundos
  topClosers: Array<{ name: string; count: number }>;
}

interface ReportMeta {
  label: string;
  actual: number;
  meta: number;
  cumple: boolean;
  pct: number;
  unidad?: string;
}

interface ReportData {
  kpis: ReportKpis;
  volumeByDay: ReportVolumeDay[];
  advisorRanking: ReportAdvisorRow[];
  objeciones: ReportObjecion[];
  ads: ReportAds | null;
  chats: ReportChats | null;
  alertasMetas: ReportMeta[] | null;
}

// ─── Mock data (reemplazar con fetch real cuando la API esté lista) ─────────

const MOCK_DATA: ReportData = {
  kpis: {
    totalLeads: 148,
    callsMade: 312,
    answerRate: 0.58,
    meetingsBooked: 67,
    meetingsAttended: 52,
    meetingsClosed: 19,
    tasaCierre: 0.365,
    tasaAgendamiento: 0.453,
    revenue: 47800,
    cashCollected: 31200,
    avgTicket: 2516,
    speedToLeadAvg: 8.3,
    noShows: 11,
  },
  volumeByDay: [
    { date: 'Lu', llamadas: 48, citas: 12, cierres: 3 },
    { date: 'Ma', llamadas: 55, citas: 10, cierres: 2 },
    { date: 'Mi', llamadas: 61, citas: 14, cierres: 4 },
    { date: 'Ju', llamadas: 43, citas: 9, cierres: 3 },
    { date: 'Vi', llamadas: 52, citas: 11, cierres: 5 },
    { date: 'Sá', llamadas: 28, citas: 6, cierres: 1 },
    { date: 'Do', llamadas: 25, citas: 5, cierres: 1 },
  ],
  advisorRanking: [
    {
      nombre: 'Carlos M.',
      email: 'carlos@ejemplo.com',
      leads: 38,
      llamadas: 87,
      agendadas: 21,
      asistidas: 17,
      cierres: 7,
      revenue: 16800,
      tasaContacto: 0.68,
      tasaAgendamiento: 0.55,
    },
    {
      nombre: 'Ana R.',
      email: 'ana@ejemplo.com',
      leads: 31,
      llamadas: 74,
      agendadas: 18,
      asistidas: 14,
      cierres: 5,
      revenue: 11900,
      tasaContacto: 0.62,
      tasaAgendamiento: 0.58,
    },
    {
      nombre: 'Luis G.',
      email: 'luis@ejemplo.com',
      leads: 29,
      llamadas: 68,
      agendadas: 15,
      asistidas: 12,
      cierres: 4,
      revenue: 9200,
      tasaContacto: 0.59,
      tasaAgendamiento: 0.52,
    },
    {
      nombre: 'María T.',
      email: 'maria@ejemplo.com',
      leads: 26,
      llamadas: 55,
      agendadas: 9,
      asistidas: 7,
      cierres: 2,
      revenue: 7100,
      tasaContacto: 0.51,
      tasaAgendamiento: 0.35,
    },
    {
      nombre: 'Pedro H.',
      email: 'pedro@ejemplo.com',
      leads: 24,
      llamadas: 28,
      agendadas: 4,
      asistidas: 2,
      cierres: 1,
      revenue: 2800,
      tasaContacto: 0.44,
      tasaAgendamiento: 0.17,
    },
  ],
  objeciones: [
    { name: 'Precio', count: 28, percent: 0.38 },
    { name: 'No es el momento', count: 18, percent: 0.24 },
    { name: 'Necesita consultar', count: 14, percent: 0.19 },
    { name: 'Ya tiene proveedor', count: 9, percent: 0.12 },
    { name: 'Otro', count: 5, percent: 0.07 },
  ],
  ads: {
    gastoTotal: 3840,
    impresiones: 124500,
    clicks: 2380,
    ctr: 0.0191,
    cpm: 30.8,
    cpc: 1.61,
    plataformas: ['Meta Ads'],
  },
  chats: {
    total: 203,
    leadsUnicos: 148,
    tasaRespuesta: 0.82,
    speedToLeadAvg: 142,
    topClosers: [
      { name: 'Carlos M.', count: 58 },
      { name: 'Ana R.', count: 47 },
      { name: 'Luis G.', count: 41 },
    ],
  },
  alertasMetas: [
    { label: 'Llamadas realizadas', actual: 312, meta: 300, cumple: true, pct: 1.04, unidad: 'llamadas' },
    { label: 'Agendamiento', actual: 0.453, meta: 0.5, cumple: false, pct: 0.906, unidad: '%' },
    { label: 'Tasa de cierre', actual: 0.365, meta: 0.35, cumple: true, pct: 1.043, unidad: '%' },
    { label: 'Revenue', actual: 47800, meta: 50000, cumple: false, pct: 0.956, unidad: '$' },
  ],
};

// ─── Period helpers ─────────────────────────────────────────────────────────

function getPeriodDates(period: PeriodType, customFrom: string, customTo: string) {
  const today = new Date();
  switch (period) {
    case 'hoy':
      return {
        from: format(startOfDay(today), 'yyyy-MM-dd'),
        to: format(endOfDay(today), 'yyyy-MM-dd'),
      };
    case 'semana':
      return {
        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'mes':
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      };
    case 'personalizado':
      return { from: customFrom, to: customTo };
  }
}

function periodLabel(period: PeriodType, from: string, to: string) {
  switch (period) {
    case 'hoy': return 'Hoy';
    case 'semana': return 'Esta semana';
    case 'mes': return 'Este mes';
    case 'personalizado': return `${from} → ${to}`;
  }
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5 text-accent-cyan" />
      {label}
    </h3>
  );
}

function MetaBar({ meta }: { meta: ReportMeta }) {
  const pct = Math.min(meta.pct * 100, 100);
  const fmt = (v: number) => {
    if (meta.unidad === '$') return formatCurrency(v);
    if (meta.unidad === '%') return formatPct(v);
    return v.toLocaleString('es');
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-300">{meta.label}</span>
        <span className={meta.cumple ? 'text-accent-green font-medium' : 'text-accent-amber font-medium'}>
          {fmt(meta.actual)} / {fmt(meta.meta)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-600 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${meta.cumple ? 'bg-accent-green' : 'bg-accent-amber'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 md:p-4 space-y-3 animate-pulse">
      <div className="h-8 rounded-lg bg-surface-700/60 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-700/60" />
        ))}
      </div>
      <div className="h-40 rounded-xl bg-surface-700/60" />
      <div className="h-48 rounded-xl bg-surface-700/60" />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const today = new Date();
  const [period, setPeriod] = useState<PeriodType>('semana');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(today, 'yyyy-MM-dd'));
  // Loading state: simula fetch real — reemplazar con useApiData cuando exista la API
  const [loading] = useState(false);

  const { from, to } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  // TODO (AUT-386 followup): reemplazar MOCK_DATA con:
  // const { data, loading } = useApiData<ReportData>('/api/data/report', { from, to, period_type: period });
  const data: ReportData | null = MOCK_DATA;

  const kpis = data?.kpis ?? null;

  const PERIODS: { id: PeriodType; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'mes', label: 'Este mes' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={`Periodo: ${periodLabel(period, from, to)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="flex rounded-lg bg-surface-700/80 p-0.5 border border-surface-500">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    period === p.id
                      ? 'bg-accent-cyan text-black'
                      : 'text-gray-300 hover:text-white hover:bg-surface-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date picker — solo visible en modo personalizado */}
            {period === 'personalizado' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg bg-surface-700 border border-surface-500 px-2 py-1 text-sm text-gray-300">
                  <Calendar className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer w-32"
                  />
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer w-32"
                  />
                </div>
              </div>
            )}
          </div>
        }
      />

      {loading ? (
        <LoadingSkeleton />
      ) : !data ? (
        <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-sm">
          No hay datos para el periodo seleccionado.
        </div>
      ) : (
        <div className="p-3 md:p-4 space-y-4 max-w-6xl mx-auto min-w-0 overflow-x-hidden text-sm">

          {/* ── KPIs principales ─────────────────────────────────────────── */}
          <section>
            <SectionTitle icon={TrendingUp} label="Métricas del periodo" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
              {kpis && [
                { label: 'Leads', value: kpis.totalLeads, color: 'blue' as const },
                {
                  label: 'Llamadas',
                  value: kpis.callsMade,
                  color: 'cyan' as const,
                  sub: `Contestación ${formatPct(kpis.answerRate)}`,
                },
                {
                  label: 'Agendadas',
                  value: kpis.meetingsBooked,
                  color: 'purple' as const,
                  sub: `Asistidas ${kpis.meetingsAttended}`,
                },
                {
                  label: 'Cierres',
                  value: kpis.meetingsClosed,
                  color: 'green' as const,
                  sub: `Tasa ${formatPct(kpis.tasaCierre)}`,
                },
                {
                  label: 'Facturación',
                  value: formatCurrency(kpis.revenue),
                  color: 'amber' as const,
                  sub: `Efectivo ${formatCurrency(kpis.cashCollected)}`,
                },
                {
                  label: 'Tiempo al lead',
                  value: formatMinutes(kpis.speedToLeadAvg),
                  color: 'blue' as const,
                  sub: `No-shows ${kpis.noShows}`,
                },
              ].map(({ label, value, color, sub }) => (
                <KPICard
                  key={label}
                  label={label}
                  value={value}
                  subValue={sub}
                  color={color}
                />
              ))}
            </div>
          </section>

          {/* ── Volumen por día ────────────────────────────────────────────── */}
          {data.volumeByDay.length > 0 && (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60">
              <SectionTitle icon={BarChart2} label="Volumen diario" />
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.volumeByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b9cb5' }} stroke="#1e2a3a" />
                    <YAxis tick={{ fontSize: 11, fill: '#8b9cb5' }} stroke="#1e2a3a" />
                    <Tooltip
                      contentStyle={{
                        background: '#0d1219',
                        border: '1px solid #1e2a3a',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="llamadas" name="Llamadas" fill="#4dabf7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="citas" name="Citas" fill="#b24bf3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cierres" name="Cierres" fill="#00e676" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* ── Ranking por asesor ─────────────────────────────────────────── */}
          {data.advisorRanking.length > 0 && (
            <section className="rounded-xl overflow-hidden section-futuristic border border-surface-500/60">
              <div className="p-3 pb-0">
                <SectionTitle icon={Users} label="Ranking por asesor" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface-700/60 text-left text-gray-400">
                      {['Asesor', 'Leads', 'Llamadas', 'Agend.', 'Asist.', 'Cierres', 'Facturación', 'Contacto%', 'Agend.%'].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.advisorRanking.map((a, i) => (
                      <tr
                        key={`${i}-${a.email ?? a.nombre}`}
                        className="border-t border-surface-500/40 hover:bg-surface-700/40 transition-colors"
                      >
                        <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                          {i === 0 && '🥇 '}
                          {i === 1 && '🥈 '}
                          {i === 2 && '🥉 '}
                          {a.nombre}
                        </td>
                        <td className="px-3 py-2 text-accent-blue">{a.leads}</td>
                        <td className="px-3 py-2 text-accent-cyan">{a.llamadas}</td>
                        <td className="px-3 py-2 text-accent-purple">{a.agendadas}</td>
                        <td className="px-3 py-2 text-gray-300">{a.asistidas}</td>
                        <td className="px-3 py-2 text-accent-green">{a.cierres}</td>
                        <td className="px-3 py-2 text-accent-amber">{formatCurrency(a.revenue)}</td>
                        <td className="px-3 py-2 text-gray-300">{formatPct(a.tasaContacto)}</td>
                        <td className="px-3 py-2 text-gray-300">{formatPct(a.tasaAgendamiento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Metas (condicional) ────────────────────────────────────────── */}
          {data.alertasMetas !== null && data.alertasMetas.length > 0 && (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60">
              <SectionTitle icon={Target} label="Cumplimiento de metas" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.alertasMetas.map((m) => (
                  <MetaBar key={m.label} meta={m} />
                ))}
              </div>
            </section>
          )}

          {/* ── Objeciones (condicional) ───────────────────────────────────── */}
          {data.objeciones.length > 0 && (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60">
              <SectionTitle icon={Phone} label="Objeciones detectadas" />
              <div className="space-y-2">
                {data.objeciones.map((o) => (
                  <div key={o.name} className="flex items-center gap-3">
                    <div className="w-32 text-xs text-gray-300 truncate shrink-0">{o.name}</div>
                    <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-purple/80 rounded-full"
                        style={{ width: `${o.percent * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-gray-400 shrink-0">
                      {o.count} ({Math.round(o.percent * 100)}%)
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Chats (condicional — solo si data.chats !== null) ─────────── */}
          {data.chats !== null && (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60">
              <SectionTitle icon={MessageSquare} label="Chats / WhatsApp" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 mb-3">
                <KPICard label="Total chats" value={data.chats.total} color="cyan" />
                <KPICard label="Leads únicos" value={data.chats.leadsUnicos} color="blue" />
                <KPICard label="Tasa respuesta" value={formatPct(data.chats.tasaRespuesta)} color="green" />
                <KPICard
                  label="Tiempo al lead"
                  value={data.chats.speedToLeadAvg !== null ? formatMinutes(data.chats.speedToLeadAvg / 60) : '—'}
                  color="amber"
                />
              </div>
              {data.chats.topClosers.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Top closers</p>
                  <div className="flex flex-wrap gap-2">
                    {data.chats.topClosers.map((c) => (
                      <span
                        key={c.name}
                        className="inline-flex items-center gap-1 rounded-full bg-surface-600/80 border border-surface-500 px-2.5 py-1 text-xs text-gray-200"
                      >
                        {c.name}
                        <span className="text-accent-cyan font-semibold ml-1">{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Ads (condicional — solo si data.ads !== null) ─────────────── */}
          {data.ads !== null && (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60">
              <SectionTitle icon={Megaphone} label={`Publicidad · ${data.ads.plataformas.join(', ')}`} />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-2">
                {[
                  { label: 'Gasto total', value: formatCurrency(data.ads.gastoTotal), color: 'amber' as const },
                  { label: 'Impresiones', value: data.ads.impresiones.toLocaleString('es'), color: 'blue' as const },
                  { label: 'Clicks', value: data.ads.clicks.toLocaleString('es'), color: 'cyan' as const },
                  { label: 'CTR', value: formatPct(data.ads.ctr), color: 'green' as const },
                  { label: 'CPM', value: formatCurrency(data.ads.cpm), color: 'purple' as const },
                  { label: 'CPC', value: formatCurrency(data.ads.cpc), color: 'red' as const },
                ].map(({ label, value, color }) => (
                  <KPICard key={label} label={label} value={value} color={color} />
                ))}
              </div>
            </section>
          )}

        </div>
      )}
    </>
  );
}
