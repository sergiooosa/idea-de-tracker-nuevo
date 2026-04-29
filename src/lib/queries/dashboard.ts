import { db } from "@/lib/db";
import { resumenesDiariosAgendas, logLlamadas, cuentas, kpisExternos, chatsLogs, metasCuenta, metricasWebhook } from "@/lib/db/schema";
import type { EmbudoEtapa, MetricaConfig, ChatMessage } from "@/lib/db/schema";
import { calcMetricaManual, calcMetricaAutomatica, DEFAULT_METRICAS_CONFIG, DEFAULT_EMBUDO_CONFIG, parseMetricasConfig } from "@/lib/metricas-engine";
import { eq, and, or, gte, lte, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import type {
  DashboardKpis,
  DashboardAdvisorRow,
  DashboardVolumeDay,
  DashboardObjecion,
  DashboardResponse,
  DashboardAdsSummary,
  ApiAdvisor,
  ChatKpis,
  AlertaMeta,
} from "@/types";

const DEFAULT_ATTENDED = ["Cerrada", "Ofertada", "No_Ofertada", "cerrada", "ofertada", "no_ofertada"];
const DEFAULT_CLOSED = ["Cerrada", "cerrada"];
const DEFAULT_EFFECTIVE = ["Cerrada", "Ofertada", "cerrada", "ofertada"];

/**
 * Normaliza un valor de fecha a string "YYYY-MM-DD".
 * Algunos drivers (p. ej. PostgreSQL) devuelven columnas date/timestamp como Date;
 * otros como string. Usar esto evita TypeError en volumeByDay.sort (localeCompare es de string).
 */
function toDateString(value: Date | string | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function buildFunnelSets(embudo: EmbudoEtapa[] | null | undefined) {
  if (!embudo || embudo.length === 0) {
    return {
      attendedSet: new Set(DEFAULT_ATTENDED),
      closedSet: new Set(DEFAULT_CLOSED),
      effectiveSet: new Set(DEFAULT_EFFECTIVE),
      etapas: null,
    };
  }
  // Soporta campo "nombre" (estándar) y "name" (legacy) y también el "id"
  const getLabel = (e: EmbudoEtapa) =>
    (e?.nombre ?? (e as any)?.name ?? e?.id ?? "").trim();
  const ids = embudo.map((e) => (e?.id ?? "").trim()).filter(Boolean);
  const nombres = embudo.map(getLabel).filter(Boolean);
  // Reconocer tanto por label como por id (el Cerebro puede guardar el id como categoría)
  // Usar lowercase para comparaciones case-insensitive
  const allKeys = [...new Set([...nombres, ...ids])];
  const allKeysLower = allKeys.map(k => k.toLowerCase());
  const closedFromEmbudo = new Set(allKeysLower.filter((k) =>
    k.includes("cerrad") || k.includes("closed"),
  ));
  const effectiveFromEmbudo = new Set(allKeysLower.filter((k) => {
    return k.includes("cerrad") || k.includes("closed") ||
           k.includes("ofertad") || k.includes("offered");
  }));
  // Si el embudo personalizado no tiene etapas que matcheen "cerrada/closed",
  // las agendas del sistema usan su propio vocabulario (Cerrada, Ofertada, etc.)
  // → usar defaults para no romper el cálculo de revenue/cierres
  const closedSet = closedFromEmbudo.size > 0 ? closedFromEmbudo : new Set(DEFAULT_CLOSED);
  const effectiveSet = effectiveFromEmbudo.size > 0 ? effectiveFromEmbudo : new Set(DEFAULT_EFFECTIVE);
  return {
    attendedSet: new Set([...allKeysLower.filter((k) => {
      return !k.includes("cancel") && !k.includes("pdte") && k !== "";
    }), ...DEFAULT_ATTENDED.map(k => k.toLowerCase())]),
    closedSet,
    effectiveSet,
    etapas: embudo,
  };
}

export async function getDashboard(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmails?: string[],
  filterTags?: string[],
): Promise<DashboardResponse> {
  const emails = (closerEmails ?? []).map((e) => e.trim()).filter(Boolean);
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [cuentaRow] = await db
    .select({
      configuracion_ui: cuentas.configuracion_ui,
      embudo_personalizado: cuentas.embudo_personalizado,
      metricas_personalizadas: cuentas.metricas_personalizadas,
      metricas_config: cuentas.metricas_config,
      metricas_manual_data: cuentas.metricas_manual_data,
      dashboards_personalizados: cuentas.dashboards_personalizados,
      fuente_llamadas: cuentas.fuente_llamadas,
      // chat_triggers ya no se usa para clasificar — la IA escribe chats_logs.estado directamente
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
  if (emails.length > 0) agendaConditions.push(inArray(resumenesDiariosAgendas.closer, emails));

  // Excluir "pdte" y "contacto_creado" — son eventos de lead nuevo, NO llamadas realizadas
  const TIPOS_NO_LLAMADA = ["pdte", "contacto_creado"];
  const callConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromDate),
    lte(logLlamadas.ts, toDate),
    sql`${logLlamadas.tipo_evento} NOT IN (${sql.join(TIPOS_NO_LLAMADA.map((t) => sql`${t}`), sql`, `)})`,
  ];
  if (emails.length > 0) callConditions.push(inArray(logLlamadas.closer_mail, emails));

  // Query separada para eventos de leads nuevos (pdte/contacto_creado)
  const newLeadConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromDate),
    lte(logLlamadas.ts, toDate),
    sql`${logLlamadas.tipo_evento} IN (${sql.join(TIPOS_NO_LLAMADA.map((t) => sql`${t}`), sql`, `)})`,
  ];
  if (emails.length > 0) newLeadConditions.push(inArray(logLlamadas.closer_mail, emails));

  const [agendas, calls, newLeadEvents] = await Promise.all([
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(and(...agendaConditions)),
    db
      .select()
      .from(logLlamadas)
      .where(and(...callConditions)),
    db
      .select({
        id: logLlamadas.id,
        mail_lead: logLlamadas.mail_lead,
        nombre_lead: logLlamadas.nombre_lead,
        phone: logLlamadas.phone,
        closer_mail: logLlamadas.closer_mail,
        nombre_closer: logLlamadas.nombre_closer,
        ts: logLlamadas.ts,
      })
      .from(logLlamadas)
      .where(and(...newLeadConditions)),
  ]);

  let filteredAgendas = agendas;
  let filteredCalls = calls;
  let filteredNewLeadEvents = newLeadEvents;
  if (filterTags && filterTags.length > 0) {
    const tagSet = new Set(filterTags);
    filteredAgendas = agendas.filter((a) => Array.isArray(a.tags_internos) && a.tags_internos.some((t) => tagSet.has(t)));
    filteredCalls = calls.filter((c) => Array.isArray(c.tags_internos) && c.tags_internos.some((t) => tagSet.has(t)));
    // newLeadEvents no tiene tags_internos en la query selectiva — no filtrar por tags
  }

  // Un registro con cash_collected > 0 se considera cierre aunque la categoría no diga "Cerrada".
  // Esto cubre casos como Serentis donde los agentes cobran pero no marcan la etapa correcta.
  const hasCash = (a: (typeof filteredAgendas)[0]) =>
    (parseFloat(a.cash_collected || "0") || 0) > 0;
  const asistidas = filteredAgendas.filter((a) =>
    attendedSet.has((a.categoria ?? "").toLowerCase().trim()) || hasCash(a)
  ).length;
  // Deduplicar canceladas por lead único (GHL puede enviar el mismo evento múltiples veces)
  const canceladas = new Set(
    filteredAgendas
      .filter((a) => (a.categoria ?? "").toLowerCase().includes("cancel"))
      .map((a) => a.idcliente?.trim() || a.ghl_contact_id?.trim() || a.email_lead?.trim().toLowerCase() || `nokey_${a.id_registro_agenda}`)
  ).size;
  const cerradas = filteredAgendas.filter((a) =>
    closedSet.has((a.categoria ?? "").toLowerCase().trim()) || hasCash(a)
  ).length;
  const efectivas = filteredAgendas.filter((a) => effectiveSet.has((a.categoria ?? "").toLowerCase().trim())).length;
  // revenue: sumar facturacion de agendas "cerradas". Si closedSet no captura nada
  // (embudo personalizado con nombres distintos), usar cualquier agenda con facturacion > 0.
  const revenueClosedSet = filteredAgendas
    .filter((a) => closedSet.has((a.categoria ?? "").toLowerCase().trim()))
    .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
  const revenueAnyFact = filteredAgendas
    .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
  const revenueNativo = revenueClosedSet > 0 ? revenueClosedSet : revenueAnyFact;
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

  const efectivasCalls = filteredCalls.filter((c) => (c.tipo_evento ?? "").startsWith("efectiva_")).length;
  const contestadas = efectivasCalls;

  // Usar email OR phone OR id para no perder leads sin email (igual que panel asesor)
  const normLeadKey = (mail: string | null | undefined, phone: string | null | undefined, id: string | number) =>
    mail?.trim().toLowerCase() || phone?.trim() || String(id);
  const leadsFromCalls = new Set(filteredCalls.map((c) => normLeadKey(c.mail_lead, c.phone, c.id)));
  const leadsFromAgendas = new Set(filteredAgendas.map((a) => normLeadKey(a.email_lead, null, a.id_registro_agenda)));
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

  const tasaCierre = asistidas > 0 ? cerradas / asistidas : 0;

  // Leads únicos agendados: deduplicar por idcliente (GHL contact ID) o email_lead
  // Un mismo lead puede tener múltiples registros (PDTE → ofertada → cerrada)
  // meetingsBooked debe contar leads únicos, no registros totales
  const uniqueBookedLeads = new Set(
    filteredAgendas
      .filter((a) => !(a.categoria ?? "").toLowerCase().includes("cancel"))
      .map((a) => a.idcliente?.trim() || a.email_lead?.trim().toLowerCase() || `nokey_${a.id_registro_agenda}`)
  );
  const meetingsBooked = uniqueBookedLeads.size;
  const tasaAgendamiento = totalLeads > 0 ? meetingsBooked / totalLeads : 0;

  const kpis: DashboardKpis & Record<string, number> = {
    totalLeads,
    callsMade: filteredCalls.length,
    contestadas,
    answerRate: filteredCalls.length > 0 ? contestadas / filteredCalls.length : 0,
    meetingsBooked,
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
    agendadas: meetingsBooked,
    asistidas,
    canceladas,
    efectivas,
    // Deduplicar no-shows por lead único (GHL puede enviar el mismo evento múltiples veces)
    noShows: new Set(
      filteredAgendas
        .filter((a) => (a.categoria ?? "").toLowerCase() === "no_show")
        .map((a) => a.idcliente?.trim() || a.ghl_contact_id?.trim() || a.email_lead?.trim().toLowerCase() || `nokey_${a.id_registro_agenda}`)
    ).size,
    ticket: asistidas > 0 ? revenue / asistidas : 0,
  };

  // Advisor ranking
  // Normalizar key de asesor: email lowercase tiene prioridad, luego nombre lowercase
  const normAdvisorKey = (mail?: string | null, name?: string | null) => {
    const e = mail?.trim().toLowerCase();
    if (e) return e;
    const n = name?.trim().toLowerCase();
    return n || "sin asignar";
  };

  // Construir mapa de leads generados (nuevos contactos) por asesor
  const newLeadsMap: Record<string, typeof filteredNewLeadEvents> = {};
  for (const c of filteredNewLeadEvents) {
    const key = normAdvisorKey(c.closer_mail, c.nombre_closer);
    if (!newLeadsMap[key]) newLeadsMap[key] = [];
    newLeadsMap[key].push(c);
  }

  const advisorMap: Record<string, { calls: typeof filteredCalls; agendas: typeof filteredAgendas }> = {};
  for (const c of filteredCalls) {
    const key = normAdvisorKey(c.closer_mail, c.nombre_closer);
    if (!advisorMap[key]) advisorMap[key] = { calls: [], agendas: [] };
    advisorMap[key].calls.push(c);
  }
  for (const a of filteredAgendas) {
    // agendas no tienen email — buscar si existe un key de llamada que coincida por nombre
    const nameNorm = (a.closer ?? "").trim().toLowerCase();
    // Intentar emparejar con key existente por nombre (para no crear duplicado)
    const existingKey = Object.keys(advisorMap).find(
      (k) => k === nameNorm || advisorMap[k].calls.some(
        (c) => (c.nombre_closer ?? "").trim().toLowerCase() === nameNorm
      )
    ) ?? normAdvisorKey(null, a.closer);
    if (!advisorMap[existingKey]) advisorMap[existingKey] = { calls: [], agendas: [] };
    advisorMap[existingKey].agendas.push(a);
  }

  // webhookPorUsuario debe declararse ANTES del loop de advisorRanking
  // (se llena después con los webhookRows, pero necesita existir para el closure)
  const webhookPorUsuario: Record<string, Record<string, number>> = {};

  const advisorRanking: DashboardAdvisorRow[] = Object.entries(advisorMap).map(
    ([key, { calls: ac, agendas: aa }]) => {
      const aContestadas = ac.filter((c) => (c.tipo_evento ?? "").startsWith("efectiva_")).length;
      const aLeads = new Set([
        ...ac.map((c) => c.mail_lead).filter(Boolean),
        ...aa.map((a) => a.email_lead).filter(Boolean),
      ]).size;
      const aAsistidas = aa.filter((a) => attendedSet.has((a.categoria ?? "").toLowerCase().trim())).length;
      const aRevenueClosedSet = aa.filter((a) => closedSet.has((a.categoria ?? "").toLowerCase().trim()))
        .reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
      const aRevenueAny = aa.reduce((s, a) => s + (parseFloat(a.facturacion || "0") || 0), 0);
      const aRevenue = useExterna
        ? 0
        : (aRevenueClosedSet > 0 ? aRevenueClosedSet : aRevenueAny);
      const aCash = useExterna
        ? 0
        : aa.reduce((s, a) => s + (parseFloat(a.cash_collected || "0") || 0), 0);
      const aSpeeds = ac
        .filter((c) => c.speed_to_lead)
        .map((c) => parseFloat(c.speed_to_lead!) || 0)
        .filter((v) => v > 0);

      // Leads generados: nuevos contactos del periodo asignados a este asesor
      const advisorNewLeads = newLeadsMap[key] ?? [];
      const uniqueNewLeadsMap = new Map<string, (typeof advisorNewLeads)[0]>();
      for (const nl of advisorNewLeads) {
        const leadKey = nl.mail_lead?.trim().toLowerCase() || nl.phone?.trim() || String(nl.id);
        if (!uniqueNewLeadsMap.has(leadKey)) uniqueNewLeadsMap.set(leadKey, nl);
      }
      const leadsGeneradosDetalle = Array.from(uniqueNewLeadsMap.values()).map((nl) => ({
        nombre: nl.nombre_lead ?? null,
        email: nl.mail_lead ?? null,
        telefono: nl.phone ?? null,
        ultimaActividad: nl.ts ? toDateString(nl.ts) : null,
      }));

      // Leads con actividad: leads únicos del periodo que tuvieron llamada o cita
      const uniqueActivosMap = new Map<string, { nombre: string | null; email: string | null; telefono: string | null; ultimaActividad: string | null }>();
      for (const c of ac) {
        const leadKey = c.mail_lead?.trim().toLowerCase() || c.phone?.trim() || String(c.id);
        if (!uniqueActivosMap.has(leadKey)) {
          uniqueActivosMap.set(leadKey, {
            nombre: c.nombre_lead ?? null,
            email: c.mail_lead ?? null,
            telefono: c.phone ?? null,
            ultimaActividad: c.ts ? toDateString(c.ts) : null,
          });
        }
      }
      for (const a of aa) {
        const leadKey = a.email_lead?.trim().toLowerCase() || `agenda_${a.id_registro_agenda}`;
        if (!uniqueActivosMap.has(leadKey)) {
          uniqueActivosMap.set(leadKey, {
            nombre: a.nombre_de_lead ?? null,
            email: a.email_lead ?? null,
            telefono: null,
            ultimaActividad: toDateString(a.fecha_reunion ?? null) || toDateString(a.fecha as Date | string | null) || null,
          });
        }
      }
      const leadsConActividadDetalle = Array.from(uniqueActivosMap.values());

      return {
        advisorName: ac[0]?.nombre_closer ?? aa[0]?.closer ?? key,
        advisorEmail: ac[0]?.closer_mail ?? null,
        totalLeads: aLeads,
        leadsGenerados: leadsGeneradosDetalle.length,
        leadsConActividad: leadsConActividadDetalle.length,
        leadsGeneradosDetalle,
        leadsConActividadDetalle,
        callsMade: ac.length,
        speedToLeadAvg: aSpeeds.length > 0 ? aSpeeds.reduce((s, v) => s + v, 0) / aSpeeds.length : null,
        meetingsBooked: aa.length,
        meetingsAttended: aAsistidas,
        revenue: aRevenue,
        cashCollected: aCash,
        contactRate: ac.length > 0 ? aContestadas / ac.length : 0,
        bookingRate: aLeads > 0 ? aa.length / aLeads : 0,
        metricasWebhook: webhookPorUsuario[ac[0]?.closer_mail ?? key] ?? {},
      };
    },
  );

  // Volume by day (fechas normalizadas a "YYYY-MM-DD" para evitar 500 si el driver devuelve Date/string)
  const volumeMap: Record<string, DashboardVolumeDay> = {};
  for (const c of filteredCalls) {
    const d = toDateString(c.ts);
    if (!d) continue;
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].llamadas++;
  }
  for (const a of filteredAgendas) {
    const d =
      toDateString(a.fecha_reunion ?? null) || toDateString(a.fecha as Date | string | null) || "";
    if (!d) continue;
    if (!volumeMap[d]) volumeMap[d] = { date: d, llamadas: 0, citasPresentaciones: 0, cierres: 0 };
    volumeMap[d].citasPresentaciones++;
    if (closedSet.has((a.categoria ?? "").toLowerCase().trim()) || hasCash(a)) volumeMap[d].cierres++;
  }
  const volumeByDay = Object.values(volumeMap).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );

  // Objeciones
  const objMap: Record<string, { count: number; quotes: Set<string> }> = {};
  for (const a of filteredAgendas) {
    if (!Array.isArray(a.objeciones_ia)) continue;
    for (const obj of a.objeciones_ia) {
      const key = (obj?.categoria ?? obj?.objecion ?? "").toLowerCase().trim();
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

  // Catch-all: leads sin categoría o con categoría no reconocida en el embudo → etapa fallback
  {
    const fallbackEtapa = (embudoRaw as EmbudoEtapa[]).find((e) => e.es_fallback === true);
    if (fallbackEtapa) {
      const fallbackLabel = fallbackEtapa.nombre ?? fallbackEtapa.id;
      // Construir set de categorías conocidas en el embudo
      const catSet = new Set<string>();
      for (const e of embudoRaw as EmbudoEtapa[]) {
        if (e.nombre) catSet.add(e.nombre);
        if (e.id) catSet.add(e.id);
      }
      let sinClasificar = 0;
      for (const a of filteredAgendas) {
        const cat = (a.categoria ?? "").trim();
        if (!cat || (!catSet.has(cat) && cat === "sin_categoria")) {
          sinClasificar++;
        }
      }
      if (sinClasificar > 0) {
        // Mover los sin_categoria al fallback y eliminar la clave genérica
        distribucionEmbudo[fallbackLabel] = (distribucionEmbudo[fallbackLabel] ?? 0) + sinClasificar;
        delete distribucionEmbudo["sin_categoria"];
      }
    }
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

  const rawConfigs = parseMetricasConfig(cuentaRow?.metricas_config);
  const configs = rawConfigs.length > 0 ? rawConfigs : DEFAULT_METRICAS_CONFIG;
  const manualData = (cuentaRow?.metricas_manual_data && typeof cuentaRow.metricas_manual_data === "object")
    ? (cuentaRow.metricas_manual_data as Record<string, { [k: string]: string | number | boolean | null }[]>)
    : {};

  // Cargar datos de metricas_webhook para el período (suma por campo)
  const webhookRows = await db
    .select({ campo: metricasWebhook.campo, valor: metricasWebhook.valor, fecha: metricasWebhook.fecha, ghl_user_id: metricasWebhook.ghl_user_id })
    .from(metricasWebhook)
    .where(and(
      eq(metricasWebhook.id_cuenta, idCuenta),
      gte(metricasWebhook.fecha, dateFrom),
      lte(metricasWebhook.fecha, dateTo),
    ));
  const webhookSumas: Record<string, number> = {};
  // seriesTiempo: campo → mapa de fecha → valor sumado
  const webhookSeriesPorCampo: Record<string, Record<string, number>> = {};
  for (const row of webhookRows) {
    const key = row.campo;
    const fecha = toDateString(row.fecha);
    webhookSumas[key] = (webhookSumas[key] ?? 0) + parseFloat(String(row.valor ?? 0));
    if (!webhookSeriesPorCampo[key]) webhookSeriesPorCampo[key] = {};
    webhookSeriesPorCampo[key][fecha] = (webhookSeriesPorCampo[key][fecha] ?? 0) + parseFloat(String(row.valor ?? 0));
  }

  // Poblar webhookPorUsuario (declarado antes del loop de advisorRanking)
  for (const row of webhookRows) {
    if (!row.ghl_user_id) continue;
    const uid = row.ghl_user_id;
    if (!webhookPorUsuario[uid]) webhookPorUsuario[uid] = {};
    webhookPorUsuario[uid][row.campo] = (webhookPorUsuario[uid][row.campo] ?? 0) + parseFloat(String(row.valor ?? 0));
  }
  const metricasComputadas: { id: string; nombre: string; valor: string | number; descripcion?: string; ubicacion?: string; paneles?: string[]; formato?: string; color?: string; visualizacion?: "kpi_card" | "barra" | "comparativo"; seriesTiempo?: { fecha: string; valor: number }[] }[] = [];
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
      } else if (m.tipo === "webhook") {
        // Suma del campo webhook en el período (fuente API externa)
        let baseWebhook = m.webhookCampo ? (webhookSumas[m.webhookCampo] ?? 0) : 0;
        // Sumar también incrementos manuales (de reglas de etiquetas vía Cerebro)
        // que se almacenan en metricas_manual_data con estructura {date, valor}
        const manualEntries = (manualData[m.id] ?? []) as Array<{date?: string; valor?: number}>;
        if (manualEntries.length > 0) {
          const fromTs = new Date(`${dateFrom}T00:00:00Z`).getTime();
          const toTs = new Date(`${dateTo}T23:59:59.999Z`).getTime();
          const manualSum = manualEntries
            .filter(e => { const d = e.date ? new Date(e.date).getTime() : 0; return d >= fromTs && d <= toTs; })
            .reduce((s, e) => s + (e.valor ?? 0), 0);
          baseWebhook += manualSum;
        }
        valor = baseWebhook;
      } else {
        valor = calcMetricaAutomatica(m, kpis, metricasValores, dateFrom, dateTo);
      }
      metricasValores[m.id] = typeof valor === "number" ? valor : parseFloat(String(valor)) || 0;
      // Incluir series de tiempo para métricas webhook con visualización de barra
      let seriesTiempo: { fecha: string; valor: number }[] | undefined;
      if (m.tipo === "webhook" && m.visualizacion === "barra" && m.webhookCampo) {
        const seriesMap = webhookSeriesPorCampo[m.webhookCampo] ?? {};
        seriesTiempo = Object.entries(seriesMap)
          .map(([fecha, val]) => ({ fecha, valor: val }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
      metricasComputadas.push({ id: m.id, nombre: m.nombre, valor, descripcion: m.descripcion, ubicacion: m.ubicacion, paneles: m.paneles, formato: m.formato, color: m.color, visualizacion: m.visualizacion, seriesTiempo });
      computed.add(m.id);
    }
  }

  for (const m of sorted) {
    if (computed.has(m.id)) continue;
    metricasComputadas.push({ id: m.id, nombre: m.nombre, valor: "—", descripcion: m.descripcion, ubicacion: m.ubicacion, paneles: m.paneles, formato: m.formato, color: m.color, visualizacion: m.visualizacion });
  }

  // ----------------------------------------------------------------
  // Chat KPIs — consultar chats_logs en el mismo rango de fechas
  // ----------------------------------------------------------------
  const chatRows = await db
    .select({
      chatid: chatsLogs.chatid,
      chat: chatsLogs.chat,
      estado: chatsLogs.estado,
      notas_extra: chatsLogs.notas_extra,
      fecha_y_hora_z: chatsLogs.fecha_y_hora_z,
    })
    .from(chatsLogs)
    .where(
      and(
        eq(chatsLogs.id_cuenta, idCuenta),
        gte(chatsLogs.fecha_y_hora_z, fromDate),
        lte(chatsLogs.fecha_y_hora_z, toDate),
      ),
    );

  // ----------------------------------------------------------------
  // Funnel unificado — agregar leads de chats al distribucionEmbudo
  // Usa chats_logs.estado (escrito por la IA nocturna) directamente.
  // Solo suma a etapas que tienen 'chats' en sus fuentes (o sin fuentes = todas)
  // ----------------------------------------------------------------
  {
    // Construir set de etapas que aceptan chats como fuente
    const etapasConChats = new Set<string>();
    for (const etapa of embudoRaw as EmbudoEtapa[]) {
      const fuentes = (etapa as any).fuentes as string[] | undefined;
      // Si no tiene fuentes definidas → aplica a todos los canales (default)
      // Si tiene fuentes → solo si incluye 'chats'
      if (!fuentes || fuentes.length === 0 || fuentes.includes("chats")) {
        if (etapa.nombre) etapasConChats.add(etapa.nombre);
        if (etapa.id) etapasConChats.add(etapa.id);
      }
    }
    // Si no hay embudo personalizado, todos los estados son válidos
    const sinEmbudo = embudoRawArr.length === 0;

    for (const chatRow of chatRows) {
      // La IA escribe el estado directamente en chats_logs.estado
      const estado = chatRow.estado ?? null;
      // Solo sumar si la etapa destino acepta chats como fuente
      if (estado && (sinEmbudo || etapasConChats.has(estado))) {
        distribucionEmbudo[estado] = (distribucionEmbudo[estado] ?? 0) + 1;
      }
    }
  }

  const chatKpis: ChatKpis = (() => {
    const totalChats = chatRows.length;
    if (totalChats === 0) {
      return {
        total: 0,
        leadsUnicos: 0,
        conRespuesta: 0,
        tasaRespuesta: 0,
        speedToLeadAvg: null,
        distribucionCanales: {},
        topClosers: [],
      };
    }

    const uniqueChatIds = new Set(chatRows.map((r) => r.chatid).filter(Boolean));
    let chatsConAgente = 0;
    let speedSum = 0;
    let speedCount = 0;
    const distribucionCanales: Record<string, number> = {};
    const closerCounts: Record<string, number> = {};

    const chatConfig = cuentaRow?.configuracion_ui?.chat_config ?? {};
    const tieneChatbot = chatConfig.tiene_chatbot ?? false;
    const emojiTomaAtencion = (chatConfig.emoji_toma_atencion ?? "").trim();

    for (const row of chatRows) {
      const msgs: ChatMessage[] = Array.isArray(row.chat) ? (row.chat as ChatMessage[]) : [];

      // Si hay bot, "contactado" = hay mensaje de agente DESPUÉS del emoji de toma de atención
      // Si no hay bot, "contactado" = cualquier mensaje de agente
      let hasAgent: boolean;
      if (tieneChatbot && emojiTomaAtencion) {
        const emojiIdx = msgs.findIndex(
          (m) => m.role === "agent" && (m.message ?? "").includes(emojiTomaAtencion)
        );
        // Hay agente humano después del emoji del bot
        hasAgent = emojiIdx >= 0
          ? msgs.slice(emojiIdx + 1).some((m) => m.role === "agent")
          : msgs.some((m) => m.role === "agent");
      } else {
        hasAgent = msgs.some((m) => m.role === "agent");
      }
      if (hasAgent) chatsConAgente++;

      // Speed to lead: tiempo entre primer msg lead y primer msg agent (humano si hay bot)
      const firstLeadMsg = msgs.find((m) => m.role === "lead");
      let firstAgentMsg: ChatMessage | undefined;
      if (tieneChatbot && emojiTomaAtencion) {
        const emojiIdx = msgs.findIndex(
          (m) => m.role === "agent" && (m.message ?? "").includes(emojiTomaAtencion)
        );
        firstAgentMsg = emojiIdx >= 0
          ? msgs.slice(emojiIdx + 1).find((m) => m.role === "agent")
          : msgs.find((m) => m.role === "agent");
      } else {
        firstAgentMsg = msgs.find((m) => m.role === "agent");
      }
      if (firstLeadMsg?.timestamp && firstAgentMsg?.timestamp) {
        const leadTs = new Date(firstLeadMsg.timestamp).getTime();
        const agentTs = new Date(firstAgentMsg.timestamp).getTime();
        const diffSecs = (agentTs - leadTs) / 1000;
        if (diffSecs > 0) {
          speedSum += diffSecs;
          speedCount++;
        }
      }

      // Distribución de canales — tipo del primer mensaje
      const firstMsg = msgs[0];
      if (firstMsg?.type) {
        const channel = firstMsg.type;
        distribucionCanales[channel] = (distribucionCanales[channel] ?? 0) + 1;
      }

      // Top closers — de notas_extra
      const closer = row.notas_extra?.trim();
      if (closer) {
        closerCounts[closer] = (closerCounts[closer] ?? 0) + 1;
      }
    }

    const topClosers = Object.entries(closerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: totalChats,
      leadsUnicos: uniqueChatIds.size,
      conRespuesta: chatsConAgente,
      tasaRespuesta: totalChats > 0 ? (chatsConAgente / totalChats) * 100 : 0,
      speedToLeadAvg: speedCount > 0 ? speedSum / speedCount : null,
      distribucionCanales,
      topClosers,
    };
  })();

  // ----------------------------------------------------------------
  // Metas del tenant — calcular alertas de progreso
  // ----------------------------------------------------------------
  const metasRows = await db
    .select()
    .from(metasCuenta)
    .where(eq(metasCuenta.id_cuenta, idCuenta))
    .limit(1);
  const metasRow = metasRows[0] ?? null;

  const alertasMetas: AlertaMeta[] = [];
  if (metasRow) {
    // Calcular número de días y semanas del período
    const msPerDay = 1000 * 60 * 60 * 24;
    const dias = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay));
    const semanas = Math.max(1, dias / 7);

    type Canal = "llamadas" | "videollamadas" | "chats" | "general";

    const addAlerta = (
      label: string,
      actual: number,
      meta: number | null | undefined,
      canal: Canal,
      unidad?: string,
      invertido?: boolean,
    ) => {
      const metaNum = meta != null ? parseFloat(String(meta)) : 0;
      if (!metaNum) return;
      // Para métricas invertidas (menos = mejor), el pct se calcula al revés:
      // si actual <= meta → 100% (cumple). Si actual > meta → % proporcional degradado.
      let pct: number;
      if (invertido) {
        pct = actual <= 0 ? 0 : Math.round((metaNum / actual) * 100);
      } else {
        pct = Math.round((actual / metaNum) * 100);
      }
      const cumple = invertido ? actual <= metaNum : pct >= 100;
      const sinDatos = actual === 0 && !invertido;
      alertasMetas.push({
        label,
        actual: Math.round(actual * 10) / 10,
        meta: metaNum,
        cumple,
        pct: Math.min(200, pct), // cap para no distorsionar UI
        unidad,
        canal,
        invertido,
        sinDatos,
      });
    };

    // ── LLAMADAS ────────────────────────────────────────────────────
    // Usar meta_llamadas_semanales si existe, sino meta_llamadas_diarias × días (backward compat)
    const metaLlamadasTotal = metasRow.meta_llamadas_semanales
      ? parseFloat(String(metasRow.meta_llamadas_semanales)) * semanas
      : metasRow.meta_llamadas_diarias
        ? metasRow.meta_llamadas_diarias * dias
        : null;

    // Historial diario de metas de llamadas — para mostrar qué días se cumplió
    const metaDiariaLlamadas = metasRow.meta_llamadas_diarias
      ? parseFloat(String(metasRow.meta_llamadas_diarias))
      : null;
    const historialLlamadas = metaDiariaLlamadas
      ? volumeByDay.map((d) => ({
          fecha: String(d.date),
          actual: d.llamadas,
          meta: metaDiariaLlamadas,
          cumple: d.llamadas >= metaDiariaLlamadas,
        }))
      : undefined;

    const metaLlamadasAlerta = alertasMetas.length; // índice donde se insertará
    addAlerta("📞 Llamadas realizadas", kpis.callsMade, metaLlamadasTotal, "llamadas", "llamadas en el período");
    // Inyectar historial en la alerta recién creada
    if (historialLlamadas && alertasMetas[metaLlamadasAlerta]) {
      alertasMetas[metaLlamadasAlerta]!.historialDiario = historialLlamadas;
    }
    addAlerta(
      "📞 % Contestación",
      kpis.answerRate * 100,
      metasRow.meta_contestacion_llamadas ? parseFloat(String(metasRow.meta_contestacion_llamadas)) : null,
      "llamadas",
      "%",
    );
    // Speed to lead de llamadas — invertido (menos min = mejor)
    const metaSpeedLlamadas = metasRow.meta_speed_llamadas_min
      ? parseFloat(String(metasRow.meta_speed_llamadas_min))
      : metasRow.meta_speed_to_lead_min
        ? parseFloat(String(metasRow.meta_speed_to_lead_min))
        : null;
    addAlerta("📞 Speed to lead", kpis.speedToLeadAvg, metaSpeedLlamadas, "llamadas", "min", true);

    // Backward-compat: tasa contestación vieja
    if (!metasRow.meta_contestacion_llamadas && metasRow.meta_tasa_contestacion) {
      addAlerta(
        "📞 Tasa contestación (legacy)",
        kpis.answerRate * 100,
        parseFloat(String(metasRow.meta_tasa_contestacion)) * 100,
        "llamadas",
        "%",
      );
    }

    // ── VIDEOLLAMADAS ───────────────────────────────────────────────
    // Solo si hay agendas o metas de video configuradas
    const hasVideoMetas = metasRow.meta_citas_semanales_video || metasRow.meta_citas_semanales || metasRow.meta_cierres_semanales || metasRow.meta_revenue_mensual || metasRow.meta_revenue_video;
    if (hasVideoMetas) {
      const metaCitasVideo = metasRow.meta_citas_semanales_video
        ? parseFloat(String(metasRow.meta_citas_semanales_video)) * semanas
        : metasRow.meta_citas_semanales
          ? parseFloat(String(metasRow.meta_citas_semanales)) * semanas
          : null;
      addAlerta("🎥 Citas agendadas", kpis.meetingsBooked, metaCitasVideo, "videollamadas", "citas");
      const metaCierresVideo = metasRow.meta_cierres_semanales
        ? parseFloat(String(metasRow.meta_cierres_semanales)) * semanas
        : null;
      addAlerta("🎥 Cierres", kpis.meetingsClosed, metaCierresVideo, "videollamadas", "cierres");
      addAlerta(
        "🎥 % Cierre",
        kpis.tasaCierre,
        metasRow.meta_cierre_video ? parseFloat(String(metasRow.meta_cierre_video)) : null,
        "videollamadas",
        "%",
      );
      // Backward-compat: meta_tasa_cierre vieja → videollamadas
      if (!metasRow.meta_cierre_video && metasRow.meta_tasa_cierre) {
        addAlerta(
          "🎥 Tasa de cierre (legacy)",
          kpis.tasaCierre,
          parseFloat(String(metasRow.meta_tasa_cierre)) * 100,
          "videollamadas",
          "%",
        );
      }
      const metaRevenue = metasRow.meta_revenue_video
        ? parseFloat(String(metasRow.meta_revenue_video))
        : metasRow.meta_revenue_mensual
          ? parseFloat(String(metasRow.meta_revenue_mensual))
          : null;
      addAlerta("🎥 Revenue", kpis.revenue, metaRevenue, "videollamadas", "$");
    }

    // ── CHATS ───────────────────────────────────────────────────────
    const hasChatMetas = metasRow.meta_chats_diarios || metasRow.meta_chats_contestacion || metasRow.meta_speed_chat_min;
    if (hasChatMetas) {
      const chatTotal = chatKpis?.total ?? 0;
      addAlerta(
        "💬 Chats atendidos",
        chatTotal,
        metasRow.meta_chats_diarios ? metasRow.meta_chats_diarios * dias : null,
        "chats",
        "chats",
      );
      addAlerta(
        "💬 % Con respuesta",
        chatKpis?.tasaRespuesta ?? 0,
        metasRow.meta_chats_contestacion ? parseFloat(String(metasRow.meta_chats_contestacion)) : null,
        "chats",
        "%",
      );
      // Speed chat — invertido
      const chatSpeedMin = chatKpis?.speedToLeadAvg != null ? chatKpis.speedToLeadAvg / 60 : 0;
      addAlerta(
        "💬 Speed to lead chat",
        chatSpeedMin,
        metasRow.meta_speed_chat_min ? parseFloat(String(metasRow.meta_speed_chat_min)) : null,
        "chats",
        "min",
        true,
      );
    }
  }

  // ── Ads summary para widget en Panel Ejecutivo ──────────────────────────────
  let adsSummary: DashboardAdsSummary | undefined;
  {
    const cfgAds = cuentaRow?.configuracion_ui as Record<string, unknown> | null | undefined;
    // We need to read configuracion_ads from cuentas — do a targeted SQL query to avoid circular deps
    const [adsConfigRow] = await db.execute(sql`
      SELECT configuracion_ads FROM cuentas WHERE id_cuenta = ${idCuenta}
    `).then(r => r.rows as Array<{ configuracion_ads: Record<string, unknown> | null }>);
    void cfgAds; // avoid lint unused warning
    const adsCfg = adsConfigRow?.configuracion_ads;
    const hasAdsConfig = adsCfg && typeof adsCfg === 'object' && (
      (adsCfg.meta as { activo?: boolean } | undefined)?.activo ||
      (adsCfg.google as { activo?: boolean } | undefined)?.activo ||
      (adsCfg.tiktok as { activo?: boolean } | undefined)?.activo
    );
    if (hasAdsConfig) {
      const adsAggRows = await db.execute(sql`
        SELECT
          SUM(gasto_total_ad) AS gasto,
          SUM(impresiones_totales) AS impresiones,
          SUM(clicks_unicos) AS clicks,
          AVG(CASE WHEN gasto_total_ad > 0 THEN ctr END) AS ctr,
          AVG(CASE WHEN gasto_total_ad > 0 THEN cpm END) AS cpm,
          AVG(CASE WHEN gasto_total_ad > 0 THEN cpc END) AS cpc,
          array_agg(DISTINCT plataforma) FILTER (WHERE gasto_total_ad > 0) AS plataformas,
          (
            SELECT jsonb_object_agg(key, avg_val)
            FROM (
              SELECT key, AVG((value #>> '{}')::numeric) AS avg_val
              FROM resumenes_diarios_ads r2,
                   jsonb_each(r2.datos_extra) AS kv(key, value)
              WHERE r2.id_cuenta = ${idCuenta}
                AND r2.fecha BETWEEN ${dateFrom}::date AND ${dateTo}::date
                AND r2.datos_extra IS NOT NULL
                AND r2.datos_extra != '{}'::jsonb
                AND (value #>> '{}')::text ~ '^[0-9]+\\.?[0-9]*$'
              GROUP BY key
            ) sub
          )::text AS campos_extra_json
        FROM resumenes_diarios_ads
        WHERE id_cuenta = ${idCuenta}
          AND fecha BETWEEN ${dateFrom}::date AND ${dateTo}::date
      `);
      const aggRow = adsAggRows.rows[0] as Record<string, unknown> | undefined;
      const gastoTotal = Number(aggRow?.gasto ?? 0);
      const plataformasArr = Array.isArray(aggRow?.plataformas) ? (aggRow.plataformas as string[]).filter(Boolean) : [];

      // campos_extra_json comes from SQL subquery — parse it directly
      const parseCamposExtraAgg = (raw: unknown): Record<string, number> => {
        if (!raw) return {};
        let obj: Record<string, unknown> = {};
        if (typeof raw === 'string') {
          try { obj = JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
        } else if (typeof raw === 'object') {
          obj = raw as Record<string, unknown>;
        }
        const result: Record<string, number> = {};
        for (const [k, v] of Object.entries(obj)) {
          const n = typeof v === 'number' ? v : parseFloat(String(v));
          if (Number.isFinite(n)) result[k] = n;
        }
        return result;
      };
      const camposExtra = parseCamposExtraAgg(aggRow?.campos_extra_json);

      if (gastoTotal > 0 || plataformasArr.length > 0) {
        adsSummary = {
          hasAds: true,
          gastoTotal,
          impresiones: Number(aggRow?.impresiones ?? 0),
          clicks: Number(aggRow?.clicks ?? 0),
          ctr: Number(aggRow?.ctr ?? 0),
          cpm: Number(aggRow?.cpm ?? 0),
          cpc: Number(aggRow?.cpc ?? 0),
          camposExtra,
          plataformas: plataformasArr,
        };
      }
    }
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
    dashboardsPersonalizados: Array.isArray(cuentaRow?.dashboards_personalizados) ? cuentaRow.dashboards_personalizados as { id: string; nombre: string; icono?: string }[] : [],
    chatKpis: chatKpis.total > 0 ? chatKpis : undefined,
    alertasMetas: alertasMetas.length > 0 ? alertasMetas : undefined,
    adsSummary,
    configuracion_ui: cuentaRow?.configuracion_ui as DashboardResponse["configuracion_ui"] ?? undefined,
    fuente_llamadas: (cuentaRow?.fuente_llamadas === "ghl" ? "ghl" : "twilio") as "twilio" | "ghl",
  };
}
