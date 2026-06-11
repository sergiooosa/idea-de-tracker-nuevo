import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { canControlEnfoque } from "@/lib/permisos";
import { finalizarSesionUsuario } from "@/lib/queries/enfoque";

/** F4 — Finaliza la sesión de un usuario (libera sus locks). Gating explícito. */
export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    if (!canControlEnfoque(ctx.rol, ctx.permisosArray)) {
      return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
    }

    const { id_sesion, target_email } = (await req.json()) as {
      id_sesion?: string;
      target_email?: string;
    };

    if (!id_sesion || !target_email) {
      return NextResponse.json({ error: "Faltan id_sesion o target_email" }, { status: 400 });
    }

    const result = await finalizarSesionUsuario(ctx.idCuenta, ctx.email, id_sesion, target_email);
    return NextResponse.json(result);
  });
}
