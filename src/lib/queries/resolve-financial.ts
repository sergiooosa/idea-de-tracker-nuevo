import { db } from "@/lib/db";
import { kpisExternos } from "@/lib/db/schema";
import type { MetricaConfig } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calcMetricaManual, parseMetricasConfig } from "@/lib/metricas-engine";

interface AccountFinancialConfig {
  fuenteDatosFinancieros?: string | null;
  metricasConfig?: unknown;
  metricasManualData?: Record<string, { [k: string]: string | number | boolean | null }[]> | null;
}

/**
 * Resolves cash collected and revenue (facturación) for a given account and period,
 * applying the same logic across all views (dashboard, ads, advisor panel).
 *
 * Resolution priority:
 * 1. Manual metrics (base-cash-collected / base-facturacion) with data → calcMetricaManual
 * 2. fuente_datos_financieros = "api_externa" → kpis_externos table
 * 3. Native values from resumenes_diarios_agendas (passed as parameters)
 */
export async function resolveFinancialValues(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  nativeRevenue: number,
  nativeCash: number,
  config: AccountFinancialConfig,
): Promise<{ revenue: number; cash: number }> {
  let revenue = nativeRevenue;
  let cash = nativeCash;

  const configs = parseMetricasConfig(config.metricasConfig);
  const manualData = config.metricasManualData ?? {};

  const cashMetric = configs.find(
    (m): m is MetricaConfig & { tipo: "manual" } =>
      m.id === "base-cash-collected" && m.tipo === "manual",
  );
  const revenueMetric = configs.find(
    (m): m is MetricaConfig & { tipo: "manual" } =>
      m.id === "base-facturacion" && m.tipo === "manual",
  );

  if (cashMetric) {
    const entries = manualData[cashMetric.id] ?? [];
    if (entries.length > 0) {
      const manualVal = calcMetricaManual(cashMetric, entries, dateFrom, dateTo);
      const num = typeof manualVal === "number" ? manualVal : parseFloat(String(manualVal)) || 0;
      if (num > 0) cash = num;
    }
  }

  if (revenueMetric) {
    const entries = manualData[revenueMetric.id] ?? [];
    if (entries.length > 0) {
      const manualVal = calcMetricaManual(revenueMetric, entries, dateFrom, dateTo);
      const num = typeof manualVal === "number" ? manualVal : parseFloat(String(manualVal)) || 0;
      if (num > 0) revenue = num;
    }
  }

  if (config.fuenteDatosFinancieros === "api_externa") {
    const kpisExt = await db
      .select({ metricas: kpisExternos.metricas })
      .from(kpisExternos)
      .where(
        and(
          eq(kpisExternos.id_cuenta, idCuenta),
          gte(kpisExternos.fecha, dateFrom),
          lte(kpisExternos.fecha, dateTo),
        ),
      );

    if (kpisExt.length > 0) {
      let extRevenue = 0;
      let extCash = 0;
      let extIngresos = 0;
      for (const row of kpisExt) {
        const m = row.metricas ?? {};
        extRevenue += m.facturacion ?? 0;
        extCash += m.cash_collected ?? 0;
        extIngresos += m.ingresos ?? 0;
      }
      revenue = extRevenue || extIngresos;
      cash = extCash;
    }
  }

  return { revenue, cash };
}
