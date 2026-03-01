import { db } from "@/lib/db";
import { logLlamadas, registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  AsesorKpis,
  AsesorLeadCRM,
  AsesorResponse,
  ApiAdvisor,
} from "@/types";

function getCrmCategoria(estado: string | null): AsesorLeadCRM["categoria"] {
  if (!estado) return "primera_llamada";
  const e = estado.toLowerCase().trim();
  if (e === "no_interesado") return "no_interesados";
  if (["interesado", "programado"].includes(e)) return "interesados";
  if (["pdte"].includes(e)) return "primera_llamada";
  return "seguimiento";
}

export async function getAsesorData(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  advisorEmail?: string,
): Promise<AsesorResponse> {
  const fromTs = new Date(`${dateFrom}T00:00:00Z`);
  const toTs = new Date(`${dateTo}T23:59:59.999Z`);

  const callConditions = [
    eq(logLlamadas.id_cuenta, idCuenta),
    gte(logLlamadas.ts, fromTs),
    lte(logLlamadas.ts, toTs),
  ];
  if (advisorEmail) {
    callConditions.push(eq(logLlamadas.closer_mail, advisorEmail));
  }

  const callRows = await db
    .select()
    .from(logLlamadas)
    .where(and(...callConditions))
    .orderBy(sql`${logLlamadas.ts} DESC`);

  const idCuentaStr = String(idCuenta);
  const regConditions = [eq(registrosDeLlamada.id_cuenta, idCuentaStr)];
  if (advisorEmail) {
    regConditions.push(eq(registrosDeLlamada.closer_mail, advisorEmail));
  }

  const regRows = await db
    .select()
    .from(registrosDeLlamada)
    .where(and(...regConditions))
    .orderBy(sql`${registrosDeLlamada.fecha_evento} DESC`);

  const contestadas = callRows.filter((c) => c.tipo_evento.startsWith("efectiva_")).length;
  const leadsUnique = new Set(callRows.map((c) => c.mail_lead).filter(Boolean));

  const kpis: AsesorKpis = {
    leadsAsignados: leadsUnique.size,
    llamadasRealizadas: callRows.length,
    llamadasContestadas: contestadas,
    reunionesAgendadas: 0,
    tasaContacto: callRows.length > 0 ? (contestadas / callRows.length) * 100 : 0,
    tasaAgendamiento: 0,
  };

  const leadMap: Record<string, AsesorLeadCRM> = {};
  for (const r of regRows) {
    const key = r.mail_lead ?? String(r.id_registro);
    if (leadMap[key]) continue;
    const stl = r.speed_to_lead ? `${parseFloat(r.speed_to_lead) || 0} min` : "—";

    const notasArr: { date: string; text: string }[] = [];
    if (r.iadescripcion?.trim()) {
      notasArr.push({
        date: r.fecha_evento?.toISOString() ?? "",
        text: r.iadescripcion,
      });
    }

    leadMap[key] = {
      id: String(r.id_registro),
      name: r.nombre_lead ?? key,
      email: r.mail_lead ?? null,
      phone: r.phone_raw_format ?? null,
      estado: r.estado,
      categoria: getCrmCategoria(r.estado),
      intentosContacto: r.intentos_contacto ?? 0,
      speedToLead: stl,
      notasLlamadas: notasArr,
      leadNote: null,
    };
  }

  const leads = Object.values(leadMap);

  const advisorSet = new Set<string>();
  for (const c of callRows) {
    if (c.closer_mail) advisorSet.add(c.closer_mail);
  }
  const advisors: ApiAdvisor[] = [...advisorSet].map((email) => {
    const name = callRows.find((c) => c.closer_mail === email)?.nombre_closer ?? email;
    return { id: email, name, email };
  });

  return { kpis, leads, advisors };
}
