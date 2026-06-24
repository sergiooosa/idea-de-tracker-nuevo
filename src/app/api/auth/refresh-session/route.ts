import { NextResponse } from "next/server";
import { auth, unstable_update } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const updated = await unstable_update({});
  const tipoUsuario = updated?.user?.tipoUsuario ?? "analista";

  return NextResponse.json({ ok: true, tipoUsuario });
}
