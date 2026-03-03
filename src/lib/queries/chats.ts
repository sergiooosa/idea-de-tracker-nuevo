import { db } from "@/lib/db";
import { chatsLogs, cuentas } from "@/lib/db/schema";
import type { ChatMessage, ChatTrigger } from "@/lib/db/schema";
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

function computeSpeedToLead(messages: ChatMessage[]): number | null {
  const firstLead = messages.find((m) => m.role === "lead");
  const firstAgent = messages.find((m) => m.role === "agent");
  if (!firstLead?.timestamp || !firstAgent?.timestamp) return null;
  const leadTime = new Date(firstLead.timestamp).getTime();
  const agentTime = new Date(firstAgent.timestamp).getTime();
  if (isNaN(leadTime) || isNaN(agentTime)) return null;
  const diffSec = (agentTime - leadTime) / 1000;
  return diffSec > 0 ? diffSec : null;
}

function applyTriggers(
  msgs: ChatMessage[],
  triggers: ChatTrigger[],
): { nuevoEstado: string | null; triggerUsado: string | null } {
  if (!triggers.length) return { nuevoEstado: null, triggerUsado: null };
  const agentMsgs = msgs.filter((m) => m.role === "agent");
  for (let i = agentMsgs.length - 1; i >= 0; i--) {
    const text = agentMsgs[i].message ?? "";
    for (const t of triggers) {
      if (text.includes(t.trigger)) {
        return { nuevoEstado: t.valor, triggerUsado: t.trigger };
      }
    }
  }
  return { nuevoEstado: null, triggerUsado: null };
}

export async function getChats(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmail?: string,
): Promise<ChatsResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [[cuentaRow], rows] = await Promise.all([
    db
      .select({ chat_triggers: cuentas.chat_triggers })
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

  const triggers: ChatTrigger[] = Array.isArray(cuentaRow?.chat_triggers)
    ? cuentaRow.chat_triggers
    : [];

  const chatsList: ApiChatLead[] = rows.map((r) => {
    const msgs: ChatMessage[] = Array.isArray(r.chat) ? r.chat : [];
    const agentMsgs = msgs.filter((m) => m.role === "agent");
    const leadMsgs = msgs.filter((m) => m.role === "lead");
    const agentName = extractAgentName(msgs);
    const speed = computeSpeedToLead(msgs);

    const { nuevoEstado, triggerUsado } = applyTriggers(msgs, triggers);

    return {
      id: r.id_evento,
      leadName: r.nombre_lead,
      leadId: r.id_lead,
      agentName,
      datetime: r.fecha_y_hora_z?.toISOString() ?? "",
      totalMessages: msgs.length,
      agentMessages: agentMsgs.length,
      leadMessages: leadMsgs.length,
      speedToLeadSeconds: speed,
      estado: nuevoEstado ?? r.estado,
      notasExtra: r.notas_extra,
      messages: msgs.map((m) => ({
        name: m.name,
        role: m.role,
        type: m.type,
        message: m.message,
        timestamp: m.timestamp,
      })),
      tagsInternos: Array.isArray(r.tags_internos) ? r.tags_internos : undefined,
      triggerAplicado: triggerUsado ?? undefined,
    };
  });

  const filteredChats = closerEmail
    ? chatsList.filter((c) => c.agentName?.toLowerCase() === closerEmail.toLowerCase())
    : chatsList;
  const chatsFinal = closerEmail ? filteredChats : chatsList;

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
