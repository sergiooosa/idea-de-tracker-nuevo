import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";
import { db } from "@/lib/db";
import { chatsLogs, apiKeysCuenta } from "@/lib/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
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

/**
 * GET /api/data/criterios-calificacion
 * Returns: { categorias: string[] | null, categoriasDisponibles: string[] }
 * - categorias: currently configured qualifying criteria (null = all qualify)
 * - categoriasDisponibles: distinct ia_categoria values seen in this account
 */
export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    // Fetch configured criterios from Cerebro
    let criterias: string[] | null = null;
    try {
      const apiKey = await getCuentaApiKey(idCuenta);
      if (apiKey) {
        const cerebroRes = await fetch(
          `${API_BASE_URL}/api/cuentas/${idCuenta}/criterios-calificacion`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "X-Api-Key": apiKey,
            },
          },
        );
        if (cerebroRes.ok) {
          const data = await cerebroRes.json().catch(() => null);
          if (data && "categorias" in data) {
            criterias = data.categorias;
          }
        }
      }
    } catch (err) {
      console.warn("[criterios-calificacion] No se pudo consultar Cerebro:", err);
    }

    // Fetch distinct ia_categoria values for this account (for the multi-select UI)
    const categoriasRows = await db
      .selectDistinct({ cat: chatsLogs.ia_categoria })
      .from(chatsLogs)
      .where(and(eq(chatsLogs.id_cuenta, idCuenta), isNotNull(chatsLogs.ia_categoria)))
      .orderBy(sql`${chatsLogs.ia_categoria} asc`)
      .limit(50);

    const categoriasDisponibles = categoriasRows
      .map((r) => r.cat)
      .filter((c): c is string => c != null && c.trim().length > 0);

    return NextResponse.json({ categorias: criterias, categoriasDisponibles });
  });
}

/**
 * PATCH /api/data/criterios-calificacion
 * Body: { categorias: string[] | null }
 * null clears criterios → all chats qualify (backward compat)
 */
export async function PATCH(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = await req.json().catch(() => null);
    if (!body || !("categorias" in body)) {
      return NextResponse.json({ error: "categorias requerido" }, { status: 400 });
    }

    const { categorias } = body as { categorias: string[] | null };
    if (categorias !== null && !Array.isArray(categorias)) {
      return NextResponse.json({ error: "categorias debe ser un array o null" }, { status: 400 });
    }

    const apiKey = await getCuentaApiKey(idCuenta);
    if (!apiKey) {
      return NextResponse.json(
        { error: "No se encontró clave de API para esta cuenta" },
        { status: 503 },
      );
    }

    const cerebroRes = await fetch(
      `${API_BASE_URL}/api/cuentas/${idCuenta}/criterios-calificacion`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ categorias }),
      },
    );

    if (!cerebroRes.ok) {
      const errorText = await cerebroRes.text().catch(() => "Error desconocido");
      console.error("[criterios-calificacion] Cerebro respondió:", cerebroRes.status, errorText);
      return NextResponse.json(
        { error: `El backend respondió ${cerebroRes.status}: ${errorText}` },
        { status: 502 },
      );
    }

    const data = await cerebroRes.json().catch(() => ({ ok: true, categorias }));
    return NextResponse.json(data);
  });
}
