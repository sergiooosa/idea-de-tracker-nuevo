// AutoKPI — Report v2 · Narrativa ejecutiva con Gemini (AUT-1302 / WS2)
// -----------------------------------------------------------------------------
// Genera el resumen ejecutivo a partir de los AGREGADOS del reporte v2 (no de
// 2-3 llamadas). Motor = Gemini (contexto grande + costo, decisión del plan).
// Si no hay API key configurada, cae a un resumen determinista construido desde
// los agregados — NUNCA inventa datos (regla CERO ALUCINACIONES).
// -----------------------------------------------------------------------------

import type { ReportV2, ReportV2Narrativa } from "@/types/reportV2";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiCandidate {
  content?: { parts?: Array<{ text?: string }> };
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

/** Alertas críticas derivadas de umbrales duros sobre los agregados. */
function deriveAlertas(report: ReportV2): string[] {
  const alertas: string[] = [];
  const { kpis, estadoFinal, higieneCRM } = report;
  const total = kpis.leadsAnalizados || 0;
  if (total > 0) {
    const sinRespuesta = estadoFinal.contactadosSinRespuesta + estadoFinal.sinActividad;
    const pctSinRespuesta = sinRespuesta / total;
    if (pctSinRespuesta >= 0.4) {
      alertas.push(
        `${Math.round(pctSinRespuesta * 100)}% de leads sin respuesta o sin actividad`,
      );
    }
  }
  if (kpis.citasAgendadas > 0 && kpis.showRate < 0.5) {
    alertas.push(`Show rate bajo: ${Math.round(kpis.showRate * 100)}%`);
  }
  if (higieneCRM.leadsSinActividadTotal > 0 && total > 0) {
    const pct = higieneCRM.leadsSinActividadTotal / total;
    if (pct >= 0.3) {
      alertas.push(
        `${Math.round(pct * 100)}% de leads sin actividad >${higieneCRM.diasUmbral}d (higiene CRM)`,
      );
    }
  }
  return alertas;
}

/** Resumen determinista desde agregados (fallback sin IA — sin alucinar). */
function fallbackResumen(report: ReportV2): string {
  const { kpis, meta } = report;
  const partes = [
    `En el periodo ${meta.periodo.from}–${meta.periodo.to} se analizaron ${kpis.leadsAnalizados} leads`,
    `(${kpis.nuevos} nuevos, ${kpis.reactivados} reactivados).`,
    `Se agendaron ${kpis.citasAgendadas} citas y se realizaron ${kpis.citasRealizadas}`,
    `(show rate ${Math.round(kpis.showRate * 100)}%).`,
  ];
  if (meta.enriquecimientoParcial) {
    partes.push(
      "Nota: el análisis cualitativo por IA aún es parcial para este periodo.",
    );
  }
  return partes.join(" ");
}

function buildPrompt(report: ReportV2): string {
  // Se pasa el agregado completo (no transcripts crudos) → máxima cobertura,
  // costo acotado. Gemini resume; no debe inventar cifras fuera del JSON.
  return [
    "Eres un analista comercial senior. Escribe un resumen ejecutivo (máx 180 palabras,",
    "español neutro, tono directo) del desempeño de ventas del periodo, basándote",
    "EXCLUSIVAMENTE en los datos agregados de este JSON. No inventes cifras ni",
    "menciones canales sin datos. Destaca funnel, contactabilidad, citas/show rate,",
    "higiene CRM y 2-3 acciones recomendadas.",
    "",
    "DATOS_AGREGADOS_JSON:",
    JSON.stringify(
      {
        meta: report.meta,
        kpis: report.kpis,
        funnel: report.funnel,
        estadoFinal: report.estadoFinal,
        origen: report.origen,
        higieneCRM: {
          leadsSinActividadTotal: report.higieneCRM.leadsSinActividadTotal,
          diasUmbral: report.higieneCRM.diasUmbral,
        },
        porCanal: report.porCanal,
        cobertura: report.cobertura,
        comparativo: report.comparativo,
        rankingAsesores: report.rankingAsesores.tabla.slice(0, 5),
        objeciones: report.objeciones.slice(0, 5),
      },
      null,
      0,
    ),
  ].join("\n");
}

/**
 * Genera la narrativa ejecutiva. `apiKey` = GEMINI_API_KEY (env) o por-cuenta.
 * Nunca lanza: si falla la IA, devuelve el fallback determinista.
 */
export async function generateNarrativa(
  report: ReportV2,
  apiKey: string | null,
): Promise<ReportV2Narrativa> {
  const alertasCriticas = deriveAlertas(report);
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
  if (!key) {
    return { resumenEjecutivo: fallbackResumen(report), alertasCriticas };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: buildPrompt(report) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
      }),
    });
    if (!res.ok) {
      return { resumenEjecutivo: fallbackResumen(report), alertasCriticas };
    }
    const data = (await res.json()) as GeminiResponse;
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return {
      resumenEjecutivo: texto || fallbackResumen(report),
      alertasCriticas,
    };
  } catch {
    return { resumenEjecutivo: fallbackResumen(report), alertasCriticas };
  }
}
