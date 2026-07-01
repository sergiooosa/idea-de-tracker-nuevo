import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuariosDashboard } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || !session.user.id_cuenta) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const newPassword: string | undefined = body.newPassword;

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const hashed = await hash(newPassword, 10);

  await db
    .update(usuariosDashboard)
    .set({ pass: hashed, must_change_password: false })
    .where(
      and(
        eq(usuariosDashboard.email, session.user.email),
        eq(usuariosDashboard.id_cuenta, session.user.id_cuenta),
      ),
    );

  void logAudit(session.user.id_cuenta, session.user.email, "CHANGE_PASSWORD", {
    forced: true,
  });

  return NextResponse.json({ ok: true });
}
