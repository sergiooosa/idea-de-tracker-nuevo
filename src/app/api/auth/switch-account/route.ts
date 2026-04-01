/**
 * POST /api/auth/switch-account
 * Cambia la cuenta activa en el JWT sin requerir contraseña.
 * Solo funciona si el usuario ya tiene sesión y el subdominio pertenece a su email.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handlers } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeSubdominio } from "@/lib/subdomain";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Instancia con update habilitado
const { unstable_update } = NextAuth(authConfig);

export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json() as { subdominio?: string };
  const subdominio = body.subdominio?.trim();
  if (!subdominio) return NextResponse.json({ error: "subdominio requerido" }, { status: 400 });

  // Verificar que ese subdominio pertenece al email del usuario
  const [row] = await db
    .select({
      id_cuenta: cuentas.id_cuenta,
      subdominio: cuentas.subdominio,
    })
    .from(usuariosDashboard)
    .innerJoin(cuentas, eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(and(
      eq(usuariosDashboard.email, email),
      eq(cuentas.subdominio, subdominio),
    ))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Cuenta no autorizada para este usuario" }, { status: 403 });
  }

  const subdominioNorm = normalizeSubdominio(row.subdominio) ?? row.subdominio;

  // Actualizar el JWT con el nuevo subdominio
  await unstable_update({
    user: {
      subdominio: subdominioNorm,
      id_cuenta: row.id_cuenta,
    },
  });

  return NextResponse.json({ ok: true, subdominio: subdominioNorm });
}
