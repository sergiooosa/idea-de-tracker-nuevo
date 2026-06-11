import { db } from "@/lib/db";
import {
  registrosDeLlamada,
  sesionesEnfoque,
  enfoqueResultado,
  enfoqueLock,
  enfoqueAdminAudit,
  usuariosDashboard,
  logLlamadas,
} from "@/lib/db/schema";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";
import { eq, and, sql, inArray, notInArray, asc, ne } from "drizzle-orm";

export const LOCK_EXPIRATION_MINUTES_DEFAULT = 15;
export const POLL_INTERVALO_SEG_DEFAULT = 4;

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
function lockedByOtherSubquery(idSesion: string, closerMail: string, lockMinutes: number) {
  return db
    .select({ id_registro: enfoqueLock.id_registro })
    .from(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        ne(enfoqueLock.en_progreso_por, closerMail),
        sql`${enfoqueLock.lock_ts} > now() - interval '${sql.raw(String(lockMinutes))} minutes'`,
      ),
    );
}

export interface SiguienteLeadResult {
  lead: SiguienteLead | null;
  reconexion: boolean;
}

export async function getSiguienteLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
): Promise<SiguienteLeadResult> {
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

  if (!sesion) return { lead: null, reconexion: false };

  const filtroEstado = sesion.filtro_estado ?? [];
  const filtroAsesores = sesion.filtro_asesores ?? [];
  const lockMin = sesion.lock_expiracion_min ?? LOCK_EXPIRATION_MINUTES_DEFAULT;

  if (filtroAsesores.length > 0 && !filtroAsesores.includes(closerMail)) {
    return { lead: null, reconexion: false };
  }

  // Check if this closer already has a vigent lock — reconnection returns the same lead
  const [existingLock] = await db
    .select({ id_registro: enfoqueLock.id_registro })
    .from(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.en_progreso_por, closerMail),
        sql`${enfoqueLock.lock_ts} > now() - interval '${sql.raw(String(lockMin))} minutes'`,
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

    if (lockedLead) return { lead: lockedLead, reconexion: true };
  }

  const maxIntentos = sesion.max_intentos ?? 3;
  const retryIntervaloMin = sesion.retry_intervalo_min ?? 30;
  const retryEstados = (sesion.retry_estados as string[] | null) ?? ["no_contesto", "buzon"];
  const accionAgotado = sesion.accion_agotado ?? "seguimiento";
  const expiryStreakMax = sesion.expiry_streak_max ?? 5;

  const registrosTerminados = db
    .select({ id_registro: sql<number>`er.id_registro` })
    .from(sql`enfoque_resultado er`)
    .where(
      sql`er.id_sesion = ${idSesion}
        AND er.closer_mail = ${closerMail}
        AND (
          er.resultado_canonico NOT IN (${sql.join(retryEstados.map(e => sql`${e}`), sql`, `)})
          OR (
            SELECT count(*) FROM enfoque_resultado er2
            WHERE er2.id_sesion = ${idSesion}
              AND er2.id_registro = er.id_registro
              AND er2.closer_mail = ${closerMail}
          ) >= ${maxIntentos}
        )`,
    );

  const registrosEnCooldown = db
    .select({ id_registro: sql<number>`erc.id_registro` })
    .from(sql`enfoque_resultado erc`)
    .where(
      sql`erc.id_sesion = ${idSesion}
        AND erc.closer_mail = ${closerMail}
        AND erc.ts > now() - interval '${sql.raw(String(retryIntervaloMin))} minutes'`,
    );

  const orderBy =
    sesion.orden === "menos_intentos"
      ? asc(registrosDeLlamada.intentos_contacto)
      : asc(registrosDeLlamada.fecha_evento);

  const conditions = [
    eq(registrosDeLlamada.id_cuenta, idCuentaStr),
    eq(registrosDeLlamada.closer_mail, closerMail),
    notInArray(registrosDeLlamada.id_registro, registrosTerminados),
    notInArray(registrosDeLlamada.id_registro, registrosEnCooldown),
    notInArray(registrosDeLlamada.id_registro, lockedByOtherSubquery(idSesion, closerMail, lockMin)),
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

  return { lead: lead ?? null, reconexion: false };
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
async function getLockMinutesForSession(idSesion: string): Promise<number> {
  const [row] = await db
    .select({ lock_expiracion_min: sesionesEnfoque.lock_expiracion_min })
    .from(sesionesEnfoque)
    .where(eq(sesionesEnfoque.id, idSesion))
    .limit(1);
  return row?.lock_expiracion_min ?? LOCK_EXPIRATION_MINUTES_DEFAULT;
}

export async function tomarLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
): Promise<TomarLeadResult> {
  const { lead } = await getSiguienteLead(idCuenta, closerMail, idSesion);
  if (!lead) {
    return { ok: false, lockId: null, lead: null, error: "no_leads" };
  }

  const lockMin = await getLockMinutesForSession(idSesion);
  const lockId = crypto.randomUUID();
  const result = await db.execute(sql`
    INSERT INTO enfoque_lock (id, id_sesion, id_cuenta, id_registro, en_progreso_por, lock_ts)
    VALUES (${lockId}, ${idSesion}, ${idCuenta}, ${lead.id_registro}, ${closerMail}, now())
    ON CONFLICT (id_sesion, id_registro) DO UPDATE
      SET en_progreso_por = ${closerMail},
          lock_ts = now()
      WHERE enfoque_lock.en_progreso_por = ${closerMail}
         OR enfoque_lock.lock_ts <= now() - interval '${sql.raw(String(lockMin))} minutes'
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

export interface MarcarLeadResult {
  ok: boolean;
  lockId: string | null;
  dial_ts: string | null;
  snapshot_canonico: string | null;
  error?: string;
}

export async function marcarLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
  idRegistro: number,
  callSid?: string,
): Promise<MarcarLeadResult> {
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

  if (!sesion) {
    return { ok: false, lockId: null, dial_ts: null, snapshot_canonico: null, error: "sesion_no_encontrada" };
  }

  const idCuentaStr = String(idCuenta);
  const [registro] = await db
    .select({ estado: registrosDeLlamada.estado })
    .from(registrosDeLlamada)
    .where(
      and(
        eq(registrosDeLlamada.id_registro, idRegistro),
        eq(registrosDeLlamada.id_cuenta, idCuentaStr),
      ),
    )
    .limit(1);

  if (!registro) {
    return { ok: false, lockId: null, dial_ts: null, snapshot_canonico: null, error: "registro_no_encontrado" };
  }

  const snapshotCanonico = estadoToCanonicoEnfoque(registro.estado);
  const lockMin = sesion.lock_expiracion_min ?? LOCK_EXPIRATION_MINUTES_DEFAULT;
  const lockId = crypto.randomUUID();

  const result = await db.execute(sql`
    INSERT INTO enfoque_lock (id, id_sesion, id_cuenta, id_registro, en_progreso_por, lock_ts, dial_ts, call_sid, snapshot_canonico)
    VALUES (${lockId}, ${idSesion}, ${idCuenta}, ${idRegistro}, ${closerMail}, now(), now(), ${callSid ?? null}, ${snapshotCanonico})
    ON CONFLICT (id_sesion, id_registro) DO UPDATE
      SET en_progreso_por = ${closerMail},
          lock_ts = now(),
          dial_ts = now(),
          call_sid = COALESCE(${callSid ?? null}, enfoque_lock.call_sid),
          snapshot_canonico = ${snapshotCanonico}
      WHERE enfoque_lock.en_progreso_por = ${closerMail}
         OR enfoque_lock.lock_ts <= now() - interval '${sql.raw(String(lockMin))} minutes'
    RETURNING id, dial_ts::text, snapshot_canonico
  `);

  const rows = result.rows as Array<{ id: string; dial_ts: string; snapshot_canonico: string | null }>;
  if (!rows.length) {
    return { ok: false, lockId: null, dial_ts: null, snapshot_canonico: null, error: "lock_race" };
  }

  return {
    ok: true,
    lockId: rows[0].id,
    dial_ts: rows[0].dial_ts,
    snapshot_canonico: rows[0].snapshot_canonico,
  };
}

export interface ResolverEstadoResult {
  resuelto: boolean;
  resultado_canonico: ResultadoCanonicoEnfoque | null;
  estado_raw: string | null;
  siguiente_lead: SiguienteLead | null;
  attempt_no: number | null;
  estado: "esperando" | "resuelto" | "sin_lock";
}

export async function resolverEstadoLead(
  idCuenta: number,
  closerMail: string,
  idSesion: string,
  idRegistro: number,
): Promise<ResolverEstadoResult> {
  const [lock] = await db
    .select({
      id: enfoqueLock.id,
      dial_ts: enfoqueLock.dial_ts,
      call_sid: enfoqueLock.call_sid,
      snapshot_canonico: enfoqueLock.snapshot_canonico,
    })
    .from(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.id_registro, idRegistro),
        eq(enfoqueLock.en_progreso_por, closerMail),
      ),
    )
    .limit(1);

  if (!lock) {
    return { resuelto: false, resultado_canonico: null, estado_raw: null, siguiente_lead: null, attempt_no: null, estado: "sin_lock" };
  }

  if (!lock.dial_ts) {
    return { resuelto: false, resultado_canonico: null, estado_raw: null, siguiente_lead: null, attempt_no: null, estado: "esperando" };
  }

  const conditions = [
    eq(logLlamadas.id_registro, idRegistro),
    eq(logLlamadas.id_cuenta, idCuenta),
  ];

  if (lock.call_sid) {
    conditions.push(
      sql`(${logLlamadas.ts} > ${lock.dial_ts} OR ${logLlamadas.call_sid} = ${lock.call_sid})`,
    );
  } else {
    conditions.push(sql`${logLlamadas.ts} > ${lock.dial_ts}`);
  }

  const [evento] = await db
    .select({
      estado_resultado: logLlamadas.estado_resultado,
      tipo_evento: logLlamadas.tipo_evento,
      call_sid: logLlamadas.call_sid,
      ts: logLlamadas.ts,
    })
    .from(logLlamadas)
    .where(and(...conditions))
    .orderBy(asc(logLlamadas.ts))
    .limit(1);

  if (!evento) {
    return { resuelto: false, resultado_canonico: null, estado_raw: null, siguiente_lead: null, attempt_no: null, estado: "esperando" };
  }

  const resultadoCanonico = estadoToCanonicoEnfoque(evento.estado_resultado);
  if (!resultadoCanonico) {
    return { resuelto: false, resultado_canonico: null, estado_raw: evento.estado_resultado, siguiente_lead: null, attempt_no: null, estado: "esperando" };
  }

  const [attemptCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enfoqueResultado)
    .where(
      and(
        eq(enfoqueResultado.id_sesion, idSesion),
        eq(enfoqueResultado.id_registro, idRegistro),
        eq(enfoqueResultado.closer_mail, closerMail),
      ),
    );
  const attemptNo = (attemptCount?.count ?? 0) + 1;

  await db.execute(sql`
    INSERT INTO enfoque_resultado (id, id_sesion, id_cuenta, closer_mail, id_registro, resultado_canonico, ts, attempt_no, detectado_por)
    VALUES (${crypto.randomUUID()}, ${idSesion}, ${idCuenta}, ${closerMail}, ${idRegistro}, ${resultadoCanonico}, now(), ${attemptNo}, 'auto')
    ON CONFLICT (id_sesion, id_registro, closer_mail, attempt_no) WHERE attempt_no IS NOT NULL
    DO NOTHING
  `);

  await db
    .delete(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.id_registro, idRegistro),
        eq(enfoqueLock.en_progreso_por, closerMail),
      ),
    );

  const siguiente = await getSiguienteLead(idCuenta, closerMail, idSesion);

  return {
    resuelto: true,
    resultado_canonico: resultadoCanonico,
    estado_raw: evento.estado_resultado,
    siguiente_lead: siguiente.lead,
    attempt_no: attemptNo,
    estado: "resuelto",
  };
}

export interface MetricasEnfoque {
  trabajadosHoy: number;
  contactados: number;
  tasaContacto: number;
  resumen: Array<{ resultado: string; cantidad: number }>;
  duracionPromedio: number;
}

export async function getMetricasSesion(
  idSesion: string,
  closerMail: string,
): Promise<MetricasEnfoque> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const resultados = await db
    .select({
      resultado_canonico: enfoqueResultado.resultado_canonico,
      cantidad: sql<number>`count(*)::int`,
      duracion_total: sql<number>`COALESCE(sum(${enfoqueResultado.duracion_seg}), 0)::int`,
    })
    .from(enfoqueResultado)
    .where(
      and(
        eq(enfoqueResultado.id_sesion, idSesion),
        eq(enfoqueResultado.closer_mail, closerMail),
        sql`${enfoqueResultado.ts} >= ${hoy.toISOString()}::timestamptz`,
      ),
    )
    .groupBy(enfoqueResultado.resultado_canonico);

  const trabajadosHoy = resultados.reduce((sum, r) => sum + r.cantidad, 0);
  const contactados = resultados
    .filter((r) => r.resultado_canonico === "contesto" || r.resultado_canonico === "interesado" || r.resultado_canonico === "programado" || r.resultado_canonico === "calificada" || r.resultado_canonico === "cerrada")
    .reduce((sum, r) => sum + r.cantidad, 0);
  const duracionTotal = resultados.reduce((sum, r) => sum + r.duracion_total, 0);

  return {
    trabajadosHoy,
    contactados,
    tasaContacto: trabajadosHoy > 0 ? Math.round((contactados / trabajadosHoy) * 100) : 0,
    resumen: resultados.map((r) => ({
      resultado: r.resultado_canonico,
      cantidad: r.cantidad,
    })),
    duracionPromedio: trabajadosHoy > 0 ? Math.round(duracionTotal / trabajadosHoy) : 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Tablero de operación en vivo — Fase 4d                             */
/* ------------------------------------------------------------------ */

const CONTACTO_RESULTADOS: string[] = [
  "contesto",
  "interesado",
  "programado",
  "calificada",
  "cerrada",
];

export interface AsesorEnVivo {
  closerMail: string;
  nombreCloser: string | null;
  idSesion: string;
  nombreSesion: string;
  leadActual: string | null;
  lockDesde: string;
}

export interface MetricasAsesor {
  closerMail: string;
  nombreCloser: string | null;
  trabajadosHoy: number;
  contactados: number;
  tasaContacto: number;
  duracionPromedio: number;
  resumen: Array<{ resultado: string; cantidad: number }>;
}

export interface TableroEnfoqueData {
  asesoresActivos: AsesorEnVivo[];
  metricasPorAsesor: MetricasAsesor[];
  sesionesActivas: number;
  totalTrabajadosHoy: number;
  totalContactados: number;
  tasaContactoGlobal: number;
}

export async function getTableroEnfoque(idCuenta: number): Promise<TableroEnfoqueData> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const idCuentaStr = String(idCuenta);

  const sesionesActivasRows = await db
    .select({ id: sesionesEnfoque.id, nombre: sesionesEnfoque.nombre, lock_expiracion_min: sesionesEnfoque.lock_expiracion_min })
    .from(sesionesEnfoque)
    .where(and(eq(sesionesEnfoque.id_cuenta, idCuenta), eq(sesionesEnfoque.activa, true)));

  const sesionMap = new Map(sesionesActivasRows.map((s) => [s.id, s]));

  let asesoresActivos: AsesorEnVivo[] = [];
  if (sesionesActivasRows.length > 0) {
    const locksVigentes = await db.execute(sql`
      SELECT l.en_progreso_por, l.id_sesion, l.lock_ts, r.nombre_lead
      FROM enfoque_lock l
      JOIN registros_de_llamada r ON r.id_registro = l.id_registro
      JOIN sesiones_enfoque s ON s.id = l.id_sesion
      WHERE l.id_cuenta = ${idCuenta}
        AND s.activa = true
        AND l.lock_ts > now() - (s.lock_expiracion_min || ' minutes')::interval
    `);
    const lockRows = locksVigentes.rows as Array<{
      en_progreso_por: string;
      id_sesion: string;
      lock_ts: string;
      nombre_lead: string | null;
    }>;

    asesoresActivos = lockRows.map((r) => ({
      closerMail: r.en_progreso_por,
      nombreCloser: null,
      idSesion: r.id_sesion,
      nombreSesion: sesionMap.get(r.id_sesion)?.nombre ?? "",
      leadActual: r.nombre_lead,
      lockDesde: r.lock_ts,
    }));
  }

  const resultadosHoy = await db
    .select({
      closer_mail: enfoqueResultado.closer_mail,
      resultado_canonico: enfoqueResultado.resultado_canonico,
      cantidad: sql<number>`count(*)::int`,
      duracion_total: sql<number>`COALESCE(sum(${enfoqueResultado.duracion_seg}), 0)::int`,
    })
    .from(enfoqueResultado)
    .where(
      and(
        eq(enfoqueResultado.id_cuenta, idCuenta),
        sql`${enfoqueResultado.ts} >= ${hoy.toISOString()}::timestamptz`,
      ),
    )
    .groupBy(enfoqueResultado.closer_mail, enfoqueResultado.resultado_canonico);

  const porAsesor = new Map<string, {
    trabajados: number;
    contactados: number;
    duracionTotal: number;
    resumen: Map<string, number>;
  }>();

  for (const row of resultadosHoy) {
    let entry = porAsesor.get(row.closer_mail);
    if (!entry) {
      entry = { trabajados: 0, contactados: 0, duracionTotal: 0, resumen: new Map() };
      porAsesor.set(row.closer_mail, entry);
    }
    entry.trabajados += row.cantidad;
    entry.duracionTotal += row.duracion_total;
    if (CONTACTO_RESULTADOS.includes(row.resultado_canonico)) {
      entry.contactados += row.cantidad;
    }
    entry.resumen.set(row.resultado_canonico, row.cantidad);
  }

  const closerEmails = [...new Set([...porAsesor.keys(), ...asesoresActivos.map((a) => a.closerMail)])];
  const nombreMap = new Map<string, string | null>();
  if (closerEmails.length > 0) {
    const nombres = await db
      .select({
        closer_mail: registrosDeLlamada.closer_mail,
        nombre_closer: registrosDeLlamada.nombre_closer,
      })
      .from(registrosDeLlamada)
      .where(
        and(
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
          inArray(registrosDeLlamada.closer_mail, closerEmails),
        ),
      )
      .groupBy(registrosDeLlamada.closer_mail, registrosDeLlamada.nombre_closer);
    for (const n of nombres) {
      if (n.closer_mail && n.nombre_closer) nombreMap.set(n.closer_mail, n.nombre_closer);
    }
  }

  for (const a of asesoresActivos) {
    a.nombreCloser = nombreMap.get(a.closerMail) ?? null;
  }

  const metricasPorAsesor: MetricasAsesor[] = [];
  for (const [email, data] of porAsesor) {
    metricasPorAsesor.push({
      closerMail: email,
      nombreCloser: nombreMap.get(email) ?? null,
      trabajadosHoy: data.trabajados,
      contactados: data.contactados,
      tasaContacto: data.trabajados > 0 ? Math.round((data.contactados / data.trabajados) * 100) : 0,
      duracionPromedio: data.trabajados > 0 ? Math.round(data.duracionTotal / data.trabajados) : 0,
      resumen: [...data.resumen.entries()].map(([resultado, cantidad]) => ({ resultado, cantidad })),
    });
  }

  metricasPorAsesor.sort((a, b) => b.trabajadosHoy - a.trabajadosHoy);

  const totalTrabajadosHoy = metricasPorAsesor.reduce((s, m) => s + m.trabajadosHoy, 0);
  const totalContactados = metricasPorAsesor.reduce((s, m) => s + m.contactados, 0);

  return {
    asesoresActivos,
    metricasPorAsesor,
    sesionesActivas: sesionesActivasRows.length,
    totalTrabajadosHoy,
    totalContactados,
    tasaContactoGlobal: totalTrabajadosHoy > 0 ? Math.round((totalContactados / totalTrabajadosHoy) * 100) : 0,
  };
}

export async function getAttemptCount(
  idSesion: string,
  idRegistro: number,
  closerMail: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enfoqueResultado)
    .where(
      and(
        eq(enfoqueResultado.id_sesion, idSesion),
        eq(enfoqueResultado.id_registro, idRegistro),
        eq(enfoqueResultado.closer_mail, closerMail),
      ),
    );
  return row?.count ?? 0;
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

/* ------------------------------------------------------------------ */
/*  F4 — Control en vivo del admin + auditoría (AUT-860)              */
/*  Gating en la capa de ruta (canControlEnfoque). Aquí: lógica       */
/*  tenant-scoped, concurrency-safe (WHERE = last-writer-wins) y      */
/*  fila de auditoría en enfoque_admin_audit por cada acción.         */
/* ------------------------------------------------------------------ */

export type AccionAdminEnfoque =
  | "finalizar_sesion_usuario"
  | "reasignar_lead"
  | "cambiar_tipo_usuario"
  | "forzar_saltar_lead";

export const TIPOS_USUARIO_VALIDOS = ["analista", "enfoque"] as const;
export type TipoUsuario = (typeof TIPOS_USUARIO_VALIDOS)[number];

/** Inserta una fila de auditoría. Nunca lanza si la auditoría falla por sí sola. */
async function auditarAccionEnfoque(params: {
  idCuenta: number;
  idSesion: string | null;
  actorEmail: string;
  accion: AccionAdminEnfoque;
  targetEmail?: string | null;
  idRegistro?: number | null;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(enfoqueAdminAudit).values({
    id_cuenta: params.idCuenta,
    id_sesion: params.idSesion,
    actor_email: params.actorEmail,
    accion: params.accion,
    target_email: params.targetEmail ?? null,
    id_registro: params.idRegistro ?? null,
    detalle: params.detalle ?? null,
  });
}

/**
 * Finaliza la sesión de un usuario: libera TODOS sus locks en esa sesión.
 * Graceful: los resultados ya escritos en enfoque_resultado se conservan
 * (solo se borran locks, no resultados). Tenant-scoped por id_cuenta.
 */
export async function finalizarSesionUsuario(
  idCuenta: number,
  actorEmail: string,
  idSesion: string,
  targetEmail: string,
): Promise<{ ok: boolean; locksLiberados: number }> {
  const result = await db
    .delete(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_cuenta, idCuenta),
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.en_progreso_por, targetEmail),
      ),
    )
    .returning({ id: enfoqueLock.id });

  await auditarAccionEnfoque({
    idCuenta,
    idSesion,
    actorEmail,
    accion: "finalizar_sesion_usuario",
    targetEmail,
    detalle: { locks_liberados: result.length },
  });

  return { ok: true, locksLiberados: result.length };
}

/**
 * Reasigna un lead a otro asesor: libera el lock actual (sea de quien sea)
 * y actualiza closer_mail en registros_de_llamada. El asesor anterior queda
 * sin lock → su cliente lo trata como PREEMPTED y sirve el siguiente.
 * Concurrency: last-writer-wins, ambos statements guardados por WHERE.
 */
export async function reasignarLead(
  idCuenta: number,
  actorEmail: string,
  idSesion: string,
  idRegistro: number,
  nuevoCloserMail: string,
): Promise<{ ok: boolean; closerAnterior: string | null; lockLiberado: boolean }> {
  const idCuentaStr = String(idCuenta);

  const liberado = await db
    .delete(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_cuenta, idCuenta),
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.id_registro, idRegistro),
      ),
    )
    .returning({ closer: enfoqueLock.en_progreso_por });

  const closerAnterior = liberado[0]?.closer ?? null;

  const actualizado = await db
    .update(registrosDeLlamada)
    .set({ closer_mail: nuevoCloserMail })
    .where(
      and(
        eq(registrosDeLlamada.id_registro, idRegistro),
        eq(registrosDeLlamada.id_cuenta, idCuentaStr),
      ),
    )
    .returning({ id: registrosDeLlamada.id_registro });

  await auditarAccionEnfoque({
    idCuenta,
    idSesion,
    actorEmail,
    accion: "reasignar_lead",
    targetEmail: nuevoCloserMail,
    idRegistro,
    detalle: {
      closer_anterior: closerAnterior,
      registro_actualizado: actualizado.length > 0,
    },
  });

  if (actualizado.length === 0) {
    return { ok: false, closerAnterior, lockLiberado: liberado.length > 0 };
  }

  return { ok: true, closerAnterior, lockLiberado: liberado.length > 0 };
}

/**
 * Cambia el tipo de usuario (analista ↔ enfoque) al vuelo. Tenant-scoped.
 * El refresco del JWT y la redirección de kiosko se manejan en el cliente
 * (la sesión del target re-lee tipo_usuario en su siguiente request).
 */
export async function cambiarTipoUsuario(
  idCuenta: number,
  actorEmail: string,
  targetEmail: string,
  nuevoTipo: TipoUsuario,
): Promise<{ ok: boolean }> {
  const actualizado = await db
    .update(usuariosDashboard)
    .set({ tipo_usuario: nuevoTipo })
    .where(
      and(
        eq(usuariosDashboard.id_cuenta, idCuenta),
        eq(usuariosDashboard.email, targetEmail),
      ),
    )
    .returning({ id: usuariosDashboard.id_evento });

  await auditarAccionEnfoque({
    idCuenta,
    idSesion: null,
    actorEmail,
    accion: "cambiar_tipo_usuario",
    targetEmail,
    detalle: { nuevo_tipo: nuevoTipo, encontrado: actualizado.length > 0 },
  });

  return { ok: actualizado.length > 0 };
}

/**
 * Fuerza saltar un lead atorado: libera el lock y escribe un resultado
 * marcador "seguimiento" para que getSiguienteLead lo excluya (registro ya
 * gestionado) y no se re-sirva. NO incrementa intentos_contacto (evita el
 * doble conteo). Tenant-scoped + auditado.
 */
export async function forzarSaltarLead(
  idCuenta: number,
  actorEmail: string,
  idSesion: string,
  idRegistro: number,
): Promise<{ ok: boolean; closerAfectado: string | null }> {
  const liberado = await db
    .delete(enfoqueLock)
    .where(
      and(
        eq(enfoqueLock.id_cuenta, idCuenta),
        eq(enfoqueLock.id_sesion, idSesion),
        eq(enfoqueLock.id_registro, idRegistro),
      ),
    )
    .returning({ closer: enfoqueLock.en_progreso_por });

  const closerAfectado = liberado[0]?.closer ?? null;

  // Marcar como gestionado para el asesor afectado (si lo hay) y, en su
  // defecto, para el closer actual del registro — así sale de la cola.
  let closerMarcador: string | null = closerAfectado;
  if (!closerMarcador) {
    const idCuentaStr = String(idCuenta);
    const [reg] = await db
      .select({ closer_mail: registrosDeLlamada.closer_mail })
      .from(registrosDeLlamada)
      .where(
        and(
          eq(registrosDeLlamada.id_registro, idRegistro),
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
        ),
      )
      .limit(1);
    closerMarcador = reg?.closer_mail ?? null;
  }

  if (closerMarcador) {
    await db.insert(enfoqueResultado).values({
      id_sesion: idSesion,
      id_cuenta: idCuenta,
      closer_mail: closerMarcador,
      id_registro: idRegistro,
      resultado_canonico: "seguimiento",
      nota: "Saltado por admin (F4)",
      detectado_por: "admin",
    });
  }

  await auditarAccionEnfoque({
    idCuenta,
    idSesion,
    actorEmail,
    accion: "forzar_saltar_lead",
    targetEmail: closerMarcador,
    idRegistro,
    detalle: { lock_liberado: liberado.length > 0, marcado: Boolean(closerMarcador) },
  });

  return { ok: true, closerAfectado: closerMarcador };
}
