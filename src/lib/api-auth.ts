import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

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
