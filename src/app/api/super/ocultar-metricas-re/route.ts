/**
 * POST /api/super/ocultar-metricas-re
 *
 * Oculta las 5 métricas RE supervivientes (paneles: []) en todos los tenants
 * existentes, igualando la plantilla de tenants nuevos.
 *
 * Idempotente: si una cuenta ya tiene paneles: [] en las 5 → sin_cambios.
 *
 * Requiere header: X-Cron-Secret.
 *
 * Query params:
 *   ?dry=1  → dry-run, no escribe en BD
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { MetricaConfig } from "@/lib/db/schema";
import { parseMetricasConfig } from "@/lib/metricas-engine";
import { eq } from "drizzle-orm";

const RE_IDS_OCULTAR = new Set([
  "re-recorridos-agendados",
  "re-recorridos-realizados",
  "re-recorridos-cancelados",
  "re-apartados",
  "re-monto-apartados",
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
    ocultadas: number;
    ids_ocultados: string[];
    accion: string;
  }[] = [];

  for (const cuenta of allCuentas) {
    const existentes = parseMetricasConfig(cuenta.metricas);
    const reVisibles = existentes.filter(
      (m) => RE_IDS_OCULTAR.has(m.id) && (m.paneles?.length ?? 0) > 0,
    );

    if (reVisibles.length === 0) {
      resultados.push({
        id: cuenta.id,
        nombre: cuenta.nombre,
        ocultadas: 0,
        ids_ocultados: [],
        accion: "sin_cambios",
      });
      continue;
    }

    const metricasActualizadas: MetricaConfig[] = existentes.map((m) => {
      if (RE_IDS_OCULTAR.has(m.id)) {
        return { ...m, paneles: [] };
      }
      return m;
    });

    if (!dryRun) {
      await db
        .update(cuentas)
        .set({ metricas_config: metricasActualizadas })
        .where(eq(cuentas.id_cuenta, cuenta.id));
    }

    resultados.push({
      id: cuenta.id,
      nombre: cuenta.nombre,
      ocultadas: reVisibles.length,
      ids_ocultados: reVisibles.map((m) => m.id),
      accion: dryRun ? "dry_run" : "ocultado",
    });
  }

  const totalOcultados = resultados.filter(
    (r) => r.accion === "ocultado",
  ).length;
  const totalDryRun = resultados.filter((r) => r.accion === "dry_run").length;
  const totalSinCambios = resultados.filter(
    (r) => r.accion === "sin_cambios",
  ).length;

  return NextResponse.json({
    ok: true,
    dryRun,
    ids_re_ocultar: [...RE_IDS_OCULTAR],
    tenants_procesados: allCuentas.length,
    tenants_ocultados: dryRun ? totalDryRun : totalOcultados,
    tenants_sin_cambios: totalSinCambios,
    detalle: resultados.filter((r) => r.accion !== "sin_cambios"),
  });
}
