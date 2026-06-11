import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { canControlEnfoque } from "@/lib/permisos";
import { reasignarLead } from "@/lib/queries/enfoque";

/** F4 — Reasigna un lead a otro asesor (libera lock + update closer_mail). */
export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    if (!canControlEnfoque(ctx.rol, ctx.permisosArray)) {
      return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
    }

    const { id_sesion, id_registro, nuevo_closer_mail } = (await req.json()) as {
      id_sesion?: string;
      id_registro?: number;
      nuevo_closer_mail?: string;
    };

    if (!id_sesion || !id_registro || !nuevo_closer_mail) {
      return NextResponse.json(
        { error: "Faltan id_sesion, id_registro o nuevo_closer_mail" },
        { status: 400 },
      );
    }

    const result = await reasignarLead(
      ctx.idCuenta,
      ctx.email,
      id_sesion,
      id_registro,
      nuevo_closer_mail,
    );
    if (!result.ok) {
      return NextResponse.json(
        { ...result, error: "Registro no encontrado en esta cuenta" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  });
}
