import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { registrosDeLlamada } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { estadoToCanonicoEnfoque, resolverEstadoLead } from "@/lib/queries/enfoque";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const idRegistroStr = searchParams.get("id_registro");
    const idSesion = searchParams.get("id_sesion");

    if (!idRegistroStr) {
      return NextResponse.json({ error: "Falta id_registro" }, { status: 400 });
    }

    const idRegistro = Number(idRegistroStr);
    if (Number.isNaN(idRegistro)) {
      return NextResponse.json({ error: "id_registro inválido" }, { status: 400 });
    }

    if (idSesion) {
      const result = await resolverEstadoLead(idCuenta, email, idSesion, idRegistro);
      return NextResponse.json(result);
    }

    const idCuentaStr = String(idCuenta);
    const [registro] = await db
      .select({
        estado: registrosDeLlamada.estado,
      })
      .from(registrosDeLlamada)
      .where(
        and(
          eq(registrosDeLlamada.id_registro, idRegistro),
          eq(registrosDeLlamada.id_cuenta, idCuentaStr),
        ),
      )
      .limit(1);

    if (!registro) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      estado_raw: registro.estado,
      estado_canonico: estadoToCanonicoEnfoque(registro.estado),
    });
  });
}
