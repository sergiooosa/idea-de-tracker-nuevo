/**
 * POST /webhooks/metricas/:locationId
 *
 * Webhook genérico para enviar cualquier métrica personalizada al sistema.
 * El cliente configura sus campos en el panel → obtiene la URL + campos esperados.
 *
 * Body: { [nombreCampo]: valor, ... } — todos los campos que el cliente quiera enviar
 *
 * Ejemplo:
 *   POST /webhooks/metricas/sharkrealtor
 *   Headers: x-api-key: ak_xxx
 *   Body: { "ventas_cerradas": 3, "facturacion_usd": 15000, "leads_fb": 45 }
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cuentas, apiKeysCuenta, metricasWebhook } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ locationId: string }> },
) {
  try {
    const { locationId } = await params;
    const apiKey = req.headers.get("x-api-key");

    if (!apiKey?.trim()) {
      return NextResponse.json({ error: "Header x-api-key requerido" }, { status: 401 });
    }

    // Validar API key
    const [keyRow] = await db
      .select({ id_cuenta: apiKeysCuenta.id_cuenta })
      .from(apiKeysCuenta)
      .where(and(eq(apiKeysCuenta.token, apiKey.trim()), eq(apiKeysCuenta.activa, true)))
      .limit(1);

    if (!keyRow) {
      return NextResponse.json({ error: "API Key inválida o inactiva" }, { status: 401 });
    }

    // Validar que el locationId corresponde a la cuenta
    const [cuentaRow] = await db
      .select({ id_cuenta: cuentas.id_cuenta })
      .from(cuentas)
      .where(eq(cuentas.subdominio, locationId))
      .limit(1);

    if (!cuentaRow || cuentaRow.id_cuenta !== keyRow.id_cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada o API Key no corresponde" }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;
    // Aceptar fecha ("2026-04-08") o datetime con timezone ("2026-04-08T14:30:00-05:00")
    // Si viene con hora, parsear como Date y extraer la fecha en UTC
    const fechaRaw = body.fecha as string | undefined;
    let fecha: string;
    if (fechaRaw) {
      if (fechaRaw.includes("T") || fechaRaw.includes(" ")) {
        // Es datetime — parsear y tomar fecha UTC
        const d = new Date(fechaRaw);
        fecha = isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
      } else {
        // Solo fecha — usar tal cual
        fecha = fechaRaw.slice(0, 10);
      }
    } else {
      fecha = new Date().toISOString().slice(0, 10);
    }
    delete body.fecha; // No guardar fecha como campo de métrica

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Body vacío — envía al menos un campo numérico" }, { status: 400 });
    }

    const idCuenta = cuentaRow.id_cuenta;
    let inserted = 0;
    const campos_guardados: string[] = [];

    for (const [campo, valor] of Object.entries(body)) {
      const num = Number(valor);
      if (isNaN(num) || typeof valor === "object") continue;

      await db.insert(metricasWebhook).values({
        id_cuenta: idCuenta,
        fecha,
        campo,
        valor: String(num),
      }).onConflictDoUpdate({
        target: [metricasWebhook.id_cuenta, metricasWebhook.fecha, metricasWebhook.campo],
        set: { valor: String(num), updated_at: new Date() },
      });

      campos_guardados.push(campo);
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      message: `Se guardaron ${inserted} campo(s) para ${fecha}`,
      campos_guardados,
      fecha,
    });
  } catch (err) {
    console.error("[webhooks/metricas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
