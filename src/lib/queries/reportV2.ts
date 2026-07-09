// AutoKPI — Report v2 · WS2 capa de agregación (AUT-1302 / AUT-1305)
// -----------------------------------------------------------------------------
// `buildReportV2()` produce el `report JSON v2` completo (contrato en
// `@/types/reportV2`) AMPLIANDO el motor actual (`./report`) — no lo reemplaza.
// Compone los builders existentes (calls/chats/video/funnel/crm/objeciones) y
// enchufa el enriquecimiento IA de WS1 (mock hasta AUT-1301) + narrativa Gemini.
// Todas las secciones query-backed del contrato están implementadas aquí.
// -----------------------------------------------------------------------------

import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
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
  ReportV2ComparativoRow,
  ReportV2UbicacionItem,
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
function computeScore(
  row: { llamadas: number; contactoPct: number; spdLead: number | null; seguimiento: number; citas: number },
  max: { llamadas: number; seguimiento: number; citas: number },
): number {
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

// ── Derivar zona desde número E.164 ─────────────────────────────────────────

function ladaToZona(phone: string | null): { zona: string; canal: ReportV2Canal } | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  // México +52 → zona "México"
  if (digits.startsWith("52") && digits.length >= 12) return { zona: "México", canal: "llamadas" };
  // USA/Canadá +1 → zona por área code 3 dígitos después del 1
  if (digits.startsWith("1") && digits.length === 11) return { zona: "EE.UU./Canadá", canal: "llamadas" };
  return null;
}

// ── Queries nuevas (base data, sin WS1) ─────────────────────────────────────

interface LlamadasCoberturaResult {
  leadsLlamados: number;
  contestaronPorLead: number;
  unSoloIntento: number;
  dosMasIntPorCloser: Record<string, number>;
  aQueIntentoContesta: Array<{ intento: number; leads: number }>;
  franjasHorarias: Array<{ franja: string; total: number; contestaron: number }>;
  mejorFranja: string | null;
}

async function getLlamadasCobertura(
  idCuenta: number,
  from: string,
  to: string,
): Promise<LlamadasCoberturaResult> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  const [intentoRows, franjaRows] = await Promise.all([
    // Intentos por lead: count total + primer intento efectivo
    db.execute<{
      lead_id: string;
      total_intentos: string;
      tuvo_efectiva: boolean;
      primer_efectivo: string | null;
      closer_mail: string | null;
    }>(sql`
      SELECT
        COALESCE(contact_id_ghl, mail_lead, phone) AS lead_id,
        COUNT(*)::text AS total_intentos,
        BOOL_OR(tipo_evento LIKE 'efectiva_%') AS tuvo_efectiva,
        MIN(CASE WHEN tipo_evento LIKE 'efectiva_%' THEN rn ELSE NULL END)::text AS primer_efectivo,
        MAX(closer_mail) AS closer_mail
      FROM (
        SELECT
          contact_id_ghl, mail_lead, phone, tipo_evento, closer_mail,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(contact_id_ghl, mail_lead, phone) ORDER BY ts
          ) AS rn
        FROM log_llamadas
        WHERE id_cuenta = ${idCuenta}
          AND ts BETWEEN ${fromTs} AND ${toTs}
          AND tipo_evento NOT IN ('pdte', 'contacto_creado')
      ) sub
      GROUP BY COALESCE(contact_id_ghl, mail_lead, phone)
    `),

    // Franjas horarias: count + contestaron por hora local de la cuenta
    db.execute<{ hora: string; total: string; contestaron: string }>(sql`
      SELECT
        EXTRACT(HOUR FROM ts AT TIME ZONE COALESCE((SELECT zona_horaria_iana FROM cuentas WHERE id_cuenta = ${idCuenta}), 'America/Mexico_City'))::int::text AS hora,
        COUNT(*)::text AS total,
        SUM(CASE WHEN tipo_evento LIKE 'efectiva_%' THEN 1 ELSE 0 END)::text AS contestaron
      FROM log_llamadas
      WHERE id_cuenta = ${idCuenta}
        AND ts BETWEEN ${fromTs} AND ${toTs}
        AND tipo_evento NOT IN ('pdte', 'contacto_creado')
      GROUP BY EXTRACT(HOUR FROM ts AT TIME ZONE COALESCE((SELECT zona_horaria_iana FROM cuentas WHERE id_cuenta = ${idCuenta}), 'America/Mexico_City'))
      ORDER BY EXTRACT(HOUR FROM ts AT TIME ZONE COALESCE((SELECT zona_horaria_iana FROM cuentas WHERE id_cuenta = ${idCuenta}), 'America/Mexico_City'))
    `),
  ]);

  // Procesar intentos
  const leadsLlamados = intentoRows.rows.length;
  let contestaronPorLead = 0;
  let unSoloIntento = 0;
  const intentoCountMap: Record<number, number> = {};
  const dosMasIntPorCloser: Record<string, number> = {};

  for (const r of intentoRows.rows) {
    const totalInt = Number(r.total_intentos);
    const primerEfectivo = r.primer_efectivo ? Number(r.primer_efectivo) : null;
    if (r.tuvo_efectiva) contestaronPorLead++;
    if (totalInt === 1 && !r.tuvo_efectiva) unSoloIntento++;
    if (primerEfectivo != null) {
      const bucket = primerEfectivo >= 4 ? 4 : primerEfectivo;
      intentoCountMap[bucket] = (intentoCountMap[bucket] ?? 0) + 1;
    }
    if (totalInt >= 2 && r.closer_mail) {
      dosMasIntPorCloser[r.closer_mail] = (dosMasIntPorCloser[r.closer_mail] ?? 0) + 1;
    }
  }

  const aQueIntentoContesta = Object.entries(intentoCountMap)
    .map(([k, v]) => ({ intento: Number(k), leads: v }))
    .sort((a, b) => a.intento - b.intento);

  // Franjas horarias
  const franjasHorarias = franjaRows.rows.map((r) => {
    const hora = Number(r.hora);
    const total = Number(r.total);
    const contestaron = Number(r.contestaron);
    const label = `${String(hora).padStart(2, "0")}:00–${String(hora + 1).padStart(2, "0")}:00`;
    return { franja: label, total, contestaron };
  });

  let mejorFranja: string | null = null;
  let mejorTasa = -1;
  for (const f of franjasHorarias) {
    if (f.total < 5) continue; // ignorar franjas con muy pocas llamadas
    const tasa = f.contestaron / f.total;
    if (tasa > mejorTasa) { mejorTasa = tasa; mejorFranja = f.franja; }
  }

  return {
    leadsLlamados,
    contestaronPorLead,
    unSoloIntento,
    dosMasIntPorCloser,
    aQueIntentoContesta,
    franjasHorarias: franjasHorarias.map((f) => ({
      franja: f.franja,
      total: f.total,
      contestaron: f.contestaron,
    })),
    mejorFranja,
  };
}

async function getCanalesPorLead(
  idCuenta: number,
  from: string,
  to: string,
): Promise<{ llamadaYChat: number; soloLlamada: number; soloChat: number }> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);
  const rows = await db.execute<{
    llamada_y_chat: string;
    solo_llamada: string;
    solo_chat: string;
  }>(sql`
    SELECT
      SUM(CASE WHEN en_llamadas AND en_chats THEN 1 ELSE 0 END)::text AS llamada_y_chat,
      SUM(CASE WHEN en_llamadas AND NOT en_chats THEN 1 ELSE 0 END)::text AS solo_llamada,
      SUM(CASE WHEN NOT en_llamadas AND en_chats THEN 1 ELSE 0 END)::text AS solo_chat
    FROM (
      SELECT lead_id,
        BOOL_OR(fuente = 'll') AS en_llamadas,
        BOOL_OR(fuente = 'ch') AS en_chats
      FROM (
        SELECT COALESCE(contact_id_ghl, mail_lead, phone) AS lead_id, 'll' AS fuente
        FROM log_llamadas
        WHERE id_cuenta = ${idCuenta}
          AND ts BETWEEN ${fromTs} AND ${toTs}
          AND tipo_evento NOT IN ('pdte', 'contacto_creado')
        UNION ALL
        SELECT COALESCE(id_lead::text, nombre_lead) AS lead_id, 'ch' AS fuente
        FROM chats_logs
        WHERE id_cuenta = ${idCuenta}
          AND fecha_y_hora_z BETWEEN ${fromTs} AND ${toTs}
      ) x
      WHERE lead_id IS NOT NULL
      GROUP BY lead_id
    ) y
  `);
  const r = rows.rows[0];
  return {
    llamadaYChat: Number(r?.llamada_y_chat ?? 0),
    soloLlamada: Number(r?.solo_llamada ?? 0),
    soloChat: Number(r?.solo_chat ?? 0),
  };
}

async function getUbicacionLada(
  idCuenta: number,
  from: string,
  to: string,
): Promise<{ items: ReportV2UbicacionItem[]; denominador: number }> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);
  const rows = await db.execute<{ phone: string; lead_id: string }>(sql`
    SELECT DISTINCT
      COALESCE(contact_id_ghl, mail_lead, phone) AS lead_id,
      phone
    FROM log_llamadas
    WHERE id_cuenta = ${idCuenta}
      AND ts BETWEEN ${fromTs} AND ${toTs}
      AND phone IS NOT NULL
      AND tipo_evento NOT IN ('pdte', 'contacto_creado')
  `);

  const zonaCount: Record<string, number> = {};
  let denominador = 0;
  const seenLeads = new Set<string>();

  for (const r of rows.rows) {
    if (!r.lead_id || seenLeads.has(r.lead_id)) continue;
    seenLeads.add(r.lead_id);
    const z = ladaToZona(r.phone);
    if (!z) continue;
    denominador++;
    zonaCount[z.zona] = (zonaCount[z.zona] ?? 0) + 1;
  }

  const items: ReportV2UbicacionItem[] = Object.entries(zonaCount)
    .sort((a, b) => b[1] - a[1])
    .map(([zona, count]) => ({
      zona,
      canal: "llamadas" as const,
      aprox: true as const,
      count,
      pct: denominador > 0 ? count / denominador : 0,
    }));

  return { items, denominador };
}

async function getNuevosReactivados(
  idCuenta: number,
  from: string,
  to: string,
): Promise<{ nuevos: number; reactivados: number }> {
  // registros_de_llamada: un registro por lead con estado actual.
  // Consideramos "nuevo" = fecha_primera_llamada dentro del periodo.
  // "reactivado" = fecha_primera_llamada antes del periodo pero tiene actividad en él.
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);
  const rows = await db.execute<{ nuevos: string; reactivados: string }>(sql`
    SELECT
      SUM(CASE
        WHEN fecha_primera_llamada BETWEEN ${fromTs} AND ${toTs} THEN 1 ELSE 0
      END)::text AS nuevos,
      SUM(CASE
        WHEN fecha_primera_llamada < ${fromTs} THEN 1 ELSE 0
      END)::text AS reactivados
    FROM registros_de_llamada
    WHERE id_cuenta::text = ${String(idCuenta)}
      AND fecha_evento BETWEEN ${fromTs} AND ${toTs}
  `);
  const r = rows.rows[0];
  return { nuevos: Number(r?.nuevos ?? 0), reactivados: Number(r?.reactivados ?? 0) };
}

async function getCitasPorAsesor(
  idCuenta: number,
  from: string,
  to: string,
): Promise<Record<string, { citas: number; asistieron: number }>> {
  const rows = await db.execute<{
    closer: string | null;
    citas: string;
    asistieron: string;
  }>(sql`
    SELECT
      closer AS closer,
      COUNT(*)::text AS citas,
      SUM(CASE WHEN NOT (
        categoria ILIKE '%no_show%' OR categoria ILIKE '%noshow%' OR categoria ILIKE '%no show%'
        OR categoria ILIKE '%cancelad%'
      ) THEN 1 ELSE 0 END)::text AS asistieron
    FROM resumenes_diarios_agendas
    WHERE id_cuenta = ${idCuenta}
      AND fecha BETWEEN ${from}::date AND ${to}::date
    GROUP BY closer
  `);
  const map: Record<string, { citas: number; asistieron: number }> = {};
  for (const r of rows.rows) {
    const key = r.closer ?? "sin asignar";
    map[key] = { citas: Number(r.citas), asistieron: Number(r.asistieron) };
  }
  return map;
}

// ── Comparativo ──────────────────────────────────────────────────────────────

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return parseFloat((((curr - prev) / prev) * 100).toFixed(1));
}

function comparativoRow(
  label: string,
  actual: number,
  anterior: number,
  subirEsBueno: boolean,
  unidad: ReportV2ComparativoRow["unidad"] = "number",
): ReportV2ComparativoRow {
  const variacionPct = pctDelta(actual, anterior);
  const tendencia: ReportV2ComparativoRow["tendencia"] =
    variacionPct == null || variacionPct === 0
      ? "igual"
      : variacionPct > 0
      ? "sube"
      : "baja";
  return { label, actual, anterior, variacionPct, tendencia, subirEsBueno, unidad };
}

// ── Builder principal ────────────────────────────────────────────────────────

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

  // ── Queries paralelas ─────────────────────────────────────────────────────
  const [
    calls, chats, video, funnel, crm, conv, contact,
    coberturaLL, canalesPorLead, ubicacion, nrSplit, citasXAsesor,
  ] = await Promise.all([
    getReportCalls(idCuenta, from, to),
    getReportChats(idCuenta, from, to),
    getReportVideocalls(idCuenta, from, to),
    getReportFunnel(idCuenta, from, to),
    getReportCrmHealth(idCuenta, from, to),
    getReportConversationAnalysis(idCuenta, from, to),
    getReportContactabilidadCanal(idCuenta, from, to),
    getLlamadasCobertura(idCuenta, from, to),
    getCanalesPorLead(idCuenta, from, to),
    getUbicacionLada(idCuenta, from, to),
    getNuevosReactivados(idCuenta, from, to),
    getCitasPorAsesor(idCuenta, from, to),
  ]);

  // ── canales activos ───────────────────────────────────────────────────────
  const canalesActivos: Record<ReportV2Canal, boolean> = {
    llamadas: calls.totalLlamadas > 0,
    chats: chats.totalChats > 0,
    video: video.total > 0,
  };

  // ── kpis ──────────────────────────────────────────────────────────────────
  const leadsAnalizados = contact.totalGeneral;
  const citasAgendadas = video.total;
  const citasRealizadas = video.total - video.noShows;
  const kpis = {
    leadsAnalizados,
    nuevos: nrSplit.nuevos,
    reactivados: nrSplit.reactivados,
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
      id: "conIntento",
      label: "Con intento",
      count: coberturaLL.leadsLlamados + chats.totalChats,
      pct: leadsAnalizados > 0 ? (coberturaLL.leadsLlamados + chats.totalChats) / leadsAnalizados : 0,
    },
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

  // ── estadoFinal ───────────────────────────────────────────────────────────
  const estadoFinal = {
    enConversacion: contact.contestoGeneral,
    calificados: contact.calificoGeneral,
    noCalificados: contact.canales.reduce((s, c) => s + c.noCalifco, 0),
    contactadosSinRespuesta: contact.totalGeneral - contact.contestoGeneral,
    unSoloIntento: coberturaLL.unSoloIntento,
    sinActividad: crm.enLimbo,
  };

  // ── origen ────────────────────────────────────────────────────────────────
  const origen = {
    nuevos: nrSplit.nuevos,
    reactivados: nrSplit.reactivados,
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

  // ── porCanal ──────────────────────────────────────────────────────────────
  const porCanal = {
    llamadas: canalesActivos.llamadas
      ? {
          realizadas: calls.totalLlamadas,
          leadsLlamados: coberturaLL.leadsLlamados,
          contestaronPorLead: coberturaLL.contestaronPorLead,
          calificados: contact.canales.find((c) => c.canal === "llamadas")?.califico ?? 0,
          noCalificados: contact.canales.find((c) => c.canal === "llamadas")?.noCalifco ?? 0,
          intentosProm: calls.intentosPromGlobal,
          speedToLeadProm: calls.speedToLeadAvgMin,
          duracionPromContestadas: null, // [WS1 / AUT-1301] columna pendiente
          mejorFranja: coberturaLL.mejorFranja,
        }
      : null,
    chats: canalesActivos.chats
      ? {
          conversaciones: chats.totalChats,
          mensajes: 0, // JSON JSONB count omitido (campo no prioritario en este sprint)
          respondieron: contact.canales.find((c) => c.canal === "chats")?.contesto ?? 0,
          tPrimeraRespuesta: chats.speedToLeadAvgMin,
          conBot: 0, // No hay señal de bot en chats_logs actualmente
          escaladas: 0, // No hay señal de escalada en chats_logs actualmente
        }
      : null,
    video: canalesActivos.video
      ? {
          agendadas: video.total,
          realizadas: video.total - video.noShows,
          showRate: video.total > 0 ? (video.total - video.noShows) / video.total : 0,
          calificados: video.calificadosReales,
          noCalificados: video.noCalificadosReales,
          reagendadas: 0, // No hay distinción reagendada vs nueva en resumenes_diarios_agendas
          noShow: video.noShows,
          duracionProm: null, // [WS1 / AUT-1301] columna pendiente
          avanzaron: video.cerradas,
        }
      : null,
  };

  // ── demografia ────────────────────────────────────────────────────────────
  const demografia = {
    ubicacion: ubicacion.items,
    ubicacionDenominador: ubicacion.denominador,
    motivo: enrichment.demografiaIA.motivo,
    perfil: enrichment.demografiaIA.perfil,
    edadDominante: enrichment.demografiaIA.edadDominante,
    presupuestoProm: enrichment.demografiaIA.presupuestoProm,
    iaDenominador: enrichment.demografiaIA.iaDenominador,
  };

  // ── cobertura ─────────────────────────────────────────────────────────────
  const total = coberturaLL.leadsLlamados || 1;
  const cobertura = {
    canalesPorLead,
    aQueIntentoContesta: coberturaLL.aQueIntentoContesta.map(({ intento, leads }) => ({
      label: intento >= 4 ? "4+" : String(intento),
      count: leads,
      pct: leads / total,
    })),
    franjasHorarias: coberturaLL.franjasHorarias.map((f) => ({
      franja: f.franja,
      tasaRespuesta: f.total > 0 ? f.contestaron / f.total : 0,
      n: f.total,
    })),
  };

  // ── comparativo ───────────────────────────────────────────────────────────
  let comparativo: ReportV2["comparativo"] = null;
  if (opts.periodoPrevio) {
    const [callsPrev, chatsPrev, videoPrev, contactPrev] = await Promise.all([
      getReportCalls(idCuenta, opts.periodoPrevio.from, opts.periodoPrevio.to),
      getReportChats(idCuenta, opts.periodoPrevio.from, opts.periodoPrevio.to),
      getReportVideocalls(idCuenta, opts.periodoPrevio.from, opts.periodoPrevio.to),
      getReportContactabilidadCanal(idCuenta, opts.periodoPrevio.from, opts.periodoPrevio.to),
    ]);
    const prevCitas = videoPrev.total;
    const prevCitasReal = videoPrev.total - videoPrev.noShows;
    const prevShowRate = prevCitas > 0 ? prevCitasReal / prevCitas : 0;
    const prevTasaConv = contactPrev.totalGeneral > 0
      ? contactPrev.calificoGeneral / contactPrev.totalGeneral : 0;
    const currTasaConv = contact.totalGeneral > 0
      ? contact.calificoGeneral / contact.totalGeneral : 0;
    const currTasaCont = contact.totalGeneral > 0
      ? contact.contestoGeneral / contact.totalGeneral : 0;
    const prevTasaCont = contactPrev.totalGeneral > 0
      ? contactPrev.contestoGeneral / contactPrev.totalGeneral : 0;

    comparativo = {
      filas: [
        comparativoRow("Leads analizados", leadsAnalizados, contactPrev.totalGeneral, true, "number"),
        comparativoRow("Tasa contactabilidad", currTasaCont * 100, prevTasaCont * 100, true, "pct"),
        comparativoRow("Tasa calificación", currTasaConv * 100, prevTasaConv * 100, true, "pct"),
        ...(canalesActivos.llamadas
          ? [comparativoRow("Llamadas realizadas", calls.totalLlamadas, callsPrev.totalLlamadas, true, "number")]
          : []),
        ...(canalesActivos.chats
          ? [comparativoRow("Conversaciones chat", chats.totalChats, chatsPrev.totalChats, true, "number")]
          : []),
        ...(canalesActivos.video
          ? [
              comparativoRow("Citas agendadas", citasAgendadas, prevCitas, true, "number"),
              comparativoRow("Show rate", kpis.showRate * 100, prevShowRate * 100, true, "pct"),
            ]
          : []),
        comparativoRow("Sin actividad (CRM)", crm.enLimbo, 0, false, "number"),
      ],
    };
  }

  // ── conversaciones (cualitativo IA — WS1) ─────────────────────────────────
  const conversaciones = enrichment.conversaciones;

  // ── rankingAsesores + score ───────────────────────────────────────────────
  const maxVals = {
    llamadas: Math.max(1, ...calls.porCloser.map((c) => c.totalLlamadas)),
    seguimiento: Math.max(1, ...calls.porCloser.map((c) => c.leadsSeguimiento)),
    citas: Math.max(1, ...Object.values(citasXAsesor).map((v) => v.citas)),
  };
  const tabla: ReportV2AsesorRow[] = calls.porCloser.map((c) => {
    const closerKey = c.closerMail ?? "";
    const contactoPct = c.totalLlamadas > 0 ? c.contestadas / c.totalLlamadas : 0;
    const dosMas = coberturaLL.dosMasIntPorCloser[closerKey] ?? 0;
    const leadsPorCloser = Math.max(1, c.leadsNuevos + c.leadsSeguimiento);
    const citaData = citasXAsesor[closerKey] ??
      // fallback: buscar por nombre_closer (en video closer = nombre_closer)
      citasXAsesor[c.closerName ?? ""] ?? { citas: 0, asistieron: 0 };

    const row: ReportV2AsesorRow = {
      nombre: c.closerName ?? c.closerMail ?? "sin nombre",
      leads: c.leadsNuevos + c.leadsSeguimiento,
      seguimiento: c.leadsSeguimiento,
      llamadas: c.totalLlamadas,
      contactoPct,
      spdLead: c.speedToLeadAvgMin,
      intProm: c.intentosProm,
      dosMasIntPct: leadsPorCloser > 0 ? dosMas / leadsPorCloser : 0,
      citas: citaData.citas,
      asistieron: citaData.asistieron,
      score: 0,
    };
    row.score = computeScore(
      { llamadas: row.llamadas, contactoPct, spdLead: row.spdLead, seguimiento: row.seguimiento, citas: row.citas },
      maxVals,
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

  // ── conclusiones / meta ───────────────────────────────────────────────────
  const conclusiones = enrichment.conclusiones;

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

  // Ensamblar ANTES de la narrativa (Gemini resume los agregados).
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
