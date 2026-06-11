import { describe, it, expect } from "vitest";
import { canControlEnfoque } from "../permisos";

/**
 * F4 (AUT-860) — invariante de seguridad del gating de acciones admin de Enfoque.
 * Las acciones son destructivas (liberar locks, reasignar, cambiar tipo, saltar),
 * por eso el gating es EXPLÍCITO y NO se hereda de `ver_todo`.
 */
describe("canControlEnfoque", () => {
  it("permite a superadmin sin importar permisos", () => {
    expect(canControlEnfoque("superadmin", [])).toBe(true);
  });

  it("permite con el permiso explícito controlar_enfoque", () => {
    expect(canControlEnfoque("usuario", ["controlar_enfoque"])).toBe(true);
  });

  it("NO concede control solo por tener ver_todo", () => {
    expect(canControlEnfoque("usuario", ["ver_todo"])).toBe(false);
  });

  it("niega a un usuario sin rol ni permiso", () => {
    expect(canControlEnfoque("asesor", ["ver_dashboard", "editar_registros"])).toBe(false);
  });
});
