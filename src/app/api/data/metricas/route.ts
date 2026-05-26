import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas, metricasWebhook } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { MetricaConfig } from "@/lib/db/schema";

/**
 * GET /api/data/metricas
 *
 * Returns the list of metrics available for comparison for the current tenant.
 * Sources:
 *  1. metricas_config entries with tipo="webhook" (have a configured name + format)
 *  2. Distinct campo values from metricas_webhook with no matching config (raw webhook fields)
 *
 * Response: [{ id: string, nombre: string, formato?: string }]
 */
export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    // 1. Fetch metricas_config from the account
    const [cuenta] = await db
      .select({ metricas_config: cuentas.metricas_config })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const allConfig: MetricaConfig[] = cuenta?.metricas_config ?? [];
    const webhookConfigs = allConfig.filter((m) => m.tipo === "webhook" && m.webhookCampo);

    // Build a set of configured campos to avoid duplicates
    const configuredCampos = new Set(webhookConfigs.map((m) => m.webhookCampo!));

    // 2. Get distinct campos from metricas_webhook that have no config entry
    const rawCampos = await db
      .selectDistinct({ campo: metricasWebhook.campo })
      .from(metricasWebhook)
      .where(eq(metricasWebhook.id_cuenta, idCuenta));

    const metrics: { id: string; nombre: string; formato?: string }[] = [];

    // Add configured metrics first (better names + format info)
    for (const cfg of webhookConfigs) {
      metrics.push({
        id: cfg.webhookCampo!,
        nombre: cfg.nombre,
        formato: cfg.formato,
      });
    }

    // Add raw webhook campos that have no config
    for (const { campo } of rawCampos) {
      if (!configuredCampos.has(campo)) {
        metrics.push({ id: campo, nombre: campo });
      }
    }

    return NextResponse.json(metrics);
  });
}
