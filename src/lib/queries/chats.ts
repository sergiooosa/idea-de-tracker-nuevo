import { db } from "@/lib/db";
import { chatsLogs } from "@/lib/db/schema";
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

export async function getChats(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
): Promise<ChatsResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const rows = await db
    .select()
    .from(chatsLogs)
    .where(
      and(
        eq(chatsLogs.id_cuenta, idCuenta),
        gte(chatsLogs.fecha_y_hora_z, fromDate),
        lte(chatsLogs.fecha_y_hora_z, toDate),
      ),
    )
    .orderBy(sql`${chatsLogs.fecha_y_hora_z} DESC`);

  const chatsList: ApiChatLead[] = rows.map((r) => {
    const msgs: ChatMessage[] = Array.isArray(r.chat) ? r.chat : [];
    const agentMsgs = msgs.filter((m) => m.role === "agent");
    const leadMsgs = msgs.filter((m) => m.role === "lead");
    const agentName = extractAgentName(msgs);
    const speed = computeSpeedToLead(msgs);

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
      estado: r.estado,
      notasExtra: r.notas_extra,
      messages: msgs.map((m) => ({
        name: m.name,
        role: m.role,
        type: m.type,
        message: m.message,
        timestamp: m.timestamp,
      })),
    };
  });

  const contacted = chatsList.filter((c) => c.agentMessages > 0);
  const speedVals = chatsList
    .filter((c) => c.speedToLeadSeconds != null)
    .map((c) => c.speedToLeadSeconds!);

  const agg = {
    assigned: chatsList.length,
    activos: contacted.length,
    seguimientosTotal: chatsList.reduce((s, c) => s + c.totalMessages, 0),
    speedAvg: speedVals.length > 0 ? speedVals.reduce((s, v) => s + v, 0) / speedVals.length : 0,
  };

  const byAgent: Record<string, ApiChatLead[]> = {};
  for (const c of chatsList) {
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

  return { chats: chatsList, agg, advisorMetrics, advisors };
}
