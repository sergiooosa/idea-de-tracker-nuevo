import { db } from "@/lib/db";
import { usuariosDashboard } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hash } from "bcryptjs";
import { registrarWebhookFathom } from "@/lib/fathom-webhook";

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

export interface CreateUsuarioResult {
  user: UsuarioRow;
  /** Si hubo API key Fathom pero el registro del webhook falló */
  fathomWarning: string | null;
}

export async function createUsuario(
  idCuenta: number,
  data: { nombre: string; email: string; password: string; rol: string; permisos?: Record<string, boolean>; fathom?: string },
): Promise<CreateUsuarioResult> {
  const fathomKey = data.fathom?.trim() || null;
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
      fathom: fathomKey,
      id_webhook_fathom: null,
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

  let fathomWarning: string | null = null;
  if (fathomKey) {
    const reg = await registrarWebhookFathom(fathomKey, idCuenta);
    if (reg.ok) {
      await db
        .update(usuariosDashboard)
        .set({ id_webhook_fathom: reg.webhookId })
        .where(
          and(eq(usuariosDashboard.id_evento, row.id), eq(usuariosDashboard.id_cuenta, idCuenta)),
        );
      return {
        user: { ...row, id_webhook_fathom: reg.webhookId },
        fathomWarning: null,
      };
    }
    fathomWarning = reg.error;
  }

  return { user: row, fathomWarning };
}

export async function updateUsuario(
  idCuenta: number,
  idEvento: number,
  data: { nombre?: string; rol?: string; permisos?: Record<string, boolean>; fathom?: string; password?: string },
): Promise<{ fathomWarning: string | null }> {
  let fathomWarning: string | null = null;

  const [current] = await db
    .select({
      fathom: usuariosDashboard.fathom,
      id_webhook_fathom: usuariosDashboard.id_webhook_fathom,
    })
    .from(usuariosDashboard)
    .where(and(eq(usuariosDashboard.id_evento, idEvento), eq(usuariosDashboard.id_cuenta, idCuenta)))
    .limit(1);

  if (!current) return { fathomWarning: null };

  const set: Record<string, unknown> = {};
  if (data.nombre !== undefined) set.nombre = data.nombre;
  if (data.rol !== undefined) set.rol = data.rol;
  if (data.permisos !== undefined) set.permisos = data.permisos;
  if (data.password) set.pass = await hash(data.password, 10);

  if (data.fathom !== undefined) {
    const newF = data.fathom.trim() || null;
    if (!newF) {
      set.fathom = null;
      set.id_webhook_fathom = null;
    } else if (newF === (current.fathom?.trim() || null) && current.id_webhook_fathom) {
      set.fathom = newF;
    } else {
      const reg = await registrarWebhookFathom(newF, idCuenta);
      set.fathom = newF;
      if (reg.ok) {
        set.id_webhook_fathom = reg.webhookId;
      } else {
        set.id_webhook_fathom = null;
        fathomWarning = reg.error;
      }
    }
  }

  if (Object.keys(set).length === 0) return { fathomWarning: null };

  await db
    .update(usuariosDashboard)
    .set(set)
    .where(and(eq(usuariosDashboard.id_evento, idEvento), eq(usuariosDashboard.id_cuenta, idCuenta)));

  return { fathomWarning };
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
