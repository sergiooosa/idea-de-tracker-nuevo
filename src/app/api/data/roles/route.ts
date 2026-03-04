import { NextResponse } from "next/server";
import { withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { RolConfig } from "@/lib/db/schema";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["gestionar_roles", "gestionar_usuarios"], async (idCuenta) => {
    const [row] = await db
      .select({ roles_config: cuentas.roles_config })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);
    const roles: RolConfig[] = Array.isArray(row?.roles_config) ? row.roles_config : [];
    return NextResponse.json(roles);
  });
}

export async function PUT(req: Request) {
  return withAuthAndAnyPermission(req, ["gestionar_roles"], async (idCuenta) => {
    const body = (await req.json()) as { roles_config: RolConfig[] };
    if (!Array.isArray(body.roles_config)) {
      return NextResponse.json({ error: "roles_config debe ser un array" }, { status: 400 });
    }
    await db.update(cuentas).set({ roles_config: body.roles_config }).where(eq(cuentas.id_cuenta, idCuenta));
    return NextResponse.json({ ok: true });
  });
}
