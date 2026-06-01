/**
 * GET /api/data/report
 *
 * Endpoint de Reportes v2 — agrega todos los bloques de datos para el periodo
 * solicitado (y calcula automáticamente el periodo anterior para comparación).
 *
 * Params:
 *   from         — YYYY-MM-DD, inicio del periodo actual
 *   to           — YYYY-MM-DD, fin del periodo actual
 *   period_type  — daily | weekly | monthly | custom
 */

import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getReportAds,
  getReportCalls,
  getReportChats,
  getReportVideocalls,
  getReportFunnel,
  getReportCrmHealth,
  getReportConversationAnalysis,
  getReportContactabilidadCanal,
  type ReportAds,
  type ReportCalls,
  type ReportChats,
  type ReportVideocalls,
  type ReportFunnel,
  type ReportCrmHealth,
  type ReportConversationAnalysis,
  type ReportContactabilidadCanales,
} from "@/lib/queries/report";

/* ------------------------------------------------------------------ */
/*  Tipos de respuesta                                                  */
/* ------------------------------------------------------------------ */

export interface ReportPeriodo {
  from: string;
  to: string;
  type: string;
  dias: number;
}

export interface ReportComparison {
  ads: { variacion_gasto: number | null; variacion_leads: number | null } | null;
  calls: { variacion_llamadas: number | null; variacion_tasa_contacto: number | null } | null;
  chats: { variacion_chats: number | null; variacion_speed: number | null } | null;
  videocalls: { variacion_total: number | null; variacion_tasa_cierre: number | null } | null;
}

export interface ReportAccountMeta {
  nombre: string | null;
  subdominio: string;
  configuracion_ads: unknown | null;
  fuente_llamadas: string | null;
}

export interface ReportResponse {
  periodo: ReportPeriodo;
  periodoPrevio: ReportPeriodo;
  account: ReportAccountMeta;
  ads: ReportAds | null;
  calls: ReportCalls | null;
  chats: ReportChats | null;
  videocalls: ReportVideocalls | null;
  funnel: ReportFunnel | null;
  crmHealth: ReportCrmHealth | null;
  conversationAnalysis: ReportConversationAnalysis | null;
  contactabilidadCanal: ReportContactabilidadCanales | null;
  comparison: ReportComparison;
  previo: {
    ads: ReportAds | null;
    calls: ReportCalls | null;
    chats: ReportChats | null;
    videocalls: ReportVideocalls | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers de periodo                                                  */
/* ------------------------------------------------------------------ */

function daysBetween(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  return Math.round((t.getTime() - f.getTime()) / 86400000) + 1;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcPrevPeriod(
  from: string,
  to: string,
  periodType: string,
): { from: string; to: string } {
  const dias = daysBetween(from, to);

  switch (periodType) {
    case "daily": {
      // Día anterior
      const prevDay = addDays(from, -1);
      return { from: prevDay, to: prevDay };
    }
    case "weekly": {
      // Semana anterior (7 días antes)
      return { from: addDays(from, -7), to: addDays(to, -7) };
    }
    case "monthly": {
      // Mes anterior: restar un mes al from/to
      const f = new Date(`${from}T00:00:00Z`);
      const t = new Date(`${to}T00:00:00Z`);
      f.setUTCMonth(f.getUTCMonth() - 1);
      t.setUTCMonth(t.getUTCMonth() - 1);
      return {
        from: f.toISOString().slice(0, 10),
        to: t.toISOString().slice(0, 10),
      };
    }
    case "custom":
    default: {
      // Período anterior del mismo número de días
      return { from: addDays(from, -dias), to: addDays(to, -dias) };
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers de comparación                                              */
/* ------------------------------------------------------------------ */

function varPct(curr: number, prev: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

function buildComparison(
  curr: {
    ads: ReportAds | null;
    calls: ReportCalls | null;
    chats: ReportChats | null;
    videocalls: ReportVideocalls | null;
  },
  prev: {
    ads: ReportAds | null;
    calls: ReportCalls | null;
    chats: ReportChats | null;
    videocalls: ReportVideocalls | null;
  },
): ReportComparison {
  return {
    ads:
      curr.ads && prev.ads
        ? {
            variacion_gasto: varPct(curr.ads.totalGasto, prev.ads.totalGasto),
            variacion_leads: varPct(
              curr.ads.porCreativo.reduce((s, r) => s + r.leadsCount, 0),
              prev.ads.porCreativo.reduce((s, r) => s + r.leadsCount, 0),
            ),
          }
        : null,
    calls:
      curr.calls && prev.calls
        ? {
            variacion_llamadas: varPct(curr.calls.totalLlamadas, prev.calls.totalLlamadas),
            variacion_tasa_contacto: varPct(
              curr.calls.tasaContactoGlobal,
              prev.calls.tasaContactoGlobal,
            ),
          }
        : null,
    chats:
      curr.chats && prev.chats
        ? {
            variacion_chats: varPct(curr.chats.totalChats, prev.chats.totalChats),
            variacion_speed:
              curr.chats.speedToLeadAvgMin != null && prev.chats.speedToLeadAvgMin != null
                ? varPct(curr.chats.speedToLeadAvgMin, prev.chats.speedToLeadAvgMin)
                : null,
          }
        : null,
    videocalls:
      curr.videocalls && prev.videocalls
        ? {
            variacion_total: varPct(curr.videocalls.total, prev.videocalls.total),
            variacion_tasa_cierre: varPct(curr.videocalls.tasaCierre, prev.videocalls.tasaCierre),
          }
        : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */

export async function GET(req: Request): Promise<Response> {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);

    const today = new Date().toISOString().slice(0, 10);
    const from = searchParams.get("from") ?? today;
    const to = searchParams.get("to") ?? today;
    const periodType = searchParams.get("period_type") ?? "custom";

    // Validar fechas mínimas
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "from y to deben tener formato YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (from > to) {
      return NextResponse.json({ error: "from debe ser anterior o igual a to" }, { status: 400 });
    }

    const prevPeriod = calcPrevPeriod(from, to, periodType);
    const dias = daysBetween(from, to);
    const diasPrev = daysBetween(prevPeriod.from, prevPeriod.to);

    // Metadatos de cuenta
    const cuentaRow = await db
      .select({
        nombre_cuenta: cuentas.nombre_cuenta,
        subdominio: cuentas.subdominio,
        configuracion_ads: cuentas.configuracion_ads,
        fuente_llamadas: cuentas.fuente_llamadas,
      })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .then((rows) => rows[0] ?? null);

    if (!cuentaRow) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Ejecutar todos los bloques en paralelo (periodo actual + previo)
    const [
      adsResult,
      callsResult,
      chatsResult,
      videocallsResult,
      funnelResult,
      crmHealthResult,
      conversationResult,
      contactabilidadResult,
      adsPrevResult,
      callsPrevResult,
      chatsPrevResult,
      videocallsPrevResult,
    ] = await Promise.allSettled([
      getReportAds(idCuenta, from, to),
      getReportCalls(idCuenta, from, to),
      getReportChats(idCuenta, from, to),
      getReportVideocalls(idCuenta, from, to),
      getReportFunnel(idCuenta, from, to),
      getReportCrmHealth(idCuenta, from, to),
      getReportConversationAnalysis(idCuenta, from, to),
      getReportContactabilidadCanal(idCuenta, from, to),
      getReportAds(idCuenta, prevPeriod.from, prevPeriod.to),
      getReportCalls(idCuenta, prevPeriod.from, prevPeriod.to),
      getReportChats(idCuenta, prevPeriod.from, prevPeriod.to),
      getReportVideocalls(idCuenta, prevPeriod.from, prevPeriod.to),
    ]);

    // Extraer valores — bloques sin datos = null
    function settle<T>(result: PromiseSettledResult<T>): T | null {
      return result.status === "fulfilled" ? result.value : null;
    }

    const ads = settle(adsResult);
    const calls = settle(callsResult);
    const chats = settle(chatsResult);
    const videocalls = settle(videocallsResult);
    const funnel = settle(funnelResult);
    const crmHealth = settle(crmHealthResult);
    const conversationAnalysis = settle(conversationResult);
    const contactabilidadCanal = settle(contactabilidadResult);

    const adsPrev = settle(adsPrevResult);
    const callsPrev = settle(callsPrevResult);
    const chatsPrev = settle(chatsPrevResult);
    const videocallsPrev = settle(videocallsPrevResult);

    const currBlocks = { ads, calls, chats, videocalls };
    const prevBlocks = {
      ads: adsPrev,
      calls: callsPrev,
      chats: chatsPrev,
      videocalls: videocallsPrev,
    };

    const response: ReportResponse = {
      periodo: { from, to, type: periodType, dias },
      periodoPrevio: { from: prevPeriod.from, to: prevPeriod.to, type: periodType, dias: diasPrev },
      account: {
        nombre: cuentaRow.nombre_cuenta ?? null,
        subdominio: cuentaRow.subdominio,
        configuracion_ads: cuentaRow.configuracion_ads ?? null,
        fuente_llamadas: cuentaRow.fuente_llamadas ?? null,
      },
      ads,
      calls,
      chats,
      videocalls,
      funnel,
      crmHealth,
      conversationAnalysis,
      contactabilidadCanal,
      comparison: buildComparison(currBlocks, prevBlocks),
      previo: prevBlocks,
    };

    return NextResponse.json(response);
  });
}
