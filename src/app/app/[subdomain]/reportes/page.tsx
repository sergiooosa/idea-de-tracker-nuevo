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
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/dashboard/PageHeader';
import ReportExecutiveSummary from '@/components/report/ReportExecutiveSummary';
import ReportAdsPerformance from '@/components/report/ReportAdsPerformance';
import ReportAdvisorCalls from '@/components/report/ReportAdvisorCalls';
import ReportAdvisorChats from '@/components/report/ReportAdvisorChats';
import ReportAdvisorVideocalls from '@/components/report/ReportAdvisorVideocalls';
import ReportLeadFunnel from '@/components/report/ReportLeadFunnel';
import ReportCrmHealth from '@/components/report/ReportCrmHealth';
import ReportConversationAnalysis from '@/components/report/ReportConversationAnalysis';
import ReportComparison from '@/components/report/ReportComparison';
import ReportContactabilidadCanal from '@/components/report/ReportContactabilidadCanal';
import type {
  ReportExecutiveSummaryData,
  ReportAdsPerformanceData,
  ReportAdvisorCallsData,
  ReportAdvisorChatsData,
  ReportAdvisorVideocallsData,
  ReportLeadFunnelData,
  ReportCrmHealthData,
  ReportConversationAnalysisData,
  ReportComparisonData,
  ReportContactabilidadCanalData,
} from '@/types/report';

// ─── API types (minimal — avoid importing server-only modules) ──────────────

type PeriodType = 'hoy' | 'semana' | 'mes' | 'personalizado';

interface ApiAdsCampaign {
  campana: string | null;
  plataforma: string | null;
  gastoTotal: number;
  impresiones: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
}

interface ApiAdsCreativo {
  nombre: string;
  gastoTotal: number;
  leadsCount: number;
}

interface ApiAds {
  totalGasto: number;
  totalImpresiones: number;
  totalClicks: number;
  avgCtr: number | null;
  avgCpm: number | null;
  avgCpc: number | null;
  porCampana: ApiAdsCampaign[];
  porCreativo: ApiAdsCreativo[];
}

interface ApiCallsAdvisor {
  closerMail: string | null;
  closerName: string | null;
  totalLlamadas: number;
  contestadas: number;
  tasaContacto: number;
  speedToLeadAvgMin: number | null;
  intentosProm: number;
  leadsNuevos: number;
  leadsSeguimiento: number;
}

interface ApiCalls {
  totalLlamadas: number;
  totalContestadas: number;
  tasaContactoGlobal: number;
  speedToLeadAvgMin: number | null;
  intentosPromGlobal: number;
  porCloser: ApiCallsAdvisor[];
}

interface ApiChatsAdvisor {
  asesor: string | null;
  totalChats: number;
  speedToLeadAvgMin: number | null;
  porCategoria: Record<string, number>;
}

interface ApiChats {
  totalChats: number;
  speedToLeadAvgMin: number | null;
  porAsesor: ApiChatsAdvisor[];
  porCategoria: Record<string, number>;
}

interface ApiVideocallsCloser {
  closer: string | null;
  total: number;
  calificadas: number;
  noShows: number;
  cerradas: number;
  canceladas: number;
}

interface ApiVideocalls {
  total: number;
  calificadas: number;
  noShows: number;
  cerradas: number;
  canceladas: number;
  tasaCierre: number;
  porCloser: ApiVideocallsCloser[];
}

interface ApiFunnelCanal {
  contactados: number;
  sinContacto: number;
  porCategoria: Array<{ categoria: string; total: number; porcentaje: number }>;
}

interface ApiFunnel {
  llamadas: ApiFunnelCanal;
  chats: ApiFunnelCanal;
  videollamadas: ApiFunnelCanal;
}

interface ApiCrmHealthAdvisor {
  nombre: string;
  count: number;
}

interface ApiCrmHealthLeadDetalle {
  nombre: string;
  asesor: string | null;
  diasSinActividad: number;
}

interface ApiCrmHealth {
  sinEstado: number;
  sinAccion: number;
  enLimbo: number;
  porAsesor: ApiCrmHealthAdvisor[];
  leadsDetalle: ApiCrmHealthLeadDetalle[];
  leadsEnLimboDetalle: ApiCrmHealthLeadDetalle[];
}

interface ApiConversationAnalysis {
  totalConversaciones: number;
  conObjeciones: number;
  objeciones: Array<{ objecion: string; categoria: string; count: number }>;
  porCategoria: Record<string, number>;
}

interface ApiCanalContactabilidad {
  canal: 'llamadas' | 'chats';
  total: number;
  contesto: number;
  noContesto: number;
  califico: number;
  noCalifco: number;
  tasaRespuesta: number;
  tasaCalificacion: number;
}

interface ApiContactabilidadCanal {
  canales: ApiCanalContactabilidad[];
  totalGeneral: number;
  contestoGeneral: number;
  calificoGeneral: number;
  tasaRespuestaGlobal: number;
  tasaCalificacionGlobal: number;
}

interface ApiComparison {
  ads: { variacion_gasto: number | null; variacion_leads: number | null } | null;
  calls: { variacion_llamadas: number | null; variacion_tasa_contacto: number | null } | null;
  chats: { variacion_chats: number | null; variacion_speed: number | null } | null;
  videocalls: { variacion_total: number | null; variacion_tasa_cierre: number | null } | null;
}

interface ApiReportResponse {
  periodo: { from: string; to: string; type: string; dias: number };
  periodoPrevio: { from: string; to: string; type: string; dias: number };
  account: {
    nombre: string | null;
    subdominio: string;
    configuracion_ads: { meta?: { activo: boolean }; google?: { activo: boolean } } | null;
  };
  ads: ApiAds | null;
  calls: ApiCalls | null;
  chats: ApiChats | null;
  videocalls: ApiVideocalls | null;
  funnel: ApiFunnel | null;
  crmHealth: ApiCrmHealth | null;
  conversationAnalysis: ApiConversationAnalysis | null;
  contactabilidadCanal: ApiContactabilidadCanal | null;
  comparison: ApiComparison;
  previo: {
    ads: ApiAds | null;
    calls: ApiCalls | null;
    chats: ApiChats | null;
    videocalls: ApiVideocalls | null;
  };
}

interface ApiSummaryResponse {
  resumenEjecutivo: string;
  alertas: Array<{ bloque: string; nivel: string; mensaje: string }>;
  analisisConversaciones: string | null;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapAdsPerformance(
  ads: ApiAds,
  prevAds: ApiAds | null,
): ReportAdsPerformanceData {
  const plataformas = [
    ...new Set(ads.porCampana.map((c) => c.plataforma).filter((p): p is string => p != null)),
  ];

  const top3: ReportAdsPerformanceData['top3Anuncios'] = ads.porCreativo
    .slice(0, 3)
    .map((c) => ({
      nombre: c.nombre,
      gasto: c.gastoTotal,
      leads: c.leadsCount,
      cpl: c.leadsCount > 0 ? c.gastoTotal / c.leadsCount : 0,
      ctr: null,
    }));

  const totalLeads = ads.porCreativo.reduce((s, c) => s + c.leadsCount, 0);
  const cpl = totalLeads > 0 ? ads.totalGasto / totalLeads : 0;

  return {
    plataformas,
    gastoTotal: ads.totalGasto,
    impresiones: ads.totalImpresiones,
    clicks: ads.totalClicks,
    ctr: ads.avgCtr ?? 0,
    cpm: ads.avgCpm ?? 0,
    cpc: ads.avgCpc ?? 0,
    cpl,
    top3Anuncios: top3,
    tendenciaGasto: [],
  };
}

function mapAdvisorCalls(calls: ApiCalls): ReportAdvisorCallsData {
  const totalCalls = calls.totalLlamadas;
  return {
    asesores: calls.porCloser.map((c) => {
      const nombre = c.closerName ?? c.closerMail ?? 'Sin asignar';
      const tasaContacto = c.tasaContacto / 100;
      // Composite score: 40% contact rate + 30% speed (inverted, threshold 15min) + 30% scheduling
      const speedScore = c.speedToLeadAvgMin != null
        ? Math.max(0, 1 - c.speedToLeadAvgMin / 60)
        : 0.5;
      const score = Math.round(
        (tasaContacto * 0.4 + speedScore * 0.3 + (c.intentosProm > 0 ? 0.3 : 0)) * 100,
      );
      return {
        nombre,
        leads: c.leadsNuevos + c.leadsSeguimiento,
        llamadas: c.totalLlamadas,
        contestadas: c.contestadas,
        tasaContacto,
        agendadas: 0,
        tasaAgendamiento: 0,
        speedToLeadAvgMin: c.speedToLeadAvgMin,
        intentosPromedio: c.intentosProm,
        score,
      };
    }),
    speedToLeadUmbral: 15,
    totalLlamadas: calls.totalLlamadas,
    totalContestadas: calls.totalContestadas,
    tasaContactoEquipo: calls.tasaContactoGlobal / 100,
  };
}

function mapAdvisorChats(chats: ApiChats): ReportAdvisorChatsData {
  const sinAsignarEntry = chats.porAsesor.find((a) => a.asesor === null) ?? null;
  return {
    asesores: chats.porAsesor
      .filter((a): a is ApiChatsAdvisor & { asesor: string } => a.asesor !== null)
      .map((a) => ({
        nombre: a.asesor,
        chats: a.totalChats,
        leadsUnicos: a.totalChats,
        tasaRespuesta: 0,
        speedToLeadAvgMin: a.speedToLeadAvgMin,
        categorias: {
          cerrada: a.porCategoria['cerrada'] ?? 0,
          noCalificada: a.porCategoria['no_calificada'] ?? 0,
          enSeguimiento: a.porCategoria['en_seguimiento'] ?? a.porCategoria['seguimiento'] ?? 0,
          sinCategoria: a.porCategoria['sin_categoria'] ?? a.porCategoria['sin categoria'] ?? 0,
        },
      })),
    sinAsignar: sinAsignarEntry
      ? {
          chats: sinAsignarEntry.totalChats,
          categorias: {
            cerrada: sinAsignarEntry.porCategoria['cerrada'] ?? 0,
            noCalificada: sinAsignarEntry.porCategoria['no_calificada'] ?? 0,
            enSeguimiento:
              sinAsignarEntry.porCategoria['en_seguimiento'] ??
              sinAsignarEntry.porCategoria['seguimiento'] ??
              0,
            sinCategoria:
              sinAsignarEntry.porCategoria['sin_categoria'] ??
              sinAsignarEntry.porCategoria['sin categoria'] ??
              0,
          },
        }
      : null,
    speedToLeadUmbral: 5,
    totalChats: chats.totalChats,
    tasaRespuestaEquipo: 0,
    advertencia: null,
  };
}

function mapAdvisorVideocalls(videocalls: ApiVideocalls): ReportAdvisorVideocallsData {
  return {
    asesores: videocalls.porCloser.map((c) => ({
      nombre: c.closer ?? 'Sin asignar',
      citas: c.total,
      asistidas: c.calificadas,
      noShows: c.noShows,
      cerradas: c.cerradas,
      canceladas: c.canceladas,
      tasaCierre: c.calificadas > 0 ? c.cerradas / c.calificadas : 0,
      tasaNoShow: c.total > 0 ? c.noShows / c.total : 0,
    })),
    totalCitas: videocalls.total,
    totalAsistidas: videocalls.calificadas,
    totalNoShows: videocalls.noShows,
    totalCerradas: videocalls.cerradas,
    tasaCierreEquipo: videocalls.tasaCierre / 100,
  };
}

function mapLeadFunnel(funnel: ApiFunnel): ReportLeadFunnelData {
  const totalLlamadas =
    funnel.llamadas.contactados + funnel.llamadas.sinContacto;
  const totalChats =
    funnel.chats.contactados + funnel.chats.sinContacto;
  const totalVideo =
    funnel.videollamadas.contactados + funnel.videollamadas.sinContacto;

  const totalLeads = totalLlamadas || totalChats || totalVideo || 0;

  const contactados =
    funnel.llamadas.contactados +
    funnel.chats.contactados +
    funnel.videollamadas.contactados;

  const sinContacto =
    funnel.llamadas.sinContacto +
    funnel.chats.sinContacto +
    funnel.videollamadas.sinContacto;

  const stages: ReportLeadFunnelData['stages'] = [];

  if (contactados > 0) {
    stages.push({
      id: 'contactados',
      label: 'Contactados',
      count: contactados,
      pct: totalLeads > 0 ? contactados / totalLeads : 0,
      color: 'green',
    });
  }

  if (sinContacto > 0) {
    stages.push({
      id: 'sin_contacto',
      label: 'Sin contacto',
      count: sinContacto,
      pct: totalLeads > 0 ? sinContacto / totalLeads : 0,
      color: 'red',
      sublabel: 'no atendidos',
    });
  }

  // Add per-category stages from calls funnel
  for (const nodo of funnel.llamadas.porCategoria.slice(0, 5)) {
    stages.push({
      id: nodo.categoria,
      label: nodo.categoria.replace(/_/g, ' '),
      count: nodo.total,
      pct: totalLeads > 0 ? nodo.total / totalLeads : 0,
      color: 'blue',
    });
  }

  return {
    totalLeads,
    stages,
    analisis: null,
  };
}

function mapCrmHealth(crmHealth: ApiCrmHealth): ReportCrmHealthData {
  const total = crmHealth.sinEstado + crmHealth.sinAccion + crmHealth.enLimbo;
  const puntaje = total === 0 ? 100 : Math.max(0, Math.round(100 - (total / Math.max(total * 2, 1)) * 100));

  const asesorMasLimbo = crmHealth.porAsesor.length > 0
    ? { nombre: crmHealth.porAsesor[0].nombre, count: crmHealth.porAsesor[0].count }
    : null;

  return {
    puntajeHigiene: puntaje,
    leadsEnLimbo: crmHealth.enLimbo,
    leadsSinEstado: crmHealth.sinEstado,
    asignadosSinAccion: crmHealth.sinAccion,
    asesorMasLimbo,
    diasLimboUmbral: 5,
    leadsSinAccionDetalle: crmHealth.leadsDetalle ?? [],
    leadsEnLimboDetalle: crmHealth.leadsEnLimboDetalle ?? [],
  };
}

function mapConversationAnalysis(
  ca: ApiConversationAnalysis,
  aiAnalysis: string | null,
): ReportConversationAnalysisData {
  const total = ca.objeciones.reduce((s, o) => s + o.count, 0);
  return {
    totalAnalizadas: ca.totalConversaciones,
    topObjeciones: ca.objeciones.slice(0, 5).map((o) => ({
      nombre: o.objecion,
      count: o.count,
      pct: total > 0 ? o.count / total : 0,
    })),
    hallazgos: aiAnalysis
      ? [{ tipo: 'neutro' as const, texto: aiAnalysis }]
      : [],
    patronesFrecuentes: [],
    alertas: [],
    fuentesDatos: Object.keys(ca.porCategoria),
  };
}

function mapContactabilidadCanal(
  data: ApiContactabilidadCanal,
): ReportContactabilidadCanalData {
  return {
    canales: data.canales.map((c) => ({
      canal: c.canal,
      total: c.total,
      contesto: c.contesto,
      noContesto: c.noContesto,
      califico: c.califico,
      noCalifco: c.noCalifco,
      tasaRespuesta: c.tasaRespuesta,
      tasaCalificacion: c.tasaCalificacion,
    })),
    totalGeneral: data.totalGeneral,
    contestoGeneral: data.contestoGeneral,
    calificoGeneral: data.calificoGeneral,
    tasaRespuestaGlobal: data.tasaRespuestaGlobal,
    tasaCalificacionGlobal: data.tasaCalificacionGlobal,
  };
}

function mapComparison(
  comparison: ApiComparison,
  periodoActual: string,
  periodoAnterior: string,
): ReportComparisonData {
  const filas: ReportComparisonData['filas'] = [];

  if (comparison.calls) {
    if (comparison.calls.variacion_llamadas != null) {
      const v = comparison.calls.variacion_llamadas;
      filas.push({
        label: 'Llamadas realizadas',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: true,
        unidad: 'number',
      });
    }
    if (comparison.calls.variacion_tasa_contacto != null) {
      const v = comparison.calls.variacion_tasa_contacto;
      filas.push({
        label: 'Tasa de contacto',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: true,
        unidad: 'pct',
      });
    }
  }

  if (comparison.chats) {
    if (comparison.chats.variacion_chats != null) {
      const v = comparison.chats.variacion_chats;
      filas.push({
        label: 'Chats atendidos',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: true,
        unidad: 'number',
      });
    }
  }

  if (comparison.videocalls) {
    if (comparison.videocalls.variacion_total != null) {
      const v = comparison.videocalls.variacion_total;
      filas.push({
        label: 'Videollamadas',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: true,
        unidad: 'number',
      });
    }
    if (comparison.videocalls.variacion_tasa_cierre != null) {
      const v = comparison.videocalls.variacion_tasa_cierre;
      filas.push({
        label: 'Tasa de cierre',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: true,
        unidad: 'pct',
      });
    }
  }

  if (comparison.ads) {
    if (comparison.ads.variacion_gasto != null) {
      const v = comparison.ads.variacion_gasto;
      filas.push({
        label: 'Gasto en anuncios',
        actual: '-',
        anterior: '-',
        variacionPct: v,
        tendencia: v > 1 ? 'sube' : v < -1 ? 'baja' : 'igual',
        subirEsBueno: false,
        unidad: 'currency',
      });
    }
  }

  return { periodoActual, periodoAnterior, filas };
}

// ─── Period helpers ──────────────────────────────────────────────────────────

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
      <div className="h-32 rounded-xl bg-surface-700/60" />
      <div className="h-40 rounded-xl bg-surface-700/60" />
      <div className="h-52 rounded-xl bg-surface-700/60" />
      <div className="h-40 rounded-xl bg-surface-700/60" />
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const today = new Date();
  const params = useParams();
  const subdomain = typeof params?.subdomain === 'string' ? params.subdomain : '';

  const [period, setPeriod] = useState<PeriodType>('semana');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(today, 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Component-level data
  const [execSummary, setExecSummary] = useState<ReportExecutiveSummaryData | null>(null);
  const [adsData, setAdsData] = useState<ReportAdsPerformanceData | null>(null);
  const [callsData, setCallsData] = useState<ReportAdvisorCallsData | null>(null);
  const [chatsData, setChatsData] = useState<ReportAdvisorChatsData | null>(null);
  const [videocallsData, setVideocallsData] = useState<ReportAdvisorVideocallsData | null>(null);
  const [funnelData, setFunnelData] = useState<ReportLeadFunnelData | null>(null);
  const [crmHealthData, setCrmHealthData] = useState<ReportCrmHealthData | null>(null);
  const [conversationData, setConversationData] = useState<ReportConversationAnalysisData | null>(null);
  const [comparisonData, setComparisonData] = useState<ReportComparisonData | null>(null);
  const [contactabilidadData, setContactabilidadData] = useState<ReportContactabilidadCanalData | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const { from, to } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

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
    setExecSummary(null);
    setAdsData(null);
    setCallsData(null);
    setChatsData(null);
    setVideocallsData(null);
    setFunnelData(null);
    setCrmHealthData(null);
    setConversationData(null);
    setComparisonData(null);
    setContactabilidadData(null);

    const qs = new URLSearchParams({ from, to, period_type: period });
    fetch(`/api/data/report?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r: ApiReportResponse | null) => {
        if (!r) return;

        // Map all blocks
        // AUT-482: ocultar Ads si el módulo no está habilitado (meta.activo o google.activo)
        const adsModuloActivo =
          r.account.configuracion_ads?.meta?.activo === true ||
          r.account.configuracion_ads?.google?.activo === true;
        if (r.ads && adsModuloActivo) setAdsData(mapAdsPerformance(r.ads, r.previo?.ads ?? null));
        if (r.calls) setCallsData(mapAdvisorCalls(r.calls));
        if (r.chats) setChatsData(mapAdvisorChats(r.chats));
        if (r.videocalls) setVideocallsData(mapAdvisorVideocalls(r.videocalls));
        if (r.funnel) setFunnelData(mapLeadFunnel(r.funnel));
        if (r.crmHealth) setCrmHealthData(mapCrmHealth(r.crmHealth));
        if (r.contactabilidadCanal && r.contactabilidadCanal.totalGeneral > 0) {
          setContactabilidadData(mapContactabilidadCanal(r.contactabilidadCanal));
        }

        // Compute comparison if there's any comparison data
        // AUT-482: strip ads comparison rows when module is not enabled
        const effectiveComparison = adsModuloActivo
          ? r.comparison
          : { ...r.comparison, ads: null };
        const hasComparison =
          effectiveComparison.calls?.variacion_llamadas != null ||
          effectiveComparison.chats?.variacion_chats != null ||
          effectiveComparison.videocalls?.variacion_total != null ||
          effectiveComparison.ads?.variacion_gasto != null;
        if (hasComparison) {
          setComparisonData(
            mapComparison(
              effectiveComparison,
              `${r.periodo.from} → ${r.periodo.to}`,
              `${r.periodoPrevio.from} → ${r.periodoPrevio.to}`,
            ),
          );
        }

        // Funnel contact stats for executive summary
        const totalLeads =
          (r.funnel?.llamadas.contactados ?? 0) +
          (r.funnel?.llamadas.sinContacto ?? 0) +
          (r.funnel?.chats.contactados ?? 0) +
          (r.funnel?.chats.sinContacto ?? 0);

        const contactados =
          (r.funnel?.llamadas.contactados ?? 0) +
          (r.funnel?.chats.contactados ?? 0);

        // Fetch AI summary
        setSummaryLoading(true);
        fetch('/api/data/report/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r),
        })
          .then((sr) => (sr.ok ? sr.json() : null))
          .then((sr: ApiSummaryResponse | null) => {
            if (sr) {
              const validAdvisors = r.calls?.porCloser.filter(
                (c) => c.closerName || c.closerMail,
              );
              const bestAdvisor = validAdvisors?.[0]
                ? (validAdvisors[0].closerName ?? validAdvisors[0].closerMail)
                : null;
              const bestAd = r.ads?.porCreativo[0]?.nombre ?? null;

              setExecSummary({
                texto: sr.resumenEjecutivo,
                alertasCriticas: sr.alertas
                  .filter((a) => a.nivel === 'rojo')
                  .map((a) => a.mensaje),
                mejorAsesor: bestAdvisor,
                mejorAnuncio: bestAd,
                totalLeads,
                contactados,
                sinContacto: totalLeads - contactados,
              });

              // If conversation analysis exists, enrich with AI narrative
              if (r.conversationAnalysis) {
                setConversationData(
                  mapConversationAnalysis(r.conversationAnalysis, sr.analisisConversaciones),
                );
              }
            } else {
              // Fallback: basic exec summary without AI
              if (totalLeads > 0 || contactados > 0) {
                const sinContacto = totalLeads - contactados;
                const sinContactoPct = totalLeads > 0 ? Math.round((sinContacto / totalLeads) * 100) : 0;
                setExecSummary({
                  texto: '',
                  alertasCriticas: sinContactoPct >= 30
                    ? [`${sinContactoPct}% de leads sin contacto efectivo`]
                    : [],
                  mejorAsesor: r.calls?.porCloser[0]
                    ? (r.calls.porCloser[0].closerName ?? r.calls.porCloser[0].closerMail)
                    : null,
                  mejorAnuncio: r.ads?.porCreativo[0]?.nombre ?? null,
                  totalLeads,
                  contactados,
                  sinContacto,
                });
              }
              // Map conversation analysis without AI
              if (r.conversationAnalysis) {
                setConversationData(mapConversationAnalysis(r.conversationAnalysis, null));
              }
            }
          })
          .catch(() => {
            if (r.conversationAnalysis) {
              setConversationData(mapConversationAnalysis(r.conversationAnalysis, null));
            }
          })
          .finally(() => setSummaryLoading(false));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to, period]);

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
        day: '2-digit', month: 'long', year: 'numeric',
      });
      const displayName = companyName ?? subdomain;
      const periodStr = periodLabel(period, from, to);
      for (let page = 0; page < pageCount; page++) {
        if (page > 0) pdf.addPage();
        pdf.setFillColor(13, 18, 25);
        pdf.rect(0, 0, pdfW, headerH, 'F');
        pdf.setFillColor(0, 240, 255);
        pdf.rect(0, headerH - 0.5, pdfW, 0.5, 'F');
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text(displayName, marginX, 9);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 240, 255);
        pdf.text(periodStr, marginX, 17);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 160);
        const dateText = `Generado: ${generatedDate}`;
        pdf.text(dateText, pdfW - marginX - pdf.getTextWidth(dateText), 9);
        if (pageCount > 1) {
          const pageText = `Pág. ${page + 1} / ${pageCount}`;
          pdf.text(pageText, pdfW - marginX - pdf.getTextWidth(pageText), 17);
        }
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
            pdf.addImage(imgData, 'JPEG', marginX, headerH + gapAboveContent, contentW, sliceHeightMm);
          }
        }
        pdf.setFillColor(13, 18, 25);
        pdf.rect(0, pdfH - footerH, pdfW, footerH, 'F');
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

  const hasAnyData =
    execSummary !== null ||
    adsData !== null ||
    callsData !== null ||
    chatsData !== null ||
    videocallsData !== null ||
    funnelData !== null ||
    crmHealthData !== null ||
    conversationData !== null ||
    contactabilidadData !== null;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={`Periodo: ${periodLabel(period, from, to)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
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

            {period === 'personalizado' && (
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
      ) : !hasAnyData ? (
        <div className="flex items-center justify-center min-h-[300px] text-gray-500 text-sm">
          No hay datos para el periodo seleccionado.
        </div>
      ) : (
        <div ref={reportRef} className="p-3 md:p-4 space-y-4 max-w-6xl mx-auto min-w-0 overflow-x-hidden">

          {/* Bloque 0 — Resumen Ejecutivo (AI) */}
          {summaryLoading && !execSummary ? (
            <section className="rounded-xl p-4 section-futuristic border border-surface-500/60 flex items-center gap-3 text-sm text-gray-400">
              <Sparkles className="w-4 h-4 text-accent-cyan animate-pulse" />
              Generando resumen ejecutivo con IA...
            </section>
          ) : (
            <ReportExecutiveSummary data={execSummary} />
          )}

          {/* Bloque 1 — Anuncios */}
          <ReportAdsPerformance data={adsData} />

          {/* Bloque 2 — Asesores llamadas */}
          <ReportAdvisorCalls data={callsData} />

          {/* Bloque 3 — Asesores chats */}
          <ReportAdvisorChats data={chatsData} />

          {/* Bloque 4 — Videollamadas */}
          <ReportAdvisorVideocalls data={videocallsData} />

          {/* Bloque 5 — Funnel de leads */}
          <ReportLeadFunnel data={funnelData} />

          {/* Bloque 6 — Higiene CRM */}
          <ReportCrmHealth data={crmHealthData} />

          {/* Bloque 7 — Contactabilidad por Canal (AUT-493) */}
          <ReportContactabilidadCanal data={contactabilidadData} />

          {/* Bloque 8 — Análisis de conversaciones */}
          <ReportConversationAnalysis data={conversationData} />

          {/* Bloque 8 — Comparativo */}
          <ReportComparison data={comparisonData} />

        </div>
      )}
    </>
  );
}
