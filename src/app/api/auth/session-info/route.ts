import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    email: session.user.email,
    name: session.user.name,
    rol: session.user.rol,
    permisos: session.user.permisos,
    permisosArray: session.user.permisosArray ?? [],
    id_cuenta: session.user.id_cuenta,
  });
}
