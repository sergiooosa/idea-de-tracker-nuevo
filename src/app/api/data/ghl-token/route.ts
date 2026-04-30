import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

// GET — estado del token GHL de la cuenta
export async function GET(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const [row] = await db
      .select({ locationid: cuentas.locationid })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const statusRow = await db.execute(sql`
      SELECT token_ghl_status FROM cuentas WHERE id_cuenta = ${idCuenta}
    `).then(r => r.rows[0] as { token_ghl_status: string } | undefined);

    const pendingCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM ghl_pending_actions
      WHERE id_cuenta = ${idCuenta} AND resolved_at IS NULL
    `).then(r => Number((r.rows[0] as { total: string }).total));

    return NextResponse.json({
      status: statusRow?.token_ghl_status ?? "unknown",
      locationid: row?.locationid,
      pending_count: pendingCount,
    });
  });
}

// POST — validar nuevo token y si es válido, guardar + reintentar pendientes
export async function POST(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const { token } = await req.json() as { token?: string };
    if (!token) return NextResponse.json({ error: "token requerido" }, { status: 400 });

    const [row] = await db
      .select({ locationid: cuentas.locationid })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const locationId = row?.locationid;
    if (!locationId) return NextResponse.json({ error: "No hay locationId configurado" }, { status: 400 });

    // Validar el token contra GHL
    const bearer = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    let valid = false;
    try {
      const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
        headers: { Authorization: bearer, Version: "2021-07-28" },
        signal: AbortSignal.timeout(8000),
      });
      valid = res.status !== 401 && res.status !== 403;
    } catch {
      valid = false;
    }

    if (!valid) {
      return NextResponse.json({ valid: false, error: "Token inválido — GHL respondió 401" }, { status: 422 });
    }

    // Token válido — guardar y marcar ok
    await db.execute(sql`
      UPDATE cuentas SET token_ghl = ${token}, token_ghl_status = 'ok' WHERE id_cuenta = ${idCuenta}
    `);

    // Contar pendientes (para reportar al usuario)
    const totalPending = await db.execute(sql`
      SELECT COUNT(*) as total FROM ghl_pending_actions
      WHERE id_cuenta = ${idCuenta} AND resolved_at IS NULL
    `).then(r => Number((r.rows[0] as { total: string }).total));

    // Procesar solo las primeras 20 en este request (evita timeout de 30s de Next.js)
    // El resto se procesará cuando el usuario refresque o en el siguiente check.
    // 20 notas × 600ms = 12s << 30s límite ✅
    const BATCH_SIZE = 20;
    const pendientes = await db.execute(sql`
      SELECT id, contact_id, action_type, payload FROM ghl_pending_actions
      WHERE id_cuenta = ${idCuenta} AND resolved_at IS NULL
      ORDER BY created_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    let success = 0;
    let failed = 0;

    for (const action of pendientes.rows as Array<{ id: number; contact_id: string; action_type: string; payload: Record<string, unknown> }>) {
      await new Promise(r => setTimeout(r, 600));
      try {
        if (action.action_type === "note" && action.payload.body) {
          const r = await fetch(`https://services.leadconnectorhq.com/contacts/${action.contact_id}/notes`, {
            method: "POST",
            headers: { Authorization: bearer, "Content-Type": "application/json", Version: "2021-07-28" },
            body: JSON.stringify({ body: action.payload.body }),
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) throw new Error(`GHL ${r.status}`);
        } else if (action.action_type === "tag" && action.payload.tag) {
          const r = await fetch(`https://services.leadconnectorhq.com/contacts/${action.contact_id}/tags`, {
            method: "POST",
            headers: { Authorization: bearer, "Content-Type": "application/json", Version: "2021-07-28" },
            body: JSON.stringify({ tags: [action.payload.tag] }),
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) throw new Error(`GHL ${r.status}`);
        }
        await db.execute(sql`UPDATE ghl_pending_actions SET resolved_at = NOW() WHERE id = ${action.id}`);
        success++;
      } catch {
        await db.execute(sql`UPDATE ghl_pending_actions SET retry_count = retry_count + 1 WHERE id = ${action.id}`);
        failed++;
      }
    }

    const remaining = totalPending - success;
    return NextResponse.json({
      valid: true,
      total_pending: totalPending,
      processed: pendientes.rows.length,
      success,
      failed,
      remaining,  // frontend puede mostrar progreso y seguir reintentando
    });
  });
}
