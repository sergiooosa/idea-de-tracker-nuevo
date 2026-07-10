import { describe, it, expect } from "vitest";
import type { MetricaConfig, EmbudoEtapa } from "@/lib/db/schema";

/**
 * Unit-test the pruning logic extracted from updateSystemConfig's embudo block.
 * We test the pure transformation (add + prune) without hitting the DB.
 */

function makeEtapa(id: string, nombre: string, opts?: Partial<EmbudoEtapa>): EmbudoEtapa {
  return {
    id,
    nombre,
    orden: 0,
    color: "cyan",
    es_fija: false,
    es_cerrada: false,
    ...opts,
  };
}

function makeMetric(id: string, tipo: MetricaConfig["tipo"], nombre?: string): MetricaConfig {
  return {
    id,
    nombre: nombre ?? id,
    tipo,
    paneles: ["panel_ejecutivo"],
    formato: "numero",
  };
}

function syncEmbudoMetrics(
  embudoNuevo: EmbudoEtapa[],
  metricsExisting: MetricaConfig[],
): MetricaConfig[] {
  const result = [...metricsExisting];
  for (const etapa of embudoNuevo) {
    if (etapa.es_fija !== true) {
      const metricId = `embudo-${etapa.id}`;
      const alreadyExists = result.some((m) => m.id === metricId);
      if (!alreadyExists) {
        result.push({
          id: metricId,
          nombre: etapa.nombre,
          tipo: "embudo_etapa",
          paneles: ["panel_ejecutivo"],
          formato: "numero",
          color: etapa.color ?? "cyan",
          descripcion: `Leads clasificados como "${etapa.nombre}"`,
        });
      }
    }
  }
  const idsEtapasVigentes = new Set(embudoNuevo.map((e) => `embudo-${e.id}`));
  return result.filter(
    (m) => m.tipo !== "embudo_etapa" || idsEtapasVigentes.has(m.id),
  );
}

describe("syncEmbudoMetrics (add + prune)", () => {
  it("removes embudo_etapa metric when its stage is deleted", () => {
    const existing: MetricaConfig[] = [
      makeMetric("embudo-a1", "embudo_etapa", "Interesado"),
      makeMetric("embudo-a2", "embudo_etapa", "Agendado"),
      makeMetric("total-llamadas", "fija", "Total llamadas"),
    ];
    const embudo: EmbudoEtapa[] = [makeEtapa("a1", "Interesado")];

    const result = syncEmbudoMetrics(embudo, existing);

    expect(result.map((m) => m.id)).toEqual(["embudo-a1", "total-llamadas"]);
  });

  it("preserves non-embudo metrics untouched", () => {
    const existing: MetricaConfig[] = [
      makeMetric("manual-1", "manual", "Manual"),
      makeMetric("ads-1", "ads", "Gasto Ads"),
      makeMetric("embudo-gone", "embudo_etapa", "Gone"),
    ];
    const embudo: EmbudoEtapa[] = [];

    const result = syncEmbudoMetrics(embudo, existing);

    expect(result.map((m) => m.id)).toEqual(["manual-1", "ads-1"]);
  });

  it("adds metric for new stage and prunes removed in same call", () => {
    const existing: MetricaConfig[] = [
      makeMetric("embudo-old", "embudo_etapa", "Old Stage"),
      makeMetric("kpi-fijo", "fija", "KPI Fijo"),
    ];
    const embudo: EmbudoEtapa[] = [makeEtapa("new1", "New Stage")];

    const result = syncEmbudoMetrics(embudo, existing);

    const ids = result.map((m) => m.id);
    expect(ids).toContain("embudo-new1");
    expect(ids).toContain("kpi-fijo");
    expect(ids).not.toContain("embudo-old");
  });

  it("skips es_fija stages (no metric created)", () => {
    const existing: MetricaConfig[] = [];
    const embudo: EmbudoEtapa[] = [
      makeEtapa("f1", "Fija Stage", { es_fija: true }),
      makeEtapa("r1", "Regular"),
    ];

    const result = syncEmbudoMetrics(embudo, existing);

    expect(result.map((m) => m.id)).toEqual(["embudo-r1"]);
  });

  it("does not duplicate existing metric for same stage", () => {
    const existing: MetricaConfig[] = [
      makeMetric("embudo-a1", "embudo_etapa", "Interesado"),
    ];
    const embudo: EmbudoEtapa[] = [makeEtapa("a1", "Interesado")];

    const result = syncEmbudoMetrics(embudo, existing);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("embudo-a1");
  });
});
