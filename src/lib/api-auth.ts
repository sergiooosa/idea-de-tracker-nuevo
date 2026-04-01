import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { tienePermiso, canViewAll, type PermisoId } from "@/lib/permisos";

/**
 * Enforce server-side: si el usuario tiene ver_solo_propios,
 * ignora cualquier closerEmails que venga en la request y retorna solo su email.
 * Previene que un asesor pase closerEmails de otro asesor en la URL.
 */
export function enforceCloserFilter(
  requestedEmails: string[] | undefined,
  sessionEmail: string,
  permisosArray: string[],
  rol: string,
): string[] | undefined {
  const puedeVerTodo = rol === "superadmin" || canViewAll(permisosArray);
  if (!puedeVerTodo) {
    // Sin importar lo que pida, solo puede ver sus propios datos
    return sessionEmail ? [sessionEmail] : undefined;
  }
  return requestedEmails;
}

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
