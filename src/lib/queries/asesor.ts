import { db } from "@/lib/db";
import { logLlamadas, registrosDeLlamada, resumenesDiariosAgendas, chatsLogs, cuentas, usuariosDashboard, metricasWebhook } from "@/lib/db/schema";
import type { EmbudoEtapa, MetricaConfig } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, or, isNull, isNotNull, inArray } from "drizzle-orm";
import type {
  AsesorKpis,
  AsesorLeadCRM,
  AsesorVideollamada,
  AsesorChat,
  AsesorMetricaCustom,
  AsesorCanales,
  AsesorResponse,
  AsesorBreakdown,
  ApiAdvisor,
} from "@/types";

// ─── Normalización de estados ────────────────────────────────────────────────
// Convierte cualquier valor de estado (con basura de GHL) al canónico

type EstadoNormalizado = AsesorLeadCRM["estadoNormalizado"];

function normalizarEstado(estado: string | null): EstadoNormalizado {
  if (!estado) return "pendiente";
  // Limpiar: quitar llaves {valor} que GHL a veces manda
  const limpio = estado.replace(/^\{(.+)\}$/, "$1").trim().toLowerCase();

  if (limpio === "pdte" || limpio === "pendiente") return "pendiente";
  if (["no_contestado", "no_contesto", "nocontest", "no_contestada", "no contestado"].includes(limpio)) return "no_contesto";
  if (limpio === "buzon" || limpio === "buzón") return "buzon";
  if (limpio.startsWith("seguimiento")) return "seguimiento"; // seguimiento, seguimiento_1..10
  if (limpio === "interesado") return "interesado";
  if (limpio === "programado") return "programado";
  if (limpio === "calificada") return "calificada";
  if (limpio === "no_calificada") return "no_calificada";
  if (limpio === "cerrada" || limpio === "complet") return "cerrada";
  if (["no_interesado", "no interesado", "perdido", "perdida"].includes(limpio)) return "no_interesado";
  return "otro";
}

// ─── Resolver nombre→email y email→nombre para matching cross-canal ──────────

async function buildCloserMaps(idCuenta: number): Promise<{
  emailToNombre: Record<string, string>;
  nombreToEmail: Record<string, string>;
}> {
  const usuarios = await db
    .select({ email: usuariosDashboard.email, nombre_closer: usuariosDashboard.nombre_closer })
    .from(usuariosDashboard)
    .where(and(eq(usuariosDashboard.id_cuenta, idCuenta)));

  const emailToNombre: Record<string, string> = {};
  const nombreToEmail: Record<string, string> = {};

  for (const u of usuarios) {
    if (u.email && u.nombre_closer) {
      emailToNombre[u.email.toLowerCase()] = u.nombre_closer;
      nombreToEmail[u.nombre_closer.toLowerCase()] = u.email;
    }
  }
  return { emailToNombre, nombreToEmail };
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function getAsesorData(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  advisorEmails?: string[],
): Promise<AsesorResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);
  const emails = (advisorEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);

  // ── Cargar cuenta + embudo + métricas config ────────────────────────────────
  const [cuentaRow] = await db
    .select({
      fuente_llamadas: cuentas.fuente_llamadas,
      ghl_location_id: cuentas.ghl_location_id,
      locationid: cuentas.locationid,
      embudo_personalizado: cuentas.embudo_personalizado,
      metricas_config: cuentas.metricas_config,
      configuracion_ui: cuentas.configuracion_ui,
    })
    .from(cuentas)
    .where(eq(cuentas.id_cuenta, idCuenta))
    .limit(1);

  const fuenteLlamadas: "twilio" | "ghl" = cuentaRow?.fuente_llamadas === "ghl" ? "ghl" : "twilio";
  const ghlLocationId = cuentaRow?.ghl_location_id ?? cuentaRow?.locationid ?? null;
  const embudo = Array.isArray(cuentaRow?.embudo_personalizado)
    ? (cuentaRow.embudo_personalizado as EmbudoEtapa[])
    : [];

  // ── Mapas de nombre ↔ email ─────────────────────────────────────────────────
  const { emailToNombre, nombreToEmail } = await buildCloserMaps(idCuenta);

  // Para filtrar por asesor: emails seleccionados + sus nombres alternativos
  const emailsLower = emails.map((e) => e.toLowerCase());
  const nombresFromEmails = emailsLower
    .map((e) => emailToNombre[e])
    .filter((n): n is string => !!n)
    .map((n) => n.toLowerCase());

  // ── LLAMADAS: log_llamadas ──────────────────────────────────────────────────
  const callConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromTs),
    lte(logLlamadas.ts, toTs),
  ];
  if (emailsLower.length > 0) {
    callConditions.push(
      sql`LOWER(TRIM(COALESCE(${logLlamadas.closer_mail}, ''))) IN (${sql.join(emailsLower.map((e) => sql`${e}`), sql`, `)})`,
    );
  }

  const callRows = await db
    .select()
    .from(logLlamadas)
    .where(and(...callConditions))
    .orderBy(sql`${logLlamadas.ts} DESC`);

  // ── LLAMADAS: registros_de_llamada CON filtro de fecha ────────────────────
  const idCuentaStr = String(idCuenta);
  const regRows = await (async () => {
    const baseCond = and(
      eq(registrosDeLlamada.id_cuenta, idCuentaStr),
      // Aplicar filtro de fecha (fecha_evento dentro del rango)
      gte(registrosDeLlamada.fecha_evento, fromTs),
      lte(registrosDeLlamada.fecha_evento, toTs),
    )!;

    if (emailsLower.length === 0) {
      return db.select().from(registrosDeLlamada).where(baseCond).orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);
    }

    const callRegistroIds = [...new Set(callRows.map((c) => c.id_registro).filter((id): id is number => id != null && id > 0))];
    const byCloser = sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.closer_mail}, ''))) IN (${sql.join(emailsLower.map((e) => sql`${e}`), sql`, `)})`;
    const byLinkedCall = callRegistroIds.length > 0 ? inArray(registrosDeLlamada.id_registro, callRegistroIds) : sql`false`;

    return db
      .select()
      .from(registrosDeLlamada)
      .where(and(baseCond, or(byCloser, byLinkedCall))!)
      .orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);
  })();

  // ── VIDEOLLAMADAS: resumenes_diarios_agendas ──────────────────────────────
  const fechaFilterAgendas = or(
    and(isNotNull(resumenesDiariosAgendas.fecha_reunion), gte(resumenesDiariosAgendas.fecha_reunion, fromTs), lte(resumenesDiariosAgendas.fecha_reunion, toTs)),
    and(isNull(resumenesDiariosAgendas.fecha_reunion), gte(resumenesDiariosAgendas.fecha, dateFrom), lte(resumenesDiariosAgendas.fecha, dateTo)),
  )!;

  const agendaConditions = [eq(resumenesDiariosAgendas.id_cuenta, idCuenta), fechaFilterAgendas];
  if (emailsLower.length > 0 || nombresFromEmails.length > 0) {
    const allCloserValues = [...emailsLower, ...nombresFromEmails];
    agendaConditions.push(
      sql`LOWER(TRIM(COALESCE(${resumenesDiariosAgendas.closer}, ''))) IN (${sql.join(allCloserValues.map((v) => sql`${v}`), sql`, `)})`,
    );
  }

  const agendaRows = await db.select().from(resumenesDiariosAgendas).where(and(...agendaConditions));

  // ── CHATS: chats_logs ─────────────────────────────────────────────────────
  // notas_extra = nombre del closer (NO email) — resolver usando nombreFromEmails
  const chatConditions = [
    eq(chatsLogs.id_cuenta, idCuenta),
    gte(chatsLogs.fecha_y_hora_z, fromTs),
    lte(chatsLogs.fecha_y_hora_z, toTs),
  ];
  const chatCloserValues = emailsLower.length > 0
    ? [...emailsLower, ...nombresFromEmails]
    : [];
  if (chatCloserValues.length > 0) {
    chatConditions.push(
      sql`LOWER(TRIM(COALESCE(${chatsLogs.notas_extra}, ''))) IN (${sql.join(chatCloserValues.map((v) => sql`${v}`), sql`, `)})`,
    );
  }
  const chatsRows = await db.select().from(chatsLogs).where(and(...chatConditions));

  // ── MÉTRICAS CUSTOM atribuibles al asesor ────────────────────────────────
  const metricasConfig = Array.isArray(cuentaRow?.metricas_config)
    ? (cuentaRow.metricas_config as MetricaConfig[])
    : [];
  const metricasAtribuibles = metricasConfig.filter((m) => m.atribuible_a_usuario && m.webhookCampo);

  // Obtener valores de metricas_webhook por asesor (ghl_user_id)
  // ghl_user_id mapea al asesor — para filtrar necesitamos mapear email → ghl_user_id
  // Por ahora: si hay emails filtrados, filtrar por los que tengan ese closer
  const metricasRows = metricasAtribuibles.length > 0
    ? await db.execute(sql`
        SELECT campo, SUM(valor) as total
        FROM metricas_webhook
        WHERE id_cuenta = ${idCuenta}
          AND fecha BETWEEN ${dateFrom}::date AND ${dateTo}::date
          ${emailsLower.length > 0
            ? sql`AND LOWER(TRIM(COALESCE(ghl_user_id, ''))) IN (${sql.join(emailsLower.map((e) => sql`${e}`), sql`, `)})`
            : sql``
          }
        GROUP BY campo
      `).then((r) => r.rows as Array<{ campo: string; total: string }>)
    : [];

  const metricasSumaMap: Record<string, number> = {};
  for (const r of metricasRows) {
    metricasSumaMap[r.campo] = Number(r.total ?? 0);
  }

  // ── CALCULAR KPIs ─────────────────────────────────────────────────────────
  const contestadas = callRows.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;

  // leadsAsignados = leads únicos incluyendo pdte (son leads asignados)
  const leadKeyFromCall = (c: { mail_lead: string | null; phone: string | null; id: number }) =>
    c.mail_lead?.trim() || c.phone?.trim() || `id:${c.id}`;
  const leadKeyFromAgenda = (a: { email_lead: string | null; nombre_de_lead: string | null; id_registro_agenda: number }) =>
    a.email_lead?.trim() || a.nombre_de_lead?.trim() || `ag:${a.id_registro_agenda}`;
  const leadKeyFromReg = (r: { mail_lead: string | null; phone_raw_format: string | null; id_registro: number }) =>
    r.mail_lead?.trim() || r.phone_raw_format?.trim() || `reg:${r.id_registro}`;

  const leadsFromCalls = new Set(callRows.map(leadKeyFromCall).filter(Boolean));
  const leadsFromAgendas = new Set(agendaRows.map(leadKeyFromAgenda).filter(Boolean));
  const leadsFromRegistros = new Set(regRows.map(leadKeyFromReg).filter(Boolean));
  const allLeads = new Set([...leadsFromCalls, ...leadsFromAgendas]);

  // KPIs de videollamadas
  const videoAsistidas = agendaRows.filter((a) => {
    const cat = (a.categoria ?? "").toLowerCase();
    return cat !== "cancelada" && cat !== "no_show" && cat !== "pdte" && cat !== "";
  }).length;
  const videoCalificadas = agendaRows.filter((a) => {
    const cat = (a.categoria ?? "").toLowerCase();
    return ["calificada", "cerrada"].includes(cat) || embudo.find((e) => e.id === cat)?.es_calificada;
  }).length;
  const videoCerradas = agendaRows.filter((a) => (a.categoria ?? "").toLowerCase() === "cerrada").length;
  const videoNoShows = agendaRows.filter((a) => (a.categoria ?? "").toLowerCase() === "no_show").length;
  const videoCanceladas = agendaRows.filter((a) => {
    const cat = (a.categoria ?? "").toLowerCase();
    return cat === "cancelada" || cat === "cancelada";
  }).length;

  // KPIs de chats
  const chatsConRespuesta = chatsRows.filter((ch) => {
    const chatData = ch.chat as { role?: string }[] | null;
    return Array.isArray(chatData) && chatData.some((m) => m?.role === "agent");
  }).length;

  // Speed to lead en chats
  let speedChatSum = 0;
  let speedChatCount = 0;
  for (const ch of chatsRows) {
    const msgs = (ch.chat as { role?: string; timestamp?: string }[] | null) ?? [];
    const firstLead = msgs.find((m) => m.role === "lead");
    const firstAgent = msgs.find((m) => m.role === "agent");
    if (firstLead?.timestamp && firstAgent?.timestamp) {
      const diff = (new Date(firstAgent.timestamp).getTime() - new Date(firstLead.timestamp).getTime()) / 1000;
      if (diff > 0) { speedChatSum += diff; speedChatCount++; }
    }
  }

  const kpis: AsesorKpis = {
    leadsAsignados: allLeads.size,
    llamadasRealizadas: callRows.length,
    llamadasContestadas: contestadas,
    tasaContacto: callRows.length > 0 ? (contestadas / callRows.length) * 100 : 0,
    reunionesAgendadas: agendaRows.length,
    reunionesAsistidas: videoAsistidas,
    reunionesCalificadas: videoCalificadas,
    reunionesCerradas: videoCerradas,
    reunionesNoShow: videoNoShows,
    reunionesCanceladas: videoCanceladas,
    tasaAgendamiento: contestadas > 0 ? (agendaRows.length / contestadas) * 100 : 0,
    totalChats: chatsRows.length,
    chatsConRespuesta,
    tasaRespuestaChats: chatsRows.length > 0 ? (chatsConRespuesta / chatsRows.length) * 100 : 0,
    speedToLeadChatsAvg: speedChatCount > 0 ? speedChatSum / speedChatCount : null,
  };

  // ── PIPELINE: Llamadas ────────────────────────────────────────────────────
  const ghlContactMap: Record<number, string> = {};
  const phoneFromCallsMap: Record<number, string> = {};
  for (const c of callRows) {
    if (c.id_registro) {
      if (c.contact_id_ghl) ghlContactMap[c.id_registro] = c.contact_id_ghl;
      if (c.phone && !phoneFromCallsMap[c.id_registro]) phoneFromCallsMap[c.id_registro] = c.phone;
    }
  }

  const leadMap: Record<string, AsesorLeadCRM> = {};
  for (const r of regRows) {
    const key = r.mail_lead?.trim() || r.phone_raw_format?.trim() || String(r.id_registro);
    if (leadMap[key]) continue;

    const notasArr: { date: string; text: string }[] = [];
    if (r.iadescripcion?.trim()) {
      notasArr.push({ date: r.fecha_evento?.toISOString() ?? "", text: r.iadescripcion });
    }

    const estadoNorm = normalizarEstado(r.estado);

    leadMap[key] = {
      id: String(r.id_registro),
      name: r.nombre_lead ?? key,
      email: r.mail_lead ?? null,
      phone: r.phone_raw_format ?? phoneFromCallsMap[r.id_registro] ?? null,
      ghlContactId: ghlContactMap[r.id_registro] ?? null,
      estado: r.estado,
      estadoNormalizado: estadoNorm,
      intentosContacto: r.intentos_contacto ?? 0,
      speedToLead: r.speed_to_lead ? `${parseFloat(r.speed_to_lead) || 0} min` : "—",
      notasLlamadas: notasArr,
      leadNote: null,
    };
  }
  const leads = Object.values(leadMap);

  // ── PIPELINE: Videollamadas ───────────────────────────────────────────────
  const videollamadas: AsesorVideollamada[] = agendaRows.map((a) => ({
    id: a.id_registro_agenda,
    leadName: a.nombre_de_lead ?? null,
    leadEmail: a.email_lead ?? null,
    ghlContactId: a.ghl_contact_id ?? null,
    categoria: (a.categoria ?? "PDTE").toLowerCase(),
    fechaReunion: a.fecha_reunion?.toISOString() ?? null,
    facturacion: parseFloat(a.facturacion || "0") || 0,
    cashCollected: parseFloat(a.cash_collected || "0") || 0,
    fathomUrl: a.link_llamada ?? null,
    resumenIa: a.resumen_ia ?? null,
  }));

  // ── PIPELINE: Chats ───────────────────────────────────────────────────────
  const chats: AsesorChat[] = chatsRows.map((ch) => {
    const msgs = (ch.chat as { role?: string; timestamp?: string; message?: string }[] | null) ?? [];
    const respondido = msgs.some((m) => m.role === "agent");
    const firstLead = msgs.find((m) => m.role === "lead");
    const firstAgent = msgs.find((m) => m.role === "agent");
    let speedSeg: number | null = null;
    if (firstLead?.timestamp && firstAgent?.timestamp) {
      const diff = (new Date(firstAgent.timestamp).getTime() - new Date(firstLead.timestamp).getTime()) / 1000;
      if (diff > 0) speedSeg = diff;
    }
    return {
      chatId: ch.chatid ?? String(ch.id_evento ?? ""),
      leadName: null,
      leadEmail: null,
      estado: ch.estado ?? "activo",
      fechaUltimoMensaje: ch.fecha_y_hora_z?.toISOString() ?? dateFrom,
      respondido,
      speedToLeadSeg: speedSeg,
    };
  });

  // ── Métricas custom ───────────────────────────────────────────────────────
  const metricasCustom: AsesorMetricaCustom[] = metricasAtribuibles.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    valor: m.webhookCampo ? (metricasSumaMap[m.webhookCampo] ?? 0) : 0,
    formato: m.formato ?? "numero",
    color: m.color ?? "cyan",
  }));

  // ── Canales disponibles ───────────────────────────────────────────────────
  // Basado en si hay datos reales + si el módulo está activo
  const modulosActivos = cuentaRow?.configuracion_ui?.modulos_activos ?? {};
  const canales: AsesorCanales = {
    llamadas: callRows.length > 0 || regRows.length > 0,
    videollamadas: agendaRows.length > 0 || !!modulosActivos.videollamadas_fathom,
    chats: chatsRows.length > 0 || !!modulosActivos.chats,
    metricasCustom: metricasCustom.length > 0,
  };

  // ── Etapas del embudo para el pipeline de videollamadas ──────────────────
  const DEFAULT_ETAPAS = [
    { id: "calificada", nombre: "Calificada", color: "#22c55e", es_fija: true },
    { id: "no_calificada", nombre: "No calificada", color: "#f97316", es_fija: true },
    { id: "cerrada", nombre: "Cerrada", color: "#10b981", es_fija: true },
    { id: "no_show", nombre: "No Show", color: "#eab308", es_fija: true },
    { id: "cancelada", nombre: "Cancelada", color: "#ef4444", es_fija: true },
    { id: "pdte", nombre: "Pendiente", color: "#6b7280", es_fija: true },
  ];
  const embudoEtapas = embudo.length > 0
    ? [
        ...embudo.map((e) => ({ id: e.id, nombre: e.nombre ?? e.id, color: e.color ?? "#6b7280", es_fija: e.es_fija })),
        { id: "no_show", nombre: "No Show", color: "#eab308", es_fija: true },
        { id: "cancelada", nombre: "Cancelada", color: "#ef4444", es_fija: true },
        { id: "pdte", nombre: "Pendiente", color: "#6b7280", es_fija: true },
      ]
    : DEFAULT_ETAPAS;

  // ── Breakdown ─────────────────────────────────────────────────────────────
  const soloLlamadas = [...leadsFromCalls].filter((e) => !leadsFromAgendas.has(e)).length;
  const soloAgendas = [...leadsFromAgendas].filter((e) => !leadsFromCalls.has(e)).length;
  const enAmbos = [...leadsFromCalls].filter((e) => leadsFromAgendas.has(e)).length;
  const soloRegistros = [...leadsFromRegistros].filter((e) => !leadsFromCalls.has(e) && !leadsFromAgendas.has(e)).length;
  const porTipo: Record<string, number> = {};
  for (const c of callRows) { const t = c.tipo_evento || "sin_tipo"; porTipo[t] = (porTipo[t] ?? 0) + 1; }

  const breakdown: AsesorBreakdown = {
    leadsAsignados: {
      desdeLlamadas: leadsFromCalls.size,
      desdeAgendas: leadsFromAgendas.size,
      desdeRegistros: leadsFromRegistros.size,
      soloLlamadas,
      soloAgendas,
      soloRegistros,
      enAmbos,
    },
    llamadasRealizadas: { total: callRows.length, porTipo },
    llamadasContestadas: { total: contestadas },
    reunionesAgendadas: { total: agendaRows.length },
  };

  // ── Advisors list ─────────────────────────────────────────────────────────
  const advisorSet = new Map<string, string>();
  for (const c of callRows) { if (c.closer_mail) advisorSet.set(c.closer_mail, c.nombre_closer ?? c.closer_mail); }
  for (const a of agendaRows) { if (a.closer && !advisorSet.has(a.closer)) advisorSet.set(a.closer, a.closer); }
  const advisors: ApiAdvisor[] = [...advisorSet.entries()].map(([email, name]) => ({ id: email, name, email }));

  return {
    kpis,
    leads,
    videollamadas,
    chats,
    metricasCustom,
    embudoEtapas,
    canales,
    advisors,
    breakdown,
    fuente_llamadas: fuenteLlamadas,
    ghlLocationId,
  };
}

/** Lista de asesores del tenant para el combobox */
export async function getAsesoresList(idCuenta: number): Promise<ApiAdvisor[]> {
  const [callRows, agendaRows] = await Promise.all([
    db.select({ closer_mail: logLlamadas.closer_mail, nombre_closer: logLlamadas.nombre_closer })
      .from(logLlamadas).where(eq(logLlamadas.id_cuenta, idCuenta)),
    db.select({ closer: resumenesDiariosAgendas.closer })
      .from(resumenesDiariosAgendas).where(eq(resumenesDiariosAgendas.id_cuenta, idCuenta)),
  ]);
  const advisorMap = new Map<string, string>();
  for (const r of callRows) { if (r.closer_mail) advisorMap.set(r.closer_mail, r.nombre_closer ?? r.closer_mail); }
  for (const a of agendaRows) { if (a.closer && !advisorMap.has(a.closer)) advisorMap.set(a.closer, a.closer); }
  return [...advisorMap.entries()].map(([email, name]) => ({ id: email, name, email }));
}
