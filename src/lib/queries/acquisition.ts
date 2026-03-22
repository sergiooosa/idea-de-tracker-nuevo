import { db } from "@/lib/db";
import { resumenesDiariosAgendas, logLlamadas, chatsLogs, cuentas } from "@/lib/db/schema";
import type { EmbudoEtapa } from "@/lib/db/schema";
import { eq, and, or, gte, lte, isNull, isNotNull } from "drizzle-orm";

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

export interface ByChannelStats {
  llamadas: { leads: number; contactRate: number; bookingRate: number; closingRate: number };
  videollamadas: { leads: number; attendanceRate: number; closingRate: number; revenue: number };
  chats: { leads: number; conRespuesta: number; tasaRespuesta: number; topOrigen: string | null };
}

export interface AcquisitionResponse {
  rows: AcquisitionRow[];
  sources: string[];
  byChannel: ByChannelStats;
}

export async function getAcquisition(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
): Promise<AcquisitionResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [cuentaRow] = await db
    .select({ embudo_personalizado: cuentas.embudo_personalizado })
    .from(cuentas)
    .where(eq(cuentas.id_cuenta, idCuenta))
    .limit(1);

  const embudoRaw: EmbudoEtapa[] | null = Array.isArray(cuentaRow?.embudo_personalizado)
    ? cuentaRow.embudo_personalizado
    : null;

  // Soporta campo "nombre" (estándar), "name" (legacy) y "id"
  const getLabel = (e: EmbudoEtapa) =>
    ((e?.nombre ?? (e as any)?.name ?? e?.id) || "").trim();
  const allKeys = embudoRaw && embudoRaw.length > 0
    ? [...new Set([
        ...embudoRaw.map(getLabel),
        ...embudoRaw.map((e) => (e?.id ?? "").trim()),
      ].filter(Boolean))]
    : [];

  const attendedSet = allKeys.length > 0
    ? new Set(allKeys.filter((k) => !k.toLowerCase().includes("cancel") && !k.toLowerCase().includes("pdte")))
    : new Set(["Cerrada", "Ofertada", "No_Ofertada"]);

  const closedSet = allKeys.length > 0
    ? new Set(allKeys.filter((k) =>
        k.toLowerCase().includes("cerrad") || k.toLowerCase().includes("closed"),
      ))
    : new Set(["Cerrada"]);

  const fechaFilter = or(
    and(
      isNotNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha_reunion, fromDate),
      lte(resumenesDiariosAgendas.fecha_reunion, toDate),
    ),
    and(
      isNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha, dateFrom),
      lte(resumenesDiariosAgendas.fecha, dateTo),
    ),
  )!;

  const [agendas, calls, chats] = await Promise.all([
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(
        and(
          eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
          fechaFilter,
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

  // ----------------------------------------------------------------
  // TABLA EXISTENTE — lógica original sin cambios
  // ----------------------------------------------------------------
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
    if (attendedSet.has(a.categoria ?? "")) bucket.attended++;
    if (closedSet.has(a.categoria ?? "")) {
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

  // ----------------------------------------------------------------
  // BY CHANNEL — cálculo independiente por canal, denominadores limpios
  // ----------------------------------------------------------------

  // CANAL: LLAMADAS (solo log_llamadas + cross-ref emails en agendas)
  const llamadasLeads = new Set<string>();
  const llamadasAnswered = new Set<string>();
  for (const c of calls) {
    if (c.mail_lead) {
      llamadasLeads.add(c.mail_lead);
      if (c.tipo_evento.startsWith("efectiva_")) {
        llamadasAnswered.add(c.mail_lead);
      }
    }
  }
  // Cross-ref: leads de llamadas que agendaron videollamada (por email)
  let llamadasBooked = 0;
  let llamadasAttended = 0;
  let llamadasClosed = 0;
  for (const a of agendas) {
    if (a.email_lead && llamadasLeads.has(a.email_lead)) {
      llamadasBooked++;
      if (attendedSet.has(a.categoria ?? "")) llamadasAttended++;
      if (closedSet.has(a.categoria ?? "")) llamadasClosed++;
    }
  }
  const llamadasLeadsCount = llamadasLeads.size;
  const llamadasAnsweredCount = llamadasAnswered.size;

  const llamadasChannel: ByChannelStats["llamadas"] = {
    leads: llamadasLeadsCount,
    contactRate: llamadasLeadsCount > 0 ? llamadasAnsweredCount / llamadasLeadsCount : 0,
    bookingRate: llamadasAnsweredCount > 0 ? llamadasBooked / llamadasAnsweredCount : 0,
    closingRate: llamadasAttended > 0 ? llamadasClosed / llamadasAttended : 0,
  };

  // CANAL: VIDEOLLAMADAS (solo resumenes_diarios_agendas)
  const videollamadasLeads = new Set<string>();
  let videollamadasBooked = 0;
  let videollamadasAttended = 0;
  let videollamadasClosed = 0;
  let videollamadasRevenue = 0;
  for (const a of agendas) {
    if (a.email_lead) videollamadasLeads.add(a.email_lead);
    videollamadasBooked++;
    if (attendedSet.has(a.categoria ?? "")) videollamadasAttended++;
    if (closedSet.has(a.categoria ?? "")) {
      videollamadasClosed++;
      videollamadasRevenue += parseFloat(a.facturacion || "0") || 0;
    }
  }

  const videollamadasChannel: ByChannelStats["videollamadas"] = {
    leads: videollamadasLeads.size,
    attendanceRate: videollamadasBooked > 0 ? videollamadasAttended / videollamadasBooked : 0,
    closingRate: videollamadasAttended > 0 ? videollamadasClosed / videollamadasAttended : 0,
    revenue: Math.round(videollamadasRevenue),
  };

  // CANAL: CHATS (solo chats_logs)
  const chatsLeads = new Set<string>();
  const chatsLeadsWithResponse = new Set<string>();
  const chatsOrigenCount: Record<string, number> = {};
  for (const ch of chats) {
    if (ch.id_lead) {
      chatsLeads.add(ch.id_lead);
      // "con respuesta" = tiene al menos un mensaje con role="agent" en el JSONB
      const chatData = ch.chat as any[];
      const hasAgentMsg = Array.isArray(chatData) && chatData.some((m: any) => m?.role === "agent");
      if (hasAgentMsg) {
        chatsLeadsWithResponse.add(ch.id_lead);
      }
    }
    if (ch.origen) {
      chatsOrigenCount[ch.origen] = (chatsOrigenCount[ch.origen] ?? 0) + 1;
    }
  }
  const chatsLeadsCount = chatsLeads.size;
  const chatsConRespuesta = chatsLeadsWithResponse.size;
  const topOrigen =
    Object.entries(chatsOrigenCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const chatsChannel: ByChannelStats["chats"] = {
    leads: chatsLeadsCount,
    conRespuesta: chatsConRespuesta,
    tasaRespuesta: chatsLeadsCount > 0 ? chatsConRespuesta / chatsLeadsCount : 0,
    topOrigen,
  };

  return {
    rows,
    sources,
    byChannel: {
      llamadas: llamadasChannel,
      videollamadas: videollamadasChannel,
      chats: chatsChannel,
    },
  };
}
