import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sesionesEnfoque } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const [sesion] = await db
      .select({
        id: sesionesEnfoque.id,
        nombre: sesionesEnfoque.nombre,
        modo: sesionesEnfoque.modo,
        orden: sesionesEnfoque.orden,
      })
      .from(sesionesEnfoque)
      .where(
        and(
          eq(sesionesEnfoque.id_cuenta, idCuenta),
          eq(sesionesEnfoque.activa, true),
        ),
      )
      .orderBy(desc(sesionesEnfoque.created_at))
      .limit(1);

    if (!sesion) {
      return NextResponse.json({ sesion: null });
    }

    return NextResponse.json({ sesion });
  });
}
