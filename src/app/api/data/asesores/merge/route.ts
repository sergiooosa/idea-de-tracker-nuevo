/**
 * POST /api/data/asesores/merge
 * Unifica dos closers: todos los registros de `closerFrom` se reasignan a `closerTo`
 * Afecta: log_llamadas, registros_de_llamada, resumenes_diarios_agendas, chats_logs
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { logLlamadas, registrosDeLlamada, resumenesDiariosAgendas, chatsLogs } from "@/lib/db/schema";
import { eq, and, or, sql } from "drizzle-orm";

export async function POST(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const body = await req.json() as {
      from_email?: string;
      from_nombre?: string;
      to_email: string;
      to_nombre: string;
    };

    const { from_email, from_nombre, to_email, to_nombre } = body;
    if (!to_email || !to_nombre) {
      return NextResponse.json({ error: "to_email y to_nombre son requeridos" }, { status: 400 });
    }
    if (!from_email && !from_nombre) {
      return NextResponse.json({ error: "Debes indicar from_email o from_nombre del asesor a fusionar" }, { status: 400 });
    }

    // Construir condición del "from" — puede ser por email o por nombre (case-insensitive)
    const fromConditionLog = from_email
      ? sql`LOWER(TRIM(COALESCE(${logLlamadas.closer_mail}, ''))) = LOWER(TRIM(${from_email}))`
      : sql`LOWER(TRIM(COALESCE(${logLlamadas.nombre_closer}, ''))) = LOWER(TRIM(${from_nombre}))`;

    const fromConditionReg = from_email
      ? sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.closer_mail}, ''))) = LOWER(TRIM(${from_email}))`
      : sql`LOWER(TRIM(COALESCE(${registrosDeLlamada.nombre_closer}, ''))) = LOWER(TRIM(${from_nombre}))`;

    const fromConditionAgenda = from_email
      ? sql`LOWER(TRIM(COALESCE(${resumenesDiariosAgendas.closer}, ''))) = LOWER(TRIM(${from_email}))`
      : sql`LOWER(TRIM(COALESCE(${resumenesDiariosAgendas.closer}, ''))) = LOWER(TRIM(${from_nombre}))`;

    const fromConditionChat = from_nombre
      ? sql`LOWER(TRIM(COALESCE(${chatsLogs.asesor_asignado}, ''))) = LOWER(TRIM(${from_nombre}))`
      : null;

    // Ejecutar updates en paralelo
    const [r1, r2, r3, r4] = await Promise.all([
      db.update(logLlamadas)
        .set({ closer_mail: to_email, nombre_closer: to_nombre })
        .where(and(eq(logLlamadas.id_cuenta, idCuenta), fromConditionLog))
        .returning({ id: logLlamadas.id }),

      db.update(registrosDeLlamada)
        .set({ closer_mail: to_email, nombre_closer: to_nombre })
        .where(and(eq(registrosDeLlamada.id_cuenta, String(idCuenta)), fromConditionReg))
        .returning({ id: registrosDeLlamada.id_registro }),

      db.update(resumenesDiariosAgendas)
        .set({ closer: to_nombre })
        .where(and(eq(resumenesDiariosAgendas.id_cuenta, idCuenta), fromConditionAgenda))
        .returning({ id: resumenesDiariosAgendas.id_registro_agenda }),

      fromConditionChat
        ? db.update(chatsLogs)
            .set({ asesor_asignado: to_nombre })
            .where(and(eq(chatsLogs.id_cuenta, idCuenta), fromConditionChat))
            .returning({ id: chatsLogs.id_evento })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      ok: true,
      merged: {
        log_llamadas: r1.length,
        registros_llamada: r2.length,
        agendas: r3.length,
        chats: (r4 as { id: number }[]).length,
      },
    });
  });
}
