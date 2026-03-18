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
  closerEmails?: string[],
): Promise<LlamadasResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);
  const emails = (closerEmails ?? []).map((e) => e.trim()).filter(Boolean);

  const conditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromTs),
    lte(logLlamadas.ts, toTs),
  ];
  if (emails.length > 0) {
    conditions.push(
      sql`LOWER(TRIM(COALESCE(${logLlamadas.closer_mail}, ''))) IN (${sql.join(emails.map((e) => sql`LOWER(TRIM(${e}))`), sql`, `)})`,
    );
  }

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
  const regRows =
    emails.length > 0
      ? (() => {
          const linkedIds = [...new Set(rows.map((r) => r.id_registro).filter((id): id is number => id != null && id > 0))];
          const byCloser = sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.closer_mail}, ''))) IN (${sql.join(emails.map((e) => sql`LOWER(TRIM(${e}))`), sql`, `)})`;
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
    id_registro: r.id_registro != null && r.id_registro > 0 ? r.id_registro : null,
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
  const regLeadKey = (r: { mail_lead: string | null; phone_raw_format: string | null; id_registro: number }) =>
    (r.mail_lead?.trim() && r.mail_lead) || (r.phone_raw_format?.trim() && r.phone_raw_format) || `reg:${r.id_registro}`;
  const uniqueLeadsFromLog = new Set(registros.map(leadKey));
  const uniqueLeadsFromReg = new Set(regRowsResolved.map(regLeadKey));
  const uniqueLeads = new Set([...uniqueLeadsFromLog, ...uniqueLeadsFromReg]);
  const answered = registros.filter((r) => r.outcome === "answered").length;

  const speedVals = registros
    .filter((r) => r.speedToLeadMinutes != null)
    .map((r) => r.speedToLeadMinutes!);
  const speedFromReg = regRowsResolved
    .filter((r) => r.estado?.toUpperCase() !== "PDTE" && r.speed_to_lead != null && String(r.speed_to_lead).trim() !== "")
    .map((r) => parseFloat(String(r.speed_to_lead)) || 0)
    .filter((n) => !Number.isNaN(n) && n >= 0);
  const speedAvg =
    speedVals.length > 0
      ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length
      : speedFromReg.length > 0
        ? speedFromReg.reduce((s, v) => s + v, 0) / speedFromReg.length
        : 0;

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

  const leadsCountByAdvisorKey: Record<string, number> = {};
  for (const r of regRowsResolved) {
    const k = (r.closer_mail ?? r.nombre_closer ?? "Sin asignar").trim() || "Sin asignar";
    const kNorm = k.toLowerCase();
    leadsCountByAdvisorKey[kNorm] = (leadsCountByAdvisorKey[kNorm] ?? 0) + 1;
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
    const keyNorm = (key ?? "").trim().toLowerCase();
    const leadsAsignados = leadsCountByAdvisorKey[keyNorm] ?? 0;

    advisorMetrics[key] = {
      advisorName: name,
      advisorEmail: email,
      llamadas: calls.length,
      contestadas: contest,
      pctContestacion: calls.length > 0 ? (contest / calls.length) * 100 : 0,
      tiempoAlLead: speeds.length > 0 ? speeds.reduce((s, v) => s + v, 0) / speeds.length : null,
      leadsAsignados,
    };
    advisors.push({ id: key, name, email });
  }

  for (const keyNorm of Object.keys(leadsCountByAdvisorKey)) {
    if (Object.keys(advisorMetrics).some((k) => (k ?? "").trim().toLowerCase() === keyNorm)) continue;
    const firstReg = regRowsResolved.find(
      (r) => ((r.closer_mail ?? r.nombre_closer ?? "Sin asignar").trim() || "Sin asignar").toLowerCase() === keyNorm,
    );
    const displayKey = firstReg
      ? (firstReg.closer_mail ?? firstReg.nombre_closer ?? "Sin asignar").trim() || "Sin asignar"
      : keyNorm;
    advisorMetrics[displayKey] = {
      advisorName: firstReg?.nombre_closer ?? displayKey,
      advisorEmail: firstReg?.closer_mail ?? displayKey,
      llamadas: 0,
      contestadas: 0,
      pctContestacion: 0,
      tiempoAlLead: null,
      leadsAsignados: leadsCountByAdvisorKey[keyNorm] ?? 0,
    };
    advisors.push({
      id: displayKey,
      name: firstReg?.nombre_closer ?? displayKey,
      email: firstReg?.closer_mail ?? displayKey,
    });
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
    id_user_ghl: r.id_user_ghl ?? null,
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

export type RegistroLlamadaUpdate = {
  nombre_lead?: string;
  mail_lead?: string;
  phone_raw_format?: string;
  estado?: string;
  closer_mail?: string;
  nombre_closer?: string;
  id_user_ghl?: string;
};

export async function updateRegistroLlamada(
  id_registro: number,
  idCuenta: number,
  data: RegistroLlamadaUpdate,
): Promise<boolean> {
  const [row] = await db
    .select({ id_registro: registrosDeLlamada.id_registro, id_cuenta: registrosDeLlamada.id_cuenta })
    .from(registrosDeLlamada)
    .where(eq(registrosDeLlamada.id_registro, id_registro))
    .limit(1);

  if (!row) return false;
  const cuentaNum = parseInt(String(row.id_cuenta), 10);
  if (Number.isNaN(cuentaNum) || cuentaNum !== idCuenta) return false;

  const setClause: Record<string, unknown> = {};
  if (data.nombre_lead !== undefined) setClause.nombre_lead = data.nombre_lead;
  if (data.mail_lead !== undefined) setClause.mail_lead = data.mail_lead;
  if (data.phone_raw_format !== undefined) setClause.phone_raw_format = data.phone_raw_format;
  if (data.estado !== undefined) setClause.estado = data.estado;
  if (data.closer_mail !== undefined) {
    setClause.closer_mail = data.closer_mail;
    setClause.nombre_closer = data.nombre_closer ?? data.closer_mail;
  }
  if (data.nombre_closer !== undefined) setClause.nombre_closer = data.nombre_closer;
  if (data.id_user_ghl !== undefined) setClause.id_user_ghl = data.id_user_ghl;

  if (Object.keys(setClause).length > 0) {
    await db.update(registrosDeLlamada).set(setClause).where(eq(registrosDeLlamada.id_registro, id_registro));
  }

  if (data.closer_mail !== undefined || data.nombre_lead !== undefined || data.estado !== undefined) {
    const logSet: Record<string, unknown> = {};
    if (data.nombre_lead !== undefined) logSet.nombre_lead = data.nombre_lead;
    if (data.closer_mail !== undefined) {
      logSet.closer_mail = data.closer_mail;
      logSet.nombre_closer = data.nombre_closer ?? data.closer_mail;
    }
    if (data.estado !== undefined) logSet.estado_resultado = data.estado;
    if (Object.keys(logSet).length > 0) {
      await db.update(logLlamadas).set(logSet).where(eq(logLlamadas.id_registro, id_registro));
    }
  }

  return true;
}

export async function deleteRegistroLlamada(id_registro: number, idCuenta: number): Promise<boolean> {
  const [row] = await db
    .select({ id_registro: registrosDeLlamada.id_registro, id_cuenta: registrosDeLlamada.id_cuenta })
    .from(registrosDeLlamada)
    .where(eq(registrosDeLlamada.id_registro, id_registro))
    .limit(1);

  if (!row) return false;
  const cuentaNum = parseInt(String(row.id_cuenta), 10);
  if (Number.isNaN(cuentaNum) || cuentaNum !== idCuenta) return false;

  await db.delete(registrosDeLlamada).where(eq(registrosDeLlamada.id_registro, id_registro));
  return true;
}
