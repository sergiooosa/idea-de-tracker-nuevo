"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Download,
  Loader2,
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

// ─── Tipos mínimos del response de la API (evitar importar módulos server-only) ──

interface ApiReportResponse {
  calls: {
    totalLlamadas: number;
    totalContestadas: number;
    tasaContactoGlobal: number;
    speedToLeadAvgMin: number | null;
    intentosPromGlobal: number;
    porCloser: Array<{
      closerMail: string | null;
      closerName: string | null;
      totalLlamadas: number;
      contestadas: number;
      tasaContacto: number;
      speedToLeadAvgMin: number | null;
      intentosProm: number;
      leadsNuevos: number;
      leadsSeguimiento: number;
    }>;
  } | null;
  videocalls: {
    total: number;
    calificadas: number;
    noShows: number;
    cerradas: number;
    canceladas: number;
    tasaCierre: number;
    porCloser: Array<{
      closer: string | null;
      total: number;
      calificadas: number;
      noShows: number;
      cerradas: number;
      canceladas: number;
    }>;
  } | null;
  chats: {
    totalChats: number;
    speedToLeadAvgMin: number | null;
    porAsesor: Array<{ asesor: string | null; totalChats: number }>;
    porCategoria: Record<string, number>;
  } | null;
  ads: {
    totalGasto: number;
    totalImpresiones: number;
    totalClicks: number;
    avgCtr: number | null;
    avgCpm: number | null;
    avgCpc: number | null;
    porCampana: Array<{ plataforma: string | null }>;
  } | null;
  funnel: {
    llamadas: { contactados: number; sinContacto: number };
    chats: { contactados: number; sinContacto: number };
    videollamadas: { contactados: number; sinContacto: number };
  } | null;
  conversationAnalysis: {
    objeciones: Array<{ objecion: string; categoria: string; count: number }>;
  } | null;
}

// ─── Mapeo de API response → ReportData ─────────────────────────────────────

function mapApiToReportData(r: ApiReportResponse): ReportData {
  const calls = r.calls;
  const videocalls = r.videocalls;
  const chats = r.chats;
  const ads = r.ads;
  const funnel = r.funnel;

  const totalLeadsLlamadas =
    (funnel?.llamadas.contactados ?? 0) + (funnel?.llamadas.sinContacto ?? 0);
  const totalLeadsChats =
    (funnel?.chats.contactados ?? 0) + (funnel?.chats.sinContacto ?? 0);
  const totalLeads = totalLeadsLlamadas || totalLeadsChats || videocalls?.total || chats?.totalChats || 0;

  const totalLlamadas = calls?.totalLlamadas ?? 0;
  const meetingsBooked = videocalls?.total ?? 0;
  const tasaAgendamiento = totalLlamadas > 0 ? meetingsBooked / totalLlamadas : 0;

  const speedToLeadAvg = calls?.speedToLeadAvgMin ?? chats?.speedToLeadAvgMin ?? 0;

  // Ranking por asesor: base en calls, enriquecido con videocalls por nombre
  const vcByCloser = new Map<string, { cerradas: number; calificadas: number; noShows: number; total: number }>();
  for (const vc of videocalls?.porCloser ?? []) {
    const key = (vc.closer ?? 'sin asignar').trim().toLowerCase();
    vcByCloser.set(key, {
      cerradas: vc.cerradas,
      calificadas: vc.calificadas,
      noShows: vc.noShows,
      total: vc.total,
    });
  }

  const advisorRanking: ReportAdvisorRow[] = (calls?.porCloser ?? []).map((c) => {
    const nombre = c.closerName ?? c.closerMail ?? 'Sin asignar';
    const vcKey = nombre.trim().toLowerCase();
    const vc = vcByCloser.get(vcKey) ?? vcByCloser.get((c.closerMail ?? '').trim().toLowerCase());
    return {
      nombre,
      email: c.closerMail,
      leads: c.leadsNuevos + c.leadsSeguimiento,
      llamadas: c.totalLlamadas,
      agendadas: vc?.total ?? 0,
      asistidas: vc?.calificadas ?? 0,
      cierres: vc?.cerradas ?? 0,
      revenue: 0,
      tasaContacto: c.tasaContacto / 100,
      tasaAgendamiento: c.totalLlamadas > 0 ? (vc?.total ?? 0) / c.totalLlamadas : 0,
    };
  });

  // Objeciones
  const totalObjeciones = r.conversationAnalysis?.objeciones.reduce((s, o) => s + o.count, 0) ?? 0;
  const objeciones: ReportObjecion[] = (r.conversationAnalysis?.objeciones ?? []).map((o) => ({
    name: o.objecion,
    count: o.count,
    percent: totalObjeciones > 0 ? (o.count / totalObjeciones) * 100 : 0,
  }));

  // Ads
  const adsData: ReportAds | null = ads
    ? {
        gastoTotal: ads.totalGasto,
        impresiones: ads.totalImpresiones,
        clicks: ads.totalClicks,
        ctr: ads.avgCtr ?? 0,
        cpm: ads.avgCpm ?? 0,
        cpc: ads.avgCpc ?? 0,
        plataformas: [
          ...new Set(ads.porCampana.map((c) => c.plataforma).filter((p): p is string => p != null)),
        ],
      }
    : null;

  // Chats
  const chatsData: ReportChats | null = chats
    ? {
        total: chats.totalChats,
        leadsUnicos: chats.porAsesor.length,
        tasaRespuesta: 0,
        speedToLeadAvg: chats.speedToLeadAvgMin,
        topClosers: chats.porAsesor
          .sort((a, b) => b.totalChats - a.totalChats)
          .slice(0, 5)
          .map((a) => ({ name: a.asesor ?? 'Sin asignar', count: a.totalChats })),
      }
    : null;

  return {
    kpis: {
      totalLeads,
      callsMade: totalLlamadas,
      answerRate: (calls?.tasaContactoGlobal ?? 0) / 100,
      meetingsBooked,
      meetingsAttended: videocalls?.calificadas ?? 0,
      meetingsClosed: videocalls?.cerradas ?? 0,
      tasaCierre: (videocalls?.tasaCierre ?? 0) / 100,
      tasaAgendamiento,
      revenue: 0,
      cashCollected: 0,
      avgTicket: 0,
      speedToLeadAvg,
      noShows: videocalls?.noShows ?? 0,
    },
    volumeByDay: [],
    advisorRanking,
    objeciones,
    ads: adsData,
    chats: chatsData,
    alertasMetas: null,
  };
}

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
  const params = useParams();
  const subdomain = typeof params?.subdomain === 'string' ? params.subdomain : '';
  const [period, setPeriod] = useState<PeriodType>('semana');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(today, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch company name for PDF header
  useEffect(() => {
    fetch('/api/data/mis-cuentas')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { accounts?: Array<{ subdominio: string; nombre_cuenta: string }> } | null) => {
        const match = d?.accounts?.find((a) => a.subdominio === subdomain);
        if (match) setCompanyName(match.nombre_cuenta);
      })
      .catch(() => {});
  }, [subdomain]);

  const { from, to } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  // Fetch real report data from API
  useEffect(() => {
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ from, to, period_type: period });
    fetch(`/api/data/report?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r: ApiReportResponse | null) => {
        if (r) setData(mapApiToReportData(r));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to, period]);

  const kpis = data?.kpis ?? null;

  const downloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#0d1219',
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();  // 210mm
      const pdfH = pdf.internal.pageSize.getHeight(); // 297mm

      const marginX = 10;
      const headerH = 22;
      const footerH = 12;
      const gapAboveContent = 4; // mm between header bottom and content
      const gapBelowContent = 4; // mm between content and footer top
      const contentW = pdfW - marginX * 2;
      const contentAreaH = pdfH - headerH - gapAboveContent - gapBelowContent - footerH;

      // Scale: canvas px → mm
      const pxToMm = contentW / canvas.width;
      const totalContentH = canvas.height * pxToMm;
      const pageCount = Math.ceil(totalContentH / contentAreaH);

      const generatedDate = new Date().toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const displayName = companyName ?? subdomain;
      const periodStr = periodLabel(period, from, to);

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();

        // ── Header ──────────────────────────────────────────────
        pdf.setFillColor(13, 18, 25);
        pdf.rect(0, 0, pdfW, headerH, 'F');
        // Cyan accent line at header bottom
        pdf.setFillColor(0, 240, 255);
        pdf.rect(0, headerH - 0.5, pdfW, 0.5, 'F');

        // Company name
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(displayName, marginX, 9);

        // Period label in cyan
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 240, 255);
        pdf.text(periodStr, marginX, 17);

        // Generated date (right side, top)
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 160);
        const dateText = `Generado: ${generatedDate}`;
        pdf.text(dateText, pdfW - marginX - pdf.getTextWidth(dateText), 9);

        // Page number (right side, bottom of header)
        if (pageCount > 1) {
          const pageText = `Pág. ${page + 1} / ${pageCount}`;
          pdf.text(pageText, pdfW - marginX - pdf.getTextWidth(pageText), 17);
        }

        // ── Content slice ────────────────────────────────────────
        const srcYMm = page * contentAreaH;
        const srcYPx = Math.round(srcYMm / pxToMm);
        const sliceHeightMm = Math.min(contentAreaH, totalContentH - srcYMm);
        const sliceHeightPx = Math.round(sliceHeightMm / pxToMm);

        if (sliceHeightPx > 0) {
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceHeightPx;
          const ctx = slice.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#0d1219';
            ctx.fillRect(0, 0, slice.width, slice.height);
            ctx.drawImage(canvas, 0, -srcYPx);
            const imgData = slice.toDataURL('image/jpeg', 0.92);
            const contentY = headerH + gapAboveContent;
            pdf.addImage(imgData, 'JPEG', marginX, contentY, contentW, sliceHeightMm);
          }
        }

        // ── Footer ───────────────────────────────────────────────
        pdf.setFillColor(13, 18, 25);
        pdf.rect(0, pdfH - footerH, pdfW, footerH, 'F');
        // Separator line
        pdf.setFillColor(30, 42, 58);
        pdf.rect(0, pdfH - footerH, pdfW, 0.4, 'F');

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 115, 135);
        pdf.text('Generado por AutoKPI — autokpi.net', marginX, pdfH - footerH + 7);

        const confText = 'Reporte confidencial · uso interno';
        pdf.text(confText, pdfW - marginX - pdf.getTextWidth(confText), pdfH - footerH + 7);
      }

      pdf.save(`reporte-${subdomain}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('No se pudo exportar el PDF. Por favor intenta de nuevo.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [companyName, subdomain, period, from, to]);

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

            {/* PDF download button */}
            <button
              type="button"
              onClick={() => void downloadPdf()}
              disabled={generatingPdf || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan text-black text-sm font-semibold hover:shadow-glow-cyan disabled:opacity-50 transition-all"
            >
              {generatingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {generatingPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
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
        <div ref={reportRef} className="p-3 md:p-4 space-y-4 max-w-6xl mx-auto min-w-0 overflow-x-hidden text-sm">

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
