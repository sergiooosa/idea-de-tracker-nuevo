import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    try {
      const cerebroRes = await fetch(
        `${API_BASE_URL}/api/v1/metrics?id_cuenta=${idCuenta}`,
        {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );

      if (!cerebroRes.ok) {
        const errorText = await cerebroRes.text().catch(() => "Error desconocido");
        console.error("[metricas] Cerebro respondió:", cerebroRes.status, errorText);
        return NextResponse.json(
          { error: `Error al obtener métricas: ${cerebroRes.status}` },
          { status: cerebroRes.status },
        );
      }

      const data = await cerebroRes.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error("[metricas] Error de red:", err);
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor" },
        { status: 503 },
      );
    }
  });
}
