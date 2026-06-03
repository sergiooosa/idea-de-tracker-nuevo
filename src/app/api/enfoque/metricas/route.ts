import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getMetricasSesion } from "@/lib/queries/enfoque";

export async function GET(req: Request) {
  return withAuth(req, async (_idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const idSesion = searchParams.get("sesion");

    if (!idSesion) {
      return NextResponse.json({ error: "Falta sesion" }, { status: 400 });
    }

    const metricas = await getMetricasSesion(idSesion, email);
    return NextResponse.json(metricas);
  });
}
