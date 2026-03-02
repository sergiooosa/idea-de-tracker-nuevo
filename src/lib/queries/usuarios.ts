import { db } from "@/lib/db";
import { usuariosDashboard } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";

export interface UsuarioRow {
  id: number;
  nombre: string | null;
  email: string;
  rol: string;
  permisos: Record<string, boolean> | null;
  fathom: string | null;
  id_webhook_fathom: string | null;
}

export async function listUsuarios(idCuenta: number): Promise<UsuarioRow[]> {
  const rows = await db
    .select({
      id: usuariosDashboard.id_evento,
      nombre: usuariosDashboard.nombre,
      email: usuariosDashboard.email,
      rol: usuariosDashboard.rol,
      permisos: usuariosDashboard.permisos,
      fathom: usuariosDashboard.fathom,
      id_webhook_fathom: usuariosDashboard.id_webhook_fathom,
    })
    .from(usuariosDashboard)
    .where(eq(usuariosDashboard.id_cuenta, idCuenta));

  return rows;
}

export async function createUsuario(
  idCuenta: number,
  data: { nombre: string; email: string; password: string; rol: string; permisos?: Record<string, boolean>; fathom?: string },
): Promise<UsuarioRow> {
  const hashed = await hash(data.password, 10);
  const [row] = await db
    .insert(usuariosDashboard)
    .values({
      id_cuenta: idCuenta,
      nombre: data.nombre,
      email: data.email.trim().toLowerCase(),
      pass: hashed,
      rol: data.rol as "superadmin" | "usuario",
      permisos: data.permisos ?? null,
      fathom: data.fathom ?? null,
    })
    .returning({
      id: usuariosDashboard.id_evento,
      nombre: usuariosDashboard.nombre,
      email: usuariosDashboard.email,
      rol: usuariosDashboard.rol,
      permisos: usuariosDashboard.permisos,
      fathom: usuariosDashboard.fathom,
      id_webhook_fathom: usuariosDashboard.id_webhook_fathom,
    });

  return row;
}

export async function updateUsuario(
  idCuenta: number,
  idEvento: number,
  data: { nombre?: string; rol?: string; permisos?: Record<string, boolean>; fathom?: string; password?: string },
): Promise<void> {
  const set: Record<string, unknown> = {};
  if (data.nombre !== undefined) set.nombre = data.nombre;
  if (data.rol !== undefined) set.rol = data.rol;
  if (data.permisos !== undefined) set.permisos = data.permisos;
  if (data.fathom !== undefined) set.fathom = data.fathom;
  if (data.password) set.pass = await hash(data.password, 10);

  if (Object.keys(set).length === 0) return;

  await db
    .update(usuariosDashboard)
    .set(set)
    .where(
      and(
        eq(usuariosDashboard.id_evento, idEvento),
        eq(usuariosDashboard.id_cuenta, idCuenta),
      ),
    );
}

export async function deleteUsuario(idCuenta: number, idEvento: number): Promise<void> {
  await db
    .delete(usuariosDashboard)
    .where(
      and(
        eq(usuariosDashboard.id_evento, idEvento),
        eq(usuariosDashboard.id_cuenta, idCuenta),
      ),
    );
}
