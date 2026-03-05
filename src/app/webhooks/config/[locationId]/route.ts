import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas, apiKeysCuenta } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET /webhooks/config/:locationId
 *
 * Endpoint público (autenticado con x-api-key) para que el Cerebro
 * obtenga la configuración activa del tenant: reglas de etiquetas,
 * embudo personalizado, chat triggers, prompts y datos de cuenta.
 *
 * Flujo típico del Cerebro:
 *  1. Recibir webhook de llamada/meeting/chat
 *  2. Llamar este endpoint para obtener las reglas actuales
 *  3. Evaluar `reglas_etiquetas` contra el resultado de la IA
 *  4. Escribir tags_internos en la BD + llamar al endpoint GHL configurado
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await params;
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey?.trim()) {
      return NextResponse.json(
        { error: "Header x-api-key requerido" },
        { status: 401 },
      );
    }

    const [keyRow] = await db
      .select({ id_cuenta: apiKeysCuenta.id_cuenta })
      .from(apiKeysCuenta)
      .where(
        and(
          eq(apiKeysCuenta.token, apiKey.trim()),
          eq(apiKeysCuenta.activa, true),
        ),
      )
      .limit(1);

    if (!keyRow) {
      return NextResponse.json(
        { error: "API Key inválida o inactiva" },
        { status: 401 },
      );
    }

    const [cuenta] = await db
      .select({
        id_cuenta: cuentas.id_cuenta,
        subdominio: cuentas.subdominio,
        nombre_cuenta: cuentas.nombre_cuenta,
        prompt_ventas: cuentas.prompt_ventas,
        prompt_videollamadas: cuentas.prompt_videollamadas,
        prompt_llamadas: cuentas.prompt_llamadas,
        reglas_etiquetas: cuentas.reglas_etiquetas,
        embudo_personalizado: cuentas.embudo_personalizado,
        chat_triggers: cuentas.chat_triggers,
        openai_api_key: cuentas.openai_api_key,
      })
      .from(cuentas)
      .where(eq(cuentas.subdominio, locationId))
      .limit(1);

    if (!cuenta || cuenta.id_cuenta !== keyRow.id_cuenta) {
      return NextResponse.json(
        { error: "Cuenta no encontrada o API Key no corresponde a este tenant" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      id_cuenta: cuenta.id_cuenta,
      subdominio: cuenta.subdominio,
      nombre_cuenta: cuenta.nombre_cuenta ?? null,
      prompts: {
        ventas: cuenta.prompt_ventas ?? null,
        videollamadas: cuenta.prompt_videollamadas ?? null,
        llamadas: cuenta.prompt_llamadas ?? null,
      },
      reglas_etiquetas: cuenta.reglas_etiquetas ?? [],
      embudo_personalizado: cuenta.embudo_personalizado ?? [],
      chat_triggers: cuenta.chat_triggers ?? [],
      has_openai_key: !!cuenta.openai_api_key,
    });
  } catch (err) {
    console.error("[webhooks/config]", err);
    return NextResponse.json(
      { error: "Error interno al obtener configuración" },
      { status: 500 },
    );
  }
}
