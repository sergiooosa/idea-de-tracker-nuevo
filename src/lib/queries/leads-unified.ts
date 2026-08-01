import { db } from "@/lib/db";
import {
  chatsLogs,
  logLlamadas,
  resumenesDiariosAgendas,
  registrosDeLlamada,
  usuariosDashboard,
} from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { zonedDayRange } from "@/lib/date-range";
import type {
  UnifiedLead,
  UnifiedLeadChat,
  UnifiedLeadCall,
  UnifiedLeadAppointment,
  UnifiedLeadsResponse,
  JourneyStage,
  ApiAdvisor,
  ApiChatMessage,
} from "@/types";

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/\D/g, "").slice(-10);
}

function leadKey(email: string | null, phone: string | null, ghlContactId: string | null): string {
  if (ghlContactId) return `ghl:${ghlContactId}`;
  if (email) return `email:${email.toLowerCase().trim()}`;
  if (phone) return `phone:${normalizePhone(phone)}`;
  return "";
}

interface LeadBucket {
  name: string;
  email: string | null;
  phone: string | null;
  ghlContactId: string | null;
  advisor: string | null;
  lastActivity: string;
  chats: UnifiedLeadChat[];
  calls: UnifiedLeadCall[];
  appointments: UnifiedLeadAppointment[];
}

function chatMsgToApi(m: ChatMessage): ApiChatMessage {
  return {
    name: m.name,
    role: m.role,
    type: m.type,
    message: m.message,
    timestamp: m.timestamp,
  };
}

export async function getUnifiedLeads(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmails?: string[],
): Promise<UnifiedLeadsResponse> {
  const { fromDate: start, toDate: end } = zonedDayRange(dateFrom, dateTo, null);

  // ── Advisors list ─────────────────────────────────────────────────────────
  const usuarios = await db
    .select({
      email: usuariosDashboard.email,
      nombre: usuariosDashboard.nombre_closer,
    })
    .from(usuariosDashboard)
    .where(eq(usuariosDashboard.id_cuenta, idCuenta));

  const advisorMap = new Map<string, ApiAdvisor>();
  for (const u of usuarios) {
    if (u.email) {
      advisorMap.set(u.email.toLowerCase(), {
        id: u.email.toLowerCase(),
        name: u.nombre ?? u.email,
        email: u.email,
      });
    }
  }

  // ── Chats ─────────────────────────────────────────────────────────────────
  const chatRows = await db
    .select({
      id: chatsLogs.id_evento,
      datetime: chatsLogs.fecha_y_hora_z,
      nombre_lead: chatsLogs.nombre_lead,
      estado: chatsLogs.estado,
      asesor: chatsLogs.asesor_asignado,
      chat: chatsLogs.chat,
      id_lead: chatsLogs.id_lead,
      iaCategoria: chatsLogs.ia_categoria,
      primerMsgLeadAt: chatsLogs.primer_msg_lead_at,
      primerMsgAt: chatsLogs.primer_msg_at,
      excluida: chatsLogs.excluida_dashboard,
    })
    .from(chatsLogs)
    .where(
      and(
        eq(chatsLogs.id_cuenta, idCuenta),
        gte(chatsLogs.fecha_y_hora_z, start),
        lte(chatsLogs.fecha_y_hora_z, end),
        ...(closerEmails?.length
          ? [sql`lower(${chatsLogs.asesor_asignado}) = ANY(${sql.raw(`ARRAY[${closerEmails.map((e) => `'${e.toLowerCase().replace(/'/g, "''")}'`).join(",")}]`)})`]
          : []),
      ),
    );

  // ── Llamadas (log_llamadas) ───────────────────────────────────────────────
  const callRows = await db
    .select({
      id: logLlamadas.id,
      datetime: logLlamadas.ts,
      nombre_lead: logLlamadas.nombre_lead,
      mail_lead: logLlamadas.mail_lead,
      phone: logLlamadas.phone,
      contact_id_ghl: logLlamadas.contact_id_ghl,
      tipoEvento: logLlamadas.tipo_evento,
      estadoResultado: logLlamadas.estado_resultado,
      closerName: logLlamadas.nombre_closer,
      closerMail: logLlamadas.closer_mail,
      duracion: logLlamadas.duracion_segundos,
      transcripcion: logLlamadas.transcripcion,
      iaDescripcion: logLlamadas.ia_descripcion,
      speedToLead: logLlamadas.speed_to_lead,
    })
    .from(logLlamadas)
    .where(
      and(
        eq(logLlamadas.id_cuenta, idCuenta),
        gte(logLlamadas.ts, start),
        lte(logLlamadas.ts, end),
        ...(closerEmails?.length
          ? [sql`lower(${logLlamadas.closer_mail}) = ANY(${sql.raw(`ARRAY[${closerEmails.map((e) => `'${e.toLowerCase().replace(/'/g, "''")}'`).join(",")}]`)})`]
          : []),
      ),
    );

  // ── Citas (resumenes_diarios_agendas) ─────────────────────────────────────
  const appointmentRows = await db
    .select({
      id: resumenesDiariosAgendas.id_registro_agenda,
      fecha: resumenesDiariosAgendas.fecha,
      fechaReunion: resumenesDiariosAgendas.fecha_reunion,
      nombre_lead: resumenesDiariosAgendas.nombre_de_lead,
      email_lead: resumenesDiariosAgendas.email_lead,
      ghl_contact_id: resumenesDiariosAgendas.ghl_contact_id,
      closer: resumenesDiariosAgendas.closer,
      categoria: resumenesDiariosAgendas.categoria,
      cashCollected: resumenesDiariosAgendas.cash_collected,
      facturacion: resumenesDiariosAgendas.facturacion,
      resumenIa: resumenesDiariosAgendas.resumen_ia,
      linkLlamada: resumenesDiariosAgendas.link_llamada,
      excluida: resumenesDiariosAgendas.excluida_dashboard,
    })
    .from(resumenesDiariosAgendas)
    .where(
      and(
        eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
        gte(resumenesDiariosAgendas.fecha, dateFrom),
        lte(resumenesDiariosAgendas.fecha, dateTo),
        ...(closerEmails?.length
          ? [sql`lower(${resumenesDiariosAgendas.closer}) = ANY(${sql.raw(`ARRAY[${closerEmails.map((e) => `'${e.toLowerCase().replace(/'/g, "''")}'`).join(",")}]`)})`]
          : []),
      ),
    );

  // ── Also get registros_de_llamada for phone/email matching ────────────────
  const registroRows = await db
    .select({
      id_registro: registrosDeLlamada.id_registro,
      nombre_lead: registrosDeLlamada.nombre_lead,
      mail_lead: registrosDeLlamada.mail_lead,
      phone: registrosDeLlamada.phone_raw_format,
      ghl_contact_id: registrosDeLlamada.ghl_contact_id,
    })
    .from(registrosDeLlamada)
    .where(eq(registrosDeLlamada.id_cuenta, String(idCuenta)));

  const registroByName = new Map<string, typeof registroRows[0]>();
  for (const r of registroRows) {
    if (r.nombre_lead) registroByName.set(r.nombre_lead.toLowerCase().trim(), r);
  }

  // ── Merge into lead buckets ───────────────────────────────────────────────
  const buckets = new Map<string, LeadBucket>();

  function getOrCreate(key: string, name: string, email: string | null, phone: string | null, ghlContactId: string | null): LeadBucket {
    if (!key) {
      key = `name:${name.toLowerCase().trim()}`;
    }
    let b = buckets.get(key);
    if (!b) {
      b = {
        name,
        email,
        phone,
        ghlContactId,
        advisor: null,
        lastActivity: "",
        chats: [],
        calls: [],
        appointments: [],
      };
      buckets.set(key, b);
    }
    if (!b.email && email) b.email = email;
    if (!b.phone && phone) b.phone = phone;
    if (!b.ghlContactId && ghlContactId) b.ghlContactId = ghlContactId;
    return b;
  }

  // Process chats
  for (const c of chatRows) {
    if (c.excluida) continue;
    const name = c.nombre_lead ?? "Sin nombre";
    const registro = registroByName.get(name.toLowerCase().trim());
    const email = registro?.mail_lead ?? null;
    const phone = registro?.phone ?? null;
    const ghlId = c.id_lead ?? registro?.ghl_contact_id ?? null;

    const key = leadKey(email, phone, ghlId) || `name:${name.toLowerCase().trim()}`;
    const bucket = getOrCreate(key, name, email, phone, ghlId);

    const messages = (c.chat ?? []) as ChatMessage[];
    const leadMsgs = messages.filter((m) => m.role === "lead").length;
    const agentMsgs = messages.filter((m) => m.role === "agent").length;
    const humanTookOver = agentMsgs > 0;

    let speedToLead: number | null = null;
    if (c.primerMsgLeadAt && c.primerMsgAt) {
      speedToLead = Math.round((c.primerMsgAt.getTime() - c.primerMsgLeadAt.getTime()) / 1000);
      if (speedToLead < 0) speedToLead = null;
    }

    const dt = c.datetime?.toISOString() ?? "";
    bucket.chats.push({
      id: c.id,
      datetime: dt,
      estado: c.estado,
      asesor: c.asesor,
      totalMessages: messages.length,
      leadMessages: leadMsgs,
      agentMessages: agentMsgs,
      speedToLeadSeconds: speedToLead,
      humanTookOver,
      iaCategoria: c.iaCategoria,
      messages: messages.map(chatMsgToApi),
    });

    if (c.asesor && !bucket.advisor) bucket.advisor = c.asesor;
    if (dt > bucket.lastActivity) bucket.lastActivity = dt;
  }

  // Process calls
  for (const c of callRows) {
    const name = c.nombre_lead ?? "Sin nombre";
    const email = c.mail_lead ?? null;
    const phone = c.phone ?? null;
    const ghlId = c.contact_id_ghl ?? null;

    const key = leadKey(email, phone, ghlId) || `name:${name.toLowerCase().trim()}`;
    const bucket = getOrCreate(key, name, email, phone, ghlId);

    const outcome = mapCallOutcome(c.tipoEvento, c.estadoResultado);
    const stl = c.speedToLead ? parseFloat(c.speedToLead) : null;

    const dt = c.datetime?.toISOString() ?? "";
    bucket.calls.push({
      id: c.id,
      datetime: dt,
      tipoEvento: c.tipoEvento,
      outcome,
      closerName: c.closerName,
      closerMail: c.closerMail,
      duracionSegundos: c.duracion,
      transcripcion: c.transcripcion,
      iaDescripcion: c.iaDescripcion,
      speedToLeadMinutes: stl,
    });

    if (c.closerName && !bucket.advisor) bucket.advisor = c.closerName;
    if (dt > bucket.lastActivity) bucket.lastActivity = dt;
  }

  // Process appointments
  for (const a of appointmentRows) {
    if (a.excluida) continue;
    const name = a.nombre_lead ?? "Sin nombre";
    const email = a.email_lead ?? null;
    const ghlId = a.ghl_contact_id ?? null;

    const key = leadKey(email, null, ghlId) || `name:${name.toLowerCase().trim()}`;
    const bucket = getOrCreate(key, name, email, null, ghlId);

    const dt = a.fechaReunion?.toISOString() ?? a.fecha ?? "";
    const cat = a.categoria ?? null;
    const attended = !!cat && !["cancelada", "no_show", "no-show", "default-cancelada", "default-no-show"].includes(cat.toLowerCase());
    const qualified = !!cat && ["calificada", "cerrada", "complet", "default-agendada", "default-asistida", "default-ofertada"].includes(cat.toLowerCase());
    const canceled = !!cat && ["cancelada", "default-cancelada"].includes(cat.toLowerCase());

    bucket.appointments.push({
      id: a.id,
      datetime: dt,
      closer: a.closer,
      categoria: cat,
      attended,
      qualified,
      canceled,
      facturacion: a.facturacion ? parseFloat(a.facturacion) : 0,
      cashCollected: a.cashCollected ? parseFloat(a.cashCollected) : 0,
      resumenIa: a.resumenIa,
      linkLlamada: a.linkLlamada,
    });

    if (a.closer && !bucket.advisor) bucket.advisor = a.closer;
    if (dt > bucket.lastActivity) bucket.lastActivity = dt;
  }

  // ── Build response ────────────────────────────────────────────────────────
  let soloChat = 0;
  let chatLlamada = 0;
  let cita = 0;

  const leads: UnifiedLead[] = [];
  let idx = 0;
  for (const [key, b] of buckets) {
    const hasChat = b.chats.length > 0;
    const hasCall = b.calls.length > 0;
    const hasAppointment = b.appointments.length > 0;

    let stage: JourneyStage;
    if (hasAppointment) {
      stage = "cita";
      cita++;
    } else if (hasCall) {
      stage = "chat_llamada";
      chatLlamada++;
    } else {
      stage = "solo_chat";
      soloChat++;
    }

    // Sort sub-arrays by datetime desc
    b.chats.sort((a, c) => c.datetime.localeCompare(a.datetime));
    b.calls.sort((a, c) => c.datetime.localeCompare(a.datetime));
    b.appointments.sort((a, c) => c.datetime.localeCompare(a.datetime));

    leads.push({
      id: `lead-${idx++}`,
      name: b.name,
      email: b.email,
      phone: b.phone,
      ghlContactId: b.ghlContactId,
      journeyStage: stage,
      lastActivity: b.lastActivity,
      advisor: b.advisor,
      chats: b.chats,
      calls: b.calls,
      appointments: b.appointments,
    });
  }

  // Sort leads by last activity desc
  leads.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));

  return {
    leads,
    agg: {
      total: leads.length,
      soloChat,
      chatLlamada,
      cita,
    },
    advisors: Array.from(advisorMap.values()),
  };
}

function mapCallOutcome(tipo: string, estado: string | null): string {
  const t = tipo.toLowerCase();
  if (t.startsWith("efectiva")) return "answered";
  if (t === "no_contesto" || t === "no_contestado") return "no_answer";
  if (t === "buzon") return "voicemail";
  return estado ?? "pending";
}
