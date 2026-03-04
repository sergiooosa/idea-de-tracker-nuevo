import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { tienePermiso, type PermisoId } from "@/lib/permisos";

export interface AuthContext {
  idCuenta: number;
  email: string;
  rol: string;
  permisosArray: string[];
}

export async function withAuth(
  req: Request,
  handler: (idCuenta: number, email: string) => Promise<Response>,
) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handler(session.user.id_cuenta, session.user.email ?? "");
}

export async function withAuthFull(
  req: Request,
  handler: (ctx: AuthContext) => Promise<Response>,
) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return handler({
    idCuenta: session.user.id_cuenta,
    email: session.user.email ?? "",
    rol: session.user.rol ?? "",
    permisosArray: session.user.permisosArray ?? [],
  });
}

/** Requiere sesión + permiso específico. Si no tiene permiso, 403. */
export async function withAuthAndPermission(
  req: Request,
  permiso: PermisoId,
  handler: (idCuenta: number, email: string) => Promise<Response>,
) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const permisos = session.user.permisosArray ?? [];
  const rol = session.user.rol ?? "";
  const tieneAcceso = rol === "superadmin" || tienePermiso(permisos, permiso);
  if (!tieneAcceso) {
    return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
  }
  return handler(session.user.id_cuenta, session.user.email ?? "");
}

/** Requiere sesión + al menos uno de los permisos. */
export async function withAuthAndAnyPermission(
  req: Request,
  permisosRequeridos: PermisoId[],
  handler: (idCuenta: number, email: string) => Promise<Response>,
) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const permisos = session.user.permisosArray ?? [];
  const rol = session.user.rol ?? "";
  const tieneAcceso = rol === "superadmin" || permisosRequeridos.some((p) => tienePermiso(permisos, p));
  if (!tieneAcceso) {
    return NextResponse.json({ error: "Sin permiso para esta acción" }, { status: 403 });
  }
  return handler(session.user.id_cuenta, session.user.email ?? "");
}
