import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { canControlEnfoque } from "@/lib/permisos";
import { forzarSaltarLead } from "@/lib/queries/enfoque";

/** F4 — Fuerza saltar un lead atorado (libera lock + marca como gestionado). */
export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    if (!canControlEnfoque(ctx.rol, ctx.permisosArray)) {
      return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
    }

    const { id_sesion, id_registro } = (await req.json()) as {
      id_sesion?: string;
      id_registro?: number;
    };

    if (!id_sesion || !id_registro) {
      return NextResponse.json({ error: "Faltan id_sesion o id_registro" }, { status: 400 });
    }

    const result = await forzarSaltarLead(ctx.idCuenta, ctx.email, id_sesion, id_registro);
    return NextResponse.json(result);
  });
}
