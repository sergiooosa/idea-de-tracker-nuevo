import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const { searchParams } = new URL(req.url);

    const metricIds = searchParams.getAll("metricIds[]");
    const from = searchParams.get("from") ?? "";
    const to = searchParams.get("to") ?? "";

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parámetros from y to son requeridos (YYYY-MM)" },
        { status: 400 },
      );
    }

    try {
      const upstreamParams = new URLSearchParams();
      upstreamParams.set("id_cuenta", String(idCuenta));
      upstreamParams.set("from", from);
      upstreamParams.set("to", to);
      for (const id of metricIds) {
        upstreamParams.append("metricIds[]", id);
      }

      const cerebroRes = await fetch(
        `${API_BASE_URL}/api/v1/metrics/monthly-summary?${upstreamParams.toString()}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );

      if (!cerebroRes.ok) {
        const errorText = await cerebroRes.text().catch(() => "Error desconocido");
        console.error("[monthly-summary] Cerebro respondió:", cerebroRes.status, errorText);
        return NextResponse.json(
          { error: `Error al obtener resumen mensual: ${cerebroRes.status}` },
          { status: cerebroRes.status },
        );
      }

      const data = await cerebroRes.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error("[monthly-summary] Error de red:", err);
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor" },
        { status: 503 },
      );
    }
  });
}
