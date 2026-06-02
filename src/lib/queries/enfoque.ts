import { db } from "@/lib/db";
import {
  registrosDeLlamada,
  sesionesEnfoque,
  enfoqueResultado,
} from "@/lib/db/schema";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";
import { eq, and, sql, inArray, notInArray, asc } from "drizzle-orm";

export interface SiguienteLead {
  id_registro: number;
  nombre_lead: string | null;
  mail_lead: string | null;
  phone: string | null;
  closer_mail: string | null;
  nombre_closer: string | null;
  estado: string | null;
  intentos_contacto: number;
  fecha_evento: Date | null;
  creativo_origen: string | null;
}

/**
 * Normaliza un estado crudo de `registros_de_llamada` al set canónico de enfoque.
 * Misma lógica que normalizarEstado() en asesor.ts, pero sin "pendiente"/"otro"
 * ya que esos estados no son resultados de una llamada realizada.
 */
function estadoToCanonicoEnfoque(estado: string | null): ResultadoCanonicoEnfoque | null {
  if (!estado) return null;
  const limpio = estado.replace(/^\{(.+)\}$/, "$1").trim().toLowerCase();

  if (["no_contestado", "no_contesto", "nocontest", "no_contestada", "no contestado"].includes(limpio)) return "no_contesto";
  if (limpio === "buzon" || limpio === "buzón") return "buzon";
  if (limpio.startsWith("seguimiento")) return "seguimiento";
  if (limpio === "interesado") return "interesado";
  if (limpio === "programado") return "programado";
  if (limpio === "calificada" || limpio === "default-agendada" || limpio === "default-asistida" || limpio === "default-ofertada") return "calificada";
  if (limpio === "no_calificada") return "no_calificada";
  if (limpio === "cerrada" || limpio === "complet") return "cerrada";
  if (["no_interesado", "no interesado", "perdido", "perdida"].includes(limpio)) return "no_interesado";
  if (limpio === "no_show" || limpio === "default-no-show") return "no_contesto";
  if (limpio === "cancelada" || limpio === "default-cancelada") return "no_interesado";
  if (limpio === "contesto" || limpio === "contestó") return "contesto";
  return null;
}

export { estadoToCanonicoEnfoque };

export async function getSiguienteLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
): Promise<SiguienteLead | null> {
  const idCuentaStr = String(idCuenta);

  const [sesion] = await db
    .select()
    .from(sesionesEnfoque)
    .where(
      and(
        eq(sesionesEnfoque.id, idSesion),
        eq(sesionesEnfoque.id_cuenta, idCuenta),
        eq(sesionesEnfoque.activa, true),
      ),
    )
    .limit(1);

  if (!sesion) return null;

  const filtroEstado = sesion.filtro_estado ?? [];
  const filtroAsesores = sesion.filtro_asesores ?? [];

  if (filtroAsesores.length > 0 && !filtroAsesores.includes(closerMail)) {
    return null;
  }

  const registrosYaGestionados = db
    .select({ id_registro: enfoqueResultado.id_registro })
    .from(enfoqueResultado)
    .where(
      and(
        eq(enfoqueResultado.id_sesion, idSesion),
        eq(enfoqueResultado.closer_mail, closerMail),
      ),
    );

  const orderBy =
    sesion.orden === "menos_intentos"
      ? asc(registrosDeLlamada.intentos_contacto)
      : asc(registrosDeLlamada.fecha_evento);

  const conditions = [
    eq(registrosDeLlamada.id_cuenta, idCuentaStr),
    eq(registrosDeLlamada.closer_mail, closerMail),
    notInArray(registrosDeLlamada.id_registro, registrosYaGestionados),
  ];

  if (filtroEstado.length > 0) {
    conditions.push(inArray(registrosDeLlamada.estado, filtroEstado));
  }

  const [lead] = await db
    .select({
      id_registro: registrosDeLlamada.id_registro,
      nombre_lead: registrosDeLlamada.nombre_lead,
      mail_lead: registrosDeLlamada.mail_lead,
      phone: registrosDeLlamada.phone_raw_format,
      closer_mail: registrosDeLlamada.closer_mail,
      nombre_closer: registrosDeLlamada.nombre_closer,
      estado: registrosDeLlamada.estado,
      intentos_contacto: sql<number>`COALESCE(${registrosDeLlamada.intentos_contacto}, 0)`,
      fecha_evento: registrosDeLlamada.fecha_evento,
      creativo_origen: registrosDeLlamada.creativo_origen,
    })
    .from(registrosDeLlamada)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(1);

  return lead ?? null;
}
