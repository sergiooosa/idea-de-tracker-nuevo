import { NextResponse } from "next/server";
import { withAuthAndPermission, withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { comisionesConfig, resumenesDiariosAgendas } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["configurar_sistema", "ver_dashboard", "ver_comisiones"], async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // Lista de configuraciones activas
    const configs = await db
      .select()
      .from(comisionesConfig)
      .where(and(eq(comisionesConfig.id_cuenta, idCuenta), eq(comisionesConfig.activo, true)));

    // Si hay filtro de fechas, calcular cierres reales del período
    let resultados: Array<{
      closer_email: string;
      closer_nombre: string | null;
      tipo: string;
      valor: string;
      aplica_sobre: string | null;
      cierres: number;
      monto_generado: number;
      comision_calculada: number;
    }> = [];

    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00Z`);
      const toDate = new Date(`${to}T23:59:59.999Z`);

      const agendaRows = await db
        .select({
          closer: resumenesDiariosAgendas.closer,
          categoria: resumenesDiariosAgendas.categoria,
          facturacion: resumenesDiariosAgendas.facturacion,
          cash_collected: resumenesDiariosAgendas.cash_collected,
          fecha_reunion: resumenesDiariosAgendas.fecha_reunion,
          fecha: resumenesDiariosAgendas.fecha,
        })
        .from(resumenesDiariosAgendas)
        .where(
          and(
            eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
            sql`(
              (${resumenesDiariosAgendas.fecha_reunion} IS NOT NULL AND ${resumenesDiariosAgendas.fecha_reunion} >= ${fromDate} AND ${resumenesDiariosAgendas.fecha_reunion} <= ${toDate})
              OR
              (${resumenesDiariosAgendas.fecha_reunion} IS NULL AND ${resumenesDiariosAgendas.fecha} >= ${from} AND ${resumenesDiariosAgendas.fecha} <= ${to})
            )`,
          ),
        );

      // Agrupar cierres y montos por closer
      const closesByEmail: Record<string, { cierres: number; cash_collected: number; facturacion: number }> = {};
      for (const row of agendaRows) {
        const email = (row.closer ?? "").trim().toLowerCase();
        if (!email) continue;
        const categoria = (row.categoria ?? "").toLowerCase().trim();
        const isCierre = categoria === "cerrada";
        if (!closesByEmail[email]) {
          closesByEmail[email] = { cierres: 0, cash_collected: 0, facturacion: 0 };
        }
        if (isCierre) {
          closesByEmail[email].cierres += 1;
          closesByEmail[email].cash_collected += parseFloat(String(row.cash_collected ?? 0)) || 0;
          closesByEmail[email].facturacion += parseFloat(String(row.facturacion ?? 0)) || 0;
        }
      }

      resultados = configs.map((cfg) => {
        const emailKey = cfg.closer_email.trim().toLowerCase();
        const data = closesByEmail[emailKey] ?? { cierres: 0, cash_collected: 0, facturacion: 0 };
        const baseAmount = cfg.aplica_sobre === "facturacion" ? data.facturacion : data.cash_collected;
        const valorNum = parseFloat(String(cfg.valor)) || 0;
        const comision =
          cfg.tipo === "porcentaje"
            ? (baseAmount * valorNum) / 100
            : data.cierres * valorNum;

        return {
          closer_email: cfg.closer_email,
          closer_nombre: cfg.closer_nombre,
          tipo: cfg.tipo,
          valor: String(cfg.valor),
          aplica_sobre: cfg.aplica_sobre,
          cierres: data.cierres,
          monto_generado: baseAmount,
          comision_calculada: Math.round(comision * 100) / 100,
        };
      });
    }

    return NextResponse.json({ configs, resultados });
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const body = await req.json() as {
      id?: number;
      closer_email: string;
      closer_nombre?: string;
      tipo?: string;
      valor?: number;
      aplica_sobre?: string;
      activo?: boolean;
    };

    const { id, closer_email, closer_nombre, tipo, valor, aplica_sobre, activo } = body;

    if (!closer_email) {
      return NextResponse.json({ error: "closer_email es requerido" }, { status: 400 });
    }

    if (id) {
      // Actualizar existente
      await db
        .update(comisionesConfig)
        .set({
          closer_email,
          closer_nombre: closer_nombre ?? null,
          tipo: tipo ?? "porcentaje",
          valor: String(valor ?? 0),
          aplica_sobre: aplica_sobre ?? "cash_collected",
          activo: activo ?? true,
        })
        .where(and(eq(comisionesConfig.id, id), eq(comisionesConfig.id_cuenta, idCuenta)));
      return NextResponse.json({ ok: true, action: "updated" });
    } else {
      // Crear nuevo
      const [inserted] = await db
        .insert(comisionesConfig)
        .values({
          id_cuenta: idCuenta,
          closer_email,
          closer_nombre: closer_nombre ?? null,
          tipo: tipo ?? "porcentaje",
          valor: String(valor ?? 0),
          aplica_sobre: aplica_sobre ?? "cash_collected",
          activo: activo ?? true,
        })
        .returning({ id: comisionesConfig.id });
      return NextResponse.json({ ok: true, action: "created", id: inserted?.id });
    }
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await db
      .delete(comisionesConfig)
      .where(and(eq(comisionesConfig.id, parseInt(id, 10)), eq(comisionesConfig.id_cuenta, idCuenta)));
    return NextResponse.json({ ok: true });
  });
}
