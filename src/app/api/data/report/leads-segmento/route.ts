/**
 * GET /api/data/report/leads-segmento
 *
 * Retorna lista de leads con datos de contacto (teléfono, correo) para reactivación.
 * Segmentos soportados:
 *   enLimbo   — leads con > 5 días sin actividad en el rango
 *   sinAccion — leads en registros_de_llamada sin ninguna entrada en log_llamadas
 *
 * AUT-1395
 */

import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface LeadContacto {
  nombre: string;
  telefono: string | null;
  email: string | null;
  asesor: string | null;
  diasSinActividad?: number;
  estado?: string | null;
  ghlContactId?: string | null;
}

export interface LeadsSegmentoResponse {
  segmento: string;
  total: number;
  leads: LeadContacto[];
}

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_reportes", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const segmento = searchParams.get("segmento");

    if (!from || !to || !segmento) {
      return NextResponse.json(
        { error: "Faltan parámetros: from, to, segmento" },
        { status: 400 },
      );
    }

    if (!["enLimbo", "sinAccion"].includes(segmento)) {
      return NextResponse.json(
        { error: "segmento inválido. Valores: enLimbo, sinAccion" },
        { status: 400 },
      );
    }
    const fromTs = new Date(`${from}T00:00:00Z`);
    const toTs = new Date(`${to}T23:59:59.999Z`);
    const limboThreshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    try {
      if (segmento === "enLimbo") {
        const result = await db.execute(sql`
          SELECT
            COALESCE(rr.nombre_lead, 'Lead sin nombre') AS nombre,
            rr.phone_raw_format AS telefono,
            rr.mail_lead AS email,
            COALESCE(rr.nombre_closer, rr.closer_mail) AS asesor,
            rr.estado,
            rr.ghl_contact_id,
            EXTRACT(EPOCH FROM (NOW() - GREATEST(
              COALESCE((
                SELECT MAX(ll2.ts) FROM log_llamadas ll2
                WHERE ll2.id_registro = rr.id_registro AND ll2.id_cuenta = ${idCuenta}
              ), rr.fecha_evento),
              COALESCE((
                SELECT MAX(cl2.fecha_y_hora_z) FROM chats_logs cl2
                WHERE cl2.id_lead = rr.id_user_ghl AND cl2.id_cuenta = ${idCuenta}
              ), rr.fecha_evento)
            )))::int / 86400 AS dias_sin_actividad
          FROM registros_de_llamada rr
          WHERE rr.id_cuenta = ${String(idCuenta)}
            AND rr.fecha_evento BETWEEN ${fromTs} AND ${toTs}
            AND LOWER(TRIM(COALESCE(rr.estado, ''))) NOT IN ('cerrado', 'vendido', 'ganado', 'done', 'perdido', 'perdida')
            AND (
              EXISTS (
                SELECT 1 FROM log_llamadas ll
                WHERE ll.id_registro = rr.id_registro AND ll.id_cuenta = ${idCuenta}
              )
              OR EXISTS (
                SELECT 1 FROM chats_logs cl
                WHERE cl.id_lead = rr.id_user_ghl AND cl.id_cuenta = ${idCuenta}
              )
            )
            AND NOT EXISTS (
              SELECT 1 FROM log_llamadas ll2
              WHERE ll2.id_registro = rr.id_registro
                AND ll2.id_cuenta = ${idCuenta}
                AND ll2.ts >= ${limboThreshold}
            )
            AND NOT EXISTS (
              SELECT 1 FROM chats_logs cl2
              WHERE cl2.id_lead = rr.id_user_ghl
                AND cl2.id_cuenta = ${idCuenta}
                AND cl2.fecha_y_hora_z >= ${limboThreshold}
            )
          ORDER BY dias_sin_actividad DESC
          LIMIT 100
        `);

        type Row = {
          nombre: string;
          telefono: string | null;
          email: string | null;
          asesor: string | null;
          estado: string | null;
          ghl_contact_id: string | null;
          dias_sin_actividad: number;
        };

        const leads: LeadContacto[] = (result.rows as Row[]).map((r) => ({
          nombre: r.nombre,
          telefono: r.telefono || null,
          email: r.email || null,
          asesor: r.asesor || null,
          estado: r.estado || null,
          ghlContactId: r.ghl_contact_id || null,
          diasSinActividad: Number(r.dias_sin_actividad),
        }));

        return NextResponse.json({
          segmento,
          total: leads.length,
          leads,
        } satisfies LeadsSegmentoResponse);
      }

      // segmento === "sinAccion"
      const result = await db.execute(sql`
        SELECT
          COALESCE(rr.nombre_lead, 'Lead sin nombre') AS nombre,
          rr.phone_raw_format AS telefono,
          rr.mail_lead AS email,
          COALESCE(rr.nombre_closer, rr.closer_mail) AS asesor,
          rr.estado,
          rr.ghl_contact_id,
          EXTRACT(EPOCH FROM (NOW() - rr.fecha_evento))::int / 86400 AS dias_sin_actividad
        FROM registros_de_llamada rr
        WHERE rr.id_cuenta = ${String(idCuenta)}
          AND rr.fecha_evento BETWEEN ${fromTs} AND ${toTs}
          AND LOWER(TRIM(COALESCE(rr.estado, ''))) NOT IN ('perdido', 'perdida')
          AND NOT EXISTS (
            SELECT 1 FROM log_llamadas ll
            WHERE ll.id_registro = rr.id_registro
              AND ll.id_cuenta = ${idCuenta}
          )
          AND NOT EXISTS (
            SELECT 1 FROM chats_logs cl
            WHERE cl.id_lead = rr.id_user_ghl
              AND cl.id_cuenta = ${idCuenta}
          )
        ORDER BY rr.fecha_evento ASC
        LIMIT 100
      `);

      type Row = {
        nombre: string;
        telefono: string | null;
        email: string | null;
        asesor: string | null;
        estado: string | null;
        ghl_contact_id: string | null;
        dias_sin_actividad: number;
      };

      const leads: LeadContacto[] = (result.rows as Row[]).map((r) => ({
        nombre: r.nombre,
        telefono: r.telefono || null,
        email: r.email || null,
        asesor: r.asesor || null,
        estado: r.estado || null,
        ghlContactId: r.ghl_contact_id || null,
        diasSinActividad: Number(r.dias_sin_actividad),
      }));

      return NextResponse.json({
        segmento,
        total: leads.length,
        leads,
      } satisfies LeadsSegmentoResponse);
    } catch (err) {
      console.error("[leads-segmento] Error:", err);
      return NextResponse.json(
        { error: "Error al cargar leads del segmento" },
        { status: 500 },
      );
    }
  });
}
