"use client";

import { useState } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { format, subDays } from 'date-fns';
import PageHeader from '@/components/dashboard/PageHeader';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { BarChart2, TrendingDown, DollarSign, Target, Settings } from 'lucide-react';
import Link from 'next/link';

const fm = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
const fmRoas = (n: number) => `${n.toFixed(2)}x`;

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 30);

interface PorPlataforma {
  plataforma: string;
  gasto: number;
  impresiones: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  agendamientos: number;
}

interface PorCampana {
  campana: string;
  plataforma: string;
  gasto: number;
  leads: number;
  cierres: number;
  cpl: number;
  costoPorCierre: number;
}

interface AdsResponse {
  hasAds: boolean;
  plataformas: ('meta' | 'google' | 'tiktok')[];
  resumen: {
    gastoTotal: number;
    leads: number;
    cierres: number;
    cpl: number;
    costoPorCierre: number;
    roas: number;
  };
  porPlataforma: PorPlataforma[];
  porCampana: PorCampana[];
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'blue',
  google: 'green',
  tiktok: 'purple',
};

const PLATFORM_ICONS: Record<string, string> = {
  meta: '📘',
  google: '🔍',
  tiktok: '🎵',
};

export default function AdsPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));

  const { data, loading } = useApiData<AdsResponse>('/api/data/ads', { from: dateFrom, to: dateTo });

  return (
    <>
      <PageHeader
        title={t.nav.ads}
        subtitle="ROI · Campañas · Plataformas"
        action={
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onRange={(from, to) => { setDateFrom(from); setDateTo(to); }}
            defaultFrom={format(defaultFrom, 'yyyy-MM-dd')}
            defaultTo={format(defaultTo, 'yyyy-MM-dd')}
          />
        }
      />

      <div className="p-3 md:p-4 space-y-4 max-w-full overflow-x-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500 text-sm">Cargando datos de Ads...</div>
          </div>
        )}

        {!loading && (!data || !data.hasAds) && (
          <div className="rounded-xl border border-surface-500 bg-surface-800/60 p-8 text-center space-y-3">
            <BarChart2 className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-white font-semibold text-lg">No hay plataformas de Ads conectadas</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Activa tus plataformas de publicidad en <strong>Sistema → Integraciones de Ads</strong> para ver el retorno de inversión de cada campaña.
            </p>
            <Link
              href="/system?step=11"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-[0_0_20px_-6px_rgba(0,240,255,0.5)] transition-all mt-2"
            >
              <Settings className="w-4 h-4" />
              Ir a configuración
            </Link>
          </div>
        )}

        {!loading && data?.hasAds && (
          <>
            {/* KPI top */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Inversión total', value: fm(data.resumen.gastoTotal), icon: DollarSign, color: 'cyan' },
                { label: 'CPL', value: fm(data.resumen.cpl), icon: Target, color: 'purple' },
                { label: 'Costo por cierre', value: fm(data.resumen.costoPorCierre), icon: TrendingDown, color: 'amber' },
                { label: 'ROAS', value: fmRoas(data.resumen.roas), icon: BarChart2, color: 'green' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className={`rounded-xl p-4 border card-futuristic-${color} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 text-accent-${color}`} />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</span>
                  </div>
                  <div className={`text-2xl font-bold text-accent-${color}`}>{value}</div>
                  <div className="text-[10px] text-gray-500">
                    {label === 'Inversión total' && `${data.resumen.leads} leads · ${data.resumen.cierres} cierres`}
                    {label === 'CPL' && `gasto / leads`}
                    {label === 'Costo por cierre' && `gasto / cierres`}
                    {label === 'ROAS' && `revenue / inversión`}
                  </div>
                </div>
              ))}
            </div>

            {/* Por plataforma */}
            {data.porPlataforma.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Por Plataforma</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {data.porPlataforma.map((p) => {
                    const color = PLATFORM_COLORS[p.plataforma] ?? 'blue';
                    const icon = PLATFORM_ICONS[p.plataforma] ?? '📊';
                    return (
                      <div key={p.plataforma} className={`rounded-xl p-4 border card-futuristic-${color} space-y-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className={`text-sm font-semibold text-accent-${color} capitalize`}>{p.plataforma} Ads</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div><span className="text-gray-500">Gasto</span><div className="font-bold text-white">{fm(p.gasto)}</div></div>
                          <div><span className="text-gray-500">Impresiones</span><div className="font-bold text-white">{p.impresiones.toLocaleString()}</div></div>
                          <div><span className="text-gray-500">Clicks</span><div className="font-bold text-white">{p.clicks.toLocaleString()}</div></div>
                          <div><span className="text-gray-500">CTR</span><div className="font-bold text-white">{p.ctr.toFixed(2)}%</div></div>
                          <div><span className="text-gray-500">CPM</span><div className="font-bold text-white">{fm(p.cpm)}</div></div>
                          <div><span className="text-gray-500">CPC</span><div className="font-bold text-white">{fm(p.cpc)}</div></div>
                          {p.agendamientos > 0 && (
                            <div className="col-span-2"><span className="text-gray-500">Agendamientos</span><div className="font-bold text-white">{p.agendamientos}</div></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabla de campañas */}
            {data.porCampana.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Campañas</h2>
                <div className="rounded-lg border border-surface-500 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead className="bg-surface-800 text-gray-500 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 text-left">Campaña</th>
                          <th className="px-3 py-2 text-left">Plataforma</th>
                          <th className="px-3 py-2 text-right">Inversión</th>
                          <th className="px-3 py-2 text-right">Leads</th>
                          <th className="px-3 py-2 text-right">Cierres</th>
                          <th className="px-3 py-2 text-right">CPL</th>
                          <th className="px-3 py-2 text-right">Costo/Cierre</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.porCampana.map((c, i) => (
                          <tr key={`${c.campana}-${i}`} className="border-t border-surface-600 hover:bg-surface-700/50">
                            <td className="px-3 py-2 text-white max-w-[200px] truncate">{c.campana}</td>
                            <td className="px-3 py-2 capitalize">
                              <span className={`text-accent-${PLATFORM_COLORS[c.plataforma] ?? 'blue'}`}>
                                {PLATFORM_ICONS[c.plataforma]} {c.plataforma}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{fm(c.gasto)}</td>
                            <td className="px-3 py-2 text-right text-accent-cyan">{c.leads}</td>
                            <td className="px-3 py-2 text-right text-accent-green">{c.cierres}</td>
                            <td className="px-3 py-2 text-right">{c.cpl > 0 ? fm(c.cpl) : '—'}</td>
                            <td className="px-3 py-2 text-right">{c.costoPorCierre > 0 ? fm(c.costoPorCierre) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
