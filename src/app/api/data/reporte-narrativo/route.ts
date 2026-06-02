/**
 * GET /api/data/reporte-narrativo?periodo=7d|30d&regenerar=1
 *
 * Agrega métricas del período y genera narrativa comercial con GPT-4o-mini.
 * Cachea resultado 24h en memoria por (id_cuenta, periodo).
 * ?regenerar=1 invalida el cache y fuerza regeneración.
 */

import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/*  Tipos de respuesta                                                  */
/* ------------------------------------------------------------------ */

export interface RankingAsesor {
  nombre: string;
  totalChats: number;
  totalLlamadas: number;
}

export interface TopObjecion {
  objecion: string;
  categoria: string;
  count: number;
}

export interface ReporteNarrativoResponse {
  periodo: string;
  from: string;
  to: string;
  totalChats: number;
  totalLlamadas: number;
  contactadosPorChat: number;
  contactadosPorLlamada: number;
  sinContacto: number;
  categorias: Record<string, number>;
  topObjeciones: TopObjecion[];
  rankingAsesores: RankingAsesor[];
  narrativa: string;
  generadoAt: string;
  desdeCaché: boolean;
}

/* ------------------------------------------------------------------ */
/*  Cache en memoria — 24h TTL                                         */
/* ------------------------------------------------------------------ */

const narrativoCache = new Map<string, { data: ReporteNarrativoResponse; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getPeriodDates(periodo: string): { from: Date; to: Date } {
  const to = new Date();
  const dias = periodo === "7d" ? 7 : 30;
  const from = new Date(to.getTime() - dias * 24 * 60 * 60 * 1000);
  return { from, to };
}

function buildNarrativaPrompt(
  empresa: string,
  periodo: string,
  data: Pick<
    ReporteNarrativoResponse,
    "from" | "to" | "totalChats" | "totalLlamadas" | "contactadosPorChat" | "contactadosPorLlamada" | "sinContacto" | "categorias" | "topObjeciones" | "rankingAsesores"
  >,
): string {
  const lines: string[] = [
    `Eres un analista comercial experto analizando datos reales de "${empresa}".`,
    `Período: últimos ${periodo === "7d" ? "7 días" : "30 días"} (${data.from} al ${data.to}).`,
    ``,
    `INSTRUCCIONES CRÍTICAS:`,
    `- NUNCA inventes datos. Solo menciona lo que aparece en los datos.`,
    `- Escribe en español, lenguaje ejecutivo, directo.`,
    `- Sin jerga técnica. Un dueño de negocio debe entenderlo.`,
    `- Máximo 5-7 líneas. Sé conciso.`,
    `- Incluye los números más importantes.`,
    ``,
    `DATOS DISPONIBLES:`,
  ];

  if (data.totalChats > 0) {
    lines.push(`- Chats atendidos: ${data.totalChats}`);
    lines.push(`- Leads contactados por chat: ${data.contactadosPorChat}`);
  }
  if (data.totalLlamadas > 0) {
    lines.push(`- Llamadas realizadas: ${data.totalLlamadas}`);
    lines.push(`- Leads contactados por llamada: ${data.contactadosPorLlamada}`);
  }
  if (data.sinContacto > 0) {
    lines.push(`- Leads sin contacto: ${data.sinContacto}`);
  }

  const catEntries = Object.entries(data.categorias)
    .filter(([k]) => k !== "sin_categoria" && k !== "null")
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  if (catEntries.length > 0) {
    lines.push(`- Distribución por categoría de chats: ${catEntries.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
  }

  if (data.topObjeciones.length > 0) {
    lines.push(`- Top objeciones detectadas:`);
    for (const o of data.topObjeciones.slice(0, 5)) {
      lines.push(`  • "${o.objecion}" (${o.categoria}): ${o.count} veces`);
    }
  }

  if (data.rankingAsesores.length > 0) {
    lines.push(`- Ranking de asesores:`);
    for (const a of data.rankingAsesores.slice(0, 5)) {
      const partes: string[] = [];
      if (a.totalChats > 0) partes.push(`${a.totalChats} chats`);
      if (a.totalLlamadas > 0) partes.push(`${a.totalLlamadas} llamadas`);
      if (partes.length > 0) lines.push(`  • ${a.nombre}: ${partes.join(", ")}`);
    }
  }

  lines.push(
    ``,
    `Genera un párrafo narrativo ejecutivo en español que resuma los datos clave del período.`,
    `No uses bullets ni formato markdown. Solo texto corrido, máximo 7 líneas.`,
  );

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */

export async function GET(req: Request): Promise<Response> {
  return withAuthAndPermission(req, "ver_reportes", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") === "7d" ? "7d" : "30d";
    const regenerar = searchParams.get("regenerar") === "1";

    const cacheKey = `${idCuenta}:${periodo}`;

    // Devolver desde caché si es válido
    if (!regenerar) {
      const cached = narrativoCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json({ ...cached.data, desdeCaché: true });
      }
    }

    const { from, to } = getPeriodDates(periodo);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    // 1. Chats por categoría (también da totalChats)
    const chatsRows = await db.execute(sql`
      SELECT
        COALESCE(ia_categoria, 'sin_categoria') AS ia_categoria,
        COUNT(*)::int AS count
      FROM chats_logs
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z >= ${from}
        AND fecha_y_hora_z <= ${to}
      GROUP BY ia_categoria
    `);

    let totalChats = 0;
    const categorias: Record<string, number> = {};
    for (const row of chatsRows.rows) {
      const count = Number(row.count ?? 0);
      totalChats += count;
      const cat = String(row.ia_categoria ?? "sin_categoria");
      categorias[cat] = (categorias[cat] ?? 0) + count;
    }

    // 2. Contactados por chat
    const contactadosChatRows = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM chats_logs
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z >= ${from}
        AND fecha_y_hora_z <= ${to}
        AND estado IS NOT NULL
        AND estado NOT IN ('sin contactar', 'pendiente', 'sin_contactar')
    `);
    const contactadosPorChat = Number(contactadosChatRows.rows[0]?.count ?? 0);

    // 3. Top objeciones (JSONB array expansion)
    const objecionesRows = await db.execute(sql`
      SELECT
        o->>'objecion' AS objecion,
        COALESCE(o->>'categoria', 'general') AS categoria,
        COUNT(*)::int AS count
      FROM chats_logs,
           jsonb_array_elements(ia_objeciones) AS o
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z >= ${from}
        AND fecha_y_hora_z <= ${to}
        AND ia_objeciones IS NOT NULL
        AND jsonb_array_length(ia_objeciones) > 0
      GROUP BY o->>'objecion', o->>'categoria'
      ORDER BY count DESC
      LIMIT 10
    `);
    const topObjeciones: TopObjecion[] = objecionesRows.rows
      .filter((r) => r.objecion != null && String(r.objecion).trim() !== "")
      .map((r) => ({
        objecion: String(r.objecion),
        categoria: String(r.categoria ?? "general"),
        count: Number(r.count ?? 0),
      }));

    // 4. Ranking asesores por chats
    const asesorChatRows = await db.execute(sql`
      SELECT
        asesor_asignado,
        COUNT(*)::int AS total_chats
      FROM chats_logs
      WHERE id_cuenta = ${idCuenta}
        AND fecha_y_hora_z >= ${from}
        AND fecha_y_hora_z <= ${to}
        AND asesor_asignado IS NOT NULL
        AND asesor_asignado != ''
      GROUP BY asesor_asignado
      ORDER BY total_chats DESC
      LIMIT 10
    `);

    // 5. Llamadas
    const llamadasRows = await db.execute(sql`
      SELECT
        COALESCE(nombre_closer, closer_mail, 'Sin asignar') AS nombre,
        COUNT(*)::int AS total_llamadas,
        COUNT(*) FILTER (
          WHERE tipo_evento ILIKE '%answer%'
             OR tipo_evento ILIKE '%contestad%'
             OR tipo_evento ILIKE '%completed%'
        )::int AS contestadas
      FROM log_llamadas
      WHERE id_cuenta = ${idCuenta}
        AND ts >= ${from}
        AND ts <= ${to}
      GROUP BY nombre_closer, closer_mail
      ORDER BY total_llamadas DESC
      LIMIT 10
    `);

    let totalLlamadas = 0;
    let contactadosPorLlamada = 0;
    const asesorLlamadasMap = new Map<string, number>();
    for (const r of llamadasRows.rows) {
      const ll = Number(r.total_llamadas ?? 0);
      const contestadas = Number(r.contestadas ?? 0);
      totalLlamadas += ll;
      contactadosPorLlamada += contestadas;
      const nombre = String(r.nombre ?? "Sin asignar");
      asesorLlamadasMap.set(nombre, (asesorLlamadasMap.get(nombre) ?? 0) + ll);
    }

    // Merge asesores chats + llamadas
    const asesorMap = new Map<string, { totalChats: number; totalLlamadas: number }>();
    for (const r of asesorChatRows.rows) {
      const nombre = String(r.asesor_asignado ?? "");
      const entry = asesorMap.get(nombre) ?? { totalChats: 0, totalLlamadas: 0 };
      entry.totalChats += Number(r.total_chats ?? 0);
      asesorMap.set(nombre, entry);
    }
    for (const [nombre, ll] of asesorLlamadasMap) {
      const entry = asesorMap.get(nombre) ?? { totalChats: 0, totalLlamadas: 0 };
      entry.totalLlamadas += ll;
      asesorMap.set(nombre, entry);
    }
    const rankingAsesores: RankingAsesor[] = Array.from(asesorMap.entries())
      .map(([nombre, stats]) => ({ nombre, ...stats }))
      .sort((a, b) => (b.totalChats + b.totalLlamadas) - (a.totalChats + a.totalLlamadas))
      .slice(0, 10);

    const sinContacto = Math.max(0, totalChats - contactadosPorChat);

    // Obtener API key y nombre de la cuenta
    const cuentaRow = await db
      .select({ openai_api_key: cuentas.openai_api_key, nombre_cuenta: cuentas.nombre_cuenta })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1)
      .then((r) => r[0] ?? null);

    const apiKey = cuentaRow?.openai_api_key?.trim() || process.env.OPENAI_API_KEY;
    const empresa = cuentaRow?.nombre_cuenta ?? "la empresa";

    const metricas = {
      periodo,
      from: fromStr,
      to: toStr,
      totalChats,
      totalLlamadas,
      contactadosPorChat,
      contactadosPorLlamada,
      sinContacto,
      categorias,
      topObjeciones,
      rankingAsesores,
    };

    // Generar narrativa con GPT-4o-mini
    let narrativa = "";
    if (apiKey) {
      try {
        const prompt = buildNarrativaPrompt(empresa, periodo, metricas);
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Eres un analista comercial experto. Generas resúmenes ejecutivos concisos y directos en español. NUNCA inventas datos. Si un dato no está en el JSON, no lo menciones.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 400,
          }),
        });

        if (openaiRes.ok) {
          const json = (await openaiRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          narrativa = json.choices?.[0]?.message?.content?.trim() ?? "";
        } else {
          console.error("[reporte-narrativo] OpenAI error:", openaiRes.status, await openaiRes.text());
        }
      } catch (e) {
        console.error("[reporte-narrativo] OpenAI fetch error:", e);
      }
    }

    const response: ReporteNarrativoResponse = {
      ...metricas,
      narrativa,
      generadoAt: new Date().toISOString(),
      desdeCaché: false,
    };

    // Guardar en caché 24h
    narrativoCache.set(cacheKey, { data: response, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(response);
  });
}
