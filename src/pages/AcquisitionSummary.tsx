import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import KpiTooltip from '@/components/KpiTooltip';
import { acquisitionRows } from '@/data/mockData';
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fm = (n: number) => `$${(n / 1000).toFixed(1)}k`;

export default function AcquisitionSummary() {
  const [dateFrom, setDateFrom] = useState('2026-02-01');
  const [dateTo, setDateTo] = useState('2026-02-27');
  const [filterSource, setFilterSource] = useState('');
  const [filterAdvisor, setFilterAdvisor] = useState('');

  const sources = [...new Set(acquisitionRows.map((r) => r.utm_source).filter(Boolean))];

  return (
    <>
      <PageHeader
        title="Resumen de adquisición"
        subtitle="UTM / Anuncios / Medios"
      />
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
          >
            <option value="">Todas las fuentes</option>
            {sources.map((s) => (
              <option key={s} value={s!}>{s}</option>
            ))}
          </select>
          <select
            value={filterAdvisor}
            onChange={(e) => setFilterAdvisor(e.target.value)}
            className="rounded-lg bg-surface-700 border border-surface-500 px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los asesores</option>
          </select>
        </div>

        <div className="rounded-xl border border-surface-500 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Origen / UTM / Medio</th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Leads <KpiTooltip significado="Leads que llegaron por este canal." calculo="Conteo de leads por fuente/medio." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Contestaron <KpiTooltip significado="Leads que contestaron al menos una llamada." calculo="Conteo de leads con llamada contestada." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Agendaron <KpiTooltip significado="Reuniones agendadas desde este canal." calculo="Cantidad de citas agendadas." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Asistieron <KpiTooltip significado="Reuniones a las que asistieron." calculo="Reuniones con attended = sí." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Facturación <KpiTooltip significado="Ingresos por ventas de este canal." calculo="Suma de revenue de reuniones cerradas." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">ROAS <KpiTooltip significado="Retorno de la inversión en publicidad." calculo="Ingresos atribuidos / gasto en publicidad." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Tasa contestación <KpiTooltip significado="Porcentaje de leads que contestaron." calculo="(Contestaron / Leads) × 100." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Tasa agendamiento <KpiTooltip significado="Porcentaje que agendó reunión." calculo="(Agendaron / Contestaron) × 100." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Tasa asistencia <KpiTooltip significado="Porcentaje que asistió a la reunión." calculo="(Asistieron / Agendaron) × 100." /></span></th>
                <th className="px-4 py-3 font-medium"><span className="inline-flex items-center">Tasa cierre <KpiTooltip significado="Porcentaje que cerró venta de los que asistieron." calculo="(Cerrados / Asistieron) × 100." /></span></th>
              </tr>
            </thead>
            <tbody>
              {acquisitionRows.map((r) => (
                <tr key={r.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                  <td className="px-4 py-3 text-white">
                    {[r.utm_source, r.utm_medium, r.utm_campaign, r.medium]
                      .filter(Boolean)
                      .join(' · ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-accent-cyan">{r.leads}</td>
                  <td className="px-4 py-3">{r.answered}</td>
                  <td className="px-4 py-3 text-accent-purple">{r.booked}</td>
                  <td className="px-4 py-3">{r.attended}</td>
                  <td className="px-4 py-3 text-accent-green">{fm(r.revenue)}</td>
                  <td className="px-4 py-3 text-accent-green">
                    {r.roas != null ? `${r.roas}x` : '-'}
                  </td>
                  <td className="px-4 py-3">{pct(r.contactRate)}</td>
                  <td className="px-4 py-3">{pct(r.bookingRate)}</td>
                  <td className="px-4 py-3">{pct(r.attendanceRate)}</td>
                  <td className="px-4 py-3 text-accent-green">
                    {r.closingRate != null ? pct(r.closingRate) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
