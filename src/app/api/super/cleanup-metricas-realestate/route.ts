/**
 * POST /api/super/cleanup-metricas-realestate
 *
 * Elimina las 10 métricas RE sobrantes del backfill AUT-1205, dejando solo
 * las 5 métricas finales (re-recorridos-*, re-apartados, re-monto-apartados).
 *
 * Idempotente: si una cuenta ya no tiene sobrantes → sin_cambios.
 *
 * Requiere header: X-Cron-Secret.
 *
 * Query params:
 *   ?dry=1  → dry-run, no escribe en BD
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { PLANTILLA_METRICAS_REALESTATE_IDS } from "@/lib/plantilla-metricas";
import { parseMetricasConfig } from "@/lib/metricas-engine";
import { eq } from "drizzle-orm";

const RE_IDS_SOBRANTES = new Set([
  "re-actividad-vencida",
  "re-comision-apartados",
  "re-horas-capacitacion",
  "re-leads-mes",
  "re-leads-semana",
  "re-perfilamiento",
  "re-ranking-comisiones",
  "re-tasa-lead-perfilado",
  "re-tasa-perfilado-recorrido",
  "re-tasa-recorrido-apartado",
]);

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  const allCuentas = await db
    .select({
      id: cuentas.id_cuenta,
      nombre: cuentas.nombre_cuenta,
      metricas: cuentas.metricas_config,
    })
    .from(cuentas);

  const resultados: {
    id: number;
    nombre: string | null;
    eliminadas: number;
    ids_eliminados: string[];
    accion: string;
  }[] = [];

  for (const cuenta of allCuentas) {
    const existentes = parseMetricasConfig(cuenta.metricas);
    const sobrantes = existentes.filter((m) => RE_IDS_SOBRANTES.has(m.id));

    if (sobrantes.length === 0) {
      resultados.push({
        id: cuenta.id,
        nombre: cuenta.nombre,
        eliminadas: 0,
        ids_eliminados: [],
        accion: "sin_cambios",
      });
      continue;
    }

    const metricasLimpias = existentes.filter(
      (m) => !RE_IDS_SOBRANTES.has(m.id),
    );

    if (!dryRun) {
      await db
        .update(cuentas)
        .set({ metricas_config: metricasLimpias })
        .where(eq(cuentas.id_cuenta, cuenta.id));
    }

    resultados.push({
      id: cuenta.id,
      nombre: cuenta.nombre,
      eliminadas: sobrantes.length,
      ids_eliminados: sobrantes.map((m) => m.id),
      accion: dryRun ? "dry_run" : "limpiado",
    });
  }

  const totalLimpiados = resultados.filter(
    (r) => r.accion === "limpiado",
  ).length;
  const totalDryRun = resultados.filter((r) => r.accion === "dry_run").length;
  const totalSinCambios = resultados.filter(
    (r) => r.accion === "sin_cambios",
  ).length;

  return NextResponse.json({
    ok: true,
    dryRun,
    ids_sobrantes: [...RE_IDS_SOBRANTES],
    ids_finales_re: [...PLANTILLA_METRICAS_REALESTATE_IDS],
    tenants_procesados: allCuentas.length,
    tenants_limpiados: dryRun ? totalDryRun : totalLimpiados,
    tenants_sin_cambios: totalSinCambios,
    detalle: resultados.filter((r) => r.accion !== "sin_cambios"),
  });
}
