import { db } from "@/lib/db";
import { logLlamadas, registrosDeLlamada, resumenesDiariosAgendas, chatsLogs } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, or, isNull, isNotNull } from "drizzle-orm";
import type {
  AsesorKpis,
  AsesorLeadCRM,
  AsesorResponse,
  AsesorBreakdown,
  ApiAdvisor,
} from "@/types";

function getCrmCategoria(estado: string | null): AsesorLeadCRM["categoria"] {
  if (!estado) return "primera_llamada";
  const e = estado.toLowerCase().trim();
  if (e === "no_interesado") return "no_interesados";
  if (["interesado", "programado"].includes(e)) return "interesados";
  if (["pdte"].includes(e)) return "primera_llamada";
  return "seguimiento";
}

export async function getAsesorData(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  advisorEmail?: string,
): Promise<AsesorResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);

  const callConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromTs),
    lte(logLlamadas.ts, toTs),
  ];
  if (advisorEmail) {
    callConditions.push(eq(logLlamadas.closer_mail, advisorEmail));
  }

  const fechaFilter = or(
    and(
      isNotNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha_reunion, fromTs),
      lte(resumenesDiariosAgendas.fecha_reunion, toTs),
    ),
    and(
      isNull(resumenesDiariosAgendas.fecha_reunion),
      gte(resumenesDiariosAgendas.fecha, dateFrom),
      lte(resumenesDiariosAgendas.fecha, dateTo),
    ),
  )!;
  const agendaConditions = [
    eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
    fechaFilter,
  ];
  if (advisorEmail) agendaConditions.push(eq(resumenesDiariosAgendas.closer, advisorEmail));

  const [callRows, agendaRows] = await Promise.all([
    db
      .select()
      .from(logLlamadas)
      .where(and(...callConditions))
      .orderBy(sql`${logLlamadas.ts} DESC`),
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(and(...agendaConditions)),
  ]);

  const idCuentaStr = String(idCuenta);
  const regConditions = [eq(registrosDeLlamada.id_cuenta, idCuentaStr)];
  if (advisorEmail) {
    regConditions.push(eq(registrosDeLlamada.closer_mail, advisorEmail));
  }

  const regRows = await db
    .select()
    .from(registrosDeLlamada)
    .where(and(...regConditions))
    .orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);

  const contestadas = callRows.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;

  // Leads únicos multicanal: deduplicar por email across calls + agendas
  const leadsFromCalls = new Set(callRows.map((c) => c.mail_lead).filter(Boolean));
  const leadsFromAgendas = new Set(agendaRows.map((a) => a.email_lead).filter(Boolean));
  const allLeads = new Set([...leadsFromCalls, ...leadsFromAgendas]);

  // Desglose leads por canal
  const soloLlamadas = [...leadsFromCalls].filter((e) => !leadsFromAgendas.has(e)).length;
  const soloAgendas = [...leadsFromAgendas].filter((e) => !leadsFromCalls.has(e)).length;
  const enAmbos = [...leadsFromCalls].filter((e) => leadsFromAgendas.has(e)).length;

  // Desglose llamadas por tipo_evento
  const porTipo: Record<string, number> = {};
  for (const c of callRows) {
    const t = c.tipo_evento || "sin_tipo";
    porTipo[t] = (porTipo[t] ?? 0) + 1;
  }

  const reunionesAgendadas = agendaRows.length;
  const tasaAgendamiento = contestadas > 0 ? (reunionesAgendadas / contestadas) * 100 : 0;

  const kpis: AsesorKpis = {
    leadsAsignados: allLeads.size,
    llamadasRealizadas: callRows.length,
    llamadasContestadas: contestadas,
    reunionesAgendadas,
    tasaContacto: callRows.length > 0 ? (contestadas / callRows.length) * 100 : 0,
    tasaAgendamiento,
  };

  const breakdown: AsesorBreakdown = {
    leadsAsignados: {
      desdeLlamadas: leadsFromCalls.size,
      desdeAgendas: leadsFromAgendas.size,
      soloLlamadas,
      soloAgendas,
      enAmbos,
    },
    llamadasRealizadas: {
      total: callRows.length,
      porTipo,
    },
    llamadasContestadas: { total: contestadas },
    reunionesAgendadas: { total: reunionesAgendadas },
  };

  const leadMap: Record<string, AsesorLeadCRM> = {};
  for (const r of regRows) {
    const key = r.mail_lead ?? String(r.id_registro);
    if (leadMap[key]) continue;
    const stl = r.speed_to_lead ? `${parseFloat(r.speed_to_lead) || 0} min` : "—";

    const notasArr: { date: string; text: string }[] = [];
    if (r.iadescripcion?.trim()) {
      notasArr.push({
        date: r.fecha_evento?.toISOString() ?? "",
        text: r.iadescripcion,
      });
    }

    leadMap[key] = {
      id: String(r.id_registro),
      name: r.nombre_lead ?? key,
      email: r.mail_lead ?? null,
      phone: r.phone_raw_format ?? null,
      estado: r.estado,
      categoria: getCrmCategoria(r.estado),
      intentosContacto: r.intentos_contacto ?? 0,
      speedToLead: stl,
      notasLlamadas: notasArr,
      leadNote: null,
    };
  }

  const leads = Object.values(leadMap);

  const advisorSet = new Set<string>();
  for (const c of callRows) {
    if (c.closer_mail) advisorSet.add(c.closer_mail);
  }
  for (const a of agendaRows) {
    if (a.closer) advisorSet.add(a.closer);
  }
  const advisors: ApiAdvisor[] = [...advisorSet].map((email) => {
    const name = callRows.find((c) => c.closer_mail === email)?.nombre_closer ?? email;
    return { id: email, name, email };
  });

  return { kpis, leads, advisors, breakdown };
}

/** Lista de asesores (closers) del tenant para el filtro "Solo data del asesor" */
export async function getAsesoresList(idCuenta: number): Promise<ApiAdvisor[]> {
  const [callRows, agendaRows] = await Promise.all([
    db.select({ closer_mail: logLlamadas.closer_mail, nombre_closer: logLlamadas.nombre_closer })
      .from(logLlamadas)
      .where(eq(logLlamadas.id_cuenta, idCuenta)),
    db.select({ closer: resumenesDiariosAgendas.closer })
      .from(resumenesDiariosAgendas)
      .where(eq(resumenesDiariosAgendas.id_cuenta, idCuenta)),
  ]);
  const advisorMap = new Map<string, string>();
  for (const r of callRows) {
    if (r.closer_mail) advisorMap.set(r.closer_mail, r.nombre_closer ?? r.closer_mail);
  }
  for (const a of agendaRows) {
    if (a.closer && !advisorMap.has(a.closer)) advisorMap.set(a.closer, a.closer);
  }
  return [...advisorMap.entries()].map(([email, name]) => ({ id: email, name, email }));
}
