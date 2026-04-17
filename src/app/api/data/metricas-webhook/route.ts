/**
 * GET /api/data/metricas-webhook
 * Lista los campos únicos recibidos por webhook para esta cuenta,
 * con su último valor y fecha.
 *
 * POST /api/data/metricas-webhook
 * Envío interno de métrica (misma lógica que el webhook público pero autenticado con sesión)
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { metricasWebhook } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Campos únicos con su último valor y fecha
    const campos = await db.execute(sql`
      SELECT 
        campo,
        valor as ultimo_valor,
        fecha as ultima_fecha,
        COUNT(*) OVER (PARTITION BY campo) as total_registros
      FROM metricas_webhook
      WHERE id_cuenta = ${idCuenta}
      ${from ? sql`AND fecha >= ${from}::date` : sql``}
      ${to ? sql`AND fecha <= ${to}::date` : sql``}
      ORDER BY campo, fecha DESC
    `);

    // Agrupar por campo, tomar el más reciente
    const map: Record<string, { campo: string; ultimo_valor: number; ultima_fecha: string; total_registros: number }> = {};
    for (const row of campos.rows as Array<Record<string, unknown>>) {
      const campo = String(row.campo);
      if (!map[campo]) {
        map[campo] = {
          campo,
          ultimo_valor: parseFloat(String(row.ultimo_valor ?? 0)),
          ultima_fecha: String(row.ultima_fecha ?? ""),
          total_registros: parseInt(String(row.total_registros ?? 0)),
        };
      }
    }

    // Suma global por campo en el rango
    let sumaPorCampo: Record<string, number> = {};
    // Desglose por usuario (ghl_user_id) en el rango
    let desgloseUsuario: Record<string, Record<string, number>> = {};
    // Desglose por contacto/lead (ghl_customer_id) en el rango
    let desgloseCliente: Record<string, Record<string, number>> = {};

    if (from && to) {
      const sumas = await db.execute(sql`
        SELECT campo, SUM(valor) as total
        FROM metricas_webhook
        WHERE id_cuenta = ${idCuenta}
          AND fecha BETWEEN ${from}::date AND ${to}::date
          AND ghl_user_id IS NULL AND ghl_customer_id IS NULL
        GROUP BY campo
      `);
      for (const row of sumas.rows as Array<Record<string, unknown>>) {
        sumaPorCampo[String(row.campo)] = parseFloat(String(row.total ?? 0));
      }

      // Desglose por userId — solo filas con atribución
      const porUser = await db.execute(sql`
        SELECT campo, ghl_user_id, SUM(valor) as total
        FROM metricas_webhook
        WHERE id_cuenta = ${idCuenta}
          AND fecha BETWEEN ${from}::date AND ${to}::date
          AND ghl_user_id IS NOT NULL
        GROUP BY campo, ghl_user_id
        ORDER BY campo, total DESC
      `);
      for (const row of porUser.rows as Array<Record<string, unknown>>) {
        const campo = String(row.campo);
        const userId = String(row.ghl_user_id);
        if (!desgloseUsuario[campo]) desgloseUsuario[campo] = {};
        desgloseUsuario[campo][userId] = parseFloat(String(row.total ?? 0));
      }

      // Desglose por contacto/lead — solo filas con ghl_customer_id
      const porCliente = await db.execute(sql`
        SELECT campo, ghl_customer_id, SUM(valor) as total
        FROM metricas_webhook
        WHERE id_cuenta = ${idCuenta}
          AND fecha BETWEEN ${from}::date AND ${to}::date
          AND ghl_customer_id IS NOT NULL
        GROUP BY campo, ghl_customer_id
        ORDER BY campo, total DESC
      `);
      for (const row of porCliente.rows as Array<Record<string, unknown>>) {
        const campo = String(row.campo);
        const customerId = String(row.ghl_customer_id);
        if (!desgloseCliente[campo]) desgloseCliente[campo] = {};
        desgloseCliente[campo][customerId] = parseFloat(String(row.total ?? 0));
      }
    }

    return NextResponse.json({
      campos: Object.values(map),
      suma_por_campo: sumaPorCampo,
      desglose_usuario: desgloseUsuario,
      desglose_cliente: desgloseCliente,
      total_campos: Object.keys(map).length,
    });
  });
}
