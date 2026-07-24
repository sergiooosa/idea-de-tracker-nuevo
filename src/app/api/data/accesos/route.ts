import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { accesosDashboard, cuentas } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const isPlatformAdmin = session.user.platformAdmin === true;
  const isSuperadmin = session.user.rol === "superadmin";
  if (!isPlatformAdmin && !isSuperadmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const url = new URL(req.url);
  const filterCuenta = url.searchParams.get("id_cuenta");
  const dias = Math.min(Number(url.searchParams.get("dias")) || 30, 90);
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const conditions = [gte(accesosDashboard.created_at, desde)];

  if (!isPlatformAdmin) {
    if (!session.user.id_cuenta) {
      return NextResponse.json({ accesos: [], resumen: [], dias }, { status: 200 });
    }
    conditions.push(eq(accesosDashboard.id_cuenta, session.user.id_cuenta));
  } else if (filterCuenta) {
    conditions.push(eq(accesosDashboard.id_cuenta, Number(filterCuenta)));
  }

  const rows = await db
    .select({
      id: accesosDashboard.id,
      id_cuenta: accesosDashboard.id_cuenta,
      nombre_cuenta: cuentas.nombre_cuenta,
      email: accesosDashboard.email,
      nombre: accesosDashboard.nombre,
      ip: accesosDashboard.ip,
      created_at: accesosDashboard.created_at,
    })
    .from(accesosDashboard)
    .leftJoin(cuentas, eq(accesosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(and(...conditions))
    .orderBy(desc(accesosDashboard.created_at))
    .limit(500);

  const resumen = await db
    .select({
      email: accesosDashboard.email,
      nombre: accesosDashboard.nombre,
      id_cuenta: accesosDashboard.id_cuenta,
      nombre_cuenta: cuentas.nombre_cuenta,
      total: sql<number>`count(*)::int`,
      ultimo_acceso: sql<string>`max(${accesosDashboard.created_at})`,
    })
    .from(accesosDashboard)
    .leftJoin(cuentas, eq(accesosDashboard.id_cuenta, cuentas.id_cuenta))
    .where(and(...conditions))
    .groupBy(
      accesosDashboard.email,
      accesosDashboard.nombre,
      accesosDashboard.id_cuenta,
      cuentas.nombre_cuenta,
    )
    .orderBy(sql`count(*) desc`);

  return NextResponse.json({ accesos: rows, resumen, dias });
}
