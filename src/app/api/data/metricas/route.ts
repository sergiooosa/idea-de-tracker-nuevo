import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas, metricasWebhook } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MetricaConfig } from "@/lib/db/schema";
import { STANDARD_METRICS } from "@/lib/queries/standard-metrics";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const [cuenta] = await db
      .select({ metricas_config: cuentas.metricas_config })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const allConfig: MetricaConfig[] = cuenta?.metricas_config ?? [];
    const webhookConfigs = allConfig.filter((m) => m.tipo === "webhook" && m.webhookCampo);
    const configuredCampos = new Set(webhookConfigs.map((m) => m.webhookCampo!));

    const rawCampos = await db
      .selectDistinct({ campo: metricasWebhook.campo })
      .from(metricasWebhook)
      .where(eq(metricasWebhook.id_cuenta, idCuenta));

    const metrics: { id: string; nombre: string; formato?: string; fija?: boolean }[] = [];

    for (const std of STANDARD_METRICS) {
      metrics.push({ id: std.id, nombre: std.nombre, formato: std.formato, fija: true });
    }

    for (const cfg of webhookConfigs) {
      metrics.push({
        id: cfg.webhookCampo!,
        nombre: cfg.nombre,
        formato: cfg.formato,
      });
    }

    for (const { campo } of rawCampos) {
      if (!configuredCampos.has(campo)) {
        metrics.push({ id: campo, nombre: campo });
      }
    }

    return NextResponse.json(metrics);
  });
}
