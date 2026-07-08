import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";
import { db } from "@/lib/db";
import { apiKeysCuenta } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { desc } from "drizzle-orm";

async function getCuentaApiKey(idCuenta: number): Promise<string | null> {
  const [keyRow] = await db
    .select({ token: apiKeysCuenta.token })
    .from(apiKeysCuenta)
    .where(and(eq(apiKeysCuenta.id_cuenta, idCuenta), eq(apiKeysCuenta.activa, true)))
    .orderBy(desc(apiKeysCuenta.created_at), desc(apiKeysCuenta.id_key))
    .limit(1);
  return keyRow?.token?.trim() || null;
}

const DEFAULTS = { chats: false, llamadas: false, videollamadas: false };

export async function GET(req: Request) {
  return withAuthFull(req, async (ctx) => {
    try {
      const apiKey = await getCuentaApiKey(ctx.idCuenta);
      if (apiKey) {
        const cerebroRes = await fetch(
          `${API_BASE_URL}/api/cuentas/${ctx.idCuenta}/canales-activos`,
          { headers: { Authorization: `Bearer ${apiKey}`, "X-Api-Key": apiKey } },
        );
        if (cerebroRes.ok) {
          const data = await cerebroRes.json().catch(() => null);
          if (data && typeof data === "object") {
            return NextResponse.json({
              chats: Boolean(data.chats),
              llamadas: Boolean(data.llamadas),
              videollamadas: Boolean(data.videollamadas),
            });
          }
        }
      }
    } catch (err) {
      console.warn("[canales-activos] No se pudo consultar Cerebro:", err);
    }
    return NextResponse.json(DEFAULTS);
  });
}

export async function PATCH(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const puedeEditar = ctx.rol === "superadmin" || ctx.permisosArray.includes("configurar_sistema");
    if (!puedeEditar) {
      return NextResponse.json({ error: "Se requiere permiso de configuración del sistema" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const canales = {
      chats: Boolean(body.chats),
      llamadas: Boolean(body.llamadas),
      videollamadas: Boolean(body.videollamadas),
    };

    const apiKey = await getCuentaApiKey(ctx.idCuenta);
    if (!apiKey) {
      return NextResponse.json({ error: "No se encontró clave de API para esta cuenta" }, { status: 503 });
    }

    const cerebroRes = await fetch(
      `${API_BASE_URL}/api/cuentas/${ctx.idCuenta}/canales-activos`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(canales),
      },
    );

    if (!cerebroRes.ok) {
      const errorText = await cerebroRes.text().catch(() => "Error desconocido");
      console.error("[canales-activos] Cerebro respondió:", cerebroRes.status, errorText);
      return NextResponse.json(
        { error: `El backend respondió ${cerebroRes.status}: ${errorText}` },
        { status: 502 },
      );
    }

    const data = await cerebroRes.json().catch(() => ({ ok: true, ...canales }));
    return NextResponse.json(data);
  });
}
