import { db } from "@/lib/db";
import { resumenesDiariosAgendas, logLlamadas } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  DashboardKpis,
  DashboardAdvisorRow,
  DashboardVolumeDay,
  DashboardObjecion,
  DashboardResponse,
  ApiAdvisor,
} from "@/types";

export async function getDashboard(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
): Promise<DashboardResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [agendas, calls] = await Promise.all([
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
  ]);

  const attended = ["Cerrada", "Ofertada", "No_Ofertada"];
  const asistidas = agendas.filter((a) => attended.includes(a.categoria ?? "")).length;
  const canceladas = agendas.filter((a) => a.categoria === "CANCELADA").length;
  const cerradas = agendas.filter((a) => a.categoria === "Cerrada").length;
  const efectivas = agendas.filter((a) => a.categoria === "Cerrada" || a.categoria === "Ofertada").length;
  const revenue = agendas
    .filter((a) => a.categoria === "Cerrada")
    .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
  const cash = agendas.reduce((s, a) => s + (parseFloat(a.cash_collected || "0") || 0), 0);

  const efectivasCalls = calls.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;
  const contestadas = efectivasCalls;

  const leadsFromCalls = new Set(calls.map((c) => c.mail_lead).filter(Boolean));
  const leadsFromAgendas = new Set(agendas.map((a) => a.email_lead).filter(Boolean));
  const totalLeads = new Set([...leadsFromCalls, ...leadsFromAgendas]).size;

  const speedVals = calls
    .filter((c) => c.speed_to_lead)
    .map((c) => parseFloat(c.speed_to_lead!) || 0)
    .filter((v) => v > 0);
  const speedAvg = speedVals.length > 0 ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length : 0;

  const attemptsByLead: Record<string, number> = {};
  for (const c of calls) {
    const key = c.mail_lead ?? c.phone ?? String(c.id);
    attemptsByLead[key] = (attemptsByLead[key] ?? 0) + 1;
  }
  const leadKeysArr = Object.keys(attemptsByLead);
  const attemptsAvg = leadKeysArr.length > 0
    ? Object.values(attemptsByLead).reduce((s, v) => s + v, 0) / leadKeysArr.length
    : 0;

  const tasaCierre = asistidas > 0 ? (cerradas / asistidas) * 100 : 0;
  const tasaAgendamiento = contestadas > 0 ? (agendas.length / contestadas) * 100 : 0;

  const kpis: DashboardKpis = {
    totalLeads,
    callsMade: calls.length,
    contestadas,
    answerRate: calls.length > 0 ? contestadas / calls.length : 0,
    meetingsBooked: agendas.length,
    meetingsAttended: asistidas,
    meetingsCanceled: canceladas,
    meetingsClosed: cerradas,
    effectiveAppointments: efectivas,
    tasaCierre,
    tasaAgendamiento,
    revenue,
    cashCollected: cash,
    avgTicket: efectivas > 0 ? revenue / efectivas : 0,
    speedToLeadAvg: speedAvg,
    avgAttempts: attemptsAvg,
    attemptsToFirstContactAvg: attemptsAvg,
  };

  // Advisor ranking
  const advisorMap: Record<string, { calls: typeof calls; agendas: typeof agendas }> = {};
  for (const c of calls) {
    const key = c.closer_mail ?? c.nombre_closer ?? "Sin asignar";
    if (!advisorMap[key]) advisorMap[key] = { calls: [], agendas: [] };
    advisorMap[key].calls.push(c);
  }
  for (const a of agendas) {
    const key = a.closer ?? "Sin asignar";
    if (!advisorMap[key]) advisorMap[key] = { calls: [], agendas: [] };
    advisorMap[key].agendas.push(a);
  }

  const advisorRanking: DashboardAdvisorRow[] = Object.entries(advisorMap).map(
    ([key, { calls: ac, agendas: aa }]) => {
      const aContestadas = ac.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;
      const aLeads = new Set([
        ...ac.map((c) => c.mail_lead).filter(Boolean),
        ...aa.map((a) => a.email_lead).filter(Boolean),
      ]).size;
      const aAsistidas = aa.filter((a) => attended.includes(a.categoria ?? "")).length;
      const aRevenue = aa
        .filter((a) => a.categoria === "Cerrada")
        .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
      const aCash = aa.reduce((s, a) => s + (parseFloat(a.cash_collected || "0") || 0), 0);
      const aSpeeds = ac
        .filter((c) => c.speed_to_lead)
        .map((c) => parseFloat(c.speed_to_lead!) || 0)
        .filter((v) => v > 0);

      return {
        advisorName: ac[0]?.nombre_closer ?? aa[0]?.closer ?? key,
        advisorEmail: ac[0]?.closer_mail ?? null,
        totalLeads: aLeads,
        callsMade: ac.length,
        speedToLeadAvg: aSpeeds.length > 0 ? aSpeeds.reduce((s, v) => s + v, 0) / aSpeeds.length : null,
        meetingsBooked: aa.length,
        meetingsAttended: aAsistidas,
        revenue: aRevenue,
        cashCollected: aCash,
        contactRate: ac.length > 0 ? aContestadas / ac.length : 0,
        bookingRate: aContestadas > 0 ? aa.length / aContestadas : 0,
      };
    },
  );

  // Volume by day
  const volumeMap: Record<string, DashboardVolumeDay> = {};
  for (const c of calls) {
    const d = c.ts.toISOString().slice(0, 10);
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].llamadas++;
  }
  for (const a of agendas) {
    const d = a.fecha_reunion?.toISOString().slice(0, 10) ?? a.fecha;
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].citasPresentaciones++;
    if (a.categoria === "Cerrada") volumeMap[d].cierres++;
  }
  const volumeByDay = Object.values(volumeMap).sort((a, b) => a.date.localeCompare(b.date));

  // Objeciones
  const objMap: Record<string, { count: number; quotes: Set<string> }> = {};
  for (const a of agendas) {
    if (!Array.isArray(a.objeciones_ia)) continue;
    for (const obj of a.objeciones_ia) {
      const key = (obj.categoria ?? obj.objecion ?? "").toLowerCase().trim();
      if (!key) continue;
      if (!objMap[key]) objMap[key] = { count: 0, quotes: new Set() };
      objMap[key].count++;
      if (obj.objecion) objMap[key].quotes.add(obj.objecion);
    }
  }
  const totalObj = Object.values(objMap).reduce((s, o) => s + o.count, 0);
  const objeciones: DashboardObjecion[] = Object.entries(objMap)
    .map(([name, { count, quotes }]) => ({
      name,
      count,
      percent: totalObj > 0 ? Math.round((count / totalObj) * 100) : 0,
      tipos: quotes.size,
    }))
    .sort((a, b) => b.count - a.count);

  const advisors: ApiAdvisor[] = advisorRanking.map((a) => ({
    id: a.advisorEmail ?? a.advisorName,
    name: a.advisorName,
    email: a.advisorEmail ?? undefined,
  }));

  return { kpis, advisorRanking, volumeByDay, objeciones, advisors };
}
