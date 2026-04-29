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

    // Aggregate ads data per platform (exclude zero-spend days to avoid distorting CTR/CPM/CPC averages)
    const adsRows = await db.execute(sql`
      SELECT
        plataforma,
        SUM(gasto_total_ad) AS gasto,
        SUM(impresiones_totales) AS impresiones,
        SUM(clicks_unicos) AS clicks,
        AVG(CASE WHEN gasto_total_ad > 0 THEN ctr END) AS ctr,
        AVG(CASE WHEN gasto_total_ad > 0 THEN cpm END) AS cpm,
        AVG(CASE WHEN gasto_total_ad > 0 THEN cpc END) AS cpc,
        SUM(agendamientos) AS agendamientos
      FROM resumenes_diarios_ads
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
      GROUP BY plataforma
    `);

    // Fetch datos_extra rows for campos_extra (frequency, unique_ctr, hook_rate, etc.)
    // Cast to text to ensure reliable parsing regardless of pg/neon driver JSONB handling
    const datosExtraRows = await db.execute(sql`
      SELECT plataforma, datos_extra::text AS datos_extra_text
      FROM resumenes_diarios_ads
      WHERE id_cuenta = ${idCuenta}
        AND fecha BETWEEN ${from}::date AND ${to}::date
        AND datos_extra IS NOT NULL
        AND datos_extra != '{}'::jsonb
    `);

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

    // Aggregate datos_extra campos (frequency, unique_ctr, hook_rate, etc.) per platform
    // We avg numeric scalar fields across all rows of each platform
    const extraByPlatform: Record<string, Record<string, { sum: number; count: number }>> = {};
    for (const rawRow of datosExtraRows.rows as Array<{ plataforma: string; datos_extra_text?: string; datos_extra?: Record<string, unknown> | string }>) {
      const plat = rawRow.plataforma ?? 'meta';
      if (!extraByPlatform[plat]) extraByPlatform[plat] = {};
      // Handle both text-cast (datos_extra_text) and direct JSONB (datos_extra)
      let extra: Record<string, unknown> = {};
      const rawExtra = rawRow.datos_extra_text ?? rawRow.datos_extra;
      if (typeof rawExtra === 'string') {
        try { extra = JSON.parse(rawExtra) as Record<string, unknown>; } catch { extra = {}; }
      } else if (rawExtra && typeof rawExtra === 'object') {
        extra = rawExtra as Record<string, unknown>;
      }
      for (const [key, val] of Object.entries(extra)) {
        // Only aggregate top-level numeric fields (skip nested objects like actions arrays)
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        if (!Number.isFinite(num)) continue;
        if (!extraByPlatform[plat][key]) extraByPlatform[plat][key] = { sum: 0, count: 0 };
        extraByPlatform[plat][key].sum += num;
        extraByPlatform[plat][key].count += 1;
      }
    }
    // Convert to averaged values
    const camposExtraPorPlataforma: Record<string, Record<string, number>> = {};
    for (const [plat, campos] of Object.entries(extraByPlatform)) {
      camposExtraPorPlataforma[plat] = {};
      for (const [key, { sum, count }] of Object.entries(campos)) {
        // frequency, unique_ctr → avg; sums for count-like fields would need different logic
        // Using avg for all for now (suitable for rates/percentages like frequency, ctr)
        camposExtraPorPlataforma[plat][key] = count > 0 ? sum / count : 0;
      }
    }

    const porPlataforma = (adsRows.rows as Array<Record<string, unknown>>).map((r) => ({
      plataforma: String(r.plataforma ?? 'meta'),
      gasto: Number(r.gasto ?? 0),
      impresiones: Number(r.impresiones ?? 0),
      clicks: Number(r.clicks ?? 0),
      ctr: Number(r.ctr ?? 0),
      cpm: Number(r.cpm ?? 0),
      cpc: Number(r.cpc ?? 0),
      agendamientos: Number(r.agendamientos ?? 0),
      camposExtra: camposExtraPorPlataforma[String(r.plataforma ?? 'meta')] ?? {},
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
