import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const url = new URL(req.url);
    const closerMail = url.searchParams.get("closer_mail");
    const sinAsignar = url.searchParams.get("sin_asignar") === "1";
    const estado = url.searchParams.get("estado");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const idCuentaStr = String(idCuenta);

    const conditions = [eq(registrosDeLlamada.id_cuenta, idCuentaStr)];

    if (sinAsignar) {
      conditions.push(
        sql`(${registrosDeLlamada.closer_mail} IS NULL OR ${registrosDeLlamada.closer_mail} = '')`,
      );
    } else if (closerMail) {
      conditions.push(eq(registrosDeLlamada.closer_mail, closerMail));
    } else {
      return NextResponse.json(
        { error: "Se requiere closer_mail o sin_asignar=1" },
        { status: 400 },
      );
    }

    if (estado) {
      conditions.push(eq(registrosDeLlamada.estado, estado));
    }

    const [leads, countResult] = await Promise.all([
      db
        .select({
          id_registro: registrosDeLlamada.id_registro,
          nombre_lead: registrosDeLlamada.nombre_lead,
          mail_lead: registrosDeLlamada.mail_lead,
          phone_raw_format: registrosDeLlamada.phone_raw_format,
          estado: registrosDeLlamada.estado,
          closer_mail: registrosDeLlamada.closer_mail,
          nombre_closer: registrosDeLlamada.nombre_closer,
          intentos_contacto: registrosDeLlamada.intentos_contacto,
          fecha_evento: registrosDeLlamada.fecha_evento,
          creativo_origen: registrosDeLlamada.creativo_origen,
        })
        .from(registrosDeLlamada)
        .where(and(...conditions))
        .orderBy(desc(registrosDeLlamada.fecha_evento))
        .limit(limit)
        .offset(offset),

      db
        .select({ total: sql<number>`count(*)::int` })
        .from(registrosDeLlamada)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      leads,
      total: countResult[0]?.total ?? 0,
      limit,
      offset,
    });
  });
}
