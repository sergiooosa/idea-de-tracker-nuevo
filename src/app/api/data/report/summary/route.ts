/**
 * POST /api/data/report/summary
 *
 * Recibe el JSON completo del reporte v2 y genera via GPT-4o-mini:
 *  1. Resumen ejecutivo (Bloque 0) — max 5 líneas, lenguaje ejecutivo
 *  2. Alertas y anomalías por bloque con semáforos (🟢🟡🔴)
 *  3. Análisis narrativo de conversaciones (Bloque 7) si hay datos pre-computados
 *
 * Regla crítica: NUNCA inventar datos. Si el JSON no tiene un campo, la IA no lo menciona.
 */

import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ReportResponse } from "@/app/api/data/report/route";

/* ------------------------------------------------------------------ */
/*  Tipos de respuesta                                                  */
/* ------------------------------------------------------------------ */

export interface ReportAlerta {
  bloque: string;
  nivel: "verde" | "amarillo" | "rojo";
  mensaje: string;
}

export interface ReportSummaryResponse {
  resumenEjecutivo: string;
  alertas: ReportAlerta[];
  analisisConversaciones: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constructor de prompt                                               */
/* ------------------------------------------------------------------ */

function buildPrompt(data: ReportResponse, empresa: string): string {
  const { periodo, ads, calls, chats, videocalls, funnel, crmHealth, conversationAnalysis, comparison } = data;

  const lines: string[] = [];

  lines.push(
    `Eres un analista de ventas experto analizando datos reales de "${empresa}".`,
    `Período analizado: ${periodo.from} al ${periodo.to} (${periodo.dias} días, tipo: ${periodo.type}).`,
    ``,
    `INSTRUCCIONES CRÍTICAS:`,
    `- NUNCA inventes datos. Si un campo no aparece en los datos, no lo menciones.`,
    `- Usa nombres reales de asesores cuando estén disponibles.`,
    `- Usa semáforos: 🟢 bueno, 🟡 atención, 🔴 crítico.`,
    `- Sé directo y ejecutivo. Sin relleno.`,
    ``,
    `Genera una respuesta JSON con este formato exacto:`,
    `{`,
    `  "resumenEjecutivo": "máximo 5 líneas con lo más importante del período, lenguaje ejecutivo, incluye el número más relevante",`,
    `  "alertas": [`,
    `    { "bloque": "nombre del bloque", "nivel": "verde|amarillo|rojo", "mensaje": "hallazgo concreto con número real" }`,
    `  ],`,
    `  "analisisConversaciones": "análisis narrativo de objeciones y patrones de conversación, o null si no hay datos"`,
    `}`,
    ``,
    `DATOS DISPONIBLES:`,
  );

  // --- Llamadas ---
  if (calls) {
    const tasaContacto = calls.tasaContactoGlobal.toFixed(1);
    const speed = calls.speedToLeadAvgMin != null ? `${calls.speedToLeadAvgMin.toFixed(1)} min` : "N/D";
    lines.push(
      ``,
      `LLAMADAS (Bloque 2):`,
      `- Total llamadas: ${calls.totalLlamadas}`,
      `- Contestadas: ${calls.totalContestadas} (${tasaContacto}% tasa de contacto)`,
      `- Speed-to-lead promedio: ${speed}`,
      `- Intentos promedio por lead: ${calls.intentosPromGlobal.toFixed(1)}`,
    );
    if (calls.porCloser.length > 0) {
      lines.push(`- Rendimiento por asesor:`);
      for (const c of calls.porCloser.slice(0, 8)) {
        const nombre = c.closerName ?? c.closerMail ?? "Sin nombre";
        const tasa = c.tasaContacto.toFixed(1);
        const spd = c.speedToLeadAvgMin != null ? `speed ${c.speedToLeadAvgMin.toFixed(1)}min` : "";
        lines.push(`  • ${nombre}: ${c.totalLlamadas} llamadas, ${tasa}% contacto${spd ? `, ${spd}` : ""}, ${c.leadsNuevos} nuevos + ${c.leadsSeguimiento} seguimiento`);
      }
    }
    if (comparison.calls) {
      const vLlamadas = comparison.calls.variacion_llamadas;
      const vTasa = comparison.calls.variacion_tasa_contacto;
      if (vLlamadas != null) lines.push(`- Variación vs período anterior: llamadas ${vLlamadas >= 0 ? "+" : ""}${vLlamadas.toFixed(1)}%, tasa contacto ${vTasa != null ? (vTasa >= 0 ? "+" : "") + vTasa.toFixed(1) + "%" : "N/D"}`);
    }
  }

  // --- Chats ---
  if (chats) {
    const speed = chats.speedToLeadAvgMin != null ? `${chats.speedToLeadAvgMin.toFixed(1)} min` : "N/D";
    lines.push(
      ``,
      `CHATS (Bloque 3):`,
      `- Total chats: ${chats.totalChats}`,
      `- Speed-to-lead promedio: ${speed}`,
    );
    const catEntries = Object.entries(chats.porCategoria).sort(([, a], [, b]) => b - a).slice(0, 5);
    if (catEntries.length > 0) {
      lines.push(`- Distribución por categoría: ${catEntries.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
    }
    if (chats.porAsesor.length > 0) {
      lines.push(`- Top asesores:`);
      for (const a of chats.porAsesor.slice(0, 5)) {
        const nombre = a.asesor ?? "Sin asignar";
        const spd = a.speedToLeadAvgMin != null ? `, speed ${a.speedToLeadAvgMin.toFixed(1)}min` : "";
        lines.push(`  • ${nombre}: ${a.totalChats} chats${spd}`);
      }
    }
    if (comparison.chats) {
      const vChats = comparison.chats.variacion_chats;
      if (vChats != null) lines.push(`- Variación vs período anterior: chats ${vChats >= 0 ? "+" : ""}${vChats.toFixed(1)}%`);
    }
  }

  // --- Videollamadas ---
  if (videocalls) {
    lines.push(
      ``,
      `VIDEOLLAMADAS (Bloque 4):`,
      `- Total citas: ${videocalls.total}`,
      `- Calificadas: ${videocalls.calificadas}`,
      `- No shows: ${videocalls.noShows}`,
      `- Cerradas: ${videocalls.cerradas}`,
      `- Tasa de cierre: ${videocalls.tasaCierre.toFixed(1)}%`,
    );
    if (videocalls.porCloser.length > 0) {
      lines.push(`- Rendimiento por closer:`);
      for (const c of videocalls.porCloser.slice(0, 6)) {
        const nombre = c.closer ?? "Sin nombre";
        const tasaCierre = c.total > 0 ? ((c.cerradas / c.total) * 100).toFixed(1) : "0.0";
        lines.push(`  • ${nombre}: ${c.total} citas, ${c.cerradas} cerradas (${tasaCierre}%), ${c.noShows} no-shows`);
      }
    }
    if (comparison.videocalls) {
      const vTotal = comparison.videocalls.variacion_total;
      const vCierre = comparison.videocalls.variacion_tasa_cierre;
      if (vTotal != null) lines.push(`- Variación vs período anterior: citas ${vTotal >= 0 ? "+" : ""}${vTotal.toFixed(1)}%, cierre ${vCierre != null ? (vCierre >= 0 ? "+" : "") + vCierre.toFixed(1) + "%" : "N/D"}`);
    }
  }

  // --- Ads ---
  if (ads) {
    lines.push(
      ``,
      `ANUNCIOS (Bloque 1):`,
      `- Gasto total: $${ads.totalGasto.toLocaleString("es-CO")}`,
      `- Impresiones: ${ads.totalImpresiones.toLocaleString("es-CO")}`,
      `- Clicks: ${ads.totalClicks.toLocaleString("es-CO")}`,
    );
    if (ads.avgCtr != null) lines.push(`- CTR promedio: ${(ads.avgCtr * 100).toFixed(2)}%`);
    if (ads.avgCpc != null) lines.push(`- CPC promedio: $${ads.avgCpc.toFixed(2)}`);
    if (ads.porCampana.length > 0) {
      lines.push(`- Top campañas: ${ads.porCampana.slice(0, 3).map((c) => `${c.campana ?? "sin nombre"}: $${c.gastoTotal.toLocaleString("es-CO")}`).join(", ")}`);
    }
    if (ads.porCreativo.length > 0) {
      lines.push(`- Top creativos por leads: ${ads.porCreativo.slice(0, 3).map((c) => `${c.nombre}: ${c.leadsCount} leads`).join(", ")}`);
    }
    if (comparison.ads) {
      const vGasto = comparison.ads.variacion_gasto;
      const vLeads = comparison.ads.variacion_leads;
      if (vGasto != null) lines.push(`- Variación vs período anterior: gasto ${vGasto >= 0 ? "+" : ""}${vGasto.toFixed(1)}%, leads ${vLeads != null ? (vLeads >= 0 ? "+" : "") + vLeads.toFixed(1) + "%" : "N/D"}`);
    }
  }

  // --- Funnel ---
  if (funnel) {
    const totalLlamadas = funnel.llamadas.contactados + funnel.llamadas.sinContacto;
    const totalChats = funnel.chats.contactados + funnel.chats.sinContacto;
    const totalVideo = funnel.videollamadas.contactados + funnel.videollamadas.sinContacto;
    lines.push(``, `FUNNEL DE LEADS (Bloque 5):`);
    if (totalLlamadas > 0) lines.push(`- Llamadas: ${funnel.llamadas.contactados} contactados / ${funnel.llamadas.sinContacto} sin contacto de ${totalLlamadas} total`);
    if (totalChats > 0) lines.push(`- Chats: ${funnel.chats.contactados} contactados / ${funnel.chats.sinContacto} sin contacto de ${totalChats} total`);
    if (totalVideo > 0) lines.push(`- Videollamadas: ${funnel.videollamadas.contactados} realizadas / ${funnel.videollamadas.sinContacto} sin ocurrir de ${totalVideo} total`);
  }

  // --- CRM Health ---
  if (crmHealth) {
    lines.push(
      ``,
      `HIGIENE CRM (Bloque 6):`,
      `- Leads sin estado: ${crmHealth.sinEstado}`,
      `- Leads sin acción: ${crmHealth.sinAccion}`,
      `- Leads en limbo (>5 días sin actividad): ${crmHealth.enLimbo}`,
    );
    const problemAsesor = crmHealth.porAsesor
      .filter((a) => a.sinEstado + a.sinAccion + a.enLimbo > 0)
      .sort((a, b) => (b.sinEstado + b.sinAccion + b.enLimbo) - (a.sinEstado + a.sinAccion + a.enLimbo))
      .slice(0, 3);
    if (problemAsesor.length > 0) {
      lines.push(`- Asesores con más problemas: ${problemAsesor.map((a) => `${a.asesor ?? "sin asignar"} (${a.sinEstado + a.sinAccion + a.enLimbo} issues)`).join(", ")}`);
    }
  }

  // --- Análisis de conversaciones ---
  if (conversationAnalysis && conversationAnalysis.objeciones.length > 0) {
    lines.push(
      ``,
      `ANÁLISIS DE CONVERSACIONES (Bloque 7):`,
      `- Total conversaciones analizadas: ${conversationAnalysis.totalConversaciones}`,
      `- Con objeciones detectadas: ${conversationAnalysis.conObjeciones}`,
      `- Top objeciones:`,
    );
    for (const o of conversationAnalysis.objeciones.slice(0, 8)) {
      lines.push(`  • "${o.objecion}" (${o.categoria}): ${o.count} veces`);
    }
    const catEntries = Object.entries(conversationAnalysis.porCategoria)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    if (catEntries.length > 0) {
      lines.push(`- Distribución por categoría de objeción: ${catEntries.map(([k, v]) => `${k}: ${v}`).join(", ")}`);
    }
  }

  lines.push(
    ``,
    `IMPORTANTE: Solo genera el JSON. No agregues texto antes ni después. No uses markdown code blocks.`,
    `Si analisisConversaciones no tiene datos de objeciones, devuelve null para ese campo.`,
  );

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Handler                                                             */
/* ------------------------------------------------------------------ */

export async function POST(req: Request): Promise<Response> {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    let body: ReportResponse;
    try {
      body = (await req.json()) as ReportResponse;
    } catch {
      return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
    }

    if (!body || !body.periodo) {
      return NextResponse.json({ error: "Se requiere el JSON completo del reporte" }, { status: 400 });
    }

    // Obtener API key de la cuenta o fallback a env
    const cuentaRow = await db
      .select({ openai_api_key: cuentas.openai_api_key, nombre_cuenta: cuentas.nombre_cuenta })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1)
      .then((r) => r[0] ?? null);

    const apiKey = cuentaRow?.openai_api_key?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "no_ai_config" }, { status: 422 });
    }

    const empresa = body.account?.nombre ?? cuentaRow?.nombre_cuenta ?? "la empresa";
    let prompt: string;
    try {
      prompt = buildPrompt(body, empresa);
    } catch (e) {
      console.error("[report/summary] Error construyendo prompt:", e);
      return NextResponse.json(
        { error: "JSON del reporte inválido o incompleto para generar el resumen" },
        { status: 400 },
      );
    }

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
              "Eres un analista de ventas experto. Respondes SIEMPRE con JSON válido y sin inventar datos. Si un bloque no tiene información, no lo incluyas en las alertas.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[report/summary] OpenAI error:", openaiRes.status, err);
      return NextResponse.json({ error: `OpenAI error ${openaiRes.status}` }, { status: 500 });
    }

    const json = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawContent = json.choices?.[0]?.message?.content ?? "{}";

    const VALID_NIVELES = new Set<string>(["verde", "amarillo", "rojo"]);

    let parsed: ReportSummaryResponse;
    try {
      const raw = JSON.parse(rawContent) as Partial<ReportSummaryResponse>;
      const rawAlertas = Array.isArray(raw.alertas) ? raw.alertas : [];
      parsed = {
        resumenEjecutivo: raw.resumenEjecutivo ?? "No se pudo generar el resumen.",
        alertas: rawAlertas.filter(
          (a): a is ReportAlerta =>
            a != null &&
            typeof a.bloque === "string" &&
            typeof a.mensaje === "string" &&
            VALID_NIVELES.has(a.nivel),
        ),
        analisisConversaciones: raw.analisisConversaciones ?? null,
      };
    } catch {
      console.error("[report/summary] JSON parse error, raw:", rawContent);
      return NextResponse.json({ error: "Error al parsear respuesta de IA" }, { status: 500 });
    }

    return NextResponse.json(parsed);
  });
}
