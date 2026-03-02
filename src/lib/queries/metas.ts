import { db } from "@/lib/db";
import { metasCuenta } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface MetasData {
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
};

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
    meta_citas_semanales: r.meta_citas_semanales,
    meta_cierres_semanales: r.meta_cierres_semanales,
    meta_revenue_mensual: r.meta_revenue_mensual ? parseFloat(r.meta_revenue_mensual) : null,
    meta_cash_collected_mensual: r.meta_cash_collected_mensual ? parseFloat(r.meta_cash_collected_mensual) : null,
    meta_tasa_cierre: r.meta_tasa_cierre ? parseFloat(r.meta_tasa_cierre) : null,
    meta_tasa_contestacion: r.meta_tasa_contestacion ? parseFloat(r.meta_tasa_contestacion) : null,
    meta_speed_to_lead_min: r.meta_speed_to_lead_min ? parseFloat(r.meta_speed_to_lead_min) : null,
    metas_por_asesor: Array.isArray(r.metas_por_asesor) ? r.metas_por_asesor : [],
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
        updated_at: sql`NOW()`,
      },
    });

  return getMetas(idCuenta);
}
