import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TomarLeadResult, SiguienteLead } from "../enfoque";

const mockLead: SiguienteLead = {
  id_registro: 42,
  nombre_lead: "Juan Pérez",
  mail_lead: "juan@test.com",
  phone: "+521234567890",
  closer_mail: "closer@test.com",
  nombre_closer: "Closer Test",
  estado: "pendiente",
  intentos_contacto: 0,
  fecha_evento: new Date("2026-06-01"),
  creativo_origen: "facebook",
};

const mockDbSelect = vi.fn();
const mockDbInsert = vi.fn();
const mockDbDelete = vi.fn();
const mockDbExecute = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => [{ id: "sess-1", id_cuenta: 33, nombre: "Test", modo: "llamada", filtro_estado: [], filtro_asesores: [], orden: "mas_antiguo", activa: true, created_by: "admin@test.com", created_at: new Date() }],
          orderBy: () => ({
            limit: () => [mockLead],
          }),
        }),
      }),
    }),
    insert: mockDbInsert,
    delete: mockDbDelete,
    execute: mockDbExecute,
  },
}));

vi.mock("@/lib/db/schema", () => ({
  registrosDeLlamada: { id_registro: "id_registro", id_cuenta: "id_cuenta", closer_mail: "closer_mail", estado: "estado", intentos_contacto: "intentos_contacto", fecha_evento: "fecha_evento", nombre_lead: "nombre_lead", mail_lead: "mail_lead", phone_raw_format: "phone_raw_format", nombre_closer: "nombre_closer", creativo_origen: "creativo_origen" },
  sesionesEnfoque: { id: "id", id_cuenta: "id_cuenta", activa: "activa" },
  enfoqueResultado: { id_sesion: "id_sesion", closer_mail: "closer_mail", id_registro: "id_registro" },
  enfoqueLock: { id: "id", id_sesion: "id_sesion", id_cuenta: "id_cuenta", id_registro: "id_registro", en_progreso_por: "en_progreso_por", lock_ts: "lock_ts" },
}));

describe("LOCK_EXPIRATION_MINUTES", () => {
  it("es 15 minutos", async () => {
    const { LOCK_EXPIRATION_MINUTES } = await import("../enfoque");
    expect(LOCK_EXPIRATION_MINUTES).toBe(15);
  });
});

describe("estadoToCanonicoEnfoque — lock tests context", () => {
  it("funciones de lock se exportan correctamente", async () => {
    const mod = await import("../enfoque");
    expect(typeof mod.tomarLead).toBe("function");
    expect(typeof mod.liberarLead).toBe("function");
    expect(typeof mod.getSiguienteLead).toBe("function");
    expect(typeof mod.estadoToCanonicoEnfoque).toBe("function");
  });
});

describe("enfoqueLock schema", () => {
  it("tabla enfoque_lock se exporta del schema", async () => {
    const actualSchema = await vi.importActual("@/lib/db/schema") as Record<string, unknown>;
    expect(actualSchema.enfoqueLock).toBeDefined();
  });
});
