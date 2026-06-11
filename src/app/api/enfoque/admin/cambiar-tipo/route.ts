import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { canControlEnfoque } from "@/lib/permisos";
import {
  cambiarTipoUsuario,
  TIPOS_USUARIO_VALIDOS,
  type TipoUsuario,
} from "@/lib/queries/enfoque";

/** F4 — Cambia el tipo de usuario analista↔enfoque al vuelo. */
export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    if (!canControlEnfoque(ctx.rol, ctx.permisosArray)) {
      return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
    }

    const { target_email, nuevo_tipo } = (await req.json()) as {
      target_email?: string;
      nuevo_tipo?: string;
    };

    if (!target_email || !nuevo_tipo) {
      return NextResponse.json({ error: "Faltan target_email o nuevo_tipo" }, { status: 400 });
    }

    if (!TIPOS_USUARIO_VALIDOS.includes(nuevo_tipo as TipoUsuario)) {
      return NextResponse.json({ error: "tipo_usuario inválido" }, { status: 400 });
    }

    const result = await cambiarTipoUsuario(
      ctx.idCuenta,
      ctx.email,
      target_email,
      nuevo_tipo as TipoUsuario,
    );
    if (!result.ok) {
      return NextResponse.json(
        { ...result, error: "Usuario no encontrado en esta cuenta" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  });
}
