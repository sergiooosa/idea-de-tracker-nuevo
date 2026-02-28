import { useState } from 'react';
import { format, subDays } from 'date-fns';
import PageHeader from '@/components/PageHeader';
import KpiTooltip from '@/components/KpiTooltip';
import DateRangePicker from '@/components/DateRangePicker';
import { acquisitionRows } from '@/data/mockData';
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fm = (n: number) => `$${(n / 1000).toFixed(1)}k`;

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

export default function AcquisitionSummary() {
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [filterSource, setFilterSource] = useState('');
  const [filterAdvisor, setFilterAdvisor] = useState('');

  const sources = [...new Set(acquisitionRows.map((r) => r.utm_source).filter(Boolean))];

  return (
    <>
      <PageHeader
        title="Resumen de adquisición"
        subtitle="UTM / Anuncios / Medios"
      />
      <div className="p-3 md:p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden text-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-md bg-surface-700 border border-surface-500 px-2 py-1.5 text-xs text-white"
          >
            <option value="">Todas las fuentes</option>
            {sources.map((s) => (
              <option key={s} value={s!}>{s}</option>
            ))}
          </select>
          <select
            value={filterAdvisor}
            onChange={(e) => setFilterAdvisor(e.target.value)}
            className="rounded-md bg-surface-700 border border-surface-500 px-2 py-1.5 text-xs text-white"
          >
            <option value="">Todos los asesores</option>
          </select>
        </div>

        <div className="rounded-lg border border-surface-500 overflow-x-auto table-wrap">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-700 text-left text-gray-400">
                <th className="px-2 py-2 font-medium">Origen / UTM / Medio</th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Leads generados <KpiTooltip significado="Contactos creados en GHL por canal." calculo="Conteo de leads por fuente/medio." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Leads llamados <KpiTooltip significado="Leads a los que se les realizó al menos una llamada." calculo="Conteo de leads contactados por teléfono." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Contestaron <KpiTooltip significado="Llamadas que el lead contestó efectivamente." calculo="Leads que contestaron al menos una llamada." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Agendaron <KpiTooltip significado="Citas o presentaciones agendadas." calculo="Cantidad de citas agendadas desde el canal." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Asistieron <KpiTooltip significado="Reuniones a las que el lead asistió. Dato de Fathom." calculo="Reuniones con attended = sí." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Facturación <KpiTooltip significado="Ingresos por ventas (por canal)." calculo="Suma de revenue de reuniones cerradas." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Tasa contestación <KpiTooltip significado="Porcentaje de llamados que contestaron." calculo="(Contestaron / Leads llamados) × 100." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Tasa agendamiento <KpiTooltip significado="Porcentaje de contestados que agendó." calculo="(Agendaron / Contestaron) × 100." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Tasa asistencia <KpiTooltip significado="Porcentaje que asistió a la reunión." calculo="(Asistieron / Agendaron) × 100." /></span></th>
                <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Tasa cierre <KpiTooltip significado="Porcentaje que cerró venta." calculo="(Cerradas / Asistieron) × 100." /></span></th>
              </tr>
            </thead>
            <tbody>
              {acquisitionRows.map((r) => (
                <tr key={r.id} className="border-t border-surface-500 hover:bg-surface-700/50">
                  <td className="px-2 py-2 text-white">
                    {[r.utm_source, r.utm_medium, r.utm_campaign, r.medium]
                      .filter(Boolean)
                      .join(' · ') || '-'}
                  </td>
                  <td className="px-2 py-2 text-accent-cyan">{r.leads}</td>
                  <td className="px-2 py-2 text-accent-cyan">{r.called}</td>
                  <td className="px-2 py-2">{r.answered}</td>
                  <td className="px-2 py-2 text-accent-purple">{r.booked}</td>
                  <td className="px-2 py-2">{r.attended}</td>
                  <td className="px-2 py-2 text-accent-green">{fm(r.revenue)}</td>
                  <td className="px-2 py-2">{pct(r.contactRate)}</td>
                  <td className="px-2 py-2">{pct(r.bookingRate)}</td>
                  <td className="px-2 py-2">{pct(r.attendanceRate)}</td>
                  <td className="px-2 py-2 text-accent-green">
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
