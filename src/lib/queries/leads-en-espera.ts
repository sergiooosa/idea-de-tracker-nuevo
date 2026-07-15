import { db } from "@/lib/db";
import { registrosDeLlamada, logLlamadas, cuentas, chatsLogs } from "@/lib/db/schema";
import { eq, and, isNull, lt, gt, gte, lte, sql, inArray, isNotNull } from "drizzle-orm";
import { zonedDayRange } from "@/lib/date-range";

export type CanalLeadsEnEspera = "llamada" | "chat" | "general";

export interface LeadEnEspera {
  nombre_lead: string;
  nombre_closer: string | null;
  closer_mail: string | null;
  creativo_origen: string | null;
  min_sin_llamar: number;
  phone: string | null;
  mail_lead: string | null;
  canal_origen?: "llamada" | "chat";
}

export interface CloserConLeadsEnEspera {
  nombre_closer: string;
  closer_mail: string | null;
  leads: LeadEnEspera[];
  lead_mas_antiguo_min: number;
}

export interface LeadsEnEsperaResponse {
  grupos: CloserConLeadsEnEspera[];
  total: number;
  umbral_min: number;
  canal: CanalLeadsEnEspera;
}

const UMBRAL_MINUTOS = 60;
const VENTANA_ACTIVIDAD_LLAMADAS_DIAS = 90;

interface DateRange {
  fromDate?: Date;
  toDate?: Date;
}

async function resolveDateRange(
  idCuenta: number,
  dateFrom?: string,
  dateTo?: string,
): Promise<DateRange> {
  let fromDate: Date | undefined;
  let toDate: Date | undefined;
  if (dateFrom && dateTo) {
    const [tzRow] = await db.select({ zona_horaria_iana: cuentas.zona_horaria_iana }).from(cuentas).where(eq(cuentas.id_cuenta, idCuenta)).limit(1);
    const range = zonedDayRange(dateFrom, dateTo, tzRow?.zona_horaria_iana);
    fromDate = range.fromDate;
    toDate = range.toDate;
  } else if (dateFrom) {
    const [tzRow] = await db.select({ zona_horaria_iana: cuentas.zona_horaria_iana }).from(cuentas).where(eq(cuentas.id_cuenta, idCuenta)).limit(1);
    fromDate = zonedDayRange(dateFrom, dateFrom, tzRow?.zona_horaria_iana).fromDate;
  }
  return { fromDate, toDate };
}

async function getLeadsLlamada(
  idCuenta: number,
  umbralTs: Date,
  range: DateRange,
  closerEmails: string[],
): Promise<LeadEnEspera[]> {
  const idCuentaStr = String(idCuenta);
  const ventanaActividad = new Date(
    Date.now() - VENTANA_ACTIVIDAD_LLAMADAS_DIAS * 24 * 60 * 60 * 1000,
  );
  const [actividadLlamadas] = await db
    .select({ total: sql<number>`COUNT(*)::int` })
    .from(logLlamadas)
    .where(
      and(
        eq(logLlamadas.id_cuenta, idCuenta),
        gt(logLlamadas.ts, ventanaActividad),
      ),
    );

  if (!actividadLlamadas || actividadLlamadas.total === 0) {
    return [];
  }

  const rows = await db
    .select({
      nombre_lead: registrosDeLlamada.nombre_lead,
      nombre_closer: registrosDeLlamada.nombre_closer,
      closer_mail: registrosDeLlamada.closer_mail,
      creativo_origen: registrosDeLlamada.creativo_origen,
      phone: registrosDeLlamada.phone_raw_format,
      mail_lead: registrosDeLlamada.mail_lead,
      min_sin_llamar: sql<number>`ROUND(EXTRACT(EPOCH FROM (NOW() - ${registrosDeLlamada.fecha_evento}))/60)::int`,
    })
    .from(registrosDeLlamada)
    .where(
      and(
        eq(registrosDeLlamada.id_cuenta, idCuentaStr),
        isNull(registrosDeLlamada.fecha_primera_llamada),
        eq(registrosDeLlamada.estado, "pdte"),
        lt(registrosDeLlamada.fecha_evento, umbralTs),
        range.fromDate ? gte(registrosDeLlamada.fecha_evento, range.fromDate) : undefined,
        range.toDate ? lte(registrosDeLlamada.fecha_evento, range.toDate) : undefined,
        closerEmails.length > 0
          ? inArray(registrosDeLlamada.closer_mail, closerEmails)
          : undefined,
      ),
    )
    .orderBy(sql`ROUND(EXTRACT(EPOCH FROM (NOW() - ${registrosDeLlamada.fecha_evento}))/60)::int DESC`);

  return rows.map((row) => ({
    nombre_lead: row.nombre_lead ?? "Lead sin nombre",
    nombre_closer: row.nombre_closer,
    closer_mail: row.closer_mail,
    creativo_origen: row.creativo_origen,
    min_sin_llamar: Number(row.min_sin_llamar) || 0,
    phone: row.phone,
    mail_lead: row.mail_lead,
    canal_origen: "llamada" as const,
  }));
}

async function getLeadsChat(
  idCuenta: number,
  umbralTs: Date,
  range: DateRange,
  closerEmails: string[],
): Promise<LeadEnEspera[]> {
  // Leads de chat sin contacto: el lead envió un primer mensaje hace > umbral
  // y ningún agente/asesor ha respondido aún en la conversación.
  const rows = await db
    .select({
      nombre_lead: chatsLogs.nombre_lead,
      asesor_asignado: chatsLogs.asesor_asignado,
      notas_extra: chatsLogs.notas_extra,
      origen: chatsLogs.origen,
      primer_msg_lead_at: chatsLogs.primer_msg_lead_at,
      min_sin_llamar: sql<number>`ROUND(EXTRACT(EPOCH FROM (NOW() - ${chatsLogs.primer_msg_lead_at}))/60)::int`,
    })
    .from(chatsLogs)
    .where(
      and(
        eq(chatsLogs.id_cuenta, idCuenta),
        isNotNull(chatsLogs.primer_msg_lead_at),
        lt(chatsLogs.primer_msg_lead_at, umbralTs),
        sql`NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${chatsLogs.chat}) elem WHERE elem->>'role' = 'agent')`,
        sql`COALESCE(${chatsLogs.excluida_dashboard}, false) = false`,
        range.fromDate ? gte(chatsLogs.primer_msg_lead_at, range.fromDate) : undefined,
        range.toDate ? lte(chatsLogs.primer_msg_lead_at, range.toDate) : undefined,
        closerEmails.length > 0
          ? sql`COALESCE(${chatsLogs.asesor_asignado}, NULLIF(TRIM(${chatsLogs.notas_extra}), 'por asignar')) IN (${sql.join(closerEmails.map(e => sql`${e}`), sql`, `)})`
          : undefined,
      ),
    )
    .orderBy(sql`ROUND(EXTRACT(EPOCH FROM (NOW() - ${chatsLogs.primer_msg_lead_at}))/60)::int DESC`);

  return rows.map((row) => {
    const resolvedCloser = row.asesor_asignado?.trim()
      || (row.notas_extra?.trim() !== "por asignar" ? row.notas_extra?.trim() : null)
      || null;
    return {
      nombre_lead: row.nombre_lead ?? "Lead sin nombre",
      nombre_closer: resolvedCloser,
      closer_mail: resolvedCloser,
      creativo_origen: row.origen,
      min_sin_llamar: Number(row.min_sin_llamar) || 0,
      phone: null,
      mail_lead: null,
      canal_origen: "chat" as const,
    };
  });
}

function agruparPorCloser(leads: LeadEnEspera[]): CloserConLeadsEnEspera[] {
  const mapaClosers = new Map<string, CloserConLeadsEnEspera>();

  for (const lead of leads) {
    const closerKey = lead.closer_mail ?? lead.nombre_closer ?? "sin_asignar";
    const closerNombre = lead.nombre_closer ?? lead.closer_mail ?? "Sin asignar";

    if (!mapaClosers.has(closerKey)) {
      mapaClosers.set(closerKey, {
        nombre_closer: closerNombre,
        closer_mail: lead.closer_mail,
        leads: [],
        lead_mas_antiguo_min: 0,
      });
    }

    const grupo = mapaClosers.get(closerKey);
    if (!grupo) continue;

    grupo.leads.push(lead);

    if (lead.min_sin_llamar > grupo.lead_mas_antiguo_min) {
      grupo.lead_mas_antiguo_min = lead.min_sin_llamar;
    }
  }

  return Array.from(mapaClosers.values()).sort(
    (a, b) => b.lead_mas_antiguo_min - a.lead_mas_antiguo_min,
  );
}

export async function getLeadsEnEspera(
  idCuenta: number,
  dateFrom?: string,
  dateTo?: string,
  closerEmails?: string[],
  canal: CanalLeadsEnEspera = "llamada",
): Promise<LeadsEnEsperaResponse> {
  const umbralTs = new Date(Date.now() - UMBRAL_MINUTOS * 60 * 1000);
  const range = await resolveDateRange(idCuenta, dateFrom, dateTo);
  const emails = (closerEmails ?? []).map((e) => e.trim()).filter(Boolean);

  let leads: LeadEnEspera[];
  if (canal === "llamada") {
    leads = await getLeadsLlamada(idCuenta, umbralTs, range, emails);
  } else if (canal === "chat") {
    leads = await getLeadsChat(idCuenta, umbralTs, range, emails);
  } else {
    const [llamadas, chats] = await Promise.all([
      getLeadsLlamada(idCuenta, umbralTs, range, emails),
      getLeadsChat(idCuenta, umbralTs, range, emails),
    ]);
    leads = [...llamadas, ...chats];
  }

  const grupos = agruparPorCloser(leads);

  return {
    grupos,
    total: leads.length,
    umbral_min: UMBRAL_MINUTOS,
    canal,
  };
}
