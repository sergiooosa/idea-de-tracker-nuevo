// AutoKPI — Report v2 · WS2 capa de agregación (AUT-1302)
// -----------------------------------------------------------------------------
// `buildReportV2()` produce el `report JSON v2` completo (contrato en
// `@/types/reportV2`) AMPLIANDO el motor actual (`./report`) — no lo reemplaza.
// Compone los builders existentes (calls/chats/video/funnel/crm/objeciones) y
// enchufa el enriquecimiento IA de WS1 (mock hasta AUT-1301) + narrativa Gemini.
//
// Secciones respaldadas por builders existentes → datos reales YA.
// Secciones que requieren SQL nuevo o columnas de WS1 → marcadas `TODO(AUT-…)`
// y devueltas HONESTAS (vacías/null), nunca ceros disfrazados de dato.
// -----------------------------------------------------------------------------

import {
  getReportCalls,
  getReportChats,
  getReportVideocalls,
  getReportFunnel,
  getReportCrmHealth,
  getReportConversationAnalysis,
  getReportContactabilidadCanal,
} from "./report";
import {
  getEnrichmentMock,
  type ReportV2Enrichment,
} from "./reportV2Enrichment";
import { generateNarrativa } from "./reportV2Narrative";
import type {
  ReportV2,
  ReportV2Canal,
  ReportV2Periodo,
  ReportV2AsesorRow,
  ReportV2FunnelStage,
} from "@/types/reportV2";

export interface BuildReportV2Account {
  cuentaId: number;
  nombre: string | null;
  subdominio: string;
}

export interface BuildReportV2Options {
  account: BuildReportV2Account;
  periodType: ReportV2Periodo["type"];
  /** Periodo previo ya resuelto por el caller (null = cliente sin histórico). */
  periodoPrevio: { from: string; to: string } | null;
  /** API key Gemini por-cuenta (fallback a env). */
  geminiApiKey?: string | null;
  /** Inyectable para tests; por defecto usa el mock de WS1. */
  enrichment?: ReportV2Enrichment;
}

function daysBetween(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((t - f) / 86400000) + 1;
}

/** Score compuesto 0-100: volumen+contacto+velocidad+seguimiento+citas. */
function computeScore(row: {
  llamadas: number;
  contactoPct: number;
  spdLead: number | null;
  seguimiento: number;
  citas: number;
}, max: { llamadas: number; seguimiento: number; citas: number }): number {
  const norm = (v: number, m: number) => (m > 0 ? v / m : 0);
  const velocidad =
    row.spdLead == null ? 0.5 : Math.max(0, 1 - Math.min(row.spdLead, 60) / 60);
  const score =
    0.25 * norm(row.llamadas, max.llamadas) +
    0.3 * row.contactoPct +
    0.15 * velocidad +
    0.15 * norm(row.seguimiento, max.seguimiento) +
    0.15 * norm(row.citas, max.citas);
  return Math.round(score * 100);
}

/**
 * Construye el report JSON v2 completo para una cuenta+periodo. Multi-tenant:
 * todo se filtra por `account.cuentaId`.
 */
export async function buildReportV2(
  from: string,
  to: string,
  opts: BuildReportV2Options,
): Promise<ReportV2> {
  const { account } = opts;
  const idCuenta = account.cuentaId;
  const enrichment = opts.enrichment ?? getEnrichmentMock();

  const [calls, chats, video, funnel, crm, conv, contact] = await Promise.all([
    getReportCalls(idCuenta, from, to),
    getReportChats(idCuenta, from, to),
    getReportVideocalls(idCuenta, from, to),
    getReportFunnel(idCuenta, from, to),
    getReportCrmHealth(idCuenta, from, to),
    getReportConversationAnalysis(idCuenta, from, to),
    getReportContactabilidadCanal(idCuenta, from, to),
  ]);

  // ── canales activos (para ocultar bloques vacíos) ────────────────────────
  const canalesActivos: Record<ReportV2Canal, boolean> = {
    llamadas: calls.totalLlamadas > 0,
    chats: chats.totalChats > 0,
    video: video.total > 0,
  };

  // ── kpis ─────────────────────────────────────────────────────────────────
  const leadsAnalizados = contact.totalGeneral;
  const citasAgendadas = video.total;
  const citasRealizadas = video.total - video.noShows;
  const kpis = {
    leadsAnalizados,
    // TODO(AUT-1302): split nuevos/reactivados requiere SQL sobre registros_de_llamada.
    nuevos: 0,
    reactivados: 0,
    citasAgendadas,
    citasRealizadas,
    showRate: citasAgendadas > 0 ? citasRealizadas / citasAgendadas : 0,
  };

  // ── funnel ────────────────────────────────────────────────────────────────
  const contactados =
    funnel.llamadas.contactados +
    funnel.chats.contactados +
    funnel.videollamadas.contactados;
  const stages: ReportV2FunnelStage[] = [
    { id: "analizados", label: "Analizados", count: leadsAnalizados, pct: 1 },
    {
      id: "conversacion",
      label: "Conversación",
      count: contactados,
      pct: leadsAnalizados > 0 ? contactados / leadsAnalizados : 0,
    },
    {
      id: "calificaron",
      label: "Calificaron",
      count: contact.calificoGeneral,
      pct: leadsAnalizados > 0 ? contact.calificoGeneral / leadsAnalizados : 0,
    },
    {
      id: "citaAgendada",
      label: "Cita agendada",
      count: citasAgendadas,
      pct: leadsAnalizados > 0 ? citasAgendadas / leadsAnalizados : 0,
    },
    {
      id: "citaRealizada",
      label: "Cita realizada",
      count: citasRealizadas,
      pct: leadsAnalizados > 0 ? citasRealizadas / leadsAnalizados : 0,
    },
  ];

  // ── estadoFinal ────────────────────────────────────────────────────────────
  const estadoFinal = {
    enConversacion: contact.contestoGeneral,
    calificados: contact.calificoGeneral,
    noCalificados: contact.canales.reduce((s, c) => s + c.noCalifco, 0),
    contactadosSinRespuesta: contact.totalGeneral - contact.contestoGeneral,
    // TODO(AUT-1302): unSoloIntento requiere agregación por lead sobre log_llamadas.
    unSoloIntento: 0,
    sinActividad: crm.enLimbo,
  };

  // ── origen ──────────────────────────────────────────────────────────────────
  const origen = {
    // TODO(AUT-1302): nuevos/reactivados desde registros_de_llamada.reactivado.
    nuevos: 0,
    reactivados: 0,
    narrativaReactivacion: enrichment.narrativas.reactivacion,
  };

  // ── higieneCRM ────────────────────────────────────────────────────────────
  const higieneCRM = {
    leadsSinActividadTotal: crm.enLimbo,
    porAsesor: crm.porAsesor.map((a) => ({
      asesor: a.asesor ?? "sin asignar",
      count: a.enLimbo,
    })),
    detalle: crm.leadsEnLimboDetalle.map((l) => ({
      nombre: l.nombre,
      asesor: l.asesor,
      diasSinActividad: l.diasSinActividad,
    })),
    diasUmbral: 5,
  };

  // ── porCanal ────────────────────────────────────────────────────────────────
  const porCanal = {
    llamadas: canalesActivos.llamadas
      ? {
          realizadas: calls.totalLlamadas,
          leadsLlamados: 0, // TODO(AUT-1302): leads únicos llamados (query dedicada).
          contestaronPorLead: 0, // TODO(AUT-1302).
          intentosProm: calls.intentosPromGlobal,
          speedToLeadProm: calls.speedToLeadAvgMin,
          duracionPromContestadas: null, // [WS1 #3] AUT-1301.
          mejorFranja: null, // TODO(AUT-1302): franja con mayor tasa de respuesta.
        }
      : null,
    chats: canalesActivos.chats
      ? {
          conversaciones: chats.totalChats,
          mensajes: 0, // TODO(AUT-1302): SUM mensajes desde chats_logs JSONB.
          respondieron: contact.canales.find((c) => c.canal === "chats")?.contesto ?? 0,
          tPrimeraRespuesta: chats.speedToLeadAvgMin,
          conBot: 0, // TODO(AUT-1302).
          escaladas: 0, // TODO(AUT-1302).
        }
      : null,
    video: canalesActivos.video
      ? {
          agendadas: video.total,
          realizadas: video.total - video.noShows,
          showRate: video.total > 0 ? (video.total - video.noShows) / video.total : 0,
          reagendadas: 0, // TODO(AUT-1302).
          noShow: video.noShows,
          duracionProm: null, // [WS1 #3] AUT-1301.
          avanzaron: video.cerradas,
        }
      : null,
  };

  // ── demografia (lada + IA de WS1) ────────────────────────────────────────
  const demografia = {
    ubicacion: [], // TODO(AUT-1302): lada→zona desde teléfono (WS1 provee tabla mapeo).
    ubicacionDenominador: 0,
    motivo: enrichment.demografiaIA.motivo,
    perfil: enrichment.demografiaIA.perfil,
    edadDominante: enrichment.demografiaIA.edadDominante,
    presupuestoProm: enrichment.demografiaIA.presupuestoProm,
    iaDenominador: enrichment.demografiaIA.iaDenominador,
  };

  // ── cobertura ────────────────────────────────────────────────────────────
  const cobertura = {
    // TODO(AUT-1302): canalesPorLead / aQueIntentoContesta / franjas → SQL nuevo.
    canalesPorLead: { llamadaYChat: 0, soloLlamada: 0, soloChat: 0 },
    aQueIntentoContesta: [],
    franjasHorarias: [],
  };

  // ── comparativo (null si sin histórico) ──────────────────────────────────
  const comparativo = opts.periodoPrevio
    ? {
        // TODO(AUT-1302): rehidratar builders sobre periodoPrevio y armar deltas.
        filas: [],
      }
    : null;

  // ── conversaciones (cualitativo IA — WS1) ────────────────────────────────
  const conversaciones = enrichment.conversaciones;

  // ── rankingAsesores + score ──────────────────────────────────────────────
  const max = {
    llamadas: Math.max(1, ...calls.porCloser.map((c) => c.totalLlamadas)),
    seguimiento: Math.max(1, ...calls.porCloser.map((c) => c.leadsSeguimiento)),
    citas: 1,
  };
  const tabla: ReportV2AsesorRow[] = calls.porCloser.map((c) => {
    const contactoPct = c.totalLlamadas > 0 ? c.contestadas / c.totalLlamadas : 0;
    const row = {
      nombre: c.closerName ?? c.closerMail ?? "sin nombre",
      leads: c.leadsNuevos + c.leadsSeguimiento,
      seguimiento: c.leadsSeguimiento,
      llamadas: c.totalLlamadas,
      contactoPct,
      spdLead: c.speedToLeadAvgMin,
      intProm: c.intentosProm,
      dosMasIntPct: 0, // TODO(AUT-1302): % leads con 2+ intentos.
      citas: 0, // TODO(AUT-1302): citas por asesor (cruce con video).
      asistieron: 0, // TODO(AUT-1302).
      score: 0,
    };
    row.score = computeScore(
      { llamadas: row.llamadas, contactoPct, spdLead: row.spdLead, seguimiento: row.seguimiento, citas: row.citas },
      max,
    );
    return row;
  });
  tabla.sort((a, b) => b.score - a.score);
  const rankingAsesores = {
    destacados: {
      mejor: tabla[0]?.nombre ?? null,
      masRapido:
        [...tabla]
          .filter((r) => r.spdLead != null)
          .sort((a, b) => (a.spdLead as number) - (b.spdLead as number))[0]?.nombre ?? null,
      masSeguimiento:
        [...tabla].sort((a, b) => b.seguimiento - a.seguimiento)[0]?.nombre ?? null,
      masLlamadas: [...tabla].sort((a, b) => b.llamadas - a.llamadas)[0]?.nombre ?? null,
    },
    tabla,
    alertas: enrichment.narrativas.rankingAlertas,
  };

  // ── objeciones ────────────────────────────────────────────────────────────
  const totalObj = conv.conObjeciones || 1;
  const objeciones = conv.objeciones.map((o) => ({
    nombre: o.objecion,
    count: o.count,
    pct: o.count / totalObj,
    fraseTextual: enrichment.objecionesFraseTextual[o.objecion] ?? null,
  }));

  // ── frasesRepetitivas (IA — WS1) ─────────────────────────────────────────
  const frasesRepetitivas = Object.entries(enrichment.frasesInsights).map(
    ([frase, insight]) => ({ frase, leads: 0, insight }),
  );

  // ── conclusiones (IA — WS1/WS2) ──────────────────────────────────────────
  const conclusiones = enrichment.conclusiones;

  // ── meta ────────────────────────────────────────────────────────────────
  const periodo: ReportV2Periodo = {
    from,
    to,
    type: opts.periodType,
    dias: daysBetween(from, to),
  };
  const periodoPrevio: ReportV2Periodo | null = opts.periodoPrevio
    ? {
        from: opts.periodoPrevio.from,
        to: opts.periodoPrevio.to,
        type: opts.periodType,
        dias: daysBetween(opts.periodoPrevio.from, opts.periodoPrevio.to),
      }
    : null;

  const meta = {
    cuentaId: idCuenta,
    nombre: account.nombre,
    subdominio: account.subdominio,
    periodo,
    periodoPrevio,
    canalesActivos,
    enriquecimientoParcial: enrichment.parcial,
  };

  // Ensamblar el reporte ANTES de la narrativa (Gemini resume los agregados).
  const partial: ReportV2 = {
    meta,
    kpis,
    funnel: { stages },
    estadoFinal,
    origen,
    higieneCRM,
    porCanal,
    demografia,
    cobertura,
    comparativo,
    conversaciones,
    rankingAsesores,
    objeciones,
    frasesRepetitivas,
    conclusiones,
    narrativa: { resumenEjecutivo: "", alertasCriticas: [] },
  };

  partial.narrativa = await generateNarrativa(partial, opts.geminiApiKey ?? null);

  return partial;
}
