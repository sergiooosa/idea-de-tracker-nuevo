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
import { eq, and, sql } from "drizzle-orm";

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

    // Validar que el locationId corresponde a la cuenta.
    // El subdominio en BD puede tener dos formatos:
    //   "tracker-scalebox"              (sin dominio)
    //   "tracker-scalebox.autokpi.net"  (con dominio completo)
    // El locationId que llega del webhook siempre es el prefijo sin dominio.
    // Buscar por ambos para cubrir todos los casos.
    const locationIdFull = locationId.includes(".") ? locationId : `${locationId}.autokpi.net`;
    const { or } = await import("drizzle-orm");
    const [cuentaRow] = await db
      .select({ id_cuenta: cuentas.id_cuenta, zona_horaria_iana: cuentas.zona_horaria_iana })
      .from(cuentas)
      .where(or(eq(cuentas.subdominio, locationId), eq(cuentas.subdominio, locationIdFull))!)
      .limit(1);

    if (!cuentaRow || cuentaRow.id_cuenta !== keyRow.id_cuenta) {
      return NextResponse.json({ error: "Cuenta no encontrada o API Key no corresponde" }, { status: 404 });
    }

    const body = await req.json() as Record<string, unknown>;

    // ── Atribución: extraer userId / customerId si vienen en el body ──────────
    // Campos reservados (no se guardan como métricas):
    //   userId      → ID del asesor/closer en GHL
    //   customerId  → ID del contacto/cliente en GHL
    const ghlUserId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null;
    const ghlCustomerId = typeof body.customerId === "string" && body.customerId.trim() ? body.customerId.trim() : null;
    delete body.userId;
    delete body.customerId;

    // ── Fecha ────────────────────────────────────────────────────────────────
    // Aceptar fecha ("2026-04-08") o datetime con timezone ("2026-04-08T14:30:00-05:00")
    const fechaRaw = body.fecha as string | undefined;
    let fecha: string;
    if (fechaRaw) {
      if (fechaRaw.includes("T") || fechaRaw.includes(" ")) {
        const d = new Date(fechaRaw);
        fecha = isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
      } else {
        fecha = fechaRaw.slice(0, 10);
      }
    } else {
      const tz = cuentaRow.zona_horaria_iana ?? "UTC";
      try {
        fecha = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
      } catch {
        fecha = new Date().toISOString().slice(0, 10); // fallback UTC si el IANA es inválido
      }
    }
    delete body.fecha;

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: "Body vacío — envía al menos un campo numérico" }, { status: 400 });
    }

    const idCuenta = cuentaRow.id_cuenta;
    let inserted = 0;
    const campos_guardados: string[] = [];

    for (const [campo, valor] of Object.entries(body)) {
      const num = Number(valor);
      if (isNaN(num) || typeof valor === "object") continue;

      if (ghlUserId !== null || ghlCustomerId !== null) {
        // ── Modo atribuido: INSERT individual, sin upsert global ────────────
        // Cada llamada con userId/customerId genera una fila nueva acumulable.
        // El campo global (sin user/customer) se actualiza por separado abajo
        // solo si también viene valor sin atribución (caso raro, pero seguro).
        await db.insert(metricasWebhook).values({
          id_cuenta: idCuenta,
          fecha,
          campo,
          valor: String(num),
          ghl_user_id: ghlUserId,
          ghl_customer_id: ghlCustomerId,
        });
        // También acumular en el aggregate global (fila sin user/customer)
        // Usa el constraint real: metricas_webhook_id_cuenta_fecha_campo_key
        await db.execute(sql`
          INSERT INTO metricas_webhook (id_cuenta, fecha, campo, valor, updated_at)
          VALUES (${idCuenta}, ${fecha}, ${campo}, ${String(num)}, NOW())
          ON CONFLICT (id_cuenta, fecha, campo) DO UPDATE
          SET valor = metricas_webhook.valor + ${String(num)},
              updated_at = NOW()
        `);
      } else {
        // ── Modo global: upsert simple ───────────────────────────────────────
        await db.insert(metricasWebhook).values({
          id_cuenta: idCuenta,
          fecha,
          campo,
          valor: String(num),
        }).onConflictDoUpdate({
          target: [metricasWebhook.id_cuenta, metricasWebhook.fecha, metricasWebhook.campo],
          set: { valor: String(num), updated_at: new Date() },
        });
      }

      campos_guardados.push(campo);
      inserted++;
    }

    return NextResponse.json({
      ok: true,
      message: `Se guardaron ${inserted} campo(s) para ${fecha}`,
      campos_guardados,
      fecha,
      atribuido_a: ghlUserId ? { userId: ghlUserId, customerId: ghlCustomerId } : null,
    });
  } catch (err) {
    console.error("[webhooks/metricas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
