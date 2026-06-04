import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, sql, and, isNotNull, ne } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const idCuentaStr = String(idCuenta);

    const [estados, asesores] = await Promise.all([
      db
        .select({
          estado: registrosDeLlamada.estado,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(registrosDeLlamada)
        .where(
          and(
            eq(registrosDeLlamada.id_cuenta, idCuentaStr),
            isNotNull(registrosDeLlamada.estado),
            ne(registrosDeLlamada.estado, ""),
            ne(registrosDeLlamada.estado, "{}"),
          ),
        )
        .groupBy(registrosDeLlamada.estado)
        .orderBy(registrosDeLlamada.estado),

      db
        .select({
          email: registrosDeLlamada.closer_mail,
          nombre: registrosDeLlamada.nombre_closer,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(registrosDeLlamada)
        .where(
          and(
            eq(registrosDeLlamada.id_cuenta, idCuentaStr),
            isNotNull(registrosDeLlamada.closer_mail),
            ne(registrosDeLlamada.closer_mail, ""),
          ),
        )
        .groupBy(registrosDeLlamada.closer_mail, registrosDeLlamada.nombre_closer)
        .orderBy(registrosDeLlamada.closer_mail),
    ]);

    return NextResponse.json({ estados, asesores });
  });
}
