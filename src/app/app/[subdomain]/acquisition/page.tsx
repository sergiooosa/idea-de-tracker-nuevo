"use client";

import { useState } from 'react';
import { useT } from '@/contexts/LocaleContext';
import { format, subDays } from 'date-fns';
import PageHeader from '@/components/dashboard/PageHeader';
import KpiTooltip from '@/components/dashboard/KpiTooltip';
import DateRangePicker from '@/components/dashboard/DateRangePicker';
import { useApiData } from '@/hooks/useApiData';
import { formatCurrency } from '@/lib/format';
import { AlertTriangle, DollarSign, Target, TrendingDown, BarChart2 } from 'lucide-react';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fm = formatCurrency;
const fmRoas = (n: number) => `${n.toFixed(2)}x`;

const defaultTo = new Date();
const defaultFrom = subDays(defaultTo, 7);

interface ReMetricaLead {
  campo: string;
  valor: number;
}

interface AcqLeadDetail {
  key: string;
  nombre: string | null;
  email: string | null;
  phone: string | null;
  ghlContactId: string | null;
  closer: string | null;
  estado: string | null;
  reMetricas?: ReMetricaLead[];
}

interface AcqRow {
  origen: string; leads: number; called: number; answered: number;
  booked: number; attended: number; closed: number; revenue: number;
  contactRate: number; bookingRate: number; attendanceRate: number; closingRate: number;
  leadsList?: AcqLeadDetail[];
}

interface ByChannelStats {
  llamadas: { leads: number; contactRate: number; bookingRate: number; closingRate: number };
  videollamadas: { leads: number; attendanceRate: number; closingRate: number; revenue: number };
  chats: { leads: number; conRespuesta: number; tasaRespuesta: number; topOrigen: string | null };
}

interface WebhookMetricRow {
  campo: string;
  total: number;
  porAsesor: { userId: string; nombre: string | null; valor: number }[];
}

interface ReMetricaSummary {
  campo: string;
  label: string;
  total: number;
  formato: "numero" | "moneda";
  porAsesor: { userId: string; nombre: string | null; valor: number }[];
}

interface AcqResponse {
  rows: AcqRow[];
  sources: string[];
  byChannel: ByChannelStats;
  webhookMetrics?: WebhookMetricRow[];
  reMetrics?: ReMetricaSummary[];
}

interface PorPlataforma {
  plataforma: string;
  gasto: number;
  impresiones: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  agendamientos: number;
  camposExtra: Record<string, number>;
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
    asistidas: number;
    cierres: number;
    cpl: number;
    costoPorCierre: number;
    costoPorShow: number;
    showRate: number;
    roas: number;
    roasCash: number;
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

export default function AcquisitionPage() {
  const t = useT();
  const [dateFrom, setDateFrom] = useState(format(defaultFrom, 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(defaultTo, 'yyyy-MM-dd'));
  const [filterSource, setFilterSource] = useState('');
  const [expandedOrigen, setExpandedOrigen] = useState<string | null>(null);

  const { data, loading } = useApiData<AcqResponse>('/api/data/acquisition', { from: dateFrom, to: dateTo });
  const { data: adsData, loading: adsLoading } = useApiData<AdsResponse>('/api/data/ads', { from: dateFrom, to: dateTo });
  const rows = data?.rows ?? [];
  const sources = data?.sources ?? [];
  const byChannel = data?.byChannel;

  const filtered = filterSource ? rows.filter((r) => r.origen === filterSource) : rows;

  return (
    <>
      <PageHeader title={t.adquisicion.titulo} subtitle={t.adquisicion.subtitulo} action={<span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-amber/20 text-accent-amber border border-accent-amber/40 font-medium uppercase shrink-0">Beta</span>} />
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

        {/* ── Alerta de precisión Meta ── */}
        {adsData?.hasAds && (
          <div className="flex items-start gap-2.5 rounded-lg border border-accent-amber/30 bg-accent-amber/5 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-300 leading-relaxed">
              <span className="font-semibold text-accent-amber">Precisión de datos de inversión:</span>{' '}
              esta métrica depende de Meta, que no es preciso; margen de error ~10%. Solo será exacta con anuncios de formulario y/o páginas web con formulario — con anuncios a mensajes no será precisa.
              <KpiTooltip significado="Los datos de gasto provienen de la API de Meta Ads. La atribución de leads a campañas se hace por coincidencia de nombre de origen, lo cual puede no ser exacto para campañas que dirigen a WhatsApp u otros canales de mensajería." calculo="Gasto: suma de spend reportado por Meta. Leads: conteo de emails únicos cuyo origen coincide con el nombre de campaña. CPL = gasto / leads." />
            </p>
          </div>
        )}

        {/* ── KPIs de Inversión (Ads) ── */}
        {!adsLoading && adsData?.hasAds && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
              💰 Inversión publicitaria
              <KpiTooltip significado="Resumen consolidado de inversión en ads y su retorno." calculo="Datos de gasto vienen de Meta/Google Ads API. Leads, cierres y revenue se cruzan por nombre de campaña vs. origen del lead." />
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Inversión total', value: fm(adsData.resumen.gastoTotal), icon: DollarSign, color: 'cyan', sub: `${adsData.resumen.leads} leads · ${adsData.resumen.cierres} cierres` },
                { label: 'CPL', value: fm(adsData.resumen.cpl), icon: Target, color: 'purple', sub: 'gasto / leads' },
                { label: 'Costo por show', value: adsData.resumen.costoPorShow > 0 ? fm(adsData.resumen.costoPorShow) : '—', icon: TrendingDown, color: 'amber', sub: `gasto / asistidas · ${adsData.resumen.asistidas} shows` },
                { label: 'Costo por cierre', value: adsData.resumen.costoPorCierre > 0 ? fm(adsData.resumen.costoPorCierre) : '—', icon: TrendingDown, color: 'amber', sub: 'gasto / cierres' },
                { label: 'Show Rate', value: adsData.resumen.leads > 0 ? `${(adsData.resumen.showRate * 100).toFixed(1)}%` : '—', icon: BarChart2, color: 'purple', sub: `asistidas / leads (${adsData.resumen.asistidas}/${adsData.resumen.leads})` },
                { label: 'ROAS Facturación', value: fmRoas(adsData.resumen.roas), icon: BarChart2, color: 'green', sub: 'facturación / inversión' },
                { label: 'ROAS Cash', value: fmRoas(adsData.resumen.roasCash), icon: BarChart2, color: 'green', sub: 'cash collected / inversión' },
              ].map(({ label, value, icon: Icon, color, sub }) => (
                <div key={label} className={`rounded-xl p-4 border card-futuristic-${color} flex flex-col gap-1`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 text-accent-${color}`} />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</span>
                  </div>
                  <div className={`text-2xl font-bold text-accent-${color}`}>{value}</div>
                  <div className="text-[10px] text-gray-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Por plataforma ── */}
        {!adsLoading && adsData?.hasAds && adsData.porPlataforma.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
              Por Plataforma
              <KpiTooltip significado="Desglose de métricas de ads por plataforma publicitaria." calculo="Agregado de gasto, impresiones y clicks por plataforma en el período seleccionado." />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {adsData.porPlataforma.map((p) => {
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
                      {p.camposExtra?.frequency != null && (
                        <div><span className="text-gray-500">Frecuencia</span><div className="font-bold text-white">{Number(p.camposExtra.frequency).toFixed(2)}</div></div>
                      )}
                      {p.camposExtra?.unique_ctr != null && (
                        <div><span className="text-gray-500">Hook Rate</span><div className="font-bold text-white">{Number(p.camposExtra.unique_ctr).toFixed(2)}%</div></div>
                      )}
                      {Object.entries(p.camposExtra ?? {})
                        .filter(([k]) => k !== 'frequency' && k !== 'unique_ctr')
                        .map(([key, val]) => (
                          <div key={key}><span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span><div className="font-bold text-white">{typeof val === 'number' ? val.toFixed(2) : String(val)}</div></div>
                        ))
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabla de campañas (Ads) ── */}
        {!adsLoading && adsData?.hasAds && adsData.porCampana.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
              Campañas
              <KpiTooltip significado="Desglose de inversión, leads y cierres por campaña publicitaria." calculo="Gasto sumado de resumenes_diarios_ads. Leads y cierres cruzados por nombre de campaña vs. origen del lead en agendas." />
            </h2>
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
                    {adsData.porCampana.map((c, i) => (
                      <tr key={`${c.campana}-${i}`} className="border-t border-surface-600 hover:bg-surface-700/50">
                        <td className="px-3 py-2 text-white max-w-[200px] truncate">{c.campana}</td>
                        <td className="px-3 py-2 capitalize">
                          <span className={`text-accent-${PLATFORM_COLORS[c.plataforma] ?? 'blue'}`}>
                            {PLATFORM_ICONS[c.plataforma]} {c.plataforma}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-accent-cyan">{fm(c.gasto)}</td>
                        <td className="px-3 py-2 text-right">{c.leads}</td>
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

        {/* ── Cards por canal ── */}
        {!loading && byChannel && (
          <>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
              Resumen por canal
              <KpiTooltip significado="Métricas agregadas de adquisición por canal de comunicación." calculo="Leads únicos, tasas de contacto, agendamiento y cierre calculados sobre el período." />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

              {byChannel.videollamadas.leads > 0 && (
                <div className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                    <span>🎥</span>
                    <span>Citas</span>
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
          </>
        )}

        {/* ── Métricas Real Estate ── */}
        {!loading && data?.reMetrics && data.reMetrics.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center">Métricas Inmobiliarias <KpiTooltip significado="Métricas de recorridos y apartados reportadas por el CRM inmobiliario." calculo="Suma de eventos recibidos por webhook, atribuidos al asesor que registró cada evento." /></h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {data.reMetrics.map((m) => {
                const reTooltips: Record<string, { significado: string; calculo: string }> = {
                  re_recorridos_agendados: { significado: "Recorridos de propiedad agendados con prospectos.", calculo: "Conteo de eventos 're_recorridos_agendados' recibidos por webhook." },
                  re_recorridos_realizados: { significado: "Recorridos de propiedad efectivamente realizados.", calculo: "Conteo de eventos 're_recorridos_realizados' recibidos por webhook." },
                  re_recorridos_cancelados: { significado: "Recorridos de propiedad que fueron cancelados.", calculo: "Conteo de eventos 're_recorridos_cancelados' recibidos por webhook." },
                  re_apartados: { significado: "Unidades apartadas por prospectos.", calculo: "Conteo de eventos 're_apartados' recibidos por webhook." },
                  re_monto_apartados: { significado: "Valor monetario total de las unidades apartadas.", calculo: "Suma del campo valor de eventos 're_monto_apartados' por webhook." },
                };
                const tip = reTooltips[m.campo];
                return (
                <div key={m.campo} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                  <div className="text-[10px] text-gray-400 uppercase font-medium tracking-wide inline-flex items-center">{m.label}{tip && <KpiTooltip significado={tip.significado} calculo={tip.calculo} />}</div>
                  <div className="text-xl font-bold text-accent-cyan">
                    {m.formato === "moneda" ? fm(m.total) : m.total % 1 === 0 ? m.total : m.total.toFixed(2)}
                  </div>
                  {m.porAsesor.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-surface-600">
                      {m.porAsesor.map((a) => (
                        <div key={a.userId} className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 truncate max-w-[60%]">{a.nombre ?? a.userId}</span>
                          <span className="text-white font-medium">
                            {m.formato === "moneda" ? fm(a.valor) : a.valor % 1 === 0 ? a.valor : a.valor.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Métricas Webhook por asesor ── */}
        {!loading && data?.webhookMetrics && data.webhookMetrics.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Métricas Personalizadas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.webhookMetrics.map((m) => (
                <div key={m.campo} className="rounded-lg border border-surface-500 bg-surface-700/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-300 capitalize">{m.campo.replace(/_/g, ' ')}</span>
                    <span className="text-lg font-bold text-accent-cyan">{m.total % 1 === 0 ? m.total : m.total.toFixed(2)}</span>
                  </div>
                  {m.porAsesor.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-surface-600">
                      {m.porAsesor.map((a) => (
                        <div key={a.userId} className="flex items-center justify-between text-[11px]">
                          <span className="text-gray-400 truncate max-w-[60%]">{a.nombre ?? a.userId}</span>
                          <span className="text-white font-medium">{a.valor % 1 === 0 ? a.valor : a.valor.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tabla de adquisición por origen ── */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]"><div className="text-gray-400 text-sm animate-pulse">Cargando datos de adquisición...</div></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-surface-500 px-4 py-8 text-center text-gray-500 text-sm">
            {t.adquisicion.noData}
          </div>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider inline-flex items-center gap-1.5">
              Desglose por origen
              <KpiTooltip significado="Funnel de adquisición desglosado por fuente/origen del lead." calculo="Leads únicos por origen. Tasas calculadas como proporción de cada etapa vs. la anterior." />
            </h2>
            <div className="rounded-lg border border-surface-500 overflow-x-auto table-wrap">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-700 text-left text-gray-400">
                    <th className="px-2 py-2 font-medium">{t.adquisicion.origen}</th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Leads <KpiTooltip significado="Contactos únicos por canal." calculo="Conteo de emails únicos." /></span></th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Llamados <KpiTooltip significado="Leads con al menos una llamada." calculo="Emails con evento en log_llamadas." /></span></th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Contestaron <KpiTooltip significado="Leads que contestaron." calculo="Eventos tipo efectiva_*." /></span></th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Agendaron <KpiTooltip significado="Citas agendadas." calculo="Registros en resumenes_diarios_agendas." /></span></th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Asistieron <KpiTooltip significado="Asistieron a la cita." calculo="Categoría Cerrada/Ofertada/No_Ofertada." /></span></th>
                    <th className="px-2 py-2 font-medium"><span className="inline-flex items-center">Facturación <KpiTooltip significado="Ingresos por ventas." calculo="Suma facturación de cerradas." /></span></th>
                    <th className="px-2 py-2 font-medium">{t.adquisicion.contactRate}</th>
                    <th className="px-2 py-2 font-medium">{t.adquisicion.bookingRate}</th>
                    <th className="px-2 py-2 font-medium">{t.adquisicion.attendanceRate}</th>
                    <th className="px-2 py-2 font-medium">{t.adquisicion.closingRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <>
                      <tr
                        key={r.origen}
                        className="border-t border-surface-500 hover:bg-surface-700/50 cursor-pointer"
                        onClick={() => setExpandedOrigen(expandedOrigen === r.origen ? null : r.origen)}
                      >
                        <td className="px-2 py-2 text-white capitalize">
                          <span className="flex items-center gap-1">
                            <span className={`text-[10px] transition-transform ${expandedOrigen === r.origen ? 'rotate-90' : ''}`}>▶</span>
                            {r.origen}
                          </span>
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
                        <td className="px-2 py-2 text-accent-green">{pct(r.closingRate)}</td>
                      </tr>
                      {expandedOrigen === r.origen && r.leadsList && r.leadsList.length > 0 && (
                        <tr key={`${r.origen}-detail`} className="bg-surface-800/60">
                          <td colSpan={11} className="px-4 py-3">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                              Leads de este origen ({r.leadsList.length})
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                              {r.leadsList.map((lead) => (
                                <div key={lead.key} className="rounded-lg bg-surface-700 px-2.5 py-1.5 text-[10px] space-y-0.5">
                                  <div className="text-white font-medium truncate">{lead.nombre ?? '—'}</div>
                                  <div className="text-gray-400 truncate">{lead.email ?? lead.phone ?? '—'}</div>
                                  {lead.closer && <div className="text-gray-500 truncate">Asesor: {lead.closer}</div>}
                                  {lead.estado && (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-surface-600 text-gray-300">
                                      {lead.estado.replace('efectiva_', '').replace(/_/g, ' ')}
                                    </span>
                                  )}
                                  {lead.reMetricas && lead.reMetricas.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {lead.reMetricas.map((rm) => {
                                        const RE_SHORT: Record<string, string> = {
                                          re_recorridos_agendados: "Agend.",
                                          re_recorridos_realizados: "Realiz.",
                                          re_recorridos_cancelados: "Cancel.",
                                          re_apartados: "Apart.",
                                          re_monto_apartados: "Monto",
                                        };
                                        const isMoney = rm.campo === "re_monto_apartados";
                                        return (
                                          <span key={rm.campo} className="inline-block px-1.5 py-0.5 rounded text-[9px] bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                                            {RE_SHORT[rm.campo] ?? rm.campo.replace(/re_/g, "").replace(/_/g, " ")}: {isMoney ? fm(rm.valor) : rm.valor}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
