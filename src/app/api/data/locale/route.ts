import { NextResponse } from "next/server";
import { withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { ConfiguracionAds } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(
    req,
    ["configurar_sistema", "ver_documentacion", "ver_rendimiento", "ver_dashboard"],
    async (idCuenta) => {
      const [row] = await db
        .select({ configuracion_ui: cuentas.configuracion_ui, configuracion_ads: cuentas.configuracion_ads })
        .from(cuentas)
        .where(eq(cuentas.id_cuenta, idCuenta))
        .limit(1);

      const idioma = row?.configuracion_ui?.idioma ?? "es";
      const adsCfg = (row?.configuracion_ads ?? {}) as ConfiguracionAds;
      const hasAds = !!(
        (adsCfg.meta?.activo && adsCfg.meta.ad_account_id) ||
        (adsCfg.google?.activo && adsCfg.google.customer_id) ||
        (adsCfg.tiktok?.activo && adsCfg.tiktok.advertiser_id)
      );
      return NextResponse.json({ idioma, hasAds });
    },
  );
}
