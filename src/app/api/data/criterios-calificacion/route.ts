import { NextResponse } from "next/server";
import { withAuth, withAuthFull } from "@/lib/api-auth";
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

type Canal = "chats" | "llamadas" | "videollamadas";
const CANALES: Canal[] = ["chats", "llamadas", "videollamadas"];

interface CategoriaCustom {
  slug: string;
  label: string;
  descripcion: string;
}

interface CerebroCriterios {
  categorias_calificadas: string[];
  umbral_minimo: number;
  canales?: {
    chats?: { categorias_calificadas: string[]; umbral_minimo: number };
    llamadas?: { categorias_calificadas: string[]; umbral_minimo: number };
    videollamadas?: { categorias_calificadas: string[]; umbral_minimo: number };
  };
  categorias_custom?: CategoriaCustom[];
}

interface DashboardCanales {
  chats: string[] | null;
  llamadas: string[] | null;
  videollamadas: string[] | null;
}

function cerebroToDashboard(c: CerebroCriterios | null): {
  categorias: string[] | null;
  canales: DashboardCanales;
  categoriasCustom: CategoriaCustom[];
} {
  if (!c) {
    return { categorias: null, canales: { chats: null, llamadas: null, videollamadas: null }, categoriasCustom: [] };
  }
  const canales: DashboardCanales = { chats: null, llamadas: null, videollamadas: null };
  for (const canal of CANALES) {
    const canalData = c.canales?.[canal];
    if (canalData && canalData.categorias_calificadas.length > 0) {
      canales[canal] = canalData.categorias_calificadas;
    }
  }
  return {
    categorias: c.categorias_calificadas.length > 0 ? c.categorias_calificadas : null,
    canales,
    categoriasCustom: c.categorias_custom ?? [],
  };
}

function dashboardToCerebro(
  categorias: string[] | null,
  canales: DashboardCanales | undefined,
  categoriasCustom?: CategoriaCustom[],
): CerebroCriterios | null {
  const hasGlobal = categorias && categorias.length > 0;
  const hasCanales = canales && CANALES.some((c) => canales[c] && canales[c]!.length > 0);
  const hasCustom = categoriasCustom && categoriasCustom.length > 0;

  if (!hasGlobal && !hasCanales && !hasCustom) return null;

  const result: CerebroCriterios = {
    categorias_calificadas: categorias ?? [],
    umbral_minimo: 1,
  };

  if (hasCanales && canales) {
    result.canales = {};
    for (const canal of CANALES) {
      const cats = canales[canal];
      if (cats && cats.length > 0) {
        result.canales[canal] = { categorias_calificadas: cats, umbral_minimo: 1 };
      }
    }
  }

  if (hasCustom) {
    result.categorias_custom = categoriasCustom;
  }

  return result;
}

/**
 * GET /api/data/criterios-calificacion
 * Returns: { categorias, canales, categoriasDisponibles }
 */
export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    let criteriosRaw: CerebroCriterios | null = null;
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
          if (data?.criterios_calificacion) {
            criteriosRaw = data.criterios_calificacion as CerebroCriterios;
          }
        }
      }
    } catch (err) {
      console.warn("[criterios-calificacion] No se pudo consultar Cerebro:", err);
    }

    const { categorias, canales, categoriasCustom } = cerebroToDashboard(criteriosRaw);

    const categoriasRows = await db
      .selectDistinct({ cat: chatsLogs.ia_categoria })
      .from(chatsLogs)
      .where(and(eq(chatsLogs.id_cuenta, idCuenta), isNotNull(chatsLogs.ia_categoria)))
      .orderBy(sql`${chatsLogs.ia_categoria} asc`)
      .limit(50);

    const categoriasDisponibles = categoriasRows
      .map((r) => r.cat)
      .filter((c): c is string => c != null && c.trim().length > 0);

    return NextResponse.json({ categorias, canales, categoriasDisponibles, categoriasCustom });
  });
}

/**
 * PATCH /api/data/criterios-calificacion
 * Body: { categorias: string[] | null, canales?: { chats, llamadas, videollamadas } }
 */
export async function PATCH(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const puedeEditar = ctx.rol === "superadmin" || ctx.permisosArray.includes("configurar_sistema");
    if (!puedeEditar) {
      return NextResponse.json({ error: "Se requiere permiso de configuración del sistema" }, { status: 403 });
    }
    const idCuenta = ctx.idCuenta;
    const body = await req.json().catch(() => null);
    if (!body || !("categorias" in body)) {
      return NextResponse.json({ error: "categorias requerido" }, { status: 400 });
    }

    const { categorias, canales, categoriasCustom } = body as {
      categorias: string[] | null;
      canales?: DashboardCanales;
      categoriasCustom?: CategoriaCustom[];
    };
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

    const cerebroPayload = dashboardToCerebro(categorias, canales, categoriasCustom);

    const cerebroRes = await fetch(
      `${API_BASE_URL}/api/cuentas/${idCuenta}/criterios-calificacion`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(cerebroPayload),
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

    const data = await cerebroRes.json().catch(() => ({ ok: true }));
    return NextResponse.json(data);
  });
}
