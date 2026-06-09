import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sesionesEnfoque } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthFull(req, async ({ idCuenta }) => {
    const sesiones = await db
      .select({
        id: sesionesEnfoque.id,
        nombre: sesionesEnfoque.nombre,
        modo: sesionesEnfoque.modo,
        filtro_estado: sesionesEnfoque.filtro_estado,
        filtro_asesores: sesionesEnfoque.filtro_asesores,
        orden: sesionesEnfoque.orden,
        lock_expiracion_min: sesionesEnfoque.lock_expiracion_min,
        poll_intervalo_seg: sesionesEnfoque.poll_intervalo_seg,
        activa: sesionesEnfoque.activa,
        created_at: sesionesEnfoque.created_at,
        created_by: sesionesEnfoque.created_by,
      })
      .from(sesionesEnfoque)
      .where(eq(sesionesEnfoque.id_cuenta, idCuenta))
      .orderBy(desc(sesionesEnfoque.created_at));

    return NextResponse.json({ sesiones });
  });
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function POST(req: Request) {
  return withAuthFull(req, async ({ idCuenta, email }) => {
    const body = await req.json();
    const { nombre, modo, filtro_estado, filtro_asesores, orden, lock_expiracion_min, poll_intervalo_seg } = body;

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    const [sesion] = await db
      .insert(sesionesEnfoque)
      .values({
        id_cuenta: idCuenta,
        nombre: nombre.trim(),
        modo: modo ?? "llamada",
        filtro_estado: Array.isArray(filtro_estado) ? filtro_estado : null,
        filtro_asesores: Array.isArray(filtro_asesores) ? filtro_asesores : null,
        orden: orden === "menos_intentos" ? "menos_intentos" : "mas_antiguo",
        lock_expiracion_min: lock_expiracion_min != null ? clampInt(lock_expiracion_min, 5, 60, 15) : 15,
        poll_intervalo_seg: poll_intervalo_seg != null ? clampInt(poll_intervalo_seg, 3, 10, 4) : 4,
        activa: true,
        created_by: email,
      })
      .returning();

    return NextResponse.json({ sesion }, { status: 201 });
  });
}

export async function PUT(req: Request) {
  return withAuthFull(req, async ({ idCuenta }) => {
    const body = await req.json();
    const { id, nombre, modo, filtro_estado, filtro_asesores, orden, activa, lock_expiracion_min, poll_intervalo_seg } = body;

    if (!id) {
      return NextResponse.json({ error: "Se requiere id de la sesión" }, { status: 400 });
    }

    if (nombre !== undefined && (typeof nombre !== "string" || nombre.trim().length === 0)) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (nombre !== undefined) updates.nombre = nombre.trim();
    if (modo !== undefined) updates.modo = modo;
    if (filtro_estado !== undefined) updates.filtro_estado = Array.isArray(filtro_estado) ? filtro_estado : null;
    if (filtro_asesores !== undefined) updates.filtro_asesores = Array.isArray(filtro_asesores) ? filtro_asesores : null;
    if (orden !== undefined) updates.orden = orden === "menos_intentos" ? "menos_intentos" : "mas_antiguo";
    if (activa !== undefined) updates.activa = Boolean(activa);
    if (lock_expiracion_min !== undefined) updates.lock_expiracion_min = clampInt(lock_expiracion_min, 5, 60, 15);
    if (poll_intervalo_seg !== undefined) updates.poll_intervalo_seg = clampInt(poll_intervalo_seg, 3, 10, 4);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    const [sesion] = await db
      .update(sesionesEnfoque)
      .set(updates)
      .where(and(eq(sesionesEnfoque.id, id), eq(sesionesEnfoque.id_cuenta, idCuenta)))
      .returning();

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ sesion });
  });
}
