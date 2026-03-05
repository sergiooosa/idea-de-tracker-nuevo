import { db } from "@/lib/db";
import { resumenesDiariosAgendas, logLlamadas, cuentas, kpisExternos } from "@/lib/db/schema";
import type { EmbudoEtapa, MetricaConfig } from "@/lib/db/schema";
import { calcMetricaManual, calcMetricaAutomatica, DEFAULT_METRICAS_CONFIG, DEFAULT_EMBUDO_CONFIG } from "@/lib/metricas-engine";
import { eq, and, or, gte, lte, isNull, isNotNull } from "drizzle-orm";
import type {
  DashboardKpis,
  DashboardAdvisorRow,
  DashboardVolumeDay,
  DashboardObjecion,
  DashboardResponse,
  ApiAdvisor,
} from "@/types";

const DEFAULT_ATTENDED = ["Cerrada", "Ofertada", "No_Ofertada"];
const DEFAULT_CLOSED = "Cerrada";
const DEFAULT_EFFECTIVE = ["Cerrada", "Ofertada"];

function buildFunnelSets(embudo: EmbudoEtapa[] | null | undefined) {
  if (!embudo || embudo.length === 0) {
    return {
      attendedSet: new Set(DEFAULT_ATTENDED),
      closedSet: new Set([DEFAULT_CLOSED]),
      effectiveSet: new Set(DEFAULT_EFFECTIVE),
      etapas: null,
    };
  }
  const nombres = embudo.map((e) => e.nombre);
  return {
    attendedSet: new Set(nombres),
    closedSet: new Set(nombres.filter((n) => n.toLowerCase().includes("cerrad"))),
    effectiveSet: new Set(nombres.filter((n) =>
      n.toLowerCase().includes("cerrad") || n.toLowerCase().includes("ofertad"),
    )),
    etapas: embudo,
  };
}

export async function getDashboard(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmail?: string,
  filterTags?: string[],
): Promise<DashboardResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [cuentaRow] = await db
    .select({
      configuracion_ui: cuentas.configuracion_ui,
      embudo_personalizado: cuentas.embudo_personalizado,
      metricas_personalizadas: cuentas.metricas_personalizadas,
      metricas_config: cuentas.metricas_config,
      metricas_manual_data: cuentas.metricas_manual_data,
    })
    .from(cuentas)
    .where(eq(cuentas.id_cuenta, idCuenta))
    .limit(1);

  const fuenteFinanciera = cuentaRow?.configuracion_ui?.fuente_datos_financieros;
  const useExterna = fuenteFinanciera === "api_externa";
  const embudoRawArr = Array.isArray(cuentaRow?.embudo_personalizado) ? cuentaRow.embudo_personalizado : [];
  const embudoRaw = embudoRawArr.length > 0 ? embudoRawArr : DEFAULT_EMBUDO_CONFIG;
  const { attendedSet, closedSet, effectiveSet, etapas } = buildFunnelSets(embudoRaw);

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
  const agendaConditions = [
    eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
    fechaFilter,
  ];
  if (closerEmail) agendaConditions.push(eq(resumenesDiariosAgendas.closer, closerEmail));

  const callConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromDate),
    lte(logLlamadas.ts, toDate),
  ];
  if (closerEmail) callConditions.push(eq(logLlamadas.closer_mail, closerEmail));

  const [agendas, calls] = await Promise.all([
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(and(...agendaConditions)),
    db
      .select()
      .from(logLlamadas)
      .where(and(...callConditions)),
  ]);

  let filteredAgendas = agendas;
  let filteredCalls = calls;
  if (filterTags && filterTags.length > 0) {
    const tagSet = new Set(filterTags);
    filteredAgendas = agendas.filter((a) => Array.isArray(a.tags_internos) && a.tags_internos.some((t) => tagSet.has(t)));
    filteredCalls = calls.filter((c) => Array.isArray(c.tags_internos) && c.tags_internos.some((t) => tagSet.has(t)));
  }

  const asistidas = filteredAgendas.filter((a) => attendedSet.has(a.categoria ?? "")).length;
  const canceladas = filteredAgendas.filter((a) => a.categoria === "CANCELADA").length;
  const cerradas = filteredAgendas.filter((a) => closedSet.has(a.categoria ?? "")).length;
  const efectivas = filteredAgendas.filter((a) => effectiveSet.has(a.categoria ?? "")).length;
  const revenueNativo = filteredAgendas
    .filter((a) => closedSet.has(a.categoria ?? ""))
    .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
  const cashNativo = filteredAgendas.reduce((s, a) => s + (parseFloat(a.cash_collected || "0") || 0), 0);

  let revenue = revenueNativo;
  let cash = cashNativo;

  if (useExterna) {
    const kpisExt = await db
      .select({ metricas: kpisExternos.metricas })
      .from(kpisExternos)
      .where(
        and(
          eq(kpisExternos.id_cuenta, idCuenta),
          gte(kpisExternos.fecha, dateFrom),
          lte(kpisExternos.fecha, dateTo),
        ),
      );

    let extRevenue = 0;
    let extCash = 0;
    let extIngresos = 0;
    for (const row of kpisExt) {
      const m = row.metricas ?? {};
      extRevenue += m.facturacion ?? 0;
      extCash += m.cash_collected ?? 0;
      extIngresos += m.ingresos ?? 0;
    }

    revenue = extRevenue || extIngresos;
    cash = extCash;
  }

  const efectivasCalls = filteredCalls.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;
  const contestadas = efectivasCalls;

  const leadsFromCalls = new Set(filteredCalls.map((c) => c.mail_lead).filter(Boolean));
  const leadsFromAgendas = new Set(filteredAgendas.map((a) => a.email_lead).filter(Boolean));
  const totalLeads = new Set([...leadsFromCalls, ...leadsFromAgendas]).size;

  const speedVals = filteredCalls
    .filter((c) => c.speed_to_lead)
    .map((c) => parseFloat(c.speed_to_lead!) || 0)
    .filter((v) => v > 0);
  const speedAvg = speedVals.length > 0 ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length : 0;

  const attemptsByLead: Record<string, number> = {};
  for (const c of filteredCalls) {
    const key = c.mail_lead ?? c.phone ?? String(c.id);
    attemptsByLead[key] = (attemptsByLead[key] ?? 0) + 1;
  }
  const leadKeysArr = Object.keys(attemptsByLead);
  const attemptsAvg = leadKeysArr.length > 0
    ? Object.values(attemptsByLead).reduce((s, v) => s + v, 0) / leadKeysArr.length
    : 0;

  const tasaCierre = asistidas > 0 ? (cerradas / asistidas) * 100 : 0;
  const tasaAgendamiento = contestadas > 0 ? (filteredAgendas.length / contestadas) * 100 : 0;

  const kpis: DashboardKpis & Record<string, number> = {
    totalLeads,
    callsMade: filteredCalls.length,
    contestadas,
    answerRate: filteredCalls.length > 0 ? contestadas / filteredCalls.length : 0,
    meetingsBooked: filteredAgendas.length,
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
    agendadas: filteredAgendas.length,
    asistidas,
    canceladas,
    efectivas,
    noShows: filteredAgendas.filter((a) => (a.categoria ?? "").toLowerCase() === "no_show").length,
    ticket: asistidas > 0 ? revenue / asistidas : 0,
  };

  // Advisor ranking
  const advisorMap: Record<string, { calls: typeof filteredCalls; agendas: typeof filteredAgendas }> = {};
  for (const c of filteredCalls) {
    const key = c.closer_mail ?? c.nombre_closer ?? "Sin asignar";
    if (!advisorMap[key]) advisorMap[key] = { calls: [], agendas: [] };
    advisorMap[key].calls.push(c);
  }
  for (const a of filteredAgendas) {
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
      const aAsistidas = aa.filter((a) => attendedSet.has(a.categoria ?? "")).length;
      const aRevenue = useExterna
        ? 0
        : aa.filter((a) => closedSet.has(a.categoria ?? ""))
            .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
      const aCash = useExterna
        ? 0
        : aa.reduce((s, a) => s + (parseFloat(a.cash_collected || "0") || 0), 0);
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
  for (const c of filteredCalls) {
    const d = c.ts.toISOString().slice(0, 10);
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].llamadas++;
  }
  for (const a of filteredAgendas) {
    const d = a.fecha_reunion?.toISOString().slice(0, 10) ?? a.fecha;
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].citasPresentaciones++;
    if (closedSet.has(a.categoria ?? "")) volumeMap[d].cierres++;
  }
  const volumeByDay = Object.values(volumeMap).sort((a, b) => a.date.localeCompare(b.date));

  // Objeciones
  const objMap: Record<string, { count: number; quotes: Set<string> }> = {};
  for (const a of filteredAgendas) {
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

  const distribucionEmbudo: Record<string, number> = {};
  for (const a of filteredAgendas) {
    const cat = a.categoria ?? "sin_categoria";
    distribucionEmbudo[cat] = (distribucionEmbudo[cat] ?? 0) + 1;
  }

  const allTags = new Set<string>();
  for (const a of agendas) {
    if (Array.isArray(a.tags_internos)) a.tags_internos.forEach((t) => allTags.add(t));
  }
  for (const c of calls) {
    if (Array.isArray(c.tags_internos)) c.tags_internos.forEach((t) => allTags.add(t));
  }

  const tagCounts: Record<string, number> = {};
  for (const a of filteredAgendas) {
    if (Array.isArray(a.tags_internos)) a.tags_internos.forEach((t) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; });
  }
  for (const c of filteredCalls) {
    if (Array.isArray(c.tags_internos)) c.tags_internos.forEach((t) => { tagCounts[t] = (tagCounts[t] ?? 0) + 1; });
  }

  const rawConfigs: MetricaConfig[] = Array.isArray(cuentaRow?.metricas_config) ? cuentaRow.metricas_config : [];
  const configs = rawConfigs.length > 0 ? rawConfigs : DEFAULT_METRICAS_CONFIG;
  const manualData = (cuentaRow?.metricas_manual_data && typeof cuentaRow.metricas_manual_data === "object")
    ? (cuentaRow.metricas_manual_data as Record<string, { [k: string]: string | number | boolean | null }[]>)
    : {};
  const metricasComputadas: { id: string; nombre: string; valor: string | number; descripcion?: string; ubicacion?: string; formato?: string; color?: string }[] = [];
  const metricasValores: Record<string, string | number> = {};
  const kpiKeys = new Set(["totalLeads", "callsMade", "contestadas", "answerRate", "meetingsBooked", "meetingsAttended", "meetingsCanceled", "meetingsClosed", "effectiveAppointments", "tasaCierre", "tasaAgendamiento", "revenue", "cashCollected", "avgTicket", "speedToLeadAvg", "avgAttempts", "agendadas", "asistidas", "canceladas", "efectivas", "noShows", "ticket"]);

  const getDeps = (m: MetricaConfig): string[] => {
    if (m.tipo === "fija") return [];
    if (m.tipo !== "automatica" || !m.formula) return [];
    const f = m.formula;
    if (f.fuente && !kpiKeys.has(f.fuente)) return [f.fuente];
    if (f.fuentes) return f.fuentes.filter((k) => !kpiKeys.has(k));
    return [];
  };

  const sorted = [...configs].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const computed = new Set<string>();
  let pass = 0;
  const maxPasses = sorted.length + 1;

  while (computed.size < sorted.length && pass < maxPasses) {
    pass++;
    for (const m of sorted) {
      if (computed.has(m.id)) continue;
      const deps = getDeps(m);
      if (deps.some((d) => !computed.has(d))) continue;
      let valor: string | number;
      if (m.tipo === "fija") {
        valor = m.valorFijo ?? 0;
      } else if (m.tipo === "manual") {
        const entries = manualData[m.id] ?? [];
        valor = calcMetricaManual(m, entries, dateFrom, dateTo);
      } else {
        valor = calcMetricaAutomatica(m, kpis, metricasValores, dateFrom, dateTo);
      }
      metricasValores[m.id] = typeof valor === "number" ? valor : parseFloat(String(valor)) || 0;
      metricasComputadas.push({ id: m.id, nombre: m.nombre, valor, descripcion: m.descripcion, ubicacion: m.ubicacion, formato: m.formato, color: m.color });
      computed.add(m.id);
    }
  }

  for (const m of sorted) {
    if (computed.has(m.id)) continue;
    metricasComputadas.push({ id: m.id, nombre: m.nombre, valor: "—", descripcion: m.descripcion, ubicacion: m.ubicacion, formato: m.formato, color: m.color });
  }

  return {
    kpis,
    advisorRanking,
    volumeByDay,
    objeciones,
    advisors,
    fuenteDatosFinancieros: fuenteFinanciera ?? "nativa",
    embudoPersonalizado: etapas?.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      color: e.color,
      orden: e.orden,
      condition: e.condition,
    })),
    distribucionEmbudo,
    tagsDisponibles: [...allTags].sort(),
    tagCounts,
    metricasPersonalizadas: Array.isArray(cuentaRow?.metricas_personalizadas) ? cuentaRow.metricas_personalizadas : [],
    metricasComputadas,
  };
}
