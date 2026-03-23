import { NextResponse } from "next/server";
import { withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(
    req,
    ["configurar_sistema", "ver_documentacion", "ver_rendimiento", "ver_dashboard"],
    async (idCuenta) => {
      const [row] = await db
        .select({ configuracion_ui: cuentas.configuracion_ui })
        .from(cuentas)
        .where(eq(cuentas.id_cuenta, idCuenta))
        .limit(1);

      const idioma = row?.configuracion_ui?.idioma ?? "es";
      return NextResponse.json({ idioma });
    },
  );
}
