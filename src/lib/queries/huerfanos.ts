import { db } from "@/lib/db";
import { eventosHuerfanos } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface HuerfanoRow {
  id_huerfano: number;
  id_cuenta: number;
  origen: string;
  motivo: string;
  payload_original: unknown;
  estado: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export async function getHuerfanos(
  idCuenta: number,
  estado?: string,
): Promise<HuerfanoRow[]> {
  const conditions = [eq(eventosHuerfanos.id_cuenta, idCuenta)];
  if (estado) conditions.push(eq(eventosHuerfanos.estado, estado));

  const rows = await db
    .select()
    .from(eventosHuerfanos)
    .where(and(...conditions))
    .orderBy(sql`${eventosHuerfanos.created_at} DESC`);

  return rows;
}

export async function getHuerfanoById(
  idHuerfano: number,
): Promise<HuerfanoRow | null> {
  const [row] = await db
    .select()
    .from(eventosHuerfanos)
    .where(eq(eventosHuerfanos.id_huerfano, idHuerfano))
    .limit(1);
  return row ?? null;
}

export async function updateHuerfanoEstado(
  idHuerfano: number,
  estado: string,
): Promise<void> {
  await db
    .update(eventosHuerfanos)
    .set({ estado, updated_at: new Date() })
    .where(eq(eventosHuerfanos.id_huerfano, idHuerfano));
}
