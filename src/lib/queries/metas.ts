import { db } from "@/lib/db";
import { metasCuenta } from "@/lib/db/schema";
import type { MetaPorRol } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export type { MetaPorRol };

export interface MetasData {
  // ── Campos originales (backward-compatible) ────────────────────
  meta_llamadas_diarias: number;
  leads_nuevos_dia_1: number;
  leads_nuevos_dia_2: number;
  leads_nuevos_dia_3: number;
  meta_citas_semanales: number | null;
  meta_cierres_semanales: number | null;
  meta_revenue_mensual: number | null;
  meta_cash_collected_mensual: number | null;
  meta_tasa_cierre: number | null;
  meta_tasa_contestacion: number | null;
  meta_speed_to_lead_min: number | null;
  metas_por_asesor: { email: string; meta_llamadas_diarias?: number; meta_cierres_semanales?: number }[];
  // ── Metas por rol ──────────────────────────────────────────────
  metas_por_rol: MetaPorRol[];
  // ── Canal: Llamadas ────────────────────────────────────────────
  meta_llamadas_semanales: number | null;
  meta_contestacion_llamadas: number | null;
  meta_speed_llamadas_min: number | null;
  // ── Canal: Videollamadas ────────────────────────────────────────
  meta_citas_semanales_video: number | null;
  meta_cierre_video: number | null;
  meta_revenue_video: number | null;
  // ── Canal: Chats ───────────────────────────────────────────────
  meta_chats_diarios: number | null;
  meta_chats_contestacion: number | null;
  meta_speed_chat_min: number | null;
}

const DEFAULTS: MetasData = {
  meta_llamadas_diarias: 50,
  leads_nuevos_dia_1: 3,
  leads_nuevos_dia_2: 4,
  leads_nuevos_dia_3: 5,
  meta_citas_semanales: null,
  meta_cierres_semanales: null,
  meta_revenue_mensual: null,
  meta_cash_collected_mensual: null,
  meta_tasa_cierre: null,
  meta_tasa_contestacion: null,
  meta_speed_to_lead_min: null,
  metas_por_asesor: [],
  metas_por_rol: [],
  meta_llamadas_semanales: null,
  meta_contestacion_llamadas: null,
  meta_speed_llamadas_min: null,
  meta_citas_semanales_video: null,
  meta_cierre_video: null,
  meta_revenue_video: null,
  meta_chats_diarios: null,
  meta_chats_contestacion: null,
  meta_speed_chat_min: null,
};

const toNum = (v: string | number | null | undefined): number | null =>
  v != null ? parseFloat(String(v)) || null : null;

export async function getMetas(idCuenta: number): Promise<MetasData> {
  const rows = await db
    .select()
    .from(metasCuenta)
    .where(eq(metasCuenta.id_cuenta, idCuenta))
    .limit(1);

  if (rows.length === 0) return DEFAULTS;

  const r = rows[0];
  return {
    meta_llamadas_diarias: r.meta_llamadas_diarias,
    leads_nuevos_dia_1: r.leads_nuevos_dia_1,
    leads_nuevos_dia_2: r.leads_nuevos_dia_2,
    leads_nuevos_dia_3: r.leads_nuevos_dia_3,
    meta_citas_semanales: r.meta_citas_semanales ?? null,
    meta_cierres_semanales: r.meta_cierres_semanales ?? null,
    meta_revenue_mensual: toNum(r.meta_revenue_mensual),
    meta_cash_collected_mensual: toNum(r.meta_cash_collected_mensual),
    meta_tasa_cierre: toNum(r.meta_tasa_cierre),
    meta_tasa_contestacion: toNum(r.meta_tasa_contestacion),
    meta_speed_to_lead_min: toNum(r.meta_speed_to_lead_min),
    metas_por_asesor: Array.isArray(r.metas_por_asesor) ? r.metas_por_asesor : [],
    metas_por_rol: Array.isArray(r.metas_por_rol) ? r.metas_por_rol : [],
    // ── Nuevos campos por canal ──────────────────────────────────
    meta_llamadas_semanales: r.meta_llamadas_semanales ?? null,
    meta_contestacion_llamadas: toNum(r.meta_contestacion_llamadas),
    meta_speed_llamadas_min: toNum(r.meta_speed_llamadas_min),
    meta_citas_semanales_video: r.meta_citas_semanales_video ?? null,
    meta_cierre_video: toNum(r.meta_cierre_video),
    meta_revenue_video: toNum(r.meta_revenue_video),
    meta_chats_diarios: r.meta_chats_diarios ?? null,
    meta_chats_contestacion: toNum(r.meta_chats_contestacion),
    meta_speed_chat_min: toNum(r.meta_speed_chat_min),
  };
}

export async function upsertMetas(idCuenta: number, data: Partial<MetasData>): Promise<MetasData> {
  const numOrNull = (v: number | null | undefined) =>
    v != null ? String(v) : null;

  await db
    .insert(metasCuenta)
    .values({
      id_cuenta: idCuenta,
      meta_llamadas_diarias: data.meta_llamadas_diarias ?? DEFAULTS.meta_llamadas_diarias,
      leads_nuevos_dia_1: data.leads_nuevos_dia_1 ?? DEFAULTS.leads_nuevos_dia_1,
      leads_nuevos_dia_2: data.leads_nuevos_dia_2 ?? DEFAULTS.leads_nuevos_dia_2,
      leads_nuevos_dia_3: data.leads_nuevos_dia_3 ?? DEFAULTS.leads_nuevos_dia_3,
      meta_citas_semanales: data.meta_citas_semanales ?? null,
      meta_cierres_semanales: data.meta_cierres_semanales ?? null,
      meta_revenue_mensual: numOrNull(data.meta_revenue_mensual),
      meta_cash_collected_mensual: numOrNull(data.meta_cash_collected_mensual),
      meta_tasa_cierre: numOrNull(data.meta_tasa_cierre),
      meta_tasa_contestacion: numOrNull(data.meta_tasa_contestacion),
      meta_speed_to_lead_min: numOrNull(data.meta_speed_to_lead_min),
      metas_por_asesor: data.metas_por_asesor ?? [],
      metas_por_rol: data.metas_por_rol ?? [],
      // ── Nuevos campos por canal ──────────────────────────────────
      meta_llamadas_semanales: data.meta_llamadas_semanales ?? null,
      meta_contestacion_llamadas: numOrNull(data.meta_contestacion_llamadas),
      meta_speed_llamadas_min: numOrNull(data.meta_speed_llamadas_min),
      meta_citas_semanales_video: data.meta_citas_semanales_video ?? null,
      meta_cierre_video: numOrNull(data.meta_cierre_video),
      meta_revenue_video: numOrNull(data.meta_revenue_video),
      meta_chats_diarios: data.meta_chats_diarios ?? null,
      meta_chats_contestacion: numOrNull(data.meta_chats_contestacion),
      meta_speed_chat_min: numOrNull(data.meta_speed_chat_min),
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: metasCuenta.id_cuenta,
      set: {
        meta_llamadas_diarias: sql`EXCLUDED.meta_llamadas_diarias`,
        leads_nuevos_dia_1: sql`EXCLUDED.leads_nuevos_dia_1`,
        leads_nuevos_dia_2: sql`EXCLUDED.leads_nuevos_dia_2`,
        leads_nuevos_dia_3: sql`EXCLUDED.leads_nuevos_dia_3`,
        meta_citas_semanales: sql`EXCLUDED.meta_citas_semanales`,
        meta_cierres_semanales: sql`EXCLUDED.meta_cierres_semanales`,
        meta_revenue_mensual: sql`EXCLUDED.meta_revenue_mensual`,
        meta_cash_collected_mensual: sql`EXCLUDED.meta_cash_collected_mensual`,
        meta_tasa_cierre: sql`EXCLUDED.meta_tasa_cierre`,
        meta_tasa_contestacion: sql`EXCLUDED.meta_tasa_contestacion`,
        meta_speed_to_lead_min: sql`EXCLUDED.meta_speed_to_lead_min`,
        metas_por_asesor: sql`EXCLUDED.metas_por_asesor`,
        metas_por_rol: sql`EXCLUDED.metas_por_rol`,
        meta_llamadas_semanales: sql`EXCLUDED.meta_llamadas_semanales`,
        meta_contestacion_llamadas: sql`EXCLUDED.meta_contestacion_llamadas`,
        meta_speed_llamadas_min: sql`EXCLUDED.meta_speed_llamadas_min`,
        meta_citas_semanales_video: sql`EXCLUDED.meta_citas_semanales_video`,
        meta_cierre_video: sql`EXCLUDED.meta_cierre_video`,
        meta_revenue_video: sql`EXCLUDED.meta_revenue_video`,
        meta_chats_diarios: sql`EXCLUDED.meta_chats_diarios`,
        meta_chats_contestacion: sql`EXCLUDED.meta_chats_contestacion`,
        meta_speed_chat_min: sql`EXCLUDED.meta_speed_chat_min`,
        updated_at: sql`NOW()`,
      },
    });

  return getMetas(idCuenta);
}
