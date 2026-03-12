import { db } from "@/lib/db";
import { logLlamadas, registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, or, inArray } from "drizzle-orm";
import type {
  ApiLlamadaLog,
  LlamadasAdvisorMetrics,
  LlamadasResponse,
  ApiAdvisor,
  LlamadaLead,
} from "@/types";

function mapTipoEvento(tipo: string): ApiLlamadaLog["outcome"] {
  if (tipo.startsWith("efectiva_")) return "answered";
  if (tipo === "no_contesto") return "no_answer";
  if (tipo === "buzon") return "voicemail";
  if (tipo === "pdte") return "pending";
  return "no_answer";
}

export async function getLlamadas(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmail?: string,
): Promise<LlamadasResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);

  const conditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromTs),
    lte(logLlamadas.ts, toTs),
  ];
  if (closerEmail) conditions.push(eq(logLlamadas.closer_mail, closerEmail));

  const idCuentaStr = String(idCuenta);
  const rows = await db
    .select()
    .from(logLlamadas)
    .where(and(...conditions))
    .orderBy(sql`${logLlamadas.ts} DESC`);

  const baseReg = [
    eq(registrosDeLlamada.id_cuenta, idCuentaStr),
    gte(registrosDeLlamada.fecha_evento, fromTs),
    lte(registrosDeLlamada.fecha_evento, toTs),
  ];
  const regRows = closerEmail
    ? (() => {
        const linkedIds = [...new Set(rows.map((r) => r.id_registro).filter((id): id is number => id != null && id > 0))];
        const byCloser = eq(registrosDeLlamada.closer_mail, closerEmail);
        const byLinked = linkedIds.length > 0 ? inArray(registrosDeLlamada.id_registro, linkedIds) : sql`false`;
        return db
          .select()
          .from(registrosDeLlamada)
          .where(and(...baseReg, or(byCloser, byLinked))!)
          .orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);
      })()
    : db.select().from(registrosDeLlamada).where(and(...baseReg)).orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);

  const regRowsResolved = await regRows;

  const registros: ApiLlamadaLog[] = rows.map((r) => ({
    id: r.id,
    datetime: r.ts.toISOString(),
    leadName: r.nombre_lead,
    leadEmail: r.mail_lead,
    phone: r.phone,
    closerMail: r.closer_mail,
    closerName: r.nombre_closer,
    tipoEvento: r.tipo_evento,
    outcome: mapTipoEvento(r.tipo_evento),
    transcripcion: r.transcripcion,
    iaDescripcion: r.ia_descripcion,
    speedToLeadMinutes: r.speed_to_lead ? parseFloat(r.speed_to_lead) || null : null,
    creativoOrigen: r.creativo_origen,
  }));

  const leadKey = (r: ApiLlamadaLog) =>
    (r.leadEmail?.trim() && r.leadEmail) || (r.phone?.trim() && r.phone) || `id:${r.id}`;
  const uniqueLeads = new Set(registros.map(leadKey));
  const answered = registros.filter((r) => r.outcome === "answered").length;

  const speedVals = registros
    .filter((r) => r.speedToLeadMinutes != null)
    .map((r) => r.speedToLeadMinutes!);
  const speedAvg = speedVals.length > 0 ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length : 0;

  const attemptsByLead: Record<string, number> = {};
  for (const r of registros) {
    const key = r.leadEmail ?? r.phone ?? String(r.id);
    attemptsByLead[key] = (attemptsByLead[key] ?? 0) + 1;
  }
  const leadKeys = Object.keys(attemptsByLead);
  const attemptsAvg = leadKeys.length > 0
    ? Object.values(attemptsByLead).reduce((s, v) => s + v, 0) / leadKeys.length
    : 0;

  const agg = {
    totalLeads: uniqueLeads.size,
    totalCalls: registros.length,
    answered,
    speedAvg,
    attemptsAvg,
    firstContactAttempts: attemptsAvg,
    answerRate: registros.length > 0 ? answered / registros.length : 0,
  };

  const byAdvisor: Record<string, ApiLlamadaLog[]> = {};
  for (const r of registros) {
    const key = r.closerMail ?? r.closerName ?? "Sin asignar";
    if (!byAdvisor[key]) byAdvisor[key] = [];
    byAdvisor[key].push(r);
  }

  const advisorMetrics: Record<string, LlamadasAdvisorMetrics> = {};
  const advisors: ApiAdvisor[] = [];

  for (const [key, calls] of Object.entries(byAdvisor)) {
    const name = calls[0]?.closerName ?? key;
    const email = calls[0]?.closerMail ?? key;
    const contest = calls.filter((c) => c.outcome === "answered").length;
    const speeds = calls
      .filter((c) => c.speedToLeadMinutes != null)
      .map((c) => c.speedToLeadMinutes!);

    advisorMetrics[key] = {
      advisorName: name,
      advisorEmail: email,
      llamadas: calls.length,
      contestadas: contest,
      pctContestacion: calls.length > 0 ? (contest / calls.length) * 100 : 0,
      tiempoAlLead: speeds.length > 0 ? speeds.reduce((s, v) => s + v, 0) / speeds.length : null,
    };
    advisors.push({ id: key, name, email });
  }

  const leads: LlamadaLead[] = regRowsResolved.map((r) => ({
    id_registro: r.id_registro,
    nombre_lead: r.nombre_lead,
    mail_lead: r.mail_lead,
    estado: r.estado,
    phone: r.phone_raw_format,
    speed_to_lead_min: r.speed_to_lead ? parseFloat(r.speed_to_lead) || null : null,
    closer_mail: r.closer_mail,
    fecha_evento: r.fecha_evento?.toISOString() ?? null,
  }));

  return { registros, leads, agg, advisorMetrics, advisors };
}

export async function updateLlamada(
  id: number,
  idCuenta: number,
  data: { nombre_lead?: string; closer?: string; estado?: string },
): Promise<boolean> {
  const [row] = await db
    .select({ id: logLlamadas.id, id_cuenta: logLlamadas.id_cuenta, id_registro: logLlamadas.id_registro })
    .from(logLlamadas)
    .where(eq(logLlamadas.id, id))
    .limit(1);

  if (!row || row.id_cuenta !== idCuenta) return false;

  const setClause: Record<string, unknown> = {};
  if (data.nombre_lead !== undefined) setClause.nombre_lead = data.nombre_lead;
  if (data.closer !== undefined) {
    setClause.closer_mail = data.closer;
    setClause.nombre_closer = data.closer;
  }
  if (data.estado !== undefined) setClause.estado_resultado = data.estado;

  if (Object.keys(setClause).length > 0) {
    await db.update(logLlamadas).set(setClause).where(eq(logLlamadas.id, id));
  }

  if (row.id_registro && (data.nombre_lead || data.closer || data.estado)) {
    const regSet: Record<string, unknown> = {};
    if (data.nombre_lead) regSet.nombre_lead = data.nombre_lead;
    if (data.closer) {
      regSet.closer_mail = data.closer;
      regSet.nombre_closer = data.closer;
    }
    if (data.estado) regSet.estado = data.estado;
    await db.update(registrosDeLlamada).set(regSet).where(eq(registrosDeLlamada.id_registro, row.id_registro));
  }

  return true;
}
