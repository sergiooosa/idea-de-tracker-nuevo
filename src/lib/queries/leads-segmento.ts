import { db } from "@/lib/db";
import { resumenesDiariosAgendas, cuentas, chatsLogs } from "@/lib/db/schema";
import { normalizeEmbudoEtapas } from "@/lib/db/schema";
import { zonedDayRange } from "@/lib/date-range";
import { eq, and, or, gt, gte, lte, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { buildFunnelSets } from "./dashboard";
import { DEFAULT_EMBUDO_CONFIG } from "@/lib/metricas-engine";
import type { LeadSegmentoItem, SegmentoCanal } from "@/types";

export async function getLeadsSegmento(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  segmento: "calificado" | "no_calificado",
  canal: SegmentoCanal,
  agendo: "si" | "no" | "all",
  closerEmails?: string[],
): Promise<LeadSegmentoItem[]> {
  const emails = (closerEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const [cuentaRow] = await db
    .select({
      embudo_personalizado: cuentas.embudo_personalizado,
      configuracion_ui: cuentas.configuracion_ui,
      zona_horaria_iana: cuentas.zona_horaria_iana,
    })
    .from(cuentas)
    .where(eq(cuentas.id_cuenta, idCuenta))
    .limit(1);

  const { fromDate, toDate } = zonedDayRange(dateFrom, dateTo, cuentaRow?.zona_horaria_iana);

  const cerradasCuentanComoCal = cuentaRow?.configuracion_ui?.cerradas_cuentan_como_calificadas ?? true;
  const embudoRawArr = Array.isArray(cuentaRow?.embudo_personalizado) ? normalizeEmbudoEtapas(cuentaRow.embudo_personalizado) : [];
  const embudoRaw = embudoRawArr.length > 0 ? embudoRawArr : DEFAULT_EMBUDO_CONFIG;
  const { qualifiedSet, closedSet } = buildFunnelSets(embudoRaw);

  const effectiveQualifiedSet: Set<string> = cerradasCuentanComoCal
    ? new Set([...qualifiedSet, ...closedSet] as string[])
    : new Set([...qualifiedSet] as string[]);

  if (canal === "chat") {
    return getChatLeads(idCuenta, fromDate, toDate, segmento, effectiveQualifiedSet, emails);
  }

  return getAgendaLeads(idCuenta, dateFrom, dateTo, fromDate, toDate, segmento, canal, agendo, effectiveQualifiedSet, emails);
}

async function getAgendaLeads(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  fromDate: Date,
  toDate: Date,
  segmento: "calificado" | "no_calificado",
  canal: SegmentoCanal,
  agendo: "si" | "no" | "all",
  qualifiedSet: Set<string>,
  emails: string[],
): Promise<LeadSegmentoItem[]> {
  const fechaFilter = or(
    and(
      isNotNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha_reunion, fromDate),
      lte(resumenesDiariosAgendas.fecha_reunion, toDate),
    ),
    and(
      eq(resumenesDiariosAgendas.categoria, "PDTE"),
      isNotNull(resumenesDiariosAgendas.fecha_reunion),
      gt(resumenesDiariosAgendas.fecha_reunion, sql`NOW()`),
      gte(resumenesDiariosAgendas.fecha, dateFrom),
      lte(resumenesDiariosAgendas.fecha, dateTo),
    ),
    and(
      isNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha, dateFrom),
      lte(resumenesDiariosAgendas.fecha, dateTo),
    ),
  )!;

  const conditions = [
    eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
    fechaFilter,
  ];
  if (emails.length > 0) conditions.push(inArray(resumenesDiariosAgendas.closer, emails));

  const agendas = await db
    .select({
      nombre_de_lead: resumenesDiariosAgendas.nombre_de_lead,
      email_lead: resumenesDiariosAgendas.email_lead,
      ghl_contact_id: resumenesDiariosAgendas.ghl_contact_id,
      categoria: resumenesDiariosAgendas.categoria,
      fecha_reunion: resumenesDiariosAgendas.fecha_reunion,
      fathom_recording_id: resumenesDiariosAgendas.fathom_recording_id,
      idcliente: resumenesDiariosAgendas.idcliente,
    })
    .from(resumenesDiariosAgendas)
    .where(and(...conditions));

  const results: LeadSegmentoItem[] = [];
  for (const a of agendas) {
    const cat = (a.categoria ?? "").toLowerCase().trim();
    if (!cat || cat === "pdte" || cat === "pendiente") continue;

    const inferredCanal: SegmentoCanal = a.fathom_recording_id ? "videollamada" : "llamada";
    if (inferredCanal !== canal) continue;

    const isQualified = qualifiedSet.has(cat);
    const wantQualified = segmento === "calificado";
    if (isQualified !== wantQualified) continue;

    const hasAgenda = a.fecha_reunion != null;
    if (agendo === "si" && !hasAgenda) continue;
    if (agendo === "no" && hasAgenda) continue;

    results.push({
      nombre: a.nombre_de_lead ?? null,
      telefono: null,
      ghl_contact_id: a.ghl_contact_id ?? a.idcliente ?? null,
      canal,
      calificado: isQualified,
      agendo: hasAgenda,
    });
  }

  return results;
}

async function getChatLeads(
  idCuenta: number,
  fromDate: Date,
  toDate: Date,
  segmento: "calificado" | "no_calificado",
  qualifiedSet: Set<string>,
  emails: string[],
): Promise<LeadSegmentoItem[]> {
  const chatConditions: Parameters<typeof and>[0][] = [
    eq(chatsLogs.id_cuenta, idCuenta),
    gte(sql`COALESCE(${chatsLogs.primer_msg_at}, ${chatsLogs.primer_msg_lead_at}, ${chatsLogs.fecha_y_hora_z})`, fromDate),
    lte(sql`COALESCE(${chatsLogs.primer_msg_at}, ${chatsLogs.primer_msg_lead_at}, ${chatsLogs.fecha_y_hora_z})`, toDate),
    sql`${chatsLogs.excluida_dashboard} IS NOT TRUE`,
  ];
  if (emails.length > 0) {
    chatConditions.push(inArray(chatsLogs.asesor_asignado, emails));
  }

  const chatRows = await db
    .select({
      nombre_lead: chatsLogs.nombre_lead,
      id_lead: chatsLogs.id_lead,
      estado: chatsLogs.estado,
    })
    .from(chatsLogs)
    .where(and(...chatConditions));

  const results: LeadSegmentoItem[] = [];
  for (const row of chatRows) {
    const estado = (row.estado ?? "").toLowerCase().trim();
    if (!estado) continue;

    const isQualified = qualifiedSet.has(estado);
    const wantQualified = segmento === "calificado";
    if (isQualified !== wantQualified) continue;

    results.push({
      nombre: row.nombre_lead ?? null,
      telefono: null,
      ghl_contact_id: row.id_lead ?? null,
      canal: "chat",
      calificado: isQualified,
      agendo: false,
    });
  }

  return results;
}
