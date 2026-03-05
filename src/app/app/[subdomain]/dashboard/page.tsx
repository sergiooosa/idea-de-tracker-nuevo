"use client";

import { useState, useMemo } from 'react';
import PageHeader from '@/components/dashboard/PageHeader';
import KPICard from '@/components/dashboard/KPICard';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import TagFilter from '@/components/dashboard/TagFilter';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import { useApiData } from '@/hooks/useApiData';
import type { DashboardResponse } from '@/types';
import { Target, X, UserCircle, Trophy, GitBranch, BarChart3 } from 'lucide-react';
import { subDays, format } from 'date-fns';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${n.toLocaleString('es-CO')}`;
const pctFmt = (n: number) => `${(n * 100).toFixed(1)}%`;
const minFmt = (m: number) => (m < 1 ? `${Math.round(m * 60)}s` : `${m.toFixed(1)} min`);

const defaultDateTo = new Date();
const defaultDateFrom = subDays(defaultDateTo, 7);

const OBJECTION_PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState(format(defaultDateFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultDateTo, 'yyyy-MM-dd'));
  const [modalObjeciones, setModalObjeciones] = useState(false);
  const [selectedObjeccion, setSelectedObjeccion] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data, loading } = useApiData<DashboardResponse>('/api/data/dashboard', { from: dateFrom, to: dateTo });

  const kpis = data?.kpis ?? {
    totalLeads: 0, callsMade: 0, contestadas: 0, answerRate: 0,
    meetingsBooked: 0, meetingsAttended: 0, meetingsCanceled: 0, meetingsClosed: 0,
    effectiveAppointments: 0, tasaCierre: 0, tasaAgendamiento: 0,
    revenue: 0, cashCollected: 0, avgTicket: 0, speedToLeadAvg: 0,
    avgAttempts: 0, attemptsToFirstContactAvg: 0,
  };
  const objeciones = data?.objeciones ?? [];
  const volumeByDay = data?.volumeByDay ?? [];
  const advisorRanking = data?.advisorRanking ?? [];

  if (loading) {
    return (
      <>
        <PageHeader title="Panel ejecutivo" subtitle="Vista ejecutiva · Todo en 1" />
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400 text-sm animate-pulse">Cargando panel ejecutivo...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Panel ejecutivo" subtitle="Vista ejecutiva · Todo en 1" />
      <div className="p-3 md:p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden text-sm">
        <section className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultDateFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultDateTo, 'yyyy-MM-dd')}
          />
          <TagFilter
            tags={data?.tagsDisponibles ?? []}
            selected={selectedTags}
            onChange={setSelectedTags}
          />
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">KPIs operativos</h2>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
            {[
              { label: 'Leads generados', value: kpis.totalLeads, color: 'blue' },
              { label: 'Llamadas', value: kpis.callsMade, color: 'cyan' },
              { label: 'Contestadas', value: kpis.contestadas, color: 'cyan', sub: `Tasa: ${pctFmt(kpis.answerRate)}` },
              { label: 'Tiempo al lead', value: minFmt(kpis.speedToLeadAvg), color: 'purple' },
              { label: 'Intentos promedio', value: kpis.avgAttempts.toFixed(1), color: 'amber' },
              { label: 'Ingresos', value: fm(kpis.revenue), color: 'green' },
              { label: 'Efectivo cobrado', value: fm(kpis.cashCollected), color: 'green' },
              { label: 'Ticket promedio', value: fm(kpis.avgTicket), color: 'blue' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className={`rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-${color} kpi-card-fixed`}>
                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">{label}</p>
                <p className={`text-base font-bold mt-0.5 text-accent-${color} break-words`}>{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                <div className="kpi-card-spacer" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-accent-purple" />
            Embudo de ventas
          </h2>
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
            {data?.embudoPersonalizado && data.embudoPersonalizado.length > 0 ? (
              data.embudoPersonalizado
                .sort((a, b) => a.orden - b.orden)
                .map((etapa) => {
                  const count = data.distribucionEmbudo?.[etapa.nombre] ?? 0;
                  const total = kpis.meetingsBooked || 1;
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
                  return (
                    <div
                      key={etapa.id}
                      className="rounded-lg pl-3 overflow-hidden flex flex-col bg-surface-800/80 border border-surface-500 kpi-card-fixed"
                      style={{ borderLeftColor: etapa.color ?? '#8b5cf6', borderLeftWidth: 3 }}
                    >
                      <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate">{etapa.nombre}</p>
                      <p className="text-base font-bold mt-0.5 text-white">{count}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{pct}% del total</p>
                      <div className="kpi-card-spacer" />
                    </div>
                  );
                })
            ) : (
              <>
                {[
                  { label: 'Agendadas', value: kpis.meetingsBooked, color: 'purple', sub: `Tasa agend.: ${kpis.tasaAgendamiento.toFixed(1)}%` },
                  { label: 'Asistidas', value: kpis.meetingsAttended, color: 'cyan', sub: `% Asist.: ${kpis.meetingsBooked > 0 ? pctFmt(kpis.meetingsAttended / kpis.meetingsBooked) : '0%'}` },
                  { label: 'Canceladas', value: kpis.meetingsCanceled, color: 'red' },
                  { label: 'Cerradas', value: kpis.meetingsClosed, color: 'green', sub: `Tasa cierre: ${kpis.tasaCierre.toFixed(1)}%` },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className={`rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-${color} kpi-card-fixed`}>
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1">{label}</p>
                    <p className={`text-base font-bold mt-0.5 text-accent-${color} break-words`}>{value}</p>
                    {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
                    <div className="kpi-card-spacer" />
                  </div>
                ))}
              </>
            )}
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-3">
          <section className="rounded-lg p-3 section-futuristic">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-accent-red" />
              Objeciones más comunes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2 items-start">
              <div className="h-36 sm:h-40 w-full min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                    <Pie data={objeciones} dataKey="count" nameKey="name" cx="50%" cy="45%" innerRadius="58%" outerRadius="78%" paddingAngle={2}>
                      {objeciones.map((_, i) => (
                        <Cell key={i} fill={OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a' }}
                      formatter={(_, name, props) => {
                        const p = props?.payload as { count?: number; percent?: number } | undefined;
                        return [`${p?.count ?? 0}x (${p?.percent ?? 0}%)`, String(name).charAt(0).toUpperCase() + String(name).slice(1)];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1">
                {objeciones.map((o, i) => (
                  <li key={o.name}>
                    <button type="button" onClick={() => { setSelectedObjeccion(o.name); setModalObjeciones(true); }} className="w-full flex items-center justify-between gap-2 rounded-md bg-surface-700 px-2.5 py-1.5 text-left hover:bg-surface-600">
                      <span className="flex items-center gap-2 font-medium text-white capitalize">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length] }} />
                        {o.name}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">{o.count}x</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="rounded-lg p-3 section-futuristic">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Volumen: llamadas, citas y cierres</h2>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: '#22262e', border: '1px solid #2a2f3a', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="llamadas" name="Llamadas" fill="#4dabf7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="citasPresentaciones" name="Citas" fill="#b24bf3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cierres" name="Cierres" fill="#00e676" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {((data?.metricasComputadas ?? []).filter(
          (m) => m.ubicacion === 'panel_ejecutivo' || m.ubicacion === 'ambos' || !m.ubicacion
        ).length > 0 || (data?.metricasPersonalizadas ?? []).filter(
          (m) => m.ubicacion === 'panel_ejecutivo' || m.ubicacion === 'ambos' || !m.ubicacion
        ).length > 0) && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-accent-green" />
              Métricas personalizadas
            </h2>
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5 sm:gap-2 [grid-auto-rows:minmax(64px,auto)]">
              {(data?.metricasComputadas ?? []).filter(
                (m) => m.ubicacion === 'panel_ejecutivo' || m.ubicacion === 'ambos' || !m.ubicacion
              ).length > 0
                ? (data?.metricasComputadas ?? [])
                    .filter((m) => m.ubicacion === 'panel_ejecutivo' || m.ubicacion === 'ambos' || !m.ubicacion)
                    .map((m) => (
                      <div key={m.id} className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate">{m.nombre}</p>
                        <p className="text-base font-bold mt-0.5 text-accent-green">{m.valor}</p>
                        {m.descripcion && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{m.descripcion}</p>}
                        <div className="kpi-card-spacer" />
                      </div>
                    ))
                : (data?.metricasPersonalizadas ?? [])
                    .filter((m) => m.ubicacion === 'panel_ejecutivo' || m.ubicacion === 'ambos' || !m.ubicacion)
                    .map((m) => (
                      <div key={m.id} className="rounded-lg pl-3 overflow-hidden flex flex-col card-futuristic-green kpi-card-fixed">
                        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 truncate">{m.name}</p>
                        <p className="text-base font-bold mt-0.5 text-accent-green">{m.increment}</p>
                        {m.description && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{m.description}</p>}
                        <div className="kpi-card-spacer" />
                      </div>
                    ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ranking por asesor</h2>
          <div className="rounded-lg border border-surface-500 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium">Asesor</th>
                    <th className="px-2 py-2 font-medium">Leads</th>
                    <th className="px-2 py-2 font-medium">Llamadas</th>
                    <th className="px-2 py-2 font-medium">Tiempo al lead</th>
                    <th className="px-2 py-2 font-medium">Agendadas</th>
                    <th className="px-2 py-2 font-medium">Asistidas</th>
                    <th className="px-2 py-2 font-medium">Facturación</th>
                    <th className="px-2 py-2 font-medium">Efectivo</th>
                    <th className="px-2 py-2 font-medium">Tasa contacto</th>
                    <th className="px-2 py-2 font-medium">Tasa agend.</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorRanking
                    .sort((a, b) => {
                      const sa = a.callsMade + a.meetingsBooked + a.meetingsAttended + a.revenue / 1000;
                      const sb = b.callsMade + b.meetingsBooked + b.meetingsAttended + b.revenue / 1000;
                      return sb - sa;
                    })
                    .map((a, i) => (
                      <tr key={a.advisorEmail ?? a.advisorName} className={clsx('border-t border-surface-500 hover:bg-surface-700/50', i === 0 && 'bg-accent-green/10')}>
                        <td className="px-2 py-2">
                          {i === 0 ? (
                            <span className="inline-flex items-center gap-1.5 font-medium text-accent-amber">
                              <Trophy className="w-4 h-4" /> {a.advisorName} <span className="text-[10px] uppercase">Mejor</span>
                            </span>
                          ) : (
                            <><span className="inline-block w-2 h-2 rounded-full bg-accent-green mr-2" />{a.advisorName}</>
                          )}
                        </td>
                        <td className="px-2 py-2 text-white">{a.totalLeads}</td>
                        <td className="px-2 py-2 text-accent-cyan">{a.callsMade}</td>
                        <td className="px-2 py-2 text-gray-300">{a.speedToLeadAvg != null ? minFmt(a.speedToLeadAvg) : '—'}</td>
                        <td className="px-2 py-2 text-accent-purple">{a.meetingsBooked}</td>
                        <td className="px-2 py-2 text-accent-cyan">{a.meetingsAttended}</td>
                        <td className="px-2 py-2 text-accent-green">{fm(a.revenue)}</td>
                        <td className="px-2 py-2 text-accent-green">{fm(a.cashCollected)}</td>
                        <td className="px-2 py-2">{pctFmt(a.contactRate)}</td>
                        <td className="px-2 py-2">{pctFmt(a.bookingRate)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {modalObjeciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setModalObjeciones(false); setSelectedObjeccion(null); }} aria-hidden />
          <div className="relative w-full max-w-lg max-h-[85vh] rounded-xl bg-surface-800 border border-surface-500 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-500 shrink-0">
              <h3 className="font-semibold text-white">{selectedObjeccion ? `Objeciones: ${selectedObjeccion}` : 'Objeciones'}</h3>
              <button type="button" onClick={() => { setModalObjeciones(false); setSelectedObjeccion(null); }} className="p-2 rounded-lg hover:bg-surface-600 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4">
              <ul className="space-y-2">
                {objeciones.map((o, i) => (
                  <li key={o.name} className="flex items-center justify-between rounded-lg bg-surface-700 px-3 py-2">
                    <span className="flex items-center gap-2 font-medium text-white capitalize">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: OBJECTION_PIE_COLORS[i % OBJECTION_PIE_COLORS.length] }} />
                      {o.name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">{o.count}x ({o.percent}%)</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
