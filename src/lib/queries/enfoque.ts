import { db } from "@/lib/db";
import {
  registrosDeLlamada,
  sesionesEnfoque,
  enfoqueResultado,
  enfoqueLock,
} from "@/lib/db/schema";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";
import { eq, and, sql, inArray, notInArray, asc, ne } from "drizzle-orm";

export const LOCK_EXPIRATION_MINUTES = 15;

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

/**
 * Subquery: IDs de registros con lock vigente de OTRO asesor en esta sesión.
 * Locks expirados (>15 min) se ignoran — el lead se considera libre.
 */
function lockedByOtherSubquery(idSesion: string, closerMail: string) {
  return db
    .select({ id_registro: enfoqueLock.id_registro })
    .from(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        ne(enfoqueLock.en_progreso_por, closerMail),
        sql`${enfoqueLock.lock_ts} > now() - interval '${sql.raw(String(LOCK_EXPIRATION_MINUTES))} minutes'`,
      ),
    );
}

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

  // Check if this closer already has a vigent lock — reconnection returns the same lead
  const [existingLock] = await db
    .select({ id_registro: enfoqueLock.id_registro })
    .from(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.en_progreso_por, closerMail),
        sql`${enfoqueLock.lock_ts} > now() - interval '${sql.raw(String(LOCK_EXPIRATION_MINUTES))} minutes'`,
      ),
    )
    .limit(1);

  if (existingLock) {
    const [lockedLead] = await db
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
      .where(eq(registrosDeLlamada.id_registro, existingLock.id_registro))
      .limit(1);

    if (lockedLead) return lockedLead;
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
    notInArray(registrosDeLlamada.id_registro, lockedByOtherSubquery(idSesion, closerMail)),
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

export interface TomarLeadResult {
  ok: boolean;
  lockId: string | null;
  lead: SiguienteLead | null;
  error?: string;
}

/**
 * Atomic lock via UNIQUE(id_sesion, id_registro) + ON CONFLICT upsert.
 * - Fresh lead: INSERT succeeds, closer gets lock.
 * - Expired lock by other: ON CONFLICT updates en_progreso_por + lock_ts.
 * - Vigent lock by same closer (reconnection): ON CONFLICT refreshes lock_ts, returns same lead.
 * - Vigent lock by other closer: ON CONFLICT WHERE fails, no update → race prevented.
 */
export async function tomarLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
): Promise<TomarLeadResult> {
  const lead = await getSiguienteLead(idCuenta, closerMail, idSesion);
  if (!lead) {
    return { ok: false, lockId: null, lead: null, error: "no_leads" };
  }

  const lockId = crypto.randomUUID();
  const result = await db.execute(sql`
    INSERT INTO enfoque_lock (id, id_sesion, id_cuenta, id_registro, en_progreso_por, lock_ts)
    VALUES (${lockId}, ${idSesion}, ${idCuenta}, ${lead.id_registro}, ${closerMail}, now())
    ON CONFLICT (id_sesion, id_registro) DO UPDATE
      SET en_progreso_por = ${closerMail},
          lock_ts = now()
      WHERE enfoque_lock.en_progreso_por = ${closerMail}
         OR enfoque_lock.lock_ts <= now() - interval '${sql.raw(String(LOCK_EXPIRATION_MINUTES))} minutes'
    RETURNING id
  `);

  const rows = result.rows as Array<{ id: string }>;
  if (!rows.length) {
    return { ok: false, lockId: null, lead: null, error: "lock_race" };
  }

  return { ok: true, lockId: rows[0].id, lead };
}

/**
 * Release a lock explicitly (closer finished or abandoned the lead).
 */
export async function liberarLead(
  idSesion: string,
  closerMail: string,
  idRegistro?: number,
): Promise<{ ok: boolean }> {
  const conditions = [
    eq(enfoqueLock.id_sesion, idSesion),
    eq(enfoqueLock.en_progreso_por, closerMail),
  ];

  if (idRegistro !== undefined) {
    conditions.push(eq(enfoqueLock.id_registro, idRegistro));
  }

  await db.delete(enfoqueLock).where(and(...conditions));
  return { ok: true };
}

async function getLeadById(idRegistro: number): Promise<SiguienteLead | null> {
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
    .where(eq(registrosDeLlamada.id_registro, idRegistro))
    .limit(1);

  return lead ?? null;
}
