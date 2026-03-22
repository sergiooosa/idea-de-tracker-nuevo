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

interface ByChannelStats {
  llamadas: { leads: number; contactRate: number; bookingRate: number; closingRate: number };
  videollamadas: { leads: number; attendanceRate: number; closingRate: number; revenue: number };
  chats: { leads: number; conRespuesta: number; tasaRespuesta: number; topOrigen: string | null };
}

interface AcqResponse {
  rows: AcqRow[];
  sources: string[];
  byChannel: ByChannelStats;
}

export default function AcquisitionPage() {
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [filterSource, setFilterSource] = useState('');

  const { data, loading } = useApiData<AcqResponse>('/api/data/acquisition', { from: dateFrom, to: dateTo });
  const rows = data?.rows ?? [];
  const sources = data?.sources ?? [];
  const byChannel = data?.byChannel;

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

        {/* ── Cards por canal ── */}
        {!loading && byChannel && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Llamadas */}
            {byChannel.llamadas.leads > 0 && (
              <div className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <span>📞</span>
                  <span>Llamadas</span>
                </div>
                <div className="text-2xl font-bold text-accent-cyan">{byChannel.llamadas.leads}</div>
                <div className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">leads</div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-white">{pct(byChannel.llamadas.contactRate)}</div>
                    <div className="text-[10px] text-gray-400">contactación</div>
                  </div>
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-accent-purple">{pct(byChannel.llamadas.bookingRate)}</div>
                    <div className="text-[10px] text-gray-400">agendamiento</div>
                  </div>
                </div>
              </div>
            )}

            {/* Videollamadas */}
            {byChannel.videollamadas.leads > 0 && (
              <div className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <span>🎥</span>
                  <span>Videollamadas</span>
                </div>
                <div className="text-2xl font-bold text-accent-cyan">{byChannel.videollamadas.leads}</div>
                <div className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">leads únicos</div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-white">{pct(byChannel.videollamadas.attendanceRate)}</div>
                    <div className="text-[10px] text-gray-400">asistencia</div>
                  </div>
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-accent-green">{pct(byChannel.videollamadas.closingRate)}</div>
                    <div className="text-[10px] text-gray-400">cierre</div>
                  </div>
                </div>
                {byChannel.videollamadas.revenue > 0 && (
                  <div className="text-xs text-accent-green font-semibold pt-0.5">
                    {fm(byChannel.videollamadas.revenue)} facturado
                  </div>
                )}
              </div>
            )}

            {/* Chats */}
            {byChannel.chats.leads > 0 && (
              <div className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                  <span>💬</span>
                  <span>Chats</span>
                </div>
                <div className="text-2xl font-bold text-accent-cyan">{byChannel.chats.leads}</div>
                <div className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">leads</div>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-white">{byChannel.chats.conRespuesta}</div>
                    <div className="text-[10px] text-gray-400">con respuesta</div>
                  </div>
                  <div className="bg-surface-600/60 rounded px-2 py-1.5 text-center">
                    <div className="text-sm font-bold text-accent-purple">{pct(byChannel.chats.tasaRespuesta)}</div>
                    <div className="text-[10px] text-gray-400">tasa resp.</div>
                  </div>
                </div>
                {byChannel.chats.topOrigen && (
                  <div className="text-xs text-gray-400 pt-0.5">
                    Canal principal: <span className="text-white font-medium capitalize">{byChannel.chats.topOrigen}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tabla existente (sin cambios) ── */}
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
