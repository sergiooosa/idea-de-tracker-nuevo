import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = await req.json();
    const { filtro_estado, filtro_asesores } = body;

    const idCuentaStr = String(idCuenta);

    const conditions = [eq(registrosDeLlamada.id_cuenta, idCuentaStr)];

    if (Array.isArray(filtro_estado) && filtro_estado.length > 0) {
      conditions.push(inArray(registrosDeLlamada.estado, filtro_estado));
    }

    if (Array.isArray(filtro_asesores) && filtro_asesores.length > 0) {
      conditions.push(inArray(registrosDeLlamada.closer_mail, filtro_asesores));
    }

    const [result] = await db
      .select({
        totalLeads: sql<number>`count(*)::int`,
        totalAsesores: sql<number>`count(distinct ${registrosDeLlamada.closer_mail})::int`,
      })
      .from(registrosDeLlamada)
      .where(and(...conditions));

    return NextResponse.json({
      totalLeads: result?.totalLeads ?? 0,
      totalAsesores: result?.totalAsesores ?? 0,
    });
  });
}
