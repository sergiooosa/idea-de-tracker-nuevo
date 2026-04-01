/**
 * GET /api/data/mis-cuentas
 * Devuelve todas las cuentas disponibles para el email del usuario actual.
 * Usado por el AccountSwitcher en el sidebar.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { normalizeSubdominio } from "@/lib/subdomain";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const rows = await db
    .select({
      id_cuenta: cuentas.id_cuenta,
      nombre_cuenta: cuentas.nombre_cuenta,
      subdominio: cuentas.subdominio,
    })
    .from(usuariosDashboard)
    .innerJoin(cuentas, eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(eq(usuariosDashboard.email, email));

  const accounts = rows.map((r) => ({
    id_cuenta: r.id_cuenta,
    nombre_cuenta: r.nombre_cuenta ?? r.subdominio,
    subdominio: normalizeSubdominio(r.subdominio) ?? r.subdominio,
  }));

  return NextResponse.json({ accounts });
}
