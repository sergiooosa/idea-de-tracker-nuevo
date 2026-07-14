import { NextResponse } from "next/server";
import { withAuthFull, enforceCloserFilter } from "@/lib/api-auth";
import { getLeadsEnEspera } from "@/lib/queries/leads-en-espera";
import type { CanalLeadsEnEspera } from "@/lib/queries/leads-en-espera";

const CANALES_VALIDOS = new Set<CanalLeadsEnEspera>(["llamada", "chat", "general"]);

export async function GET(req: Request) {
  return withAuthFull(req, async (ctx) => {
    try {
      const { searchParams } = new URL(req.url);
      const from = searchParams.get("from") ?? undefined;
      const to = searchParams.get("to") ?? undefined;
      const canalParam = searchParams.get("canal") ?? "llamada";
      const canal: CanalLeadsEnEspera = CANALES_VALIDOS.has(canalParam as CanalLeadsEnEspera)
        ? (canalParam as CanalLeadsEnEspera)
        : "llamada";
      const closerEmails = enforceCloserFilter(
        undefined,
        ctx.email,
        ctx.permisosArray,
        ctx.rol,
      );
      const data = await getLeadsEnEspera(ctx.idCuenta, from, to, closerEmails, canal);
      return NextResponse.json(data);
    } catch (err) {
      console.error("[leads-en-espera] Error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Error al cargar leads en espera" },
        { status: 500 },
      );
    }
  });
}
