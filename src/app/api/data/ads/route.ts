import { NextResponse } from "next/server";
import { withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { ConfiguracionAds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["ver_dashboard", "ver_acquisition", "ver_rendimiento"], async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    // Get ads config
    const [row] = await db
      .select({ configuracion_ads: cuentas.configuracion_ads })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const cfg = (row?.configuracion_ads ?? {}) as ConfiguracionAds;
    const plataformas: ('meta' | 'google' | 'tiktok')[] = [];
    if (cfg.meta?.activo) plataformas.push('meta');
    if (cfg.google?.activo) plataformas.push('google');
    if (cfg.tiktok?.activo) plataformas.push('tiktok');

    const hasAds = plataformas.length > 0;

    if (!hasAds) {
      return NextResponse.json({
        hasAds: false,
        plataformas: [],
        resumen: { gastoTotal: 0, leads: 0, asistidas: 0, cierres: 0, cpl: 0, costoPorCierre: 0, costoPorShow: 0, showRate: 0, roas: 0, roasCash: 0 },
        porPlataforma: [],
        porCampana: [],
      });
    }

    // Aggregate ads data per platform — also avg campos_extra (frequency, unique_ctr, etc.)
    // Use CTE to avoid correlated subquery issues with Drizzle's parameterized queries
    const adsRows = await db.execute(sql`
      WITH extras AS (
        SELECT plataforma, key, AVG((value #>> '{}')::numeric) AS avg_val
        FROM resumenes_diarios_ads r2,
             jsonb_each(r2.datos_extra) AS kv(key, value)
        WHERE r2.id_cuenta = ${idCuenta}
          AND r2.fecha BETWEEN ${from}::date AND ${to}::date
          AND r2.datos_extra IS NOT NULL
          AND r2.datos_extra != '{}'::jsonb
          AND (value #>> '{}')::text ~ '^[0-9]+\.?[0-9]*$'
        GROUP BY plataforma, key
      ),
      extras_agg AS (
        SELECT plataforma, jsonb_object_agg(key, avg_val)::text AS campos_extra_json
        FROM extras
        GROUP BY plataforma
      )
      SELECT
        rda.plataforma,
        SUM(rda.gasto_total_ad) AS gasto,
        SUM(rda.impresiones_totales) AS impresiones,
        SUM(rda.clicks_unicos) AS clicks,
        AVG(CASE WHEN rda.gasto_total_ad > 0 THEN rda.ctr END) AS ctr,
        AVG(CASE WHEN rda.gasto_total_ad > 0 THEN rda.cpm END) AS cpm,
        AVG(CASE WHEN rda.gasto_total_ad > 0 THEN rda.cpc END) AS cpc,
        SUM(rda.agendamientos) AS agendamientos,
        ea.campos_extra_json
      FROM resumenes_diarios_ads rda
      LEFT JOIN extras_agg ea ON ea.plataforma = rda.plataforma
      WHERE rda.id_cuenta = ${idCuenta}
        AND rda.fecha BETWEEN ${from}::date AND ${to}::date
      GROUP BY rda.plataforma, ea.campos_extra_json
    `);

    // datosExtraRows no longer needed — campos_extra_json is embedded in adsRows
    const datosExtraRows = { rows: [] as unknown[] };

    // Campaign-level data
    const campanaRows = await db.execute(sql`
      SELECT
        campana,
        plataforma,
        SUM(gasto_total_ad) AS gasto
      FROM resumenes_diarios_ads
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
        AND campana IS NOT NULL
      GROUP BY campana, plataforma
      ORDER BY gasto DESC
    `);

    // Total leads and closures in the period from resumenes_diarios_agendas
    const agendasStats = await db.execute(sql`
      SELECT
        COUNT(DISTINCT COALESCE(idcliente, ghl_contact_id, email_lead)) AS total_leads,
        COUNT(DISTINCT COALESCE(idcliente, ghl_contact_id, email_lead)) FILTER (WHERE categoria NOT ILIKE '%cancel%' AND categoria NOT ILIKE '%pdte%' AND categoria != '') AS asistidas,
        COUNT(DISTINCT COALESCE(idcliente, ghl_contact_id, email_lead)) FILTER (WHERE categoria ILIKE '%cerr%' OR categoria ILIKE '%close%') AS cierres,
        SUM(CASE 
          WHEN facturacion ~ '^[0-9]+\.?[0-9]*$' THEN facturacion::numeric 
          ELSE 0 
        END) AS revenue,
        SUM(CASE 
          WHEN cash_collected ~ '^[0-9]+\.?[0-9]*$' THEN cash_collected::numeric 
          ELSE 0 
        END) AS cash_collected
      FROM resumenes_diarios_agendas
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
    `);

    // Campaign-leads matching by origen ILIKE campana
    const campanaLeadsRows = await db.execute(sql`
      SELECT
        a.campana,
        a.plataforma,
        SUM(a.gasto_total_ad) AS gasto,
        COUNT(DISTINCT ag.email_lead) AS leads,
        COUNT(DISTINCT ag.email_lead) FILTER (WHERE ag.categoria ILIKE '%cerr%' OR ag.categoria ILIKE '%close%') AS cierres
      FROM resumenes_diarios_ads a
      LEFT JOIN resumenes_diarios_agendas ag
        ON ag.id_cuenta = a.id_cuenta
        AND ag.fecha BETWEEN ${from}::date AND ${to}::date
        AND ag.origen ILIKE ('%' || a.campana || '%')
      WHERE a.id_cuenta = ${idCuenta}
        AND a.fecha BETWEEN ${from}::date AND ${to}::date
        AND a.campana IS NOT NULL
      GROUP BY a.campana, a.plataforma
      ORDER BY gasto DESC
      LIMIT 50
    `);

    const stats = agendasStats.rows[0] as {
      total_leads: string | number;
      asistidas: string | number;
      cierres: string | number;
      revenue: string | number;
      cash_collected: string | number;
    };

    const totalLeads = Number(stats?.total_leads ?? 0);
    const totalAsistidas = Number(stats?.asistidas ?? 0);
    const totalCierres = Number(stats?.cierres ?? 0);
    const totalRevenue = Number(stats?.revenue ?? 0);
    const totalCash = Number(stats?.cash_collected ?? 0);

    // campos_extra_json is computed by the SQL subquery — parse it from each adsRow
    const parseCamposExtra = (raw: unknown): Record<string, number> => {
      if (!raw) return {};
      let obj: Record<string, unknown> = {};
      if (typeof raw === 'string') {
        try { obj = JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
      } else if (typeof raw === 'object') {
        obj = raw as Record<string, unknown>;
      }
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(obj)) {
        const n = typeof v === 'number' ? v : parseFloat(String(v));
        if (Number.isFinite(n)) result[k] = n;
      }
      return result;
    };

    const porPlataforma = (adsRows.rows as Array<Record<string, unknown>>).map((r) => ({
      plataforma: String(r.plataforma ?? 'meta'),
      gasto: Number(r.gasto ?? 0),
      impresiones: Number(r.impresiones ?? 0),
      clicks: Number(r.clicks ?? 0),
      ctr: Number(r.ctr ?? 0),
      cpm: Number(r.cpm ?? 0),
      cpc: Number(r.cpc ?? 0),
      agendamientos: Number(r.agendamientos ?? 0),
      camposExtra: parseCamposExtra(r.campos_extra_json),
    }));

    const gastoTotal = porPlataforma.reduce((s, p) => s + p.gasto, 0);

    const porCampana = (campanaLeadsRows.rows as Array<Record<string, unknown>>).map((r) => {
      const gasto = Number(r.gasto ?? 0);
      const leads = Number(r.leads ?? 0);
      const cierres = Number(r.cierres ?? 0);
      return {
        campana: String(r.campana ?? ''),
        plataforma: String(r.plataforma ?? 'meta'),
        gasto,
        leads,
        cierres,
        cpl: leads > 0 ? gasto / leads : 0,
        costoPorCierre: cierres > 0 ? gasto / cierres : 0,
      };
    });

    return NextResponse.json({
      hasAds: true,
      plataformas,
      resumen: {
        gastoTotal,
        leads: totalLeads,
        asistidas: totalAsistidas,
        cierres: totalCierres,
        cpl: totalLeads > 0 ? gastoTotal / totalLeads : 0,
        costoPorCierre: totalCierres > 0 ? gastoTotal / totalCierres : 0,
        costoPorShow: totalAsistidas > 0 ? gastoTotal / totalAsistidas : 0,
        showRate: totalLeads > 0 ? totalAsistidas / totalLeads : 0,
        roas: gastoTotal > 0 ? totalRevenue / gastoTotal : 0,
        roasCash: gastoTotal > 0 ? totalCash / gastoTotal : 0,
      },
      porPlataforma,
      porCampana,
    });
  });
}
