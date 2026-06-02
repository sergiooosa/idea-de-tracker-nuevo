import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { enfoqueResultado, registrosDeLlamada, sesionesEnfoque } from "@/lib/db/schema";
import type { ResultadoCanonicoEnfoque } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getSiguienteLead } from "@/lib/queries/enfoque";

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
    } = body as {
      id_sesion: string;
      id_registro: number;
      resultado: string;
      nota?: string;
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

    await db.insert(enfoqueResultado).values({
      id_sesion,
      id_cuenta: idCuenta,
      closer_mail: email,
      id_registro,
      resultado_canonico: resultado as ResultadoCanonicoEnfoque,
      nota: nota?.trim() || null,
    });

    await db
      .update(registrosDeLlamada)
      .set({
        estado: resultado,
        intentos_contacto: sql`COALESCE(${registrosDeLlamada.intentos_contacto}, 0) + 1`,
      })
      .where(
        and(
          eq(registrosDeLlamada.id_registro, id_registro),
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
        ),
      );

    const siguienteLead = await getSiguienteLead(idCuenta, email, id_sesion);

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
      lead: siguienteLead,
      completados: progreso?.completados ?? 0,
    });
  });
}
