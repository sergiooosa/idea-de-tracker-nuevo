"use client";

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import PageHeader from '@/components/dashboard/PageHeader';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fm = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

interface AcqRow {
  origen: string; leads: number; called: number; answered: number;
  booked: number; attended: number; closed: number; revenue: number;
  contactRate: number; bookingRate: number; attendanceRate: number; closingRate: number;
}
interface AcqResponse { rows: AcqRow[]; sources: string[] }

export default function AcquisitionPage() {
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [filterSource, setFilterSource] = useState('');

  const { data, loading } = useApiData<AcqResponse>('/api/data/acquisition', { from: dateFrom, to: dateTo });
  const rows = data?.rows ?? [];
  const sources = data?.sources ?? [];

  const filtered = filterSource ? rows.filter((r) => r.origen === filterSource) : rows;

  return (
    <>
      <PageHeader title="Resumen de adquisición" subtitle="Origen / Canal / Medio" action={<span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">Beta</span>} />
      <div className="p-3 md:p-4 space-y-3 min-w-0 max-w-full overflow-x-hidden text-sm">
        <div className="flex flex-wrap gap-2 items-center">
          <DateRangePicker
            dateFrom={dateFrom} dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}
            className="rounded-md bg-surface-700 border border-surface-500 px-2 py-1.5 text-xs text-white">
            <option value="">Todas las fuentes</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]"><div className="text-gray-400 text-sm animate-pulse">Cargando datos de adquisición...</div></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-4 py-8 text-center text-gray-500 text-sm">
            No hay datos de adquisición en el rango seleccionado.
          </div>
        ) : (
          <div className="rounded-lg border border-surface-500 overflow-x-auto table-wrap">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-700 text-left text-gray-400">
                  <th className="px-2 py-2 font-medium">Origen</th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Leads <KpiTooltip significado="Contactos únicos por canal." calculo="Conteo de emails únicos." /></span></th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Llamados <KpiTooltip significado="Leads con al menos una llamada." calculo="Emails con evento en log_llamadas." /></span></th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Contestaron <KpiTooltip significado="Leads que contestaron." calculo="Eventos tipo efectiva_*." /></span></th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Agendaron <KpiTooltip significado="Citas agendadas." calculo="Registros en resumenes_diarios_agendas." /></span></th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Asistieron <KpiTooltip significado="Asistieron a la reunión." calculo="Categoría Cerrada/Ofertada/No_Ofertada." /></span></th>
                  <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Facturación <KpiTooltip significado="Ingresos por ventas." calculo="Suma facturación de cerradas." /></span></th>
                  <th className="px-2 py-2 font-medium">Tasa contacto</th>
                  <th className="px-2 py-2 font-medium">Tasa agend.</th>
                  <th className="px-2 py-2 font-medium">Tasa asist.</th>
                  <th className="px-2 py-2 font-medium">Tasa cierre</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.origen} className="border-t border-surface-500 hover:bg-surface-700/50">
                    <td className="px-2 py-2 text-white capitalize">{r.origen}</td>
                    <td className="px-2 py-2 text-accent-cyan">{r.leads}</td>
                    <td className="px-2 py-2 text-accent-cyan">{r.called}</td>
                    <td className="px-2 py-2">{r.answered}</td>
                    <td className="px-2 py-2 text-accent-purple">{r.booked}</td>
                    <td className="px-2 py-2">{r.attended}</td>
                    <td className="px-2 py-2 text-accent-green">{fm(r.revenue)}</td>
                    <td className="px-2 py-2">{pct(r.contactRate)}</td>
                    <td className="px-2 py-2">{pct(r.bookingRate)}</td>
                    <td className="px-2 py-2">{pct(r.attendanceRate)}</td>
                    <td className="px-2 py-2 text-accent-green">{pct(r.closingRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
