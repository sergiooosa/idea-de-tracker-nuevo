import { describe, it, expect } from "vitest";
import { agendaDedupKey } from "../agenda-dedup-key";

interface AgendaRow {
  id_registro_agenda: number;
  idcliente?: string | null;
  ghl_contact_id?: string | null;
  email_lead?: string | null;
  categoria?: string | null;
}

function countReunionesAgendadas(rows: AgendaRow[]): number {
  return new Set(rows.map(agendaDedupKey)).size;
}

describe("asesor reunionesAgendadas dedup (AUT-787)", () => {
  it("same lead with 3 records (PDTE/ofertada/cerrada) counts as 1", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 1, idcliente: "lead-X", categoria: "PDTE" },
      { id_registro_agenda: 2, idcliente: "lead-X", categoria: "ofertada" },
      { id_registro_agenda: 3, idcliente: "lead-X", categoria: "cerrada" },
    ];
    expect(countReunionesAgendadas(rows)).toBe(1);
  });

  it("leads without idcliente dedup by email_lead", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 10, email_lead: "Ana@mail.com", categoria: "calificada" },
      { id_registro_agenda: 11, email_lead: "ana@mail.com", categoria: "cerrada" },
    ];
    expect(countReunionesAgendadas(rows)).toBe(1);
  });

  it("leads without idcliente dedup by ghl_contact_id", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 20, ghl_contact_id: "ghl-abc", categoria: "PDTE" },
      { id_registro_agenda: 21, ghl_contact_id: "ghl-abc", categoria: "ofertada" },
    ];
    expect(countReunionesAgendadas(rows)).toBe(1);
  });

  it("distinct leads are counted separately", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 1, idcliente: "lead-A", categoria: "cerrada" },
      { id_registro_agenda: 2, idcliente: "lead-B", categoria: "PDTE" },
      { id_registro_agenda: 3, email_lead: "c@test.com", categoria: "calificada" },
    ];
    expect(countReunionesAgendadas(rows)).toBe(3);
  });

  it("reunionesAgendadas <= agendaRows.length", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 1, idcliente: "lead-A", categoria: "PDTE" },
      { id_registro_agenda: 2, idcliente: "lead-A", categoria: "ofertada" },
      { id_registro_agenda: 3, idcliente: "lead-A", categoria: "cerrada" },
      { id_registro_agenda: 4, idcliente: "lead-B", categoria: "calificada" },
      { id_registro_agenda: 5, idcliente: "lead-C", categoria: "no_show" },
    ];
    const deduped = countReunionesAgendadas(rows);
    expect(deduped).toBeLessThanOrEqual(rows.length);
    expect(deduped).toBe(3);
  });

  it("fallback to nokey_id when no identifying fields", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 100, categoria: "PDTE" },
      { id_registro_agenda: 101, categoria: "ofertada" },
    ];
    expect(countReunionesAgendadas(rows)).toBe(2);
  });

  it("tasaAgendamiento uses deduped count", () => {
    const rows: AgendaRow[] = [
      { id_registro_agenda: 1, idcliente: "lead-A", categoria: "PDTE" },
      { id_registro_agenda: 2, idcliente: "lead-A", categoria: "cerrada" },
      { id_registro_agenda: 3, idcliente: "lead-B", categoria: "calificada" },
    ];
    const contestadas = 10;
    const dedupCount = countReunionesAgendadas(rows);
    const tasaAgendamiento = contestadas > 0 ? (dedupCount / contestadas) * 100 : 0;
    expect(dedupCount).toBe(2);
    expect(tasaAgendamiento).toBe(20);
  });
});
