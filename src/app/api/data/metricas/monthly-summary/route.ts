import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas, metricasWebhook } from "@/lib/db/schema";
import { eq, and, gte, lt, inArray, sql } from "drizzle-orm";
import type { MetricaConfig } from "@/lib/db/schema";
import { STANDARD_METRICS, computeStandardMetrics } from "@/lib/queries/standard-metrics";

function monthBounds(ym: string): { dateFrom: string; dateTo: string } {
  const [year, month] = ym.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    dateFrom: `${ym}-01`,
    dateTo: `${ym}-${String(lastDay).padStart(2, "0")}`,
  };
}

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

    if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) {
      return NextResponse.json(
        { error: "from y to deben estar en formato YYYY-MM" },
        { status: 400 },
      );
    }

    const stdIds = metricIds.filter((id) => id.startsWith("std:"));
    const webhookIds = metricIds.filter((id) => !id.startsWith("std:"));

    const boundsA = monthBounds(from);
    const boundsB = monthBounds(to);

    const stdNamesMap = new Map(STANDARD_METRICS.map((m) => [m.id, m]));

    const results: {
      metricId: string;
      nombre: string;
      formato: string;
      mesA: number | null;
      mesB: number | null;
    }[] = [];

    if (stdIds.length > 0) {
      const [stdA, stdB] = await Promise.all([
        computeStandardMetrics(idCuenta, boundsA.dateFrom, boundsA.dateTo),
        computeStandardMetrics(idCuenta, boundsB.dateFrom, boundsB.dateTo),
      ]);

      for (const id of stdIds) {
        const def = stdNamesMap.get(id);
        if (!def) continue;
        results.push({
          metricId: id,
          nombre: def.nombre,
          formato: def.formato,
          mesA: stdA[id] ?? null,
          mesB: stdB[id] ?? null,
        });
      }
    }

    if (webhookIds.length > 0 || (metricIds.length === 0 && stdIds.length === 0)) {
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

      let camposToQuery = webhookIds.filter((id) => id.length > 0);

      if (camposToQuery.length === 0 && metricIds.length === 0) {
        const rows = await db
          .selectDistinct({ campo: metricasWebhook.campo })
          .from(metricasWebhook)
          .where(eq(metricasWebhook.id_cuenta, idCuenta));
        camposToQuery = rows.map((r) => r.campo);
      }

      if (camposToQuery.length > 0) {
        const webhookBoundsA = {
          start: `${from}-01`,
          end: (() => {
            const [y, m] = from.split("-").map(Number);
            const nm = m === 12 ? 1 : m + 1;
            const ny = m === 12 ? y + 1 : y;
            return `${ny}-${String(nm).padStart(2, "0")}-01`;
          })(),
        };
        const webhookBoundsB = {
          start: `${to}-01`,
          end: (() => {
            const [y, m] = to.split("-").map(Number);
            const nm = m === 12 ? 1 : m + 1;
            const ny = m === 12 ? y + 1 : y;
            return `${ny}-${String(nm).padStart(2, "0")}-01`;
          })(),
        };

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
                gte(metricasWebhook.fecha, webhookBoundsA.start),
                lt(metricasWebhook.fecha, webhookBoundsA.end),
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
                gte(metricasWebhook.fecha, webhookBoundsB.start),
                lt(metricasWebhook.fecha, webhookBoundsB.end),
              ),
            )
            .groupBy(metricasWebhook.campo),
        ]);

        const mapA = new Map<string, number>();
        for (const row of mesARows) mapA.set(row.campo, parseFloat(row.total));
        const mapB = new Map<string, number>();
        for (const row of mesBRows) mapB.set(row.campo, parseFloat(row.total));

        for (const campo of camposToQuery) {
          if (!mapA.has(campo) && !mapB.has(campo)) continue;
          const cfg = configByCampo.get(campo);
          results.push({
            metricId: campo,
            nombre: cfg?.nombre ?? campo,
            formato: cfg?.formato ?? "numero",
            mesA: mapA.get(campo) ?? null,
            mesB: mapB.get(campo) ?? null,
          });
        }
      }
    }

    return NextResponse.json({ rows: results });
  });
}
