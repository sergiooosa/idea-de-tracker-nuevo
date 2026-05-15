import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, isNull, lt, sql } from "drizzle-orm";

export interface LeadEnEspera {
  nombre_lead: string;
  nombre_closer: string | null;
  closer_mail: string | null;
  creativo_origen: string | null;
  min_sin_llamar: number;
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

export async function getLeadsEnEspera(
  idCuenta: number,
): Promise<LeadsEnEsperaResponse> {
  const umbralTs = new Date(Date.now() - UMBRAL_MINUTOS * 60 * 1000);
  const idCuentaStr = String(idCuenta);

  const rows = await db
    .select({
      nombre_lead: registrosDeLlamada.nombre_lead,
      nombre_closer: registrosDeLlamada.nombre_closer,
      closer_mail: registrosDeLlamada.closer_mail,
      creativo_origen: registrosDeLlamada.creativo_origen,
      min_sin_llamar: sql<number>`ROUND(EXTRACT(EPOCH FROM (NOW() - ${registrosDeLlamada.fecha_evento}))/60)::int`,
    })
    .from(registrosDeLlamada)
    .where(
      and(
        eq(registrosDeLlamada.id_cuenta, idCuentaStr),
        isNull(registrosDeLlamada.fecha_primera_llamada),
        eq(registrosDeLlamada.estado, "pdte"),
        lt(registrosDeLlamada.fecha_evento, umbralTs),
      ),
    )
    .orderBy(sql`min_sin_llamar DESC`);

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

    const grupo = mapaClosers.get(closerKey)!;
    const minSinLlamar = Number(row.min_sin_llamar) || 0;

    grupo.leads.push({
      nombre_lead: row.nombre_lead ?? "Lead sin nombre",
      nombre_closer: row.nombre_closer,
      closer_mail: row.closer_mail,
      creativo_origen: row.creativo_origen,
      min_sin_llamar: minSinLlamar,
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
