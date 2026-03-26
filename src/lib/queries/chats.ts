import { db } from "@/lib/db";
import { chatsLogs, cuentas } from "@/lib/db/schema";
import type { ChatMessage } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  ApiChatLead,
  ChatsAdvisorMetrics,
  ChatsResponse,
  ApiAdvisor,
} from "@/types";

function extractAgentName(messages: ChatMessage[]): string | null {
  const agent = messages.find((m) => m.role === "agent");
  return agent?.name ?? null;
}

function computeSpeedToLead(
  messages: ChatMessage[],
  emojiTomaAtencion?: string,
  tieneChatbot?: boolean,
): number | null {
  const firstLead = messages.find((m) => m.role === "lead");
  if (!firstLead?.timestamp) return null;
  const leadTime = new Date(firstLead.timestamp).getTime();
  if (isNaN(leadTime)) return null;

  let agentTime: number | null = null;

  if (tieneChatbot && emojiTomaAtencion) {
    // Con chatbot: buscar primer mensaje de agente que contenga el emoji de toma de atención
    const takeoverMsg = messages.find(
      (m) => m.role === "agent" && (m.message ?? "").includes(emojiTomaAtencion),
    );
    if (takeoverMsg?.timestamp) {
      const ts = new Date(takeoverMsg.timestamp).getTime();
      if (!isNaN(ts)) agentTime = ts;
    }
  } else {
    // Sin chatbot: primer mensaje de agente
    const firstAgent = messages.find((m) => m.role === "agent");
    if (firstAgent?.timestamp) {
      const ts = new Date(firstAgent.timestamp).getTime();
      if (!isNaN(ts)) agentTime = ts;
    }
  }

  if (!agentTime) return null;
  const diffSec = (agentTime - leadTime) / 1000;
  return diffSec > 0 ? diffSec : null;
}

// applyTriggers: mantenido SOLO para calcular speed to lead (emoji_toma_atencion).
// Ya NO se usa para clasificar el estado del chat (ahora lo hace la IA).
function detectTakeoverEmoji(
  msgs: ChatMessage[],
  emojiTomaAtencion: string,
): boolean {
  return msgs.some((m) => m.role === "agent" && (m.message ?? "").includes(emojiTomaAtencion));
}

export async function getChats(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmails?: string[],
): Promise<ChatsResponse> {
  const emailsLower = (closerEmails ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [[cuentaRow], rows] = await Promise.all([
    db
      .select({ configuracion_ui: cuentas.configuracion_ui })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1),
    db
      .select()
      .from(chatsLogs)
      .where(
        and(
          eq(chatsLogs.id_cuenta, idCuenta),
          gte(chatsLogs.fecha_y_hora_z, fromDate),
          lte(chatsLogs.fecha_y_hora_z, toDate),
        ),
      )
      .orderBy(sql`${chatsLogs.fecha_y_hora_z} DESC`),
  ]);

  const chatConfig = cuentaRow?.configuracion_ui?.chat_config ?? {};
  const tieneChatbot = chatConfig.tiene_chatbot ?? false;
  const emojiTomaAtencion = chatConfig.emoji_toma_atencion ?? undefined;

  const chatsList: ApiChatLead[] = rows.map((r) => {
    const msgs: ChatMessage[] = Array.isArray(r.chat) ? r.chat : [];
    const agentMsgs = msgs.filter((m) => m.role === "agent");
    const leadMsgs = msgs.filter((m) => m.role === "lead");
    const agentName = extractAgentName(msgs);
    const speed = computeSpeedToLead(msgs, emojiTomaAtencion, tieneChatbot);

    // Estado proviene de la IA (chats_logs.estado escrito por analyzeChatsNightly)
    // Los triggers de emoji ya NO determinan el estado del chat.
    const estadoFinal = r.estado ?? null;

    return {
      id: r.id_evento,
      leadName: r.nombre_lead,
      leadId: r.id_lead,
      agentName,
      asesorAsignado: r.asesor_asignado ?? agentName ?? null,
      datetime: r.fecha_y_hora_z?.toISOString() ?? "",
      totalMessages: msgs.length,
      agentMessages: agentMsgs.length,
      leadMessages: leadMsgs.length,
      speedToLeadSeconds: speed,
      estado: estadoFinal,
      notasExtra: r.notas_extra,
      messages: msgs.map((m) => ({
        name: m.name,
        role: m.role,
        type: m.type,
        message: m.message,
        timestamp: m.timestamp,
      })),
      tagsInternos: Array.isArray(r.tags_internos) ? r.tags_internos : undefined,
    };
  });

  const filteredChats =
    emailsLower.length > 0
      ? chatsList.filter((c) => emailsLower.includes((c.agentName ?? "").trim().toLowerCase()))
      : chatsList;
  const chatsFinal = emailsLower.length > 0 ? filteredChats : chatsList;

  const contacted = chatsFinal.filter((c) => c.agentMessages > 0);
  const speedVals = chatsFinal
    .filter((c) => c.speedToLeadSeconds != null)
    .map((c) => c.speedToLeadSeconds!);

  const agg = {
    assigned: chatsFinal.length,
    activos: contacted.length,
    seguimientosTotal: chatsFinal.reduce((s, c) => s + c.totalMessages, 0),
    speedAvg: speedVals.length > 0 ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length : 0,
  };

  const byAgent: Record<string, ApiChatLead[]> = {};
  for (const c of chatsFinal) {
    const key = c.agentName ?? "Sin asignar";
    if (!byAgent[key]) byAgent[key] = [];
    byAgent[key].push(c);
  }

  const advisorMetrics: Record<string, ChatsAdvisorMetrics> = {};
  const advisors: ApiAdvisor[] = [];

  for (const [name, chats] of Object.entries(byAgent)) {
    const activos = chats.filter((c) => c.agentMessages > 0).length;
    const speeds = chats.filter((c) => c.speedToLeadSeconds != null).map((c) => c.speedToLeadSeconds!);
    advisorMetrics[name] = {
      advisorName: name,
      asignados: chats.length,
      activos,
      seguimientos: chats.reduce((s, c) => s + c.totalMessages, 0),
      speedToLead: speeds.length > 0 ? speeds.reduce((s, v) => s + v, 0) / speeds.length : null,
    };
    advisors.push({ id: name, name });
  }

  return { chats: chatsFinal, agg, advisorMetrics, advisors };
}

export async function updateChat(
  id: number,
  idCuenta: number,
  data: { nombre_lead?: string; closer?: string; estado?: string },
): Promise<boolean> {
  const [row] = await db
    .select({ id: chatsLogs.id_evento, id_cuenta: chatsLogs.id_cuenta })
    .from(chatsLogs)
    .where(eq(chatsLogs.id_evento, id))
    .limit(1);

  if (!row || row.id_cuenta !== idCuenta) return false;

  const setClause: Record<string, unknown> = {};
  if (data.nombre_lead !== undefined) setClause.nombre_lead = data.nombre_lead;
  if (data.estado !== undefined) setClause.estado = data.estado;

  if (Object.keys(setClause).length > 0) {
    await db.update(chatsLogs).set(setClause).where(eq(chatsLogs.id_evento, id));
  }

  return true;
}
