import { db } from "@/lib/db";
import { registrosDeLlamada, logLlamadas, cuentas } from "@/lib/db/schema";
import { eq, and, isNull, lt, gt, gte, lte, sql, inArray } from "drizzle-orm";
import { zonedDayRange } from "@/lib/date-range";

export interface LeadEnEspera {
  nombre_lead: string;
  nombre_closer: string | null;
  closer_mail: string | null;
  creativo_origen: string | null;
  min_sin_llamar: number;
  phone: string | null;
  mail_lead: string | null;
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
}

const UMBRAL_MINUTOS = 60;
const VENTANA_ACTIVIDAD_LLAMADAS_DIAS = 90;

export async function getLeadsEnEspera(
  idCuenta: number,
  dateFrom?: string,
  dateTo?: string,
  closerEmails?: string[],
): Promise<LeadsEnEsperaResponse> {
  const umbralTs = new Date(Date.now() - UMBRAL_MINUTOS * 60 * 1000);
  const idCuentaStr = String(idCuenta);
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

  // Si la cuenta no tiene llamadas en los últimos 90 días, es un cliente de canal
  // Chats/WhatsApp. La métrica "sin contacto inicial" usa fecha_primera_llamada
  // que nunca se llena para estos clientes → devolver vacío para evitar falsas alarmas.
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
    return { grupos: [], total: 0, umbral_min: UMBRAL_MINUTOS };
  }

  const emails = (closerEmails ?? []).map((e) => e.trim()).filter(Boolean);
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
        fromDate ? gte(registrosDeLlamada.fecha_evento, fromDate) : undefined,
        toDate ? lte(registrosDeLlamada.fecha_evento, toDate) : undefined,
        // Filtro por asesor: solo para usuarios sin permiso ver_todo.
        // Previene que asesores vean pendientes de sus colegas.
        emails.length > 0
          ? inArray(registrosDeLlamada.closer_mail, emails)
          : undefined,
      ),
    )
    .orderBy(sql`ROUND(EXTRACT(EPOCH FROM (NOW() - ${registrosDeLlamada.fecha_evento}))/60)::int DESC`);

  // Agrupar por closer
  const mapaClosers = new Map<string, CloserConLeadsEnEspera>();

  for (const row of rows) {
    const closerKey = row.closer_mail ?? row.nombre_closer ?? "sin_asignar";
    const closerNombre = row.nombre_closer ?? row.closer_mail ?? "Sin asignar";

    if (!mapaClosers.has(closerKey)) {
      mapaClosers.set(closerKey, {
        nombre_closer: closerNombre,
        closer_mail: row.closer_mail,
        leads: [],
        lead_mas_antiguo_min: 0,
      });
    }

    const grupo = mapaClosers.get(closerKey);
    if (!grupo) continue;
    const minSinLlamar = Number(row.min_sin_llamar) || 0;

    grupo.leads.push({
      nombre_lead: row.nombre_lead ?? "Lead sin nombre",
      nombre_closer: row.nombre_closer,
      closer_mail: row.closer_mail,
      creativo_origen: row.creativo_origen,
      min_sin_llamar: minSinLlamar,
      phone: row.phone,
      mail_lead: row.mail_lead,
    });

    if (minSinLlamar > grupo.lead_mas_antiguo_min) {
      grupo.lead_mas_antiguo_min = minSinLlamar;
    }
  }

  // Ordenar grupos por lead más antiguo (más urgente primero)
  const grupos = Array.from(mapaClosers.values()).sort(
    (a, b) => b.lead_mas_antiguo_min - a.lead_mas_antiguo_min,
  );

  return {
    grupos,
    total: rows.length,
    umbral_min: UMBRAL_MINUTOS,
  };
}
