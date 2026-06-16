import { describe, it, expect } from "vitest";
import { buildFunnelSets } from "../dashboard";
import type { EmbudoEtapa } from "@/lib/db/schema";

function makeEtapa(overrides: Partial<EmbudoEtapa> & { id: string }): EmbudoEtapa {
  return {
    nombre: overrides.id,
    color: "#000",
    orden: 0,
    ...overrides,
  };
}

describe("buildFunnelSets — closedByFlag gender variants (AUT-978)", () => {
  it("includes 'cerrado' in closedSet when fixed stage 'cerrada' has es_cerrada=true", () => {
    const embudo: EmbudoEtapa[] = [
      makeEtapa({ id: "calificada", orden: 1, es_fija: true, es_calificada: true }),
      makeEtapa({ id: "no_calificada", orden: 2, es_fija: true }),
      makeEtapa({ id: "cerrada", orden: 3, es_fija: true, es_cerrada: true }),
      makeEtapa({ id: "cancelada", orden: 4, es_fija: true }),
    ];

    const { closedSet, effectiveSet } = buildFunnelSets(embudo);

    expect(closedSet.has("cerrada")).toBe(true);
    expect(closedSet.has("cerrado")).toBe(true);
    expect(effectiveSet.has("cerrado")).toBe(true);
  });

  it("does NOT add variants for custom (non-fixed) stages", () => {
    const embudo: EmbudoEtapa[] = [
      makeEtapa({ id: "calificada", orden: 1, es_fija: true, es_calificada: true }),
      makeEtapa({ id: "cerrada", orden: 2, es_fija: false, es_cerrada: true }),
    ];

    const { closedSet } = buildFunnelSets(embudo);

    expect(closedSet.has("cerrada")).toBe(true);
    expect(closedSet.has("cerrado")).toBe(false);
  });

  it("custom funnel with unrelated closed stage is not affected", () => {
    const embudo: EmbudoEtapa[] = [
      makeEtapa({ id: "won", orden: 1, es_cerrada: true }),
      makeEtapa({ id: "lost", orden: 2 }),
    ];

    const { closedSet } = buildFunnelSets(embudo);

    expect(closedSet.has("won")).toBe(true);
    expect(closedSet.has("cerrado")).toBe(false);
    expect(closedSet.has("cerrada")).toBe(false);
  });

  it("no embudo returns default sets", () => {
    const { closedSet } = buildFunnelSets(null);
    expect(closedSet.has("cerrada")).toBe(true);
  });
});
