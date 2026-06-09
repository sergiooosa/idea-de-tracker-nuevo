import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, sql, and, isNotNull, ne } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const idCuentaStr = String(idCuenta);

    const [asesores, desglose, sinAsignarRows] = await Promise.all([
      db
        .select({
          closer_mail: registrosDeLlamada.closer_mail,
          nombre_closer: registrosDeLlamada.nombre_closer,
          total_leads: sql<number>`count(*)::int`,
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
        .orderBy(sql`count(*) desc`),

      db
        .select({
          closer_mail: registrosDeLlamada.closer_mail,
          estado: sql<string>`coalesce(${registrosDeLlamada.estado}, 'sin_estado')`,
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
        .groupBy(registrosDeLlamada.closer_mail, registrosDeLlamada.estado)
        .orderBy(registrosDeLlamada.closer_mail),

      db
        .select({
          estado: sql<string>`coalesce(${registrosDeLlamada.estado}, 'sin_estado')`,
          cantidad: sql<number>`count(*)::int`,
        })
        .from(registrosDeLlamada)
        .where(
          and(
            eq(registrosDeLlamada.id_cuenta, idCuentaStr),
            sql`(${registrosDeLlamada.closer_mail} IS NULL OR ${registrosDeLlamada.closer_mail} = '')`,
          ),
        )
        .groupBy(registrosDeLlamada.estado),
    ]);

    const desgloseMap: Record<string, Record<string, number>> = {};
    for (const row of desglose) {
      const mail = row.closer_mail ?? "";
      if (!desgloseMap[mail]) desgloseMap[mail] = {};
      desgloseMap[mail][row.estado] = row.cantidad;
    }

    const sinAsignarMap: Record<string, number> = {};
    let sinAsignarTotal = 0;
    for (const row of sinAsignarRows) {
      sinAsignarMap[row.estado] = row.cantidad;
      sinAsignarTotal += row.cantidad;
    }

    return NextResponse.json({
      asesores: asesores.map((a) => ({
        closer_mail: a.closer_mail,
        nombre_closer: a.nombre_closer,
        total_leads: a.total_leads,
        por_estado: desgloseMap[a.closer_mail ?? ""] ?? {},
      })),
      sin_asignar: {
        total: sinAsignarTotal,
        por_estado: sinAsignarMap,
      },
    });
  });
}
