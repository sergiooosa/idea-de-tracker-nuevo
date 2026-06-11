import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { enfoqueResultado, registrosDeLlamada, sesionesEnfoque, enfoqueLock } from "@/lib/db/schema";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSiguienteLead, getAttemptCount } from "@/lib/queries/enfoque";

const RESULTADOS_VALIDOS: ResultadoCanonicoEnfoque[] = [
  "contesto",
  "no_contesto",
  "buzon",
  "seguimiento",
  "interesado",
  "programado",
  "calificada",
  "no_calificada",
  "cerrada",
  "no_interesado",
];

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta, email) => {
    const body = await req.json();
    const {
      id_sesion,
      id_registro,
      resultado,
      nota,
      duracion_seg,
    } = body as {
      id_sesion: string;
      id_registro: number;
      resultado: string;
      nota?: string;
      duracion_seg?: number;
    };

    if (!id_sesion || !id_registro || !resultado) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    if (!RESULTADOS_VALIDOS.includes(resultado as ResultadoCanonicoEnfoque)) {
      return NextResponse.json({ error: "Resultado inválido" }, { status: 400 });
    }

    const [sesion] = await db
      .select()
      .from(sesionesEnfoque)
      .where(
        and(
          eq(sesionesEnfoque.id, id_sesion),
          eq(sesionesEnfoque.id_cuenta, idCuenta),
          eq(sesionesEnfoque.activa, true),
        ),
      )
      .limit(1);

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada o inactiva" }, { status: 404 });
    }

    const idCuentaStr = String(idCuenta);
    const [registro] = await db
      .select({ id_registro: registrosDeLlamada.id_registro })
      .from(registrosDeLlamada)
      .where(
        and(
          eq(registrosDeLlamada.id_registro, id_registro),
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
          eq(registrosDeLlamada.closer_mail, email),
        ),
      )
      .limit(1);

    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    const attemptNo = (await getAttemptCount(id_sesion, id_registro, email)) + 1;

    await db.execute(sql`
      INSERT INTO enfoque_resultado (id, id_sesion, id_cuenta, closer_mail, id_registro, resultado_canonico, nota, duracion_seg, ts, attempt_no, detectado_por)
      VALUES (${crypto.randomUUID()}, ${id_sesion}, ${idCuenta}, ${email}, ${id_registro}, ${resultado}, ${nota?.trim() || null}, ${duracion_seg ?? null}, now(), ${attemptNo}, 'manual')
      ON CONFLICT (id_sesion, id_registro, closer_mail, attempt_no) WHERE attempt_no IS NOT NULL
      DO NOTHING
    `);

    await db
      .delete(enfoqueLock)
      .where(
        and(
          eq(enfoqueLock.id_sesion, id_sesion),
          eq(enfoqueLock.id_registro, id_registro),
          eq(enfoqueLock.en_progreso_por, email),
        ),
      );

    const siguiente = await getSiguienteLead(idCuenta, email, id_sesion);

    const [progreso] = await db
      .select({
        completados: sql<number>`count(*)::int`,
      })
      .from(enfoqueResultado)
      .where(
        and(
          eq(enfoqueResultado.id_sesion, id_sesion),
          eq(enfoqueResultado.closer_mail, email),
        ),
      );

    return NextResponse.json({
      ok: true,
      lead: siguiente.lead,
      completados: progreso?.completados ?? 0,
    });
  });
}
