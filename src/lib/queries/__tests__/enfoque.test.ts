import { describe, it, expect } from "vitest";
import { estadoToCanonicoEnfoque } from "../enfoque";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";

describe("estadoToCanonicoEnfoque", () => {
  const cases: [string | null, ResultadoCanonicoEnfoque | null][] = [
    [null, null],
    ["no_contestado", "no_contesto"],
    ["no_contesto", "no_contesto"],
    ["nocontest", "no_contesto"],
    ["NO_CONTESTO", "no_contesto"],
    ["buzon", "buzon"],
    ["buzón", "buzon"],
    ["seguimiento", "seguimiento"],
    ["seguimiento_3", "seguimiento"],
    ["interesado", "interesado"],
    ["programado", "programado"],
    ["calificada", "calificada"],
    ["default-agendada", "calificada"],
    ["default-asistida", "calificada"],
    ["default-ofertada", "calificada"],
    ["no_calificada", "no_calificada"],
    ["cerrada", "cerrada"],
    ["complet", "cerrada"],
    ["no_interesado", "no_interesado"],
    ["perdido", "no_interesado"],
    ["cancelada", "no_interesado"],
    ["contesto", "contesto"],
    ["contestó", "contesto"],
    ["no_show", "no_contesto"],
    ["default-no-show", "no_contesto"],
    ["{buzon}", "buzon"],
    ["estado_desconocido", null],
  ];

  it.each(cases)("normaliza '%s' → '%s'", (input, expected) => {
    expect(estadoToCanonicoEnfoque(input)).toBe(expected);
  });

  it("el set canónico tiene exactamente 10 valores", () => {
    const canonicos: ResultadoCanonicoEnfoque[] = [
      "contesto",
      "no_contesto",
      "buzon",
      "seguimiento",
      "interesado",
      "programado",
      "calificada",
      "no_calificada",
      "cerrada",
      "no_interesado",
    ];
    expect(canonicos).toHaveLength(10);
  });
});
