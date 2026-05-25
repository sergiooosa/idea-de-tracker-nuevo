/**
 * src/lib/queries/report.ts
 *
 * Capa de consultas de agregación para Reportes v2.
 * Cada función recibe (idCuenta, from, to) y retorna datos tipados.
 * Todas las consultas son de solo lectura.
 */

import { db } from "@/lib/db";
import {
  logLlamadas,
  registrosDeLlamada,
  chatsLogs,
  resumenesDiariosAgendas,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, isNull, or } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  1. getReportAds                                                    */
/* ------------------------------------------------------------------ */

export interface ReportAdsCampaign {
  campana: string | null;
  plataforma: string | null;
  gastoTotal: number;
  impresiones: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
}

export interface ReportAdsCreativo {
  nombre: string;
  gastoTotal: number;
  leadsCount: number;
}

export interface ReportAds {
  totalGasto: number;
  totalImpresiones: number;
  totalClicks: number;
  avgCtr: number | null;
  avgCpm: number | null;
  avgCpc: number | null;
  porCampana: ReportAdsCampaign[];
  porCreativo: ReportAdsCreativo[];
}

export async function getReportAds(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportAds> {
  const [campanaRows, creativoRows, leadsPorCreativo] = await Promise.all([
    // Agregado por campaña desde resumenes_diarios_ads (no está en schema Drizzle → raw SQL)
    db.execute(sql`
      SELECT
        campana,
        plataforma,
        SUM(gasto_total_ad)::numeric          AS gasto_total,
        SUM(impresiones_totales)::bigint      AS impresiones,
        SUM(clicks_unicos)::bigint            AS clicks,
        AVG(CASE WHEN gasto_total_ad > 0 THEN ctr END)::numeric AS ctr,
        AVG(CASE WHEN gasto_total_ad > 0 THEN cpm END)::numeric AS cpm,
        AVG(CASE WHEN gasto_total_ad > 0 THEN cpc END)::numeric AS cpc
      FROM resumenes_diarios_ads
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
      GROUP BY campana, plataforma
      ORDER BY gasto_total DESC
    `),

    // Gasto por creativo
    db.execute(sql`
      SELECT
        nombre_de_creativo,
        SUM(gasto_total_creativo)::numeric AS gasto_total
      FROM resumenes_diarios_creativos
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
      GROUP BY nombre_de_creativo
      ORDER BY gasto_total DESC
    `),

    // Leads por creativo_origen en log_llamadas
    db.execute(sql`
      SELECT
        creativo_origen,
        COUNT(DISTINCT COALESCE(contact_id_ghl, mail_lead, phone))::int AS leads_count
      FROM log_llamadas
      WHERE id_cuenta = ${idCuenta}
        AND ts BETWEEN ${new Date(`${from}T00:00:00Z`)} AND ${new Date(`${to}T23:59:59.999Z`)}
        AND creativo_origen IS NOT NULL
        AND creativo_origen <> ''
        AND tipo_evento NOT IN ('pdte', 'contacto_creado')
      GROUP BY creativo_origen
      ORDER BY leads_count DESC
    `),
  ]);

  type CampanaRow = {
    campana: string | null;
    plataforma: string | null;
    gasto_total: string | null;
    impresiones: string | null;
    clicks: string | null;
    ctr: string | null;
    cpm: string | null;
    cpc: string | null;
  };

  type CreativoRow = { nombre_de_creativo: string; gasto_total: string | null };
  type LeadCreativoRow = { creativo_origen: string; leads_count: number };

  const porCampana: ReportAdsCampaign[] = (campanaRows.rows as CampanaRow[]).map((r) => ({
    campana: r.campana,
    plataforma: r.plataforma,
    gastoTotal: parseFloat(r.gasto_total ?? "0") || 0,
    impresiones: Number(r.impresiones ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: r.ctr != null ? parseFloat(r.ctr) : null,
    cpm: r.cpm != null ? parseFloat(r.cpm) : null,
    cpc: r.cpc != null ? parseFloat(r.cpc) : null,
  }));

  // Mapa de leads por creativo — normalizado a lowercase+trim para tolerar diferencias de capitalización
  const leadsMap: Record<string, number> = {};
  for (const r of leadsPorCreativo.rows as LeadCreativoRow[]) {
    leadsMap[r.creativo_origen.trim().toLowerCase()] = r.leads_count;
  }

  const porCreativo: ReportAdsCreativo[] = (creativoRows.rows as CreativoRow[]).map((r) => ({
    nombre: r.nombre_de_creativo,
    gastoTotal: parseFloat(r.gasto_total ?? "0") || 0,
    leadsCount: leadsMap[r.nombre_de_creativo.trim().toLowerCase()] ?? 0,
  }));

  const totalGasto = porCampana.reduce((s, r) => s + r.gastoTotal, 0);
  const totalImpresiones = porCampana.reduce((s, r) => s + r.impresiones, 0);
  const totalClicks = porCampana.reduce((s, r) => s + r.clicks, 0);

  const ctrs = porCampana.filter((r) => r.ctr != null).map((r) => r.ctr!);
  const cpms = porCampana.filter((r) => r.cpm != null).map((r) => r.cpm!);
  const cpcs = porCampana.filter((r) => r.cpc != null).map((r) => r.cpc!);

  return {
    totalGasto,
    totalImpresiones,
    totalClicks,
    avgCtr: ctrs.length > 0 ? ctrs.reduce((s, v) => s + v, 0) / ctrs.length : null,
    avgCpm: cpms.length > 0 ? cpms.reduce((s, v) => s + v, 0) / cpms.length : null,
    avgCpc: cpcs.length > 0 ? cpcs.reduce((s, v) => s + v, 0) / cpcs.length : null,
    porCampana,
    porCreativo,
  };
}

/* ------------------------------------------------------------------ */
/*  2. getReportCalls                                                  */
/* ------------------------------------------------------------------ */

export interface ReportCallsAdvisor {
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

export interface ReportCalls {
  totalLlamadas: number;
  totalContestadas: number;
  tasaContactoGlobal: number;
  speedToLeadAvgMin: number | null;
  intentosPromGlobal: number;
  porCloser: ReportCallsAdvisor[];
}

export async function getReportCalls(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportCalls> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  // Llamadas realizadas en el rango (excluir pdte y contacto_creado que son solo creación de lead)
  // Proyección explícita para no cargar transcripcion (texto completo, caro en memoria con volumen alto)
  const rows = await db
    .select({
      id: logLlamadas.id,
      id_registro: logLlamadas.id_registro,
      tipo_evento: logLlamadas.tipo_evento,
      closer_mail: logLlamadas.closer_mail,
      nombre_closer: logLlamadas.nombre_closer,
      contact_id_ghl: logLlamadas.contact_id_ghl,
      mail_lead: logLlamadas.mail_lead,
      phone: logLlamadas.phone,
      speed_to_lead: logLlamadas.speed_to_lead,
    })
    .from(logLlamadas)
    .where(
      and(
        eq(logLlamadas.id_cuenta, idCuenta),
        gte(logLlamadas.ts, fromTs),
        lte(logLlamadas.ts, toTs),
        sql`${logLlamadas.tipo_evento} NOT IN ('pdte', 'contacto_creado')`,
      ),
    );

  // Nuevos leads en el rango (tipo_evento = 'pdte' o 'contacto_creado')
  const nuevosResult = await db.execute(sql`
    SELECT
      LOWER(TRIM(COALESCE(closer_mail, nombre_closer, ''))) AS closer_key,
      MIN(closer_mail)  AS closer_mail,
      MIN(nombre_closer) AS closer_name,
      COUNT(DISTINCT COALESCE(contact_id_ghl, mail_lead, phone))::int AS leads_nuevos
    FROM log_llamadas
    WHERE id_cuenta = ${idCuenta}
      AND ts BETWEEN ${fromTs} AND ${toTs}
      AND tipo_evento IN ('pdte', 'contacto_creado')
    GROUP BY LOWER(TRIM(COALESCE(closer_mail, nombre_closer, '')))
  `);

  type NuevoRow = {
    closer_key: string;
    closer_mail: string | null;
    closer_name: string | null;
    leads_nuevos: number;
  };

  const nuevosMap: Record<string, number> = {};
  for (const r of nuevosResult.rows as NuevoRow[]) {
    nuevosMap[r.closer_key] = r.leads_nuevos;
  }

  // Leads de seguimiento = leads únicos en log_llamadas (excluyendo pdte/contacto_creado)
  // que YA existían antes del rango (tienen id_registro con fecha_primera_llamada previa)
  const seguimientoResult = await db.execute(sql`
    SELECT
      LOWER(TRIM(COALESCE(ll.closer_mail, ll.nombre_closer, ''))) AS closer_key,
      COUNT(DISTINCT COALESCE(ll.contact_id_ghl, ll.mail_lead, ll.phone))::int AS leads_seguimiento
    FROM log_llamadas ll
    LEFT JOIN registros_de_llamada rr ON rr.id_registro = ll.id_registro
    WHERE ll.id_cuenta = ${idCuenta}
      AND ll.ts BETWEEN ${fromTs} AND ${toTs}
      AND ll.tipo_evento NOT IN ('pdte', 'contacto_creado')
      AND rr.fecha_primera_llamada < ${fromTs}
    GROUP BY LOWER(TRIM(COALESCE(ll.closer_mail, ll.nombre_closer, '')))
  `);

  type SeguimientoRow = { closer_key: string; leads_seguimiento: number };
  const seguimientoMap: Record<string, number> = {};
  for (const r of seguimientoResult.rows as SeguimientoRow[]) {
    seguimientoMap[r.closer_key] = r.leads_seguimiento;
  }

  // Agrupar por closer
  function normalizeCloserKey(mail?: string | null, name?: string | null): string {
    const m = mail?.trim().toLowerCase();
    if (m) return m;
    const n = name?.trim().toLowerCase();
    if (n) return n;
    return "sin asignar";
  }

  const byCloser: Record<
    string,
    {
      closerMail: string | null;
      closerName: string | null;
      llamadas: number;
      contestadas: number;
      speeds: number[];
      leadsSet: Set<string>;
    }
  > = {};

  for (const r of rows) {
    const key = normalizeCloserKey(r.closer_mail, r.nombre_closer);
    if (!byCloser[key]) {
      byCloser[key] = {
        closerMail: r.closer_mail,
        closerName: r.nombre_closer,
        llamadas: 0,
        contestadas: 0,
        speeds: [],
        leadsSet: new Set(),
      };
    }
    const entry = byCloser[key];
    if (!entry) continue;
    entry.llamadas++;
    if (r.tipo_evento.startsWith("efectiva_")) entry.contestadas++;
    if (r.speed_to_lead) {
      const s = parseFloat(r.speed_to_lead);
      if (!isNaN(s) && s >= 0) entry.speeds.push(s);
    }
    const leadId = r.contact_id_ghl ?? r.mail_lead ?? r.phone ?? String(r.id);
    entry.leadsSet.add(leadId);
  }

  const porCloser: ReportCallsAdvisor[] = Object.entries(byCloser).map(([key, v]) => {
    const totalLeads = v.leadsSet.size || 1;
    return {
      closerMail: v.closerMail,
      closerName: v.closerName,
      totalLlamadas: v.llamadas,
      contestadas: v.contestadas,
      tasaContacto: v.llamadas > 0 ? (v.contestadas / v.llamadas) * 100 : 0,
      speedToLeadAvgMin:
        v.speeds.length > 0 ? v.speeds.reduce((s, x) => s + x, 0) / v.speeds.length : null,
      intentosProm: v.llamadas / totalLeads,
      leadsNuevos: nuevosMap[key] ?? 0,
      leadsSeguimiento: seguimientoMap[key] ?? 0,
    };
  });

  const totalLlamadas = rows.length;
  const totalContestadas = rows.filter((r) => r.tipo_evento.startsWith("efectiva_")).length;
  const allSpeeds = rows
    .filter((r) => r.speed_to_lead != null)
    .map((r) => parseFloat(r.speed_to_lead as string))
    .filter((n) => !isNaN(n) && n >= 0);

  const uniqueLeads = new Set(
    rows.map((r) => r.contact_id_ghl ?? r.mail_lead ?? r.phone ?? String(r.id)),
  );

  return {
    totalLlamadas,
    totalContestadas,
    tasaContactoGlobal: totalLlamadas > 0 ? (totalContestadas / totalLlamadas) * 100 : 0,
    speedToLeadAvgMin:
      allSpeeds.length > 0 ? allSpeeds.reduce((s, v) => s + v, 0) / allSpeeds.length : null,
    intentosPromGlobal: uniqueLeads.size > 0 ? totalLlamadas / uniqueLeads.size : 0,
    porCloser,
  };
}

/* ------------------------------------------------------------------ */
/*  3. getReportChats                                                  */
/* ------------------------------------------------------------------ */

export interface ReportChatsAdvisor {
  asesor: string | null;
  totalChats: number;
  speedToLeadAvgMin: number | null;
  porCategoria: Record<string, number>;
}

export interface ReportChats {
  totalChats: number;
  speedToLeadAvgMin: number | null;
  porAsesor: ReportChatsAdvisor[];
  porCategoria: Record<string, number>;
}

export async function getReportChats(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportChats> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  const rows = await db
    .select({
      asesor_asignado: chatsLogs.asesor_asignado,
      primer_msg_lead_at: chatsLogs.primer_msg_lead_at,
      primer_msg_at: chatsLogs.primer_msg_at,
      ia_categoria: chatsLogs.ia_categoria,
    })
    .from(chatsLogs)
    .where(
      and(
        eq(chatsLogs.id_cuenta, idCuenta),
        gte(chatsLogs.fecha_y_hora_z, fromTs),
        lte(chatsLogs.fecha_y_hora_z, toTs),
      ),
    );

  // Agrupar por asesor
  const byAsesor: Record<
    string,
    { asesor: string | null; speeds: number[]; categorias: Record<string, number> }
  > = {};

  const globalCategorias: Record<string, number> = {};
  const allSpeeds: number[] = [];

  for (const r of rows) {
    const key = r.asesor_asignado?.trim() ?? "__sin_asignar__";
    if (!byAsesor[key]) {
      byAsesor[key] = { asesor: r.asesor_asignado, speeds: [], categorias: {} };
    }
    const entry = byAsesor[key];
    if (!entry) continue;

    // Speed-to-lead = primer_msg_at - primer_msg_lead_at (en minutos)
    if (r.primer_msg_lead_at && r.primer_msg_at) {
      const diffMs = r.primer_msg_at.getTime() - r.primer_msg_lead_at.getTime();
      if (diffMs >= 0) {
        const mins = diffMs / 60000;
        entry.speeds.push(mins);
        allSpeeds.push(mins);
      }
    }

    const cat = r.ia_categoria ?? "sin categoría";
    entry.categorias[cat] = (entry.categorias[cat] ?? 0) + 1;
    globalCategorias[cat] = (globalCategorias[cat] ?? 0) + 1;
  }

  const porAsesor: ReportChatsAdvisor[] = Object.values(byAsesor).map((v) => ({
    asesor: v.asesor,
    totalChats: Object.values(v.categorias).reduce((s, n) => s + n, 0),
    speedToLeadAvgMin:
      v.speeds.length > 0 ? v.speeds.reduce((s, x) => s + x, 0) / v.speeds.length : null,
    porCategoria: v.categorias,
  }));

  return {
    totalChats: rows.length,
    speedToLeadAvgMin:
      allSpeeds.length > 0 ? allSpeeds.reduce((s, v) => s + v, 0) / allSpeeds.length : null,
    porAsesor,
    porCategoria: globalCategorias,
  };
}

/* ------------------------------------------------------------------ */
/*  4. getReportVideocalls                                             */
/* ------------------------------------------------------------------ */

export interface ReportVideocallsCloser {
  closer: string | null;
  total: number;
  calificadas: number;
  noShows: number;
  cerradas: number;
  canceladas: number;
  porCategoria: Record<string, number>;
}

export interface ReportVideocalls {
  total: number;
  calificadas: number;
  noShows: number;
  cerradas: number;
  canceladas: number;
  tasaCierre: number;
  porCloser: ReportVideocallsCloser[];
}

function clasificarCategoria(cat: string | null): {
  calificada: boolean;
  noShow: boolean;
  cerrada: boolean;
  cancelada: boolean;
} {
  if (!cat) return { calificada: false, noShow: false, cerrada: false, cancelada: false };
  const cl = cat.trim().toLowerCase();
  const cancelada = cl.includes("cancel");
  const noShow = cl === "no_show" || cl === "noshow" || cl === "no show";
  const cerrada = cl === "cerrada" || cl === "closed";
  // "calificada" en este contexto significa "la videollamada ocurrió y fue evaluada" —
  // incluye tanto calificadas como no_calificadas porque ambas representan una cita que SÍ se realizó.
  // no_show y cancelada son las únicas que NO ocurrieron.
  const calificada =
    !cancelada &&
    !noShow &&
    !cerrada &&
    (cl === "calificada" ||
      cl === "ofertada" ||
      cl === "offered" ||
      cl === "no_calificada" ||
      cl === "no_ofertada" ||
      cl === "no ofertada");
  return { calificada, noShow, cerrada, cancelada };
}

export async function getReportVideocalls(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportVideocalls> {
  const rows = await db
    .select({
      closer: resumenesDiariosAgendas.closer,
      categoria: resumenesDiariosAgendas.categoria,
    })
    .from(resumenesDiariosAgendas)
    .where(
      and(
        eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
        gte(resumenesDiariosAgendas.fecha, from),
        lte(resumenesDiariosAgendas.fecha, to),
      ),
    );

  const byCloser: Record<
    string,
    {
      closer: string | null;
      total: number;
      calificadas: number;
      noShows: number;
      cerradas: number;
      canceladas: number;
      porCategoria: Record<string, number>;
    }
  > = {};

  let totalCalificadas = 0;
  let totalNoShows = 0;
  let totalCerradas = 0;
  let totalCanceladas = 0;

  for (const r of rows) {
    const key = r.closer?.trim() ?? "__sin_closer__";
    if (!byCloser[key]) {
      byCloser[key] = {
        closer: r.closer,
        total: 0,
        calificadas: 0,
        noShows: 0,
        cerradas: 0,
        canceladas: 0,
        porCategoria: {},
      };
    }
    const entry = byCloser[key];
    if (!entry) continue;
    entry.total++;

    const cl = clasificarCategoria(r.categoria);
    if (cl.calificada) { entry.calificadas++; totalCalificadas++; }
    if (cl.noShow) { entry.noShows++; totalNoShows++; }
    if (cl.cerrada) { entry.cerradas++; totalCerradas++; }
    if (cl.cancelada) { entry.canceladas++; totalCanceladas++; }

    const catKey = r.categoria ?? "sin categoría";
    entry.porCategoria[catKey] = (entry.porCategoria[catKey] ?? 0) + 1;
  }

  const porCloser: ReportVideocallsCloser[] = Object.values(byCloser);

  return {
    total: rows.length,
    calificadas: totalCalificadas,
    noShows: totalNoShows,
    cerradas: totalCerradas,
    canceladas: totalCanceladas,
    tasaCierre: rows.length > 0 ? (totalCerradas / rows.length) * 100 : 0,
    porCloser,
  };
}

/* ------------------------------------------------------------------ */
/*  5. getReportFunnel                                                 */
/* ------------------------------------------------------------------ */

export interface ReportFunnelNodo {
  categoria: string;
  total: number;
  porcentaje: number;
}

export interface ReportFunnelCanal {
  contactados: number;
  sinContacto: number;
  porCategoria: ReportFunnelNodo[];
}

export interface ReportFunnel {
  llamadas: ReportFunnelCanal;
  chats: ReportFunnelCanal;
  videollamadas: ReportFunnelCanal;
}

export async function getReportFunnel(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportFunnel> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  const [llamadasResult, chatsResult, videoResult] = await Promise.all([
    // Distribución por estado en registros_de_llamada creados en el rango
    db.execute(sql`
      SELECT
        LOWER(TRIM(COALESCE(estado, 'sin estado'))) AS estado,
        COUNT(*)::int AS total
      FROM registros_de_llamada
      WHERE id_cuenta = ${String(idCuenta)}
        AND fecha_evento BETWEEN ${fromTs} AND ${toTs}
      GROUP BY LOWER(TRIM(COALESCE(estado, 'sin estado')))
      ORDER BY total DESC
    `),

    // Distribución por estado en chats_logs
    db
      .select({
        estado: chatsLogs.estado,
        ia_categoria: chatsLogs.ia_categoria,
      })
      .from(chatsLogs)
      .where(
        and(
          eq(chatsLogs.id_cuenta, idCuenta),
          gte(chatsLogs.fecha_y_hora_z, fromTs),
          lte(chatsLogs.fecha_y_hora_z, toTs),
        ),
      ),

    // Distribución por categoría en resumenes_diarios_agendas
    db
      .select({ categoria: resumenesDiariosAgendas.categoria })
      .from(resumenesDiariosAgendas)
      .where(
        and(
          eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
          gte(resumenesDiariosAgendas.fecha, from),
          lte(resumenesDiariosAgendas.fecha, to),
        ),
      ),
  ]);

  type EstadoRow = { estado: string; total: number };

  // --- Llamadas ---
  const llamadasCategorias: Record<string, number> = {};
  for (const r of llamadasResult.rows as EstadoRow[]) {
    llamadasCategorias[r.estado] = r.total;
  }
  const llamadasTotal = Object.values(llamadasCategorias).reduce((s, n) => s + n, 0);
  // Contactados = estado efectiva_* o seguimiento
  const estadosContactados = new Set(["seguimiento", "efectiva", "cerrado", "vendido"]);
  const llamadasContactados = Object.entries(llamadasCategorias)
    .filter(([k]) => estadosContactados.has(k) || k.startsWith("efectiva"))
    .reduce((s, [, n]) => s + n, 0);

  // --- Chats ---
  const chatsCategorias: Record<string, number> = {};
  let chatsContactados = 0;
  for (const r of chatsResult) {
    const cat = r.ia_categoria ?? r.estado ?? "sin categoría";
    chatsCategorias[cat] = (chatsCategorias[cat] ?? 0) + 1;
    // Chats contactados = tiene estado o ia_categoria distinta de "pendiente"
    if (r.estado && r.estado.toLowerCase() !== "pendiente" && r.estado.toLowerCase() !== "pdte") {
      chatsContactados++;
    }
  }
  const chatsTotal = chatsResult.length;

  // --- Videollamadas ---
  const videoCategorias: Record<string, number> = {};
  let videoContactados = 0;
  for (const r of videoResult) {
    const cat = r.categoria ?? "sin categoría";
    videoCategorias[cat] = (videoCategorias[cat] ?? 0) + 1;
    const cl = clasificarCategoria(r.categoria);
    if (!cl.noShow && !cl.cancelada && r.categoria != null) videoContactados++;
  }
  const videoTotal = videoResult.length;

  function buildNodos(cats: Record<string, number>, total: number): ReportFunnelNodo[] {
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([categoria, n]) => ({
        categoria,
        total: n,
        porcentaje: total > 0 ? (n / total) * 100 : 0,
      }));
  }

  return {
    llamadas: {
      contactados: llamadasContactados,
      sinContacto: llamadasTotal - llamadasContactados,
      porCategoria: buildNodos(llamadasCategorias, llamadasTotal),
    },
    chats: {
      contactados: chatsContactados,
      sinContacto: chatsTotal - chatsContactados,
      porCategoria: buildNodos(chatsCategorias, chatsTotal),
    },
    videollamadas: {
      contactados: videoContactados,
      sinContacto: videoTotal - videoContactados,
      porCategoria: buildNodos(videoCategorias, videoTotal),
    },
  };
}

/* ------------------------------------------------------------------ */
/*  6. getReportCrmHealth                                              */
/* ------------------------------------------------------------------ */

export interface ReportCrmHealthAdvisor {
  asesor: string | null;
  sinEstado: number;
  sinAccion: number;
  enLimbo: number;
}

export interface ReportCrmHealth {
  sinEstado: number;
  sinAccion: number;
  enLimbo: number;
  porAsesor: ReportCrmHealthAdvisor[];
}

export async function getReportCrmHealth(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportCrmHealth> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);
  const limboThreshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // hace 5 días

  const [sinEstadoResult, sinAccionResult, enLimboResult] = await Promise.all([
    // Leads sin estado (estado null o vacío)
    db.execute(sql`
      SELECT
        COALESCE(nombre_closer, closer_mail, 'sin asignar') AS asesor,
        COUNT(*)::int AS total
      FROM registros_de_llamada
      WHERE id_cuenta = ${String(idCuenta)}
        AND fecha_evento BETWEEN ${fromTs} AND ${toTs}
        AND (estado IS NULL OR TRIM(estado) = '')
      GROUP BY COALESCE(nombre_closer, closer_mail, 'sin asignar')
      ORDER BY total DESC
    `),

    // Leads sin acción = lead en registros_de_llamada sin ninguna entrada en log_llamadas
    db.execute(sql`
      SELECT
        COALESCE(rr.nombre_closer, rr.closer_mail, 'sin asignar') AS asesor,
        COUNT(*)::int AS total
      FROM registros_de_llamada rr
      WHERE rr.id_cuenta = ${String(idCuenta)}
        AND rr.fecha_evento BETWEEN ${fromTs} AND ${toTs}
        AND NOT EXISTS (
          SELECT 1 FROM log_llamadas ll
          WHERE ll.id_registro = rr.id_registro
            AND ll.id_cuenta = ${idCuenta}
        )
      GROUP BY COALESCE(rr.nombre_closer, rr.closer_mail, 'sin asignar')
      ORDER BY total DESC
    `),

    // Leads en limbo: tuvo actividad pero hace >5 días que no se actualiza y no está cerrado
    db.execute(sql`
      SELECT
        COALESCE(rr.nombre_closer, rr.closer_mail, 'sin asignar') AS asesor,
        COUNT(*)::int AS total
      FROM registros_de_llamada rr
      WHERE rr.id_cuenta = ${String(idCuenta)}
        AND rr.fecha_evento BETWEEN ${fromTs} AND ${toTs}
        AND LOWER(TRIM(COALESCE(rr.estado, ''))) NOT IN ('cerrado', 'vendido', 'ganado', 'done')
        AND EXISTS (
          SELECT 1 FROM log_llamadas ll
          WHERE ll.id_registro = rr.id_registro
            AND ll.id_cuenta = ${idCuenta}
        )
        AND NOT EXISTS (
          SELECT 1 FROM log_llamadas ll2
          WHERE ll2.id_registro = rr.id_registro
            AND ll2.id_cuenta = ${idCuenta}
            AND ll2.ts >= ${limboThreshold}
        )
      GROUP BY COALESCE(rr.nombre_closer, rr.closer_mail, 'sin asignar')
      ORDER BY total DESC
    `),
  ]);

  type AsesorRow = { asesor: string | null; total: number };

  const asesorMap: Record<
    string,
    { sinEstado: number; sinAccion: number; enLimbo: number }
  > = {};

  const updateMap = (rows: AsesorRow[], field: "sinEstado" | "sinAccion" | "enLimbo") => {
    for (const r of rows) {
      const key = r.asesor ?? "sin asignar";
      if (!asesorMap[key]) asesorMap[key] = { sinEstado: 0, sinAccion: 0, enLimbo: 0 };
      asesorMap[key]![field] += r.total;
    }
  };

  updateMap(sinEstadoResult.rows as AsesorRow[], "sinEstado");
  updateMap(sinAccionResult.rows as AsesorRow[], "sinAccion");
  updateMap(enLimboResult.rows as AsesorRow[], "enLimbo");

  const porAsesor: ReportCrmHealthAdvisor[] = Object.entries(asesorMap).map(([key, v]) => ({
    asesor: key === "sin asignar" ? null : key,
    ...v,
  }));

  const totalSinEstado = (sinEstadoResult.rows as AsesorRow[]).reduce((s, r) => s + r.total, 0);
  const totalSinAccion = (sinAccionResult.rows as AsesorRow[]).reduce((s, r) => s + r.total, 0);
  const totalEnLimbo = (enLimboResult.rows as AsesorRow[]).reduce((s, r) => s + r.total, 0);

  return {
    sinEstado: totalSinEstado,
    sinAccion: totalSinAccion,
    enLimbo: totalEnLimbo,
    porAsesor,
  };
}

/* ------------------------------------------------------------------ */
/*  7. getReportConversationAnalysis                                   */
/* ------------------------------------------------------------------ */

export interface ObjecionCount {
  objecion: string;
  categoria: string;
  count: number;
}

export interface ReportConversationAnalysis {
  totalConversaciones: number;
  conObjeciones: number;
  objeciones: ObjecionCount[];
  porCategoria: Record<string, number>;
}

export async function getReportConversationAnalysis(
  idCuenta: number,
  from: string,
  to: string,
): Promise<ReportConversationAnalysis> {
  const fromTs = new Date(`${from}T00:00:00Z`);
  const toTs = new Date(`${to}T23:59:59.999Z`);

  // Objeciones de chats (ia_objeciones JSONB en chats_logs)
  const chatsObjecionesResult = await db.execute(sql`
    SELECT
      obj->>'objecion'  AS objecion,
      obj->>'categoria' AS categoria,
      COUNT(*)::int     AS cnt
    FROM chats_logs,
         jsonb_array_elements(ia_objeciones) AS obj
    WHERE id_cuenta = ${idCuenta}
      AND fecha_y_hora_z BETWEEN ${fromTs} AND ${toTs}
      AND ia_objeciones IS NOT NULL
      AND jsonb_array_length(ia_objeciones) > 0
    GROUP BY obj->>'objecion', obj->>'categoria'
    ORDER BY cnt DESC
  `);

  // Objeciones de videollamadas (objeciones_ia JSONB en resumenes_diarios_agendas)
  const videoObjecionesResult = await db.execute(sql`
    SELECT
      obj->>'objecion'  AS objecion,
      obj->>'categoria' AS categoria,
      COUNT(*)::int     AS cnt
    FROM resumenes_diarios_agendas,
         jsonb_array_elements(objeciones_ia) AS obj
    WHERE id_cuenta = ${idCuenta}
      AND fecha BETWEEN ${from}::date AND ${to}::date
      AND objeciones_ia IS NOT NULL
      AND jsonb_array_length(objeciones_ia) > 0
    GROUP BY obj->>'objecion', obj->>'categoria'
    ORDER BY cnt DESC
  `);

  type ObjecionRow = { objecion: string | null; categoria: string | null; cnt: number };

  // Merge conteos de ambas fuentes
  const merged: Record<string, ObjecionCount> = {};

  const addRows = (rows: ObjecionRow[]) => {
    for (const r of rows) {
      const key = `${r.objecion ?? ""}|${r.categoria ?? ""}`;
      if (merged[key]) {
        merged[key]!.count += r.cnt;
      } else {
        merged[key] = {
          objecion: r.objecion ?? "desconocida",
          categoria: r.categoria ?? "sin categoría",
          count: r.cnt,
        };
      }
    }
  };

  addRows(chatsObjecionesResult.rows as ObjecionRow[]);
  addRows(videoObjecionesResult.rows as ObjecionRow[]);

  const objeciones = Object.values(merged).sort((a, b) => b.count - a.count);

  // Acumular por categoría
  const porCategoria: Record<string, number> = {};
  for (const o of objeciones) {
    porCategoria[o.categoria] = (porCategoria[o.categoria] ?? 0) + o.count;
  }

  // Conteo de conversaciones con al menos una objeción
  const [chatsConResult, videoConResult] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM chats_logs
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z BETWEEN ${fromTs} AND ${toTs}
        AND ia_objeciones IS NOT NULL
        AND jsonb_array_length(ia_objeciones) > 0
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM resumenes_diarios_agendas
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
        AND objeciones_ia IS NOT NULL
        AND jsonb_array_length(objeciones_ia) > 0
    `),
  ]);

  // Total de conversaciones en el rango (chats + videollamadas)
  const [chatsTotalResult, videoTotalResult] = await Promise.all([
    db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM chats_logs
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z BETWEEN ${fromTs} AND ${toTs}
    `),
    db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM resumenes_diarios_agendas
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
    `),
  ]);

  type TotalRow = { total: number };

  const conObjeciones =
    Number((chatsConResult.rows[0] as TotalRow)?.total ?? 0) +
    Number((videoConResult.rows[0] as TotalRow)?.total ?? 0);

  const totalConversaciones =
    Number((chatsTotalResult.rows[0] as TotalRow)?.total ?? 0) +
    Number((videoTotalResult.rows[0] as TotalRow)?.total ?? 0);

  return {
    totalConversaciones,
    conObjeciones,
    objeciones,
    porCategoria,
  };
}
