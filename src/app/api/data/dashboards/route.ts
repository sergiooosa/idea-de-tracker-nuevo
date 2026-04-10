/**
 * GET  /api/data/dashboards  — Lista los dashboards personalizados de la cuenta
 * POST /api/data/dashboards  — Crea un dashboard nuevo (máx. 3)
 * PUT  /api/data/dashboards  — Actualiza nombre/icono de un dashboard existente
 * DELETE /api/data/dashboards?id=dashboard-1  — Elimina un dashboard
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { DashboardPersonalizado } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const MAX_DASHBOARDS = 3;
const VALID_IDS = ["dashboard-1", "dashboard-2", "dashboard-3"] as const;

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const [row] = await db
      .select({ dashboards_personalizados: cuentas.dashboards_personalizados })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    return NextResponse.json({
      dashboards: row?.dashboards_personalizados ?? [],
    });
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "ver_system", async (idCuenta) => {
    const body = await req.json() as { nombre?: string; icono?: string };
    const nombre = body.nombre?.trim();
    if (!nombre) {
      return NextResponse.json({ error: "nombre requerido" }, { status: 400 });
    }

    const [row] = await db
      .select({ dashboards_personalizados: cuentas.dashboards_personalizados })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const actual: DashboardPersonalizado[] = row?.dashboards_personalizados ?? [];
    if (actual.length >= MAX_DASHBOARDS) {
      return NextResponse.json({ error: `Límite de ${MAX_DASHBOARDS} dashboards alcanzado` }, { status: 422 });
    }

    // Asignar el primer ID disponible en secuencia
    const usados = new Set(actual.map((d) => d.id));
    const nuevoId = VALID_IDS.find((id) => !usados.has(id));
    if (!nuevoId) {
      return NextResponse.json({ error: "No hay IDs disponibles" }, { status: 422 });
    }

    const nuevo: DashboardPersonalizado = {
      id: nuevoId,
      nombre,
      icono: body.icono?.trim() || undefined,
      creado_en: new Date().toISOString(),
    };

    await db
      .update(cuentas)
      .set({ dashboards_personalizados: sql`${JSON.stringify([...actual, nuevo])}::jsonb` })
      .where(eq(cuentas.id_cuenta, idCuenta));

    return NextResponse.json({ ok: true, dashboard: nuevo });
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "ver_system", async (idCuenta) => {
    const body = await req.json() as { id?: string; nombre?: string; icono?: string };
    if (!body.id || !VALID_IDS.includes(body.id as typeof VALID_IDS[number])) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const [row] = await db
      .select({ dashboards_personalizados: cuentas.dashboards_personalizados })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const actual: DashboardPersonalizado[] = row?.dashboards_personalizados ?? [];
    const idx = actual.findIndex((d) => d.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Dashboard no encontrado" }, { status: 404 });
    }

    const actualizado = { ...actual[idx] };
    if (body.nombre?.trim()) actualizado.nombre = body.nombre.trim();
    if (body.icono !== undefined) actualizado.icono = body.icono.trim() || undefined;

    const nuevos = [...actual];
    nuevos[idx] = actualizado;

    await db
      .update(cuentas)
      .set({ dashboards_personalizados: sql`${JSON.stringify(nuevos)}::jsonb` })
      .where(eq(cuentas.id_cuenta, idCuenta));

    return NextResponse.json({ ok: true, dashboard: actualizado });
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "ver_system", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !VALID_IDS.includes(id as typeof VALID_IDS[number])) {
      return NextResponse.json({ error: "id inválido" }, { status: 400 });
    }

    const [row] = await db
      .select({ dashboards_personalizados: cuentas.dashboards_personalizados, metricas_config: cuentas.metricas_config })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);

    const actual: DashboardPersonalizado[] = row?.dashboards_personalizados ?? [];
    const filtrados = actual.filter((d) => d.id !== id);

    // Al borrar un dashboard, limpiar ese panel de las métricas que lo referenciaban
    const metricasActualizadas = (row?.metricas_config ?? []).map((m) => {
      const paneles = (m.paneles ?? [m.ubicacion]).filter((p) => p !== id) as typeof m.paneles;
      const ubicacion = paneles?.includes("panel_ejecutivo") ? "panel_ejecutivo"
        : paneles?.includes("rendimiento") ? "rendimiento"
        : paneles?.[0] ?? "panel_ejecutivo";
      return { ...m, paneles, ubicacion };
    });

    await db
      .update(cuentas)
      .set({
        dashboards_personalizados: sql`${JSON.stringify(filtrados)}::jsonb`,
        metricas_config: sql`${JSON.stringify(metricasActualizadas)}::jsonb`,
      })
      .where(eq(cuentas.id_cuenta, idCuenta));

    return NextResponse.json({ ok: true });
  });
}
