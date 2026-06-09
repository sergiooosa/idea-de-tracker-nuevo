import { describe, it, expect } from "vitest";
import { DEFAULT_METRICAS_CONFIG } from "../metricas-engine";

describe("DEFAULT_METRICAS_CONFIG canceladas KPI", () => {
  it("includes a default-canceladas entry sourced from meetingsCanceled", () => {
    const entry = DEFAULT_METRICAS_CONFIG.find((m) => m.id === "default-canceladas");
    expect(entry).toBeDefined();
    expect(entry!.formula?.fuente).toBe("meetingsCanceled");
    expect(entry!.ubicacion).toBe("panel_ejecutivo");
  });

  it("has unique orden values across all default entries", () => {
    const ordenes = DEFAULT_METRICAS_CONFIG.map((m) => m.orden);
    expect(new Set(ordenes).size).toBe(ordenes.length);
  });
});
