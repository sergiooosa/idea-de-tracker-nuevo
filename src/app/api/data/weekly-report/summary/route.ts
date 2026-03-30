import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getDashboard } from "@/lib/queries/dashboard";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);

    const [data, cuentaRow] = await Promise.all([
      getDashboard(idCuenta, from, to),
      db
        .select({ openai_api_key: cuentas.openai_api_key, nombre_cuenta: cuentas.nombre_cuenta })
        .from(cuentas)
        .where(eq(cuentas.id_cuenta, idCuenta))
        .limit(1)
        .then((r) => r[0] ?? null),
    ]);

    const apiKey = cuentaRow?.openai_api_key?.trim() || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "no_ai_config" }, { status: 422 });
    }

    const kpis = data.kpis;
    const objeciones = data.objeciones ?? [];
    const chats = data.chatKpis;
    const empresa = cuentaRow?.nombre_cuenta ?? "la empresa";

    const prompt = `Eres un analista de ventas experto. Genera un resumen ejecutivo semanal de ${empresa} basado en estos datos reales. Sé directo, usa bullets, máximo 300 palabras. Incluye: qué salió bien, qué falló, tendencias y 1-2 recomendaciones accionables.

DATOS DE LA SEMANA (${from} al ${to}):

LLAMADAS:
- Total realizadas: ${kpis.callsMade}
- Contestadas: ${kpis.contestadas} (${(kpis.answerRate * 100).toFixed(1)}% contestación)
- Tiempo promedio al lead: ${kpis.speedToLeadAvg ? `${kpis.speedToLeadAvg.toFixed(1)} min` : "N/D"}
- Intentos promedio primer contacto: ${kpis.avgAttempts?.toFixed(1) ?? "N/D"}

LEADS Y CIERRES:
- Leads generados: ${kpis.totalLeads}
- Citas agendadas: ${kpis.meetingsBooked}
- Asistieron: ${kpis.meetingsAttended}
- Canceladas: ${kpis.meetingsCanceled}
- Cierres: ${kpis.meetingsClosed}
- Tasa agendamiento: ${(kpis.tasaAgendamiento * 100).toFixed(1)}%
- Tasa cierre: ${(kpis.tasaCierre * 100).toFixed(1)}%

FINANCIERO:
- Facturación: $${kpis.revenue.toLocaleString("es-CO")}
- Efectivo cobrado: $${kpis.cashCollected.toLocaleString("es-CO")}
- Ticket promedio: $${kpis.avgTicket?.toLocaleString("es-CO") ?? "N/D"}

${chats && chats.total > 0 ? `CHATS:
- Total conversaciones: ${chats.total}
- Leads únicos: ${chats.leadsUnicos}
- Con respuesta de asesor: ${chats.conRespuesta} (${(chats.tasaRespuesta * 100).toFixed(1)}%)
` : ""}
OBJECIONES MÁS FRECUENTES:
${objeciones.slice(0, 5).map((o) => `- ${o.name}: ${o.count} veces`).join("\n") || "- Sin datos"}`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      console.error("[weekly-report/summary] OpenAI error:", openaiRes.status, err);
      return NextResponse.json({ error: `OpenAI error ${openaiRes.status}` }, { status: 500 });
    }

    const json = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const summary = json.choices?.[0]?.message?.content ?? "No se pudo generar el resumen.";
    return NextResponse.json({ summary });
  });
}
