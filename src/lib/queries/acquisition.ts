import { db } from "@/lib/db";
import { resumenesDiariosAgendas, logLlamadas, chatsLogs } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface AcquisitionRow {
  origen: string;
  leads: number;
  called: number;
  answered: number;
  booked: number;
  attended: number;
  closed: number;
  revenue: number;
  contactRate: number;
  bookingRate: number;
  attendanceRate: number;
  closingRate: number;
}

export interface AcquisitionResponse {
  rows: AcquisitionRow[];
  sources: string[];
}

export async function getAcquisition(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
): Promise<AcquisitionResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [agendas, calls, chats] = await Promise.all([
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(
        and(
          eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
          gte(resumenesDiariosAgendas.fecha_reunion, fromDate),
          lte(resumenesDiariosAgendas.fecha_reunion, toDate),
        ),
      ),
    db
      .select()
      .from(logLlamadas)
      .where(
        and(
          eq(logLlamadas.id_cuenta, idCuenta),
          gte(logLlamadas.ts, fromDate),
          lte(logLlamadas.ts, toDate),
        ),
      ),
    db
      .select()
      .from(chatsLogs)
      .where(
        and(
          eq(chatsLogs.id_cuenta, idCuenta),
          gte(chatsLogs.fecha_y_hora_z, fromDate),
          lte(chatsLogs.fecha_y_hora_z, toDate),
        ),
      ),
  ]);

  const attended = ["Cerrada", "Ofertada", "No_Ofertada"];
  const origenMap: Record<string, {
    leadEmails: Set<string>;
    calledEmails: Set<string>;
    answeredEmails: Set<string>;
    booked: number;
    attended: number;
    closed: number;
    revenue: number;
  }> = {};

  function getOrCreate(key: string) {
    const k = (key || "sin_origen").toLowerCase().trim();
    if (!origenMap[k]) {
      origenMap[k] = {
        leadEmails: new Set(),
        calledEmails: new Set(),
        answeredEmails: new Set(),
        booked: 0,
        attended: 0,
        closed: 0,
        revenue: 0,
      };
    }
    return origenMap[k];
  }

  for (const a of agendas) {
    const bucket = getOrCreate(a.origen ?? "sin_origen");
    if (a.email_lead) bucket.leadEmails.add(a.email_lead);
    bucket.booked++;
    if (attended.includes(a.categoria ?? "")) bucket.attended++;
    if (a.categoria === "Cerrada") {
      bucket.closed++;
      bucket.revenue += parseFloat(a.facturacion || "0") || 0;
    }
  }

  for (const c of calls) {
    const bucket = getOrCreate(c.creativo_origen ?? "sin_origen");
    if (c.mail_lead) {
      bucket.leadEmails.add(c.mail_lead);
      bucket.calledEmails.add(c.mail_lead);
      if (c.tipo_evento.startsWith("efectiva_")) {
        bucket.answeredEmails.add(c.mail_lead);
      }
    }
  }

  for (const ch of chats) {
    if (!ch.origen) continue;
    const bucket = getOrCreate(ch.origen);
    if (ch.id_lead) bucket.leadEmails.add(ch.id_lead);
  }

  const rows: AcquisitionRow[] = Object.entries(origenMap)
    .map(([origen, d]) => {
      const leads = d.leadEmails.size;
      const called = d.calledEmails.size;
      const answeredCount = d.answeredEmails.size;
      return {
        origen,
        leads,
        called,
        answered: answeredCount,
        booked: d.booked,
        attended: d.attended,
        closed: d.closed,
        revenue: Math.round(d.revenue),
        contactRate: called > 0 ? answeredCount / called : 0,
        bookingRate: answeredCount > 0 ? d.booked / answeredCount : 0,
        attendanceRate: d.booked > 0 ? d.attended / d.booked : 0,
        closingRate: d.attended > 0 ? d.closed / d.attended : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  const sources = [...new Set(rows.map((r) => r.origen))];

  return { rows, sources };
}
