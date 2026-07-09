import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
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

export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const body = (await req.json()) as {
      contactIds: string[];
      tags?: string[];
      customField?: { key: string; value: string };
    };

    if (!Array.isArray(body.contactIds) || body.contactIds.length === 0) {
      return NextResponse.json(
        { error: "contactIds requerido (array no vacío)" },
        { status: 400 },
      );
    }
    if (!body.tags?.length && !body.customField) {
      return NextResponse.json(
        { error: "Se requiere tags o customField" },
        { status: 400 },
      );
    }

    const apiKey = await getCuentaApiKey(ctx.idCuenta);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró API key para esta cuenta" },
        { status: 500 },
      );
    }

    try {
      const cerebroRes = await fetch(`${API_BASE_URL}/api/leads/bulk-tag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({
          id_cuenta: ctx.idCuenta,
          contactIds: body.contactIds,
          tags: body.tags,
          customField: body.customField,
        }),
      });

      if (!cerebroRes.ok) {
        const errText = await cerebroRes.text().catch(() => "Error desconocido");
        console.error("[bulk-tag] Cerebro respondió:", cerebroRes.status, errText);
        return NextResponse.json(
          { error: `Backend respondió ${cerebroRes.status}`, debug: errText },
          { status: cerebroRes.status >= 500 ? 502 : cerebroRes.status },
        );
      }

      const data = await cerebroRes.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error("[bulk-tag] Error:", err);
      return NextResponse.json(
        { error: "Error conectando con el backend" },
        { status: 502 },
      );
    }
  });
}
