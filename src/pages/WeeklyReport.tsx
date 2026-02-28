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
      <div className="p-3 md:p-4 space-y-3 max-w-6xl mx-auto min-w-0 max-w-full overflow-x-hidden text-sm">
        {/* Hero */}
        <section className="rounded-lg border border-surface-500/80 bg-gradient-to-br from-surface-800 to-surface-800/50 p-4 shadow-card">
          <p className="text-accent-cyan font-medium text-xs uppercase tracking-wider mb-0.5">Semana seleccionada</p>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white mb-1">
            {weekLabel}
          </h2>
          <p className="text-gray-400 text-xs">
            Resumen de actividad, llamadas, citas y cierres de la semana.
          </p>
        </section>

        {/* KPIs en grid */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-accent-cyan" />
            Números de la semana
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
            <div className="rounded-lg pl-3 overflow-hidden card-futuristic-blue kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">Leads generados <KpiTooltip significado="Contactos creados en GHL. Calificados = lo que determina la IA en la llamada." calculo="Contactos creados en GHL en el rango." /></p>
              <p className="text-base font-bold text-accent-blue mt-0.5">{metricsGlobal.totalLeads}</p>
              <div className="kpi-card-spacer" />
            </div>
            <div className="rounded-lg pl-3 overflow-hidden card-futuristic-cyan kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">Llamadas <KpiTooltip significado="Todas las llamadas realizadas en el rango seleccionado." calculo="Suma de todas las llamadas en el período." /></p>
              <p className="text-base font-bold text-accent-cyan mt-0.5">{metricsGlobal.callsMade}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Contestación {pct(metricsGlobal.answerRate)}</p>
            </div>
            <div className="rounded-lg pl-3 overflow-hidden card-futuristic-purple kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">Agendadas <KpiTooltip significado="Citas o presentaciones. Vienen de los calendarios de citas o presentaciones." calculo="Videollamadas de los calendarios en el período." /></p>
              <p className="text-base font-bold text-accent-purple mt-0.5">{metricsGlobal.meetingsBooked}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Asistieron {metricsGlobal.meetingsAttended}</p>
            </div>
            <div className="rounded-lg pl-3 overflow-hidden card-futuristic-green kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">Facturación <KpiTooltip significado="Lo que se vendió de la propiedad." calculo="Suma del monto vendido en reuniones cerradas." /></p>
              <p className="text-base font-bold text-accent-green mt-0.5">{fm(metricsGlobal.revenue)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Efectivo {fm(metricsGlobal.cashCollected)}</p>
            </div>
            <div className="rounded-lg pl-3 overflow-hidden card-futuristic-cyan kpi-card-fixed">
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tight mt-1 flex items-center gap-0.5">Tiempo al lead <KpiTooltip significado="Tiempo que se demoran en contactar al lead." calculo="Promedio de (primer contacto − creación del lead)." /></p>
              <p className="text-base font-bold text-accent-cyan mt-0.5">
                {metricsGlobal.speedToLeadAvg != null ? min(metricsGlobal.speedToLeadAvg) : '—'}
              </p>
              <div className="kpi-card-spacer" />
            </div>
          </div>
        </section>

        {/* Volumen por día */}
        <section className="rounded-lg p-3 section-futuristic">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-accent-cyan" />
            Volumen: llamadas, citas y cierres
          </h3>
          <div className="h-36">
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
        <section className="rounded-lg overflow-hidden section-futuristic border border-surface-500">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider p-3 pb-0 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-accent-cyan" />
            Ranking por asesor
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700/80 text-left text-gray-400">
                  <th className="px-2 py-2 font-medium">Asesor</th>
                  <th className="px-2 py-2 font-medium">Leads generados</th>
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
                {advisorList.map((a, i) => {
                  const m = metricsByAdvisor[a.id]!;
                  return (
                    <tr key={a.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                      <td className="px-2 py-2 text-white font-medium">
                        {i === 0 && '🥇 '}
                        {i === 1 && '🥈 '}
                        {i === 2 && '🥉 '}
                        {a.name}
                      </td>
                      <td className="px-2 py-2 text-accent-cyan">{m.totalLeads ?? 0}</td>
                      <td className="px-2 py-2 text-accent-cyan">{m.callsMade ?? 0}</td>
                      <td className="px-2 py-2 text-gray-300">
                        {m.speedToLeadAvg != null ? min(m.speedToLeadAvg) : '—'}
                      </td>
                      <td className="px-2 py-2 text-accent-purple">{m.meetingsBooked ?? 0}</td>
                      <td className="px-2 py-2 text-accent-cyan">{m.meetingsAttended ?? 0}</td>
                      <td className="px-2 py-2 text-accent-green">{m.revenue != null ? fm(m.revenue) : '—'}</td>
                      <td className="px-2 py-2 text-accent-green">{m.cashCollected != null ? fm(m.cashCollected) : '—'}</td>
                      <td className="px-2 py-2">{m.contactRate != null ? pct(m.contactRate) : '—'}</td>
                      <td className="px-2 py-2">{m.bookingRate != null ? pct(m.bookingRate) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Estado de agendas + Objeciones */}
        <div className="grid md:grid-cols-2 gap-3">
          <section className="rounded-lg p-3 section-futuristic">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-accent-purple" />
              Estado de agendas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="rounded-lg bg-surface-700/80 p-2 text-center">
                <p className="text-lg font-bold text-accent-purple">{agendadas}</p>
                <p className="text-[10px] text-gray-400">Agendadas</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-2 text-center">
                <p className="text-lg font-bold text-accent-amber">{pendientes}</p>
                <p className="text-[10px] text-gray-400">Pendientes</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-2 text-center">
                <p className="text-lg font-bold text-accent-red">{canceladas}</p>
                <p className="text-[10px] text-gray-400">Canceladas</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-2 text-center">
                <p className="text-lg font-bold text-accent-cyan">{asistidas}</p>
                <p className="text-[10px] text-gray-400">Asistieron</p>
              </div>
              <div className="rounded-lg bg-surface-700/80 p-2 text-center">
                <p className="text-lg font-bold text-accent-green">{metricsGlobal.effectiveAppointments ?? 0}</p>
                <p className="text-[10px] text-gray-400">Calificadas</p>
              </div>
            </div>
          </section>
          <section className="rounded-lg p-3 section-futuristic">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Objeciones más repetidas
            </h3>
            <ul className="space-y-1">
              {objectionsByCount.map((o) => (
                <li key={o.name} className="flex items-center justify-between rounded-lg bg-surface-700/80 px-2 py-1.5 text-xs">
                  <span className="font-medium text-white capitalize">{o.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red text-xs font-medium">
                    {o.count}x
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Resumen e accionables */}
        <section className="rounded-lg p-3 section-futuristic">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-accent-green" />
            Resumen y accionables
          </h3>
          <ul className="space-y-1.5 text-xs text-gray-300">
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
              Facturación semanal <strong className="text-accent-green">{fm(metricsGlobal.revenue)}</strong>, efectivo cobrado {fm(metricsGlobal.cashCollected)}.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
