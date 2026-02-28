import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import {
  metricsGlobal,
  metricsByAdvisor,
  objectionsByCount,
  advisors,
  callsVolumeByDay,
} from '@/data/mockData';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, Calendar, TrendingUp, Phone, Users, Video, DollarSign } from 'lucide-react';
import KpiTooltip from '@/components/KpiTooltip';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

const fm = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Number(n).toLocaleString('es-CO')}`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const min = (s: number) => (s < 60 ? `${s}s` : `${(s / 60).toFixed(1)} min`);

export default function WeeklyReport() {
  const [weekOffset, setWeekOffset] = useState(0);
  const now = new Date();
  const weekEnd = subDays(now, weekOffset * 7);
  const weekStart = subDays(weekEnd, 6);
  const weekLabel = `${format(weekStart, 'd MMM', { locale: es })} – ${format(weekEnd, 'd MMM yyyy', { locale: es })}`;

  const advisorList = advisors.filter((a) => metricsByAdvisor[a.id]).slice(0, 8);
  const agendadas = metricsGlobal.meetingsBooked ?? 91;
  const asistidas = metricsGlobal.meetingsAttended ?? 69;
  const canceladas = metricsGlobal.meetingsCanceled ?? 8;
  const pendientes = Math.max(0, agendadas - asistidas - canceladas);

  return (
    <>
      <PageHeader
        title="Reporte semanal"
        subtitle="Resumen de la semana · Números y tendencias"
        backTo="/"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-surface-700 border border-surface-500 px-2 py-1.5">
              <Calendar className="w-4 h-4 text-accent-cyan" />
              <select
                value={weekOffset}
                onChange={(e) => setWeekOffset(Number(e.target.value))}
                className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer"
              >
                {[0, 1, 2, 3, 4].map((i) => {
                  const end = subDays(now, i * 7);
                  const start = subDays(end, 6);
                  return (
                    <option key={i} value={i}>
                      {format(start, 'd/MM')} – {format(end, 'd/MM/yy')}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-glow-cyan transition-shadow"
            >
              <Download className="w-4 h-4" />
              Descargar PDF
            </button>
          </div>
        }
      />
      <div className="p-4 md:p-6 space-y-8 max-w-6xl mx-auto">
        {/* Hero */}
        <section className="rounded-2xl border border-surface-500/80 bg-gradient-to-br from-surface-800 to-surface-800/50 p-6 md:p-8 shadow-card">
          <p className="text-accent-cyan font-medium text-sm uppercase tracking-wider mb-1">Semana seleccionada</p>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-2">
            {weekLabel}
          </h2>
          <p className="text-gray-400 text-sm">
            Resumen de actividad, llamadas, citas y cierres de la semana.
          </p>
        </section>

        {/* KPIs en grid */}
        <section>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-cyan" />
            Números de la semana
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-blue overflow-hidden shadow-[0_0_20px_-8px_rgba(77,171,247,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">Leads <KpiTooltip significado="Total de leads con actividad en la semana." calculo="Leads únicos con llamada o reunión en el período." /></p>
              <p className="text-xl font-bold text-accent-blue mt-0.5">{metricsGlobal.totalLeads}</p>
              <div className="mb-3" />
            </div>
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden shadow-[0_0_20px_-8px_rgba(0,240,255,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">Llamadas <KpiTooltip significado="Total de llamadas realizadas." calculo="Suma de todas las llamadas en la semana." /></p>
              <p className="text-xl font-bold text-accent-cyan mt-0.5">{metricsGlobal.callsMade}</p>
              <p className="text-xs text-gray-500 mb-3">Contestación {pct(metricsGlobal.answerRate)}</p>
            </div>
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-purple overflow-hidden shadow-[0_0_20px_-8px_rgba(178,75,243,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">Agendadas <KpiTooltip significado="Reuniones agendadas en la semana." calculo="Cantidad de citas/videollamadas programadas." /></p>
              <p className="text-xl font-bold text-accent-purple mt-0.5">{metricsGlobal.meetingsBooked}</p>
              <p className="text-xs text-gray-500 mb-3">Asistieron {metricsGlobal.meetingsAttended}</p>
            </div>
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-green overflow-hidden shadow-[0_0_20px_-8px_rgba(0,230,118,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">Facturación <KpiTooltip significado="Ingresos por ventas en la semana." calculo="Suma del monto vendido en reuniones cerradas." /></p>
              <p className="text-xl font-bold text-accent-green mt-0.5">{fm(metricsGlobal.revenue)}</p>
              <p className="text-xs text-gray-500 mb-3">Efectivo cobrado {fm(metricsGlobal.cashCollected)}</p>
            </div>
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-amber overflow-hidden shadow-[0_0_20px_-8px_rgba(255,176,32,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">ROAS <KpiTooltip significado="Retorno de la inversión en publicidad." calculo="Ingresos atribuidos / gasto en publicidad." /></p>
              <p className="text-xl font-bold text-accent-amber mt-0.5">{metricsGlobal.ROAS}x</p>
              <div className="mb-3" />
            </div>
            <div className="rounded-xl border border-surface-500/80 bg-surface-800 pl-4 border-l-4 border-l-accent-cyan overflow-hidden shadow-[0_0_20px_-8px_rgba(0,240,255,0.2)]">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-3 flex items-center gap-0.5">Tiempo al lead <KpiTooltip significado="Tiempo promedio hasta el primer contacto." calculo="Promedio de (primer contacto − creación del lead)." /></p>
              <p className="text-xl font-bold text-accent-cyan mt-0.5">
                {metricsGlobal.speedToLeadAvg != null ? min(metricsGlobal.speedToLeadAvg) : '—'}
              </p>
              <div className="mb-3" />
            </div>
          </div>
        </section>

        {/* Volumen por día */}
        <section className="rounded-xl border border-surface-500/80 bg-surface-800 p-4 md:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-accent-cyan" />
            Volumen: llamadas, citas/presentaciones y cierres
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsVolumeByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3a" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#8b9cb5" />
                <YAxis tick={{ fontSize: 11 }} stroke="#8b9cb5" />
                <Tooltip
                  contentStyle={{ background: '#0d1219', border: '1px solid #1e2a3a', borderRadius: '8px' }}
                  labelStyle={{ color: '#f0f4f8' }}
                />
                <Legend />
                <Bar dataKey="llamadas" name="Llamadas" fill="#4dabf7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="citasPresentaciones" name="Citas / presentaciones" fill="#b24bf3" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cierres" name="Cierres" fill="#00e676" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Ranking por asesor */}
        <section className="rounded-xl border border-surface-500/80 bg-surface-800 overflow-hidden shadow-card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider p-4 pb-0 flex items-center gap-2">
            <Users className="w-4 h-4 text-accent-cyan" />
            Ranking por asesor
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-700/80 text-left text-gray-400">
                  <th className="px-4 py-3 font-medium">Asesor</th>
                  <th className="px-4 py-3 font-medium">Leads</th>
                  <th className="px-4 py-3 font-medium">Llamadas</th>
                  <th className="px-4 py-3 font-medium">Tiempo al lead</th>
                  <th className="px-4 py-3 font-medium">Agendadas</th>
                  <th className="px-4 py-3 font-medium">Asistidas</th>
                  <th className="px-4 py-3 font-medium">Facturación</th>
                  <th className="px-4 py-3 font-medium">Efectivo cobrado</th>
                  <th className="px-4 py-3 font-medium">Tasa contacto</th>
                  <th className="px-4 py-3 font-medium">Tasa agendamiento</th>
                </tr>
              </thead>
              <tbody>
                {advisorList.map((a, i) => {
                  const m = metricsByAdvisor[a.id]!;
                  return (
                    <tr key={a.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                      <td className="px-4 py-3 text-white font-medium">
                        {i === 0 && '🥇 '}
                        {i === 1 && '🥈 '}
                        {i === 2 && '🥉 '}
                        {a.name}
                      </td>
                      <td className="px-4 py-3 text-accent-cyan">{m.totalLeads ?? 0}</td>
                      <td className="px-4 py-3 text-accent-cyan">{m.callsMade ?? 0}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {m.speedToLeadAvg != null ? min(m.speedToLeadAvg) : '—'}
                      </td>
                      <td className="px-4 py-3 text-accent-purple">{m.meetingsBooked ?? 0}</td>
                      <td className="px-4 py-3 text-accent-cyan">{m.meetingsAttended ?? 0}</td>
                      <td className="px-4 py-3 text-accent-green">{m.revenue != null ? fm(m.revenue) : '—'}</td>
                      <td className="px-4 py-3 text-accent-green">{m.cashCollected != null ? fm(m.cashCollected) : '—'}</td>
                      <td className="px-4 py-3">{m.contactRate != null ? pct(m.contactRate) : '—'}</td>
                      <td className="px-4 py-3">{m.bookingRate != null ? pct(m.bookingRate) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Estado de agendas + Objeciones */}
        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-xl border border-surface-500/80 bg-surface-800 p-4 md:p-6 shadow-card">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-accent-purple" />
              Estado de agendas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-surface-700/80 p-3 text-center">
                <p className="text-2xl font-bold text-accent-purple">{agendadas}</p>
                <p className="text-xs text-gray-400">Agendadas</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-3 text-center">
                <p className="text-2xl font-bold text-accent-amber">{pendientes}</p>
                <p className="text-xs text-gray-400">Pendientes</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-3 text-center">
                <p className="text-2xl font-bold text-accent-red">{canceladas}</p>
                <p className="text-xs text-gray-400">Canceladas</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-3 text-center">
                <p className="text-2xl font-bold text-accent-cyan">{asistidas}</p>
                <p className="text-xs text-gray-400">Asistieron</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-3 text-center">
                <p className="text-2xl font-bold text-accent-green">{metricsGlobal.effectiveAppointments ?? 0}</p>
                <p className="text-xs text-gray-400">Calificadas</p>
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-surface-500/80 bg-surface-800 p-4 md:p-6 shadow-card">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Objeciones más repetidas
            </h3>
            <ul className="space-y-2">
              {objectionsByCount.map((o) => (
                <li key={o.name} className="flex items-center justify-between rounded-lg bg-surface-700/80 px-3 py-2">
                  <span className="font-medium text-white capitalize">{o.name}</span>
                  <span className="px-2 py-0.5 rounded bg-accent-red/20 text-accent-red text-sm font-medium">
                    {o.count}x
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Resumen e accionables */}
        <section className="rounded-xl border border-surface-500/80 bg-surface-800 p-4 md:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent-green" />
            Resumen y accionables
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2">
              <span className="text-accent-cyan">•</span>
              Tasa de contestación en <strong className="text-white">{pct(metricsGlobal.answerRate)}</strong>; reforzar seguimiento en &lt; 48h a leads sin respuesta.
            </li>
            <li className="flex gap-2">
              <span className="text-accent-cyan">•</span>
              Objeciones más repetidas: <strong className="text-white">{objectionsByCount.slice(0, 3).map((o) => o.name).join(', ')}</strong> → preparar respuestas tipo y material de apoyo.
            </li>
            <li className="flex gap-2">
              <span className="text-accent-cyan">•</span>
              Facturación semanal <strong className="text-accent-green">{fm(metricsGlobal.revenue)}</strong>, efectivo cobrado {fm(metricsGlobal.cashCollected)}. ROAS {metricsGlobal.ROAS}x.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
