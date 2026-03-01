import { db } from "@/lib/db";
import { logLlamadas } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  ApiLlamadaLog,
  LlamadasAdvisorMetrics,
  LlamadasResponse,
  ApiAdvisor,
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
): Promise<LlamadasResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);

  const rows = await db
    .select()
    .from(logLlamadas)
    .where(
      and(
        eq(logLlamadas.id_cuenta, idCuenta),
        gte(logLlamadas.ts, fromTs),
        lte(logLlamadas.ts, toTs),
      ),
    )
    .orderBy(sql`${logLlamadas.ts} DESC`);

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

  const uniqueLeads = new Set(registros.map((r) => r.leadEmail).filter(Boolean));
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

  return { registros, agg, advisorMetrics, advisors };
}
