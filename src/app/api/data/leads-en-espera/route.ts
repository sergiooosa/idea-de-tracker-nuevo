import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getLeadsEnEspera } from "@/lib/queries/leads-en-espera";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    try {
      const data = await getLeadsEnEspera(idCuenta);
      return NextResponse.json(data);
    } catch (err) {
      console.error("[leads-en-espera] Error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Error al cargar leads en espera", debug: message },
        { status: 500 },
      );
    }
  });
}
