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
  Calendar,
  ChevronRight,
  Download,
  Loader2,
} from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import {
  SectionPortadaKPIs,
  SectionNarrativa,
  SectionFunnel,
  SectionEstadoFinal,
  SectionOrigen,
  SectionHigieneCRM,
  SectionPorCanal,
  SectionDemografia,
  SectionComparativo,
  SectionCobertura,
  SectionConversaciones,
  SectionRankingAsesores,
  SectionObjeciones,
  SectionFrasesRepetitivas,
  SectionConclusiones,
} from '@/components/report-v2';
import type { ReportV2Data } from '@/types/report-v2';
import type { ReportV2 } from '@/types/reportV2';
import { adaptReportV2 } from '@/lib/adapters/reportV2Adapter';

// ─── Period helpers ──────────────────────────────────────────────────────────

type PeriodType = 'hoy' | 'semana' | 'mes' | 'personalizado';

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

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="p-3 md:p-4 space-y-3 animate-pulse">
      <div className="h-32 rounded-xl bg-[#111A2A]" />
      <div className="h-40 rounded-xl bg-[#111A2A]" />
      <div className="h-52 rounded-xl bg-[#111A2A]" />
      <div className="h-40 rounded-xl bg-[#111A2A]" />
      <div className="h-32 rounded-xl bg-[#111A2A]" />
    </div>
  );
}

// ─── PDF export ──────────────────────────────────────────────────────────────

async function exportPdf(
  element: HTMLElement,
  companyName: string,
  subdomain: string,
  periodoStr: string,
) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#0A101B',
    useCORS: true,
    logging: false,
  });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const marginX = 10;
  const headerH = 22;
  const footerH = 12;
  const gapAboveContent = 4;
  const gapBelowContent = 4;
  const contentW = pdfW - marginX * 2;
  const contentAreaH = pdfH - headerH - gapAboveContent - gapBelowContent - footerH;
  const pxToMm = contentW / canvas.width;
  const totalContentH = canvas.height * pxToMm;
  const pageCount = Math.ceil(totalContentH / contentAreaH);
  const generatedDate = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const displayName = companyName;

  for (let page = 0; page < pageCount; page++) {
    if (page > 0) pdf.addPage();

    // Header — dark bg with cyan accent
    pdf.setFillColor(10, 16, 27); // #0A101B
    pdf.rect(0, 0, pdfW, headerH, 'F');
    pdf.setFillColor(34, 211, 238); // #22D3EE
    pdf.rect(0, headerH - 0.5, pdfW, 0.5, 'F');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(231, 239, 248); // #E7EFF8
    pdf.text(displayName, marginX, 9);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(34, 211, 238); // #22D3EE
    pdf.text(`Reporte Ejecutivo Comercial · ${periodoStr}`, marginX, 17);
    pdf.setFontSize(7);
    pdf.setTextColor(141, 162, 184); // #8DA2B8
    const dateText = `Generado: ${generatedDate}`;
    pdf.text(dateText, pdfW - marginX - pdf.getTextWidth(dateText), 9);
    if (pageCount > 1) {
      const pageText = `Página ${page + 1} / ${pageCount}`;
      pdf.text(pageText, pdfW - marginX - pdf.getTextWidth(pageText), 17);
    }

    // Content slice
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
        ctx.fillStyle = '#0A101B';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, -srcYPx);
        const imgData = slice.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', marginX, headerH + gapAboveContent, contentW, sliceHeightMm);
      }
    }

    // Footer
    pdf.setFillColor(10, 16, 27); // #0A101B
    pdf.rect(0, pdfH - footerH, pdfW, footerH, 'F');
    pdf.setFillColor(30, 43, 64); // #1E2B40
    pdf.rect(0, pdfH - footerH, pdfW, 0.4, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(95, 114, 136); // #5F7288
    pdf.text('Generado por AutoKPI — autokpi.net', marginX, pdfH - footerH + 7);
    const confText = 'Reporte confidencial · uso interno';
    pdf.text(confText, pdfW - marginX - pdf.getTextWidth(confText), pdfH - footerH + 7);
  }

  pdf.save(`reporte-${subdomain}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const today = new Date();
  const params = useParams();
  const subdomain = typeof params?.subdomain === 'string' ? params.subdomain : '';

  const [period, setPeriod] = useState<PeriodType>('mes');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(today, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportV2Data | null>(null);
  const [enriquecimientoParcial, setEnriquecimientoParcial] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const { from, to } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  // Fetch company name
  useEffect(() => {
    fetch('/api/data/mis-cuentas')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { accounts?: Array<{ subdominio: string; nombre_cuenta: string }> } | null) => {
        const match = d?.accounts?.find((a) => a.subdominio === subdomain);
        if (match) setCompanyName(match.nombre_cuenta);
      })
      .catch(() => {});
  }, [subdomain]);

  useEffect(() => {
    setLoading(true);
    setReportData(null);
    setFetchError(null);
    setEnriquecimientoParcial(false);

    const periodTypeMap: Record<PeriodType, string> = {
      hoy: 'daily',
      semana: 'weekly',
      mes: 'monthly',
      personalizado: 'custom',
    };

    const qs = new URLSearchParams({
      from,
      to,
      period_type: periodTypeMap[period],
    });

    const controller = new AbortController();

    fetch(`/api/data/report-v2?${qs.toString()}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<ReportV2>;
      })
      .then((apiData) => {
        setEnriquecimientoParcial(apiData.meta.enriquecimientoParcial);
        setReportData(adaptReportV2(apiData));
        if (!companyName && apiData.meta.nombre) {
          setCompanyName(apiData.meta.nombre);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Error al cargar reporte v2:', err);
        setFetchError('No se pudo cargar el reporte. Intenta de nuevo.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [from, to, period, subdomain, companyName]);

  const downloadPdf = useCallback(async () => {
    if (!reportRef.current || !reportData) return;
    setGeneratingPdf(true);
    try {
      await exportPdf(
        reportRef.current,
        reportData.cuenta.nombre,
        subdomain,
        periodLabel(period, from, to),
      );
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('No se pudo exportar el PDF. Por favor intenta de nuevo.');
    } finally {
      setGeneratingPdf(false);
    }
  }, [reportData, subdomain, period, from, to]);

  const PERIODS: { id: PeriodType; label: string }[] = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Esta semana' },
    { id: 'mes', label: 'Este mes' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  return (
    <>
      <PageHeader
        title="Reporte Ejecutivo"
        subtitle={`Periodo: ${periodLabel(period, from, to)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-[#111A2A] p-0.5 border border-[#1E2B40]">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    period === p.id
                      ? 'bg-accent-cyan text-black'
                      : 'text-[#8DA2B8] hover:text-white hover:bg-[#152238]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {period === 'personalizado' && (
              <div className="flex items-center gap-1 rounded-lg bg-[#111A2A] border border-[#1E2B40] px-2 py-1 text-sm text-[#8DA2B8]">
                <Calendar className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onFocus={(e) => e.currentTarget.showPicker?.()}
                  className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer w-32"
                />
                <ChevronRight className="w-3.5 h-3.5 text-[#5F7288] shrink-0" />
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(e) => setCustomTo(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onFocus={(e) => e.currentTarget.showPicker?.()}
                  className="bg-transparent text-sm text-white border-none focus:ring-0 cursor-pointer w-32"
                />
              </div>
            )}

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
      ) : fetchError ? (
        <div className="flex items-center justify-center min-h-[300px] text-accent-red text-sm">
          {fetchError}
        </div>
      ) : !reportData ? (
        <div className="flex items-center justify-center min-h-[300px] text-[#5F7288] text-sm">
          No hay datos para el periodo seleccionado.
        </div>
      ) : (
        <div
          ref={reportRef}
          className="p-3 md:p-5 space-y-4 max-w-6xl mx-auto min-w-0 overflow-x-hidden"
          style={{ backgroundColor: '#0A101B' }}
        >
          {enriquecimientoParcial && (
            <div className="rounded-lg bg-accent-amber/10 border border-accent-amber/20 px-4 py-3 text-xs text-accent-amber flex items-center gap-2">
              <span className="font-semibold">Análisis IA parcial:</span>
              <span className="text-[#8DA2B8]">
                Algunos bloques cualitativos (conversaciones, demografía IA, narrativas) pueden estar incompletos
                porque el análisis IA aún no cubre todo el periodo.
              </span>
            </div>
          )}

          {/* Portada + KPIs */}
          <SectionPortadaKPIs
            data={reportData.kpis}
            companyName={reportData.cuenta.nombre}
            periodo={`${reportData.periodo.from} → ${reportData.periodo.to}`}
          />

          {/* Resumen ejecutivo narrativo */}
          <SectionNarrativa data={reportData.narrativa} />

          {/* Embudo */}
          <SectionFunnel data={reportData.funnel} />

          {/* Estado final */}
          <SectionEstadoFinal data={reportData.estadoFinal} />

          {/* Origen nuevos/reactivados */}
          <SectionOrigen data={reportData.origen} />

          {/* Higiene CRM */}
          <SectionHigieneCRM data={reportData.higieneCRM} from={from} to={to} />

          {/* Desglose por canal */}
          <SectionPorCanal
            llamadas={reportData.porCanal.llamadas}
            chats={reportData.porCanal.chats}
            video={reportData.porCanal.video}
          />

          {/* Demografía */}
          <SectionDemografia data={reportData.demografia} />

          {/* Comparativo */}
          <SectionComparativo data={reportData.comparativo} />

          {/* Cobertura / respuesta */}
          <SectionCobertura data={reportData.cobertura} />

          {/* Análisis de conversaciones por canal */}
          <SectionConversaciones
            llamadas={reportData.conversaciones.llamadas}
            chats={reportData.conversaciones.chats}
            video={reportData.conversaciones.video}
          />

          {/* Ranking de asesores */}
          <SectionRankingAsesores data={reportData.rankingAsesores} />

          {/* Objeciones */}
          <SectionObjeciones data={reportData.objeciones} />

          {/* Frases repetitivas */}
          <SectionFrasesRepetitivas data={reportData.frasesRepetitivas} />

          {/* Conclusiones */}
          <SectionConclusiones data={reportData.conclusiones} />
        </div>
      )}
    </>
  );
}
