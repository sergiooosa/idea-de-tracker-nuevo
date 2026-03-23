import { NextResponse } from "next/server";
import { withAuthAndPermission, withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { comisionesConfig, resumenesDiariosAgendas, metasCuenta, TramoEscalada } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

// ── Tipos del response ─────────────────────────────────────────────────────────
interface ComisionResultado {
  id: number;
  closer_email: string;
  closer_nombre: string | null;
  tipo_comision: "individual" | "global" | "equipo" | "escalada";
  tipo_valor: string;
  valor: string;
  aplica_sobre: string | null;
  activo: boolean;
  asesores_equipo: string[];
  tramos_escalada: TramoEscalada[];
  // Resultados del período
  cierres: number;
  revenue_base: number;
  comision_calculada: number;
  // Solo escalada
  meta_revenue?: number;
  pct_meta_alcanzado?: number;
  tramo_aplicado?: TramoEscalada;
}

// ── Helper: calcular cierres y revenue desde rows ────────────────────────────
function calcFromRows(
  rows: Array<{
    closer: string | null;
    categoria: string | null;
    facturacion: string | null;
    cash_collected: string | null;
  }>,
  filterEmails: string[] | null, // null = todos (global)
): { cierres: number; cash_collected: number; facturacion: number } {
  const result = { cierres: 0, cash_collected: 0, facturacion: 0 };
  for (const row of rows) {
    const email = (row.closer ?? "").trim().toLowerCase();
    if (filterEmails !== null && !filterEmails.includes(email)) continue;
    const categoria = (row.categoria ?? "").toLowerCase().trim();
    if (categoria === "cerrada") {
      result.cierres += 1;
      result.cash_collected += parseFloat(String(row.cash_collected ?? 0)) || 0;
      result.facturacion += parseFloat(String(row.facturacion ?? 0)) || 0;
    }
  }
  return result;
}

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
    let resultados: ComisionResultado[] = [];

    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00Z`);
      const toDate = new Date(`${to}T23:59:59.999Z`);

      // Traer todas las agendas del período para esta cuenta
      const agendaRows = await db
        .select({
          closer: resumenesDiariosAgendas.closer,
          categoria: resumenesDiariosAgendas.categoria,
          facturacion: resumenesDiariosAgendas.facturacion,
          cash_collected: resumenesDiariosAgendas.cash_collected,
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

      // Traer metas de la cuenta (para escalada)
      const [metaRow] = await db
        .select()
        .from(metasCuenta)
        .where(eq(metasCuenta.id_cuenta, idCuenta))
        .limit(1);

      resultados = configs.map((cfg) => {
        const tipoComision = (cfg.tipo_comision ?? "individual") as "individual" | "global" | "equipo" | "escalada";
        const asesoresEquipo = (cfg.asesores_equipo as string[] | null) ?? [];
        const tramosEscalada = (cfg.tramos_escalada as TramoEscalada[] | null) ?? [];
        const emailKey = cfg.closer_email.trim().toLowerCase();
        const aplica_sobre = cfg.aplica_sobre ?? "cash_collected";

        let data: { cierres: number; cash_collected: number; facturacion: number };

        if (tipoComision === "global") {
          // Todos los cierres del equipo
          data = calcFromRows(agendaRows.map(r => ({
            closer: r.closer,
            categoria: r.categoria,
            facturacion: r.facturacion,
            cash_collected: r.cash_collected,
          })), null);
        } else if (tipoComision === "equipo") {
          // Cierres de asesores específicos
          const emailsEquipo = asesoresEquipo.map((e) => e.trim().toLowerCase());
          data = calcFromRows(agendaRows.map(r => ({
            closer: r.closer,
            categoria: r.categoria,
            facturacion: r.facturacion,
            cash_collected: r.cash_collected,
          })), emailsEquipo);
        } else {
          // individual o escalada: cierres propios
          data = calcFromRows(agendaRows.map(r => ({
            closer: r.closer,
            categoria: r.categoria,
            facturacion: r.facturacion,
            cash_collected: r.cash_collected,
          })), [emailKey]);
        }

        const revenueBase = aplica_sobre === "facturacion" ? data.facturacion : data.cash_collected;
        const valorNum = parseFloat(String(cfg.valor)) || 0;

        let comisionCalculada = 0;
        let metaRevenue: number | undefined;
        let pctMetaAlcanzado: number | undefined;
        let tramoAplicado: TramoEscalada | undefined;

        if (tipoComision === "escalada") {
          // Buscar meta personal del asesor
          const metasAsesor = (metaRow?.metas_por_asesor ?? []) as Array<{
            email: string;
            meta_revenue_mensual?: number;
          }>;
          const metaPersonal = metasAsesor.find(
            (m) => m.email.trim().toLowerCase() === emailKey,
          );
          metaRevenue =
            metaPersonal?.meta_revenue_mensual ??
            (metaRow?.meta_revenue_mensual ? parseFloat(String(metaRow.meta_revenue_mensual)) : 0);

          pctMetaAlcanzado = metaRevenue > 0 ? (revenueBase / metaRevenue) * 100 : 0;

          // Encontrar el tramo más alto que aplique
          const tramo = [...tramosEscalada]
            .sort((a, b) => b.meta_pct - a.meta_pct)
            .find((t) => pctMetaAlcanzado! >= t.meta_pct);

          tramoAplicado = tramo;
          const comisionPct = tramo?.comision_pct ?? 0;
          comisionCalculada = (revenueBase * comisionPct) / 100;
        } else if (cfg.tipo === "porcentaje") {
          comisionCalculada = (revenueBase * valorNum) / 100;
        } else {
          // monto_fijo por cierre
          comisionCalculada = data.cierres * valorNum;
        }

        const resultado: ComisionResultado = {
          id: cfg.id,
          closer_email: cfg.closer_email,
          closer_nombre: cfg.closer_nombre,
          tipo_comision: tipoComision,
          tipo_valor: cfg.tipo,
          valor: String(cfg.valor),
          aplica_sobre: cfg.aplica_sobre,
          activo: cfg.activo ?? true,
          asesores_equipo: asesoresEquipo,
          tramos_escalada: tramosEscalada,
          cierres: data.cierres,
          revenue_base: revenueBase,
          comision_calculada: Math.round(comisionCalculada * 100) / 100,
        };

        if (tipoComision === "escalada") {
          resultado.meta_revenue = metaRevenue;
          resultado.pct_meta_alcanzado = Math.round((pctMetaAlcanzado ?? 0) * 10) / 10;
          resultado.tramo_aplicado = tramoAplicado;
        }

        return resultado;
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
      tipo_comision?: string;
      asesores_equipo?: string[];
      tramos_escalada?: TramoEscalada[];
    };

    const {
      id,
      closer_email,
      closer_nombre,
      tipo,
      valor,
      aplica_sobre,
      activo,
      tipo_comision,
      asesores_equipo,
      tramos_escalada,
    } = body;

    if (!closer_email) {
      return NextResponse.json({ error: "closer_email es requerido" }, { status: 400 });
    }

    const updateData = {
      closer_email,
      closer_nombre: closer_nombre ?? null,
      tipo: tipo ?? "porcentaje",
      valor: String(valor ?? 0),
      aplica_sobre: aplica_sobre ?? "cash_collected",
      activo: activo ?? true,
      tipo_comision: tipo_comision ?? "individual",
      asesores_equipo: asesores_equipo ?? [],
      tramos_escalada: tramos_escalada ?? [],
    };

    if (id) {
      await db
        .update(comisionesConfig)
        .set(updateData)
        .where(and(eq(comisionesConfig.id, id), eq(comisionesConfig.id_cuenta, idCuenta)));
      return NextResponse.json({ ok: true, action: "updated" });
    } else {
      const [inserted] = await db
        .insert(comisionesConfig)
        .values({
          id_cuenta: idCuenta,
          ...updateData,
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
