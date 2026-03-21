import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeysCuenta, usuariosDashboard } from "@/lib/db/schema";

export interface VideoRecoveryUserRow {
  id_evento: string;
  label: string;
  email: string;
}

interface VideoRecoveryCredentialRow {
  id_evento: number;
  id_cuenta: number | null;
  email: string;
  nombre: string | null;
}

export async function listVideoRecoveryUsers(
  idCuenta: number,
  requesterEmail: string,
  canManageUsers: boolean,
): Promise<VideoRecoveryUserRow[]> {
  const rows = await db
    .select({
      id_evento: usuariosDashboard.id_evento,
      nombre: usuariosDashboard.nombre,
      email: usuariosDashboard.email,
      fathom: usuariosDashboard.fathom,
    })
    .from(usuariosDashboard)
    .where(eq(usuariosDashboard.id_cuenta, idCuenta));

  const filtered = canManageUsers
    ? rows
    : rows.filter((row) => row.email.toLowerCase() === requesterEmail.toLowerCase());

  return filtered
    .map((row) => ({
      id_evento: String(row.id_evento),
      email: row.email,
      label: `${row.nombre?.trim() || row.email} · id_evento ${row.id_evento}${row.fathom?.trim() ? "" : " · sin API key"}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export async function getVideoRecoveryCredential(
  idCuenta: number,
  idEvento: number,
): Promise<VideoRecoveryCredentialRow | null> {
  const [row] = await db
    .select({
      id_evento: usuariosDashboard.id_evento,
      id_cuenta: usuariosDashboard.id_cuenta,
      email: usuariosDashboard.email,
      nombre: usuariosDashboard.nombre,
    })
    .from(usuariosDashboard)
    .where(and(eq(usuariosDashboard.id_cuenta, idCuenta), eq(usuariosDashboard.id_evento, idEvento)))
    .limit(1);

  return row ?? null;
}

export async function getCuentaInternalApiKey(idCuenta: number): Promise<string | null> {
  const [keyRow] = await db
    .select({
      token: apiKeysCuenta.token,
    })
    .from(apiKeysCuenta)
    .where(and(eq(apiKeysCuenta.id_cuenta, idCuenta), eq(apiKeysCuenta.activa, true)))
    .orderBy(desc(apiKeysCuenta.created_at), desc(apiKeysCuenta.id_key))
    .limit(1);

  return keyRow?.token?.trim() || null;
}

