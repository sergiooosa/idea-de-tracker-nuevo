import { describe, it, expect } from "vitest";
import { agendaDedupKey } from "../agenda-dedup-key";

interface AgendaRecord {
  id_registro_agenda: number;
  idcliente?: string | null;
  ghl_contact_id?: string | null;
  email_lead?: string | null;
  categoria?: string | null;
  cash?: number | null;
}

const agendaKey = agendaDedupKey;

function computeAgendaKpis(filteredAgendas: AgendaRecord[]) {
  const uniqueBookedLeads = new Set(filteredAgendas.map(agendaKey));
  const agendadas = uniqueBookedLeads.size;

  const uniqueCanceledLeadKeys = new Set(
    filteredAgendas
      .filter((a) => (a.categoria ?? "").toLowerCase().includes("cancel"))
      .map(agendaKey)
  );
  const canceladas = uniqueCanceledLeadKeys.size;

  const attendedSet = new Set(["calificada", "no_calificada", "cerrada", "ofertada", "no_ofertada"]);
  const asistidas = filteredAgendas.filter(
    (a) => attendedSet.has((a.categoria ?? "").toLowerCase().trim())
  ).length;

  const noShows = new Set(
    filteredAgendas
      .filter((a) => (a.categoria ?? "").toLowerCase() === "no_show")
      .map(agendaKey)
      .filter((key) => !uniqueCanceledLeadKeys.has(key))
  ).size;

  const closedSet = new Set(["cerrada"]);
  const cerradas = filteredAgendas.filter(
    (a) => closedSet.has((a.categoria ?? "").toLowerCase().trim())
  ).length;

  const pendientes = Math.max(0, agendadas - asistidas - canceladas - noShows - cerradas);

  return { agendadas, asistidas, canceladas, noShows, cerradas, pendientes };
}

describe("dashboard agendadas counting", () => {
  it("includes cancelled leads in agendadas count", () => {
    const agendas: AgendaRecord[] = [
      { id_registro_agenda: 1, idcliente: "lead-A", categoria: "calificada" },
      { id_registro_agenda: 2, idcliente: "lead-B", categoria: "cancelada" },
      { id_registro_agenda: 3, idcliente: "lead-C", categoria: "no_show" },
      { id_registro_agenda: 4, idcliente: "lead-D", categoria: "cerrada" },
      { id_registro_agenda: 5, idcliente: "lead-E", categoria: null },
    ];

    const kpis = computeAgendaKpis(agendas);

    expect(kpis.agendadas).toBe(5);
    expect(kpis.canceladas).toBe(1);
    expect(kpis.pendientes).toBeGreaterThanOrEqual(0);
    expect(kpis.agendadas).toBe(
      kpis.asistidas + kpis.canceladas + kpis.noShows + kpis.cerradas + kpis.pendientes
    );
  });

  it("deduplicates same lead across multiple records", () => {
    const agendas: AgendaRecord[] = [
      { id_registro_agenda: 1, idcliente: "lead-A", categoria: "calificada" },
      { id_registro_agenda: 2, idcliente: "lead-A", categoria: "cancelada" },
      { id_registro_agenda: 3, idcliente: "lead-A", categoria: "cerrada" },
      { id_registro_agenda: 4, idcliente: "lead-B", categoria: "cancelada" },
    ];

    const kpis = computeAgendaKpis(agendas);

    expect(kpis.agendadas).toBe(2);
  });

  it("uses ghl_contact_id as fallback dedup key", () => {
    const agendas: AgendaRecord[] = [
      { id_registro_agenda: 1, ghl_contact_id: "ghl-1", categoria: "calificada" },
      { id_registro_agenda: 2, ghl_contact_id: "ghl-1", categoria: "cancelada" },
      { id_registro_agenda: 3, email_lead: "test@example.com", categoria: "no_show" },
    ];

    const kpis = computeAgendaKpis(agendas);

    expect(kpis.agendadas).toBe(2);
  });

  it("real-world scenario: 107 agendadas / 43 canceladas → pendientes >= 0", () => {
    const agendas: AgendaRecord[] = [];
    for (let i = 0; i < 64; i++) {
      agendas.push({
        id_registro_agenda: i + 1,
        idcliente: `lead-${i}`,
        categoria: "calificada",
      });
    }
    for (let i = 0; i < 43; i++) {
      agendas.push({
        id_registro_agenda: 100 + i,
        idcliente: `canceled-lead-${i}`,
        categoria: "cancelada",
      });
    }

    const kpis = computeAgendaKpis(agendas);

    expect(kpis.agendadas).toBe(107);
    expect(kpis.canceladas).toBe(43);
    expect(kpis.pendientes).toBeGreaterThanOrEqual(0);
    expect(kpis.agendadas).toBe(
      kpis.asistidas + kpis.canceladas + kpis.noShows + kpis.cerradas + kpis.pendientes
    );
  });

  it("invariant holds: agendadas = asistidas + canceladas + noShows + cerradas + pendientes", () => {
    const agendas: AgendaRecord[] = [
      { id_registro_agenda: 1, idcliente: "lead-1", categoria: "calificada" },
      { id_registro_agenda: 2, idcliente: "lead-2", categoria: "cancelada" },
      { id_registro_agenda: 3, idcliente: "lead-3", categoria: "no_show" },
      { id_registro_agenda: 4, idcliente: "lead-4", categoria: "cerrada" },
      { id_registro_agenda: 5, idcliente: "lead-5", categoria: "no_calificada" },
      { id_registro_agenda: 6, idcliente: "lead-6", categoria: null },
      { id_registro_agenda: 7, idcliente: "lead-7", categoria: "ofertada" },
    ];

    const kpis = computeAgendaKpis(agendas);

    expect(kpis.agendadas).toBe(7);
    expect(kpis.pendientes).toBeGreaterThanOrEqual(0);
    expect(kpis.agendadas).toBe(
      kpis.asistidas + kpis.canceladas + kpis.noShows + kpis.cerradas + kpis.pendientes
    );
  });
});
