/**
 * POST /api/super/seed-metricas-realestate
 *
 * Aplica la plantilla vertical Real Estate a una cuenta específica o a un
 * conjunto de cuentas (por ID).
 *
 * Solo añade métricas faltantes — nunca sobreescribe ni elimina las existentes.
 *
 * Requiere header interno: X-Cron-Secret.
 *
 * Body (JSON):
 *   { "cuentaIds": [30] }           → aplica solo a cuentas especificadas
 *   { "cuentaIds": [] }             → dry-run o aplicar a todas si dry=0
 *
 * Query params:
 *   ?dry=1   → dry-run, no escribe en BD
 *   ?all=1   → aplica a TODOS los tenants (peligroso, solo para testing)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import {
  PLANTILLA_METRICAS_REALESTATE,
  getMetricasRealEstateFaltantes,
} from "@/lib/plantilla-metricas";
import { parseMetricasConfig } from "@/lib/metricas-engine";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry") === "1";
  const applyAll = url.searchParams.get("all") === "1";

  let body: { cuentaIds?: number[] } = {};
  try {
    body = await request.json();
  } catch {
    // body vacío es válido si se usa ?all=1
  }

  const cuentaIds: number[] = body.cuentaIds ?? [];

  if (cuentaIds.length === 0 && !applyAll) {
    return NextResponse.json(
      { error: "Especifica cuentaIds en el body, o usa ?all=1 para aplicar a todos." },
      { status: 400 }
    );
  }

  const query = applyAll
    ? db.select({ id: cuentas.id_cuenta, nombre: cuentas.nombre_cuenta, metricas: cuentas.metricas_config }).from(cuentas)
    : db.select({ id: cuentas.id_cuenta, nombre: cuentas.nombre_cuenta, metricas: cuentas.metricas_config }).from(cuentas).where(inArray(cuentas.id_cuenta, cuentaIds));

  const allCuentas = await query;

  const resultados: { id: number; nombre: string | null; agregadas: number; accion: string }[] = [];

  for (const cuenta of allCuentas) {
    const existentes = parseMetricasConfig(cuenta.metricas);
    const faltantes = getMetricasRealEstateFaltantes(existentes);

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

  return NextResponse.json({
    ok: true,
    dryRun,
    plantilla_realestate_total: PLANTILLA_METRICAS_REALESTATE.length,
    tenants_procesados: allCuentas.length,
    tenants_actualizados: totalActualizados,
    tenants_sin_cambios: totalSinCambios,
    detalle: resultados,
  });
}
