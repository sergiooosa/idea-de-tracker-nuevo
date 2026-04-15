/**
 * POST /api/super/seed-metricas-base
 *
 * Migración retroactiva: agrega las métricas base a todos los tenants que no las tienen.
 * Solo añade métricas faltantes — nunca sobreescribe ni elimina las existentes.
 *
 * Requiere header interno: X-Cron-Secret o acceso superadmin.
 * Uso: llamar una sola vez después del deploy de AUT-30.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import {
  PLANTILLA_METRICAS_BASE,
  getMetricasBaseFaltantes,
} from "@/lib/plantilla-metricas";
import { parseMetricasConfig } from "@/lib/metricas-engine";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  const allCuentas = await db
    .select({ id: cuentas.id_cuenta, nombre: cuentas.nombre_cuenta, metricas: cuentas.metricas_config })
    .from(cuentas);

  const resultados: { id: number; nombre: string | null; agregadas: number; accion: string }[] = [];

  for (const cuenta of allCuentas) {
    const existentes = parseMetricasConfig(cuenta.metricas);
    const faltantes = getMetricasBaseFaltantes(existentes);

    if (faltantes.length === 0) {
      resultados.push({ id: cuenta.id, nombre: cuenta.nombre, agregadas: 0, accion: "sin_cambios" });
      continue;
    }

    const nuevasMetricas = [...existentes, ...faltantes];

    if (!dryRun) {
      await db
        .update(cuentas)
        .set({ metricas_config: nuevasMetricas })
        .where(eq(cuentas.id_cuenta, cuenta.id));
    }

    resultados.push({
      id: cuenta.id,
      nombre: cuenta.nombre,
      agregadas: faltantes.length,
      accion: dryRun ? "dry_run" : "actualizado",
    });
  }

  const totalActualizados = resultados.filter((r) => r.accion === "actualizado").length;
  const totalSinCambios = resultados.filter((r) => r.accion === "sin_cambios").length;
  const totalDryRun = resultados.filter((r) => r.accion === "dry_run").length;

  return NextResponse.json({
    ok: true,
    dryRun,
    plantilla_metricas_total: PLANTILLA_METRICAS_BASE.length,
    tenants_total: allCuentas.length,
    tenants_actualizados: dryRun ? totalDryRun : totalActualizados,
    tenants_sin_cambios: totalSinCambios,
    detalle: resultados,
  });
}
