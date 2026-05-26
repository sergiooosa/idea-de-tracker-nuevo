import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas, metricasWebhook } from "@/lib/db/schema";
import { eq, and, gte, lt, inArray, sql } from "drizzle-orm";
import type { MetricaConfig } from "@/lib/db/schema";

/**
 * GET /api/data/metricas/monthly-summary
 *
 * Aggregates metricas_webhook by month for comparison between two months.
 *
 * Query params:
 *   metricIds[]  — array of campo IDs to include
 *   from         — YYYY-MM (Mes A)
 *   to           — YYYY-MM (Mes B)
 *
 * Response: { rows: [{ metricId, nombre, formato, mesA, mesB }] }
 */
export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const { searchParams } = new URL(req.url);

    const metricIds = searchParams.getAll("metricIds[]");
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parámetros from y to son requeridos (YYYY-MM)" },
        { status: 400 },
      );
    }

    // Validate YYYY-MM format
    if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "from y to deben estar en formato YYYY-MM" },
        { status: 400 },
      );
    }

    // Compute inclusive date bounds for each month
    function monthBounds(ym: string): { start: string; end: string } {
      const [year, month] = ym.split("-").map(Number);
      const start = `${ym}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
      return { start, end };
    }

    const boundsA = monthBounds(from);
    const boundsB = monthBounds(to);

    // Fetch metricas_config for name/format enrichment
    const [cuenta] = await db
      .select({ metricas_config: cuentas.metricas_config })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const allConfig: MetricaConfig[] = cuenta?.metricas_config ?? [];
    const configByCampo = new Map<string, MetricaConfig>();
    for (const cfg of allConfig) {
      if (cfg.tipo === "webhook" && cfg.webhookCampo) {
        configByCampo.set(cfg.webhookCampo, cfg);
      }
    }

    // Determine which campos to query
    let camposToQuery: string[] = metricIds.filter((id) => id.length > 0);

    if (camposToQuery.length === 0) {
      const rows = await db
        .selectDistinct({ campo: metricasWebhook.campo })
        .from(metricasWebhook)
        .where(eq(metricasWebhook.id_cuenta, idCuenta));
      camposToQuery = rows.map((r) => r.campo);
    }

    if (camposToQuery.length === 0) {
      return NextResponse.json({ rows: [] });
    }

    // Aggregate SUM per campo for each month using drizzle ORM
    const [mesARows, mesBRows] = await Promise.all([
      db
        .select({
          campo: metricasWebhook.campo,
          total: sql<string>`COALESCE(SUM(${metricasWebhook.valor}::numeric), 0)`,
        })
        .from(metricasWebhook)
        .where(
          and(
            eq(metricasWebhook.id_cuenta, idCuenta),
            inArray(metricasWebhook.campo, camposToQuery),
            gte(metricasWebhook.fecha, boundsA.start),
            lt(metricasWebhook.fecha, boundsA.end),
          ),
        )
        .groupBy(metricasWebhook.campo),
      db
        .select({
          campo: metricasWebhook.campo,
          total: sql<string>`COALESCE(SUM(${metricasWebhook.valor}::numeric), 0)`,
        })
        .from(metricasWebhook)
        .where(
          and(
            eq(metricasWebhook.id_cuenta, idCuenta),
            inArray(metricasWebhook.campo, camposToQuery),
            gte(metricasWebhook.fecha, boundsB.start),
            lt(metricasWebhook.fecha, boundsB.end),
          ),
        )
        .groupBy(metricasWebhook.campo),
    ]);

    const mapA = new Map<string, number>();
    for (const row of mesARows) {
      mapA.set(row.campo, parseFloat(row.total));
    }
    const mapB = new Map<string, number>();
    for (const row of mesBRows) {
      mapB.set(row.campo, parseFloat(row.total));
    }

    // Only return campos that have data in at least one of the two months
    const rows = camposToQuery
      .filter((campo) => mapA.has(campo) || mapB.has(campo))
      .map((campo) => {
        const cfg = configByCampo.get(campo);
        return {
          metricId: campo,
          nombre: cfg?.nombre ?? campo,
          formato: cfg?.formato ?? "numero",
          mesA: mapA.get(campo) ?? null,
          mesB: mapB.get(campo) ?? null,
        };
      });

    return NextResponse.json({ rows });
  });
}
