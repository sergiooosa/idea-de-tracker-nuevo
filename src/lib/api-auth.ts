import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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
