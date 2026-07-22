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

interface CerebroCanalData {
  categorias_calificadas: string[];
  umbral_minimo: number;
  califica?: boolean;
}

interface CerebroCriterios {
  categorias_calificadas: string[];
  umbral_minimo: number;
  canales?: {
    chats?: CerebroCanalData;
    llamadas?: CerebroCanalData;
    videollamadas?: CerebroCanalData;
  };
  categorias_custom?: CategoriaCustom[];
  prompt_calificacion_chats?: string | null;
}

interface DashboardCanales {
  chats: string[] | null;
  llamadas: string[] | null;
  videollamadas: string[] | null;
}

interface DashboardCalifica {
  chats: boolean;
  llamadas: boolean;
  videollamadas: boolean;
}

const CALIFICA_DEFAULTS: DashboardCalifica = { chats: true, llamadas: false, videollamadas: true };

function cerebroToDashboard(c: CerebroCriterios | null): {
  categorias: string[] | null;
  canales: DashboardCanales;
  califica: DashboardCalifica;
  categoriasCustom: CategoriaCustom[];
  promptCalificacionChats: string | null;
} {
  if (!c) {
    return {
      categorias: null,
      canales: { chats: null, llamadas: null, videollamadas: null },
      califica: { ...CALIFICA_DEFAULTS },
      categoriasCustom: [],
      promptCalificacionChats: null,
    };
  }
  const canales: DashboardCanales = { chats: null, llamadas: null, videollamadas: null };
  const califica: DashboardCalifica = { ...CALIFICA_DEFAULTS };
  for (const canal of CANALES) {
    const canalData = c.canales?.[canal];
    if (canalData) {
      if (canalData.categorias_calificadas.length > 0) {
        canales[canal] = canalData.categorias_calificadas;
      }
      if (typeof canalData.califica === "boolean") {
        califica[canal] = canalData.califica;
      }
    }
  }
  return {
    categorias: c.categorias_calificadas.length > 0 ? c.categorias_calificadas : null,
    canales,
    califica,
    categoriasCustom: c.categorias_custom ?? [],
    promptCalificacionChats: c.prompt_calificacion_chats ?? null,
  };
}

function dashboardToCerebro(
  categorias: string[] | null,
  canales: DashboardCanales | undefined,
  categoriasCustom?: CategoriaCustom[],
  promptCalificacionChats?: string | null,
  califica?: DashboardCalifica,
): CerebroCriterios | null {
  const hasGlobal = categorias && categorias.length > 0;
  const hasCanales = canales && CANALES.some((c) => canales[c] && canales[c]!.length > 0);
  const hasCustom = categoriasCustom && categoriasCustom.length > 0;
  const hasPrompt = typeof promptCalificacionChats === "string" && promptCalificacionChats.trim().length > 0;
  const hasCalifica = califica && CANALES.some((c) => califica[c] !== CALIFICA_DEFAULTS[c]);

  if (!hasGlobal && !hasCanales && !hasCustom && !hasPrompt && !hasCalifica) return null;

  const result: CerebroCriterios = {
    categorias_calificadas: categorias ?? [],
    umbral_minimo: 1,
  };

  if ((hasCanales && canales) || (hasCalifica && califica)) {
    result.canales = {};
    for (const canal of CANALES) {
      const cats = canales?.[canal];
      const canalCalifica = califica?.[canal];
      if ((cats && cats.length > 0) || typeof canalCalifica === "boolean") {
        result.canales[canal] = {
          categorias_calificadas: cats ?? [],
          umbral_minimo: 1,
          ...(typeof canalCalifica === "boolean" ? { califica: canalCalifica } : {}),
        };
      }
    }
  }

  if (hasCustom) {
    result.categorias_custom = categoriasCustom;
  }

  if (hasPrompt) {
    result.prompt_calificacion_chats = promptCalificacionChats!.trim();
  } else if (promptCalificacionChats === null) {
    result.prompt_calificacion_chats = null;
  }

  return result;
}

/**
 * GET /api/data/criterios-calificacion
 * Returns: { categorias, canales, califica, categoriasDisponibles, categoriasCustom, promptCalificacionChats }
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

    const { categorias, canales, califica, categoriasCustom, promptCalificacionChats } = cerebroToDashboard(criteriosRaw);

    const categoriasRows = await db
      .selectDistinct({ cat: chatsLogs.ia_categoria })
      .from(chatsLogs)
      .where(and(eq(chatsLogs.id_cuenta, idCuenta), isNotNull(chatsLogs.ia_categoria)))
      .orderBy(sql`${chatsLogs.ia_categoria} asc`)
      .limit(50);

    const categoriasDisponibles = categoriasRows
      .map((r) => r.cat)
      .filter((c): c is string => c != null && c.trim().length > 0);

    return NextResponse.json({ categorias, canales, califica, categoriasDisponibles, categoriasCustom, promptCalificacionChats });
  });
}

/**
 * PATCH /api/data/criterios-calificacion
 * Body: { categorias, canales?, categoriasCustom?, promptCalificacionChats?, califica? }
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

    const { categorias, canales, categoriasCustom, promptCalificacionChats, califica } = body as {
      categorias: string[] | null;
      canales?: DashboardCanales;
      categoriasCustom?: CategoriaCustom[];
      promptCalificacionChats?: string | null;
      califica?: DashboardCalifica;
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

    const cerebroPayload = dashboardToCerebro(categorias, canales, categoriasCustom, promptCalificacionChats, califica);

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
