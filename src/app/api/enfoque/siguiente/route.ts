import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSiguienteLead } from "@/lib/queries/enfoque";
import { db } from "@/lib/db";
import { enfoqueResultado } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const idSesion = searchParams.get("sesion");

    if (!idSesion) {
      return NextResponse.json({ error: "Falta sesion" }, { status: 400 });
    }

    const { lead, reconexion } = await getSiguienteLead(idCuenta, email, idSesion);

    const [progreso] = await db
      .select({
        completados: sql<number>`count(*)::int`,
      })
      .from(enfoqueResultado)
      .where(
        and(
          eq(enfoqueResultado.id_sesion, idSesion),
          eq(enfoqueResultado.closer_mail, email),
        ),
      );

    return NextResponse.json({
      lead,
      reconexion,
      completados: progreso?.completados ?? 0,
    });
  });
}
