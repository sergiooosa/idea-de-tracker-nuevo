import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";
import { db } from "@/lib/db";
import { apiKeysCuenta } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function getCuentaApiKey(idCuenta: number): Promise<string | null> {
  const [keyRow] = await db
    .select({ token: apiKeysCuenta.token })
    .from(apiKeysCuenta)
    .where(and(eq(apiKeysCuenta.id_cuenta, idCuenta), eq(apiKeysCuenta.activa, true)))
    .orderBy(desc(apiKeysCuenta.created_at), desc(apiKeysCuenta.id_key))
    .limit(1);
  return keyRow?.token?.trim() || null;
}

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const { searchParams } = new URL(req.url);

    const apiKey = await getCuentaApiKey(idCuenta);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró clave de API para esta cuenta" },
        { status: 503 },
      );
    }

    const params = new URLSearchParams();
    params.set("id_cuenta", String(idCuenta));

    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const asesor = searchParams.get("asesor");
    const lead = searchParams.get("lead");

    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    if (asesor) params.set("asesor", asesor);
    if (lead) params.set("lead", lead);

    const cerebroRes = await fetch(
      `${API_BASE_URL}/api/data/mapa-tiempos?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
      },
    );

    if (!cerebroRes.ok) {
      const errorText = await cerebroRes.text().catch(() => "Error desconocido");
      return NextResponse.json(
        { error: `Backend respondió ${cerebroRes.status}: ${errorText}` },
        { status: cerebroRes.status >= 500 ? 502 : cerebroRes.status },
      );
    }

    const data: unknown = await cerebroRes.json();
    return NextResponse.json(data);
  });
}
