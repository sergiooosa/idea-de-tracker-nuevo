import { NextResponse } from "next/server";
import { withAuthAndPermission, withAuthAndAnyPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { comisionesConfig, resumenesDiariosAgendas, metasCuenta, TramoEscalada } from "@/lib/db/schema";
import type { SocioSplit } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Tipos del response ─────────────────────────────────────────────────────────
interface SocioSplitCalculado extends SocioSplit {
  comision_asignada: number;
}

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
  // Campos extendidos
  subtipo: string | null;
  nombre_proyecto: string | null;
  pct_division: number;
  forma_pago: string | null;
  socios_split: SocioSplit[];
  notas: string | null;
  // Resultados del período
  cierres: number;
  revenue_base: number;
  comision_calculada: number;
  comision_neta: number; // tras pct_division
  splits_calculados?: SocioSplitCalculado[];
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
  filterEmails: string[] | null,
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

    const configs = await db
      .select()
      .from(comisionesConfig)
      .where(and(eq(comisionesConfig.id_cuenta, idCuenta), eq(comisionesConfig.activo, true)));

    let resultados: ComisionResultado[] = [];

    if (from && to) {
      const fromDate = new Date(`${from}T00:00:00Z`);
      const toDate = new Date(`${to}T23:59:59.999Z`);

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

      const [metaRow] = await db
        .select()
        .from(metasCuenta)
        .where(eq(metasCuenta.id_cuenta, idCuenta))
        .limit(1);

      resultados = configs.map((cfg) => {
        const tipoComision = (cfg.tipo_comision ?? "individual") as "individual" | "global" | "equipo" | "escalada";
        const asesoresEquipo = (cfg.asesores_equipo as string[] | null) ?? [];
        const tramosEscalada = (cfg.tramos_escalada as TramoEscalada[] | null) ?? [];
        const sociosSplit = (cfg.socios_split as SocioSplit[] | null) ?? [];
        const pctDivision = parseFloat(String(cfg.pct_division ?? 100)) || 100;
        const emailKey = cfg.closer_email.trim().toLowerCase();
        const aplica_sobre = cfg.aplica_sobre ?? "cash_collected";

        let data: { cierres: number; cash_collected: number; facturacion: number };

        if (tipoComision === "global") {
          data = calcFromRows(agendaRows.map(r => ({ closer: r.closer, categoria: r.categoria, facturacion: r.facturacion, cash_collected: r.cash_collected })), null);
        } else if (tipoComision === "equipo") {
          const emailsEquipo = asesoresEquipo.map((e) => e.trim().toLowerCase());
          data = calcFromRows(agendaRows.map(r => ({ closer: r.closer, categoria: r.categoria, facturacion: r.facturacion, cash_collected: r.cash_collected })), emailsEquipo);
        } else {
          data = calcFromRows(agendaRows.map(r => ({ closer: r.closer, categoria: r.categoria, facturacion: r.facturacion, cash_collected: r.cash_collected })), [emailKey]);
        }

        const revenueBase = aplica_sobre === "facturacion" ? data.facturacion : data.cash_collected;
        const valorNum = parseFloat(String(cfg.valor)) || 0;

        let comisionCalculada = 0;
        let metaRevenue: number | undefined;
        let pctMetaAlcanzado: number | undefined;
        let tramoAplicado: TramoEscalada | undefined;

        if (tipoComision === "escalada") {
          const metasAsesor = (metaRow?.metas_por_asesor ?? []) as Array<{ email: string; meta_revenue_mensual?: number }>;
          const metaPersonal = metasAsesor.find((m) => m.email.trim().toLowerCase() === emailKey);
          metaRevenue = metaPersonal?.meta_revenue_mensual ?? (metaRow?.meta_revenue_mensual ? parseFloat(String(metaRow.meta_revenue_mensual)) : 0);
          pctMetaAlcanzado = metaRevenue > 0 ? (revenueBase / metaRevenue) * 100 : 0;
          const tramo = [...tramosEscalada].sort((a, b) => b.meta_pct - a.meta_pct).find((t) => pctMetaAlcanzado! >= t.meta_pct);
          tramoAplicado = tramo;
          const comisionPct = tramo?.comision_pct ?? 0;
          comisionCalculada = (revenueBase * comisionPct) / 100;
        } else if (cfg.tipo === "porcentaje") {
          comisionCalculada = (revenueBase * valorNum) / 100;
        } else {
          comisionCalculada = data.cierres * valorNum;
        }

        // Aplicar pct_division
        const comisionNeta = Math.round((comisionCalculada * pctDivision) / 100 * 100) / 100;

        // Calcular splits si hay socios
        let splitsCalculados: SocioSplitCalculado[] | undefined;
        if (sociosSplit.length > 0) {
          splitsCalculados = sociosSplit.map((s) => ({
            ...s,
            comision_asignada: Math.round((comisionNeta * s.pct) / 100 * 100) / 100,
          }));
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
          subtipo: cfg.subtipo ?? "estandar",
          nombre_proyecto: cfg.nombre_proyecto ?? null,
          pct_division: pctDivision,
          forma_pago: cfg.forma_pago ?? "transferencia",
          socios_split: sociosSplit,
          notas: cfg.notas ?? null,
          cierres: data.cierres,
          revenue_base: revenueBase,
          comision_calculada: Math.round(comisionCalculada * 100) / 100,
          comision_neta: comisionNeta,
        };

        if (tipoComision === "escalada") {
          resultado.meta_revenue = metaRevenue;
          resultado.pct_meta_alcanzado = Math.round((pctMetaAlcanzado ?? 0) * 10) / 10;
          resultado.tramo_aplicado = tramoAplicado;
        }

        if (splitsCalculados) resultado.splits_calculados = splitsCalculados;

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
      subtipo?: string;
      nombre_proyecto?: string;
      pct_division?: number;
      forma_pago?: string;
      socios_split?: SocioSplit[];
      notas?: string;
    };

    const { id, closer_email, closer_nombre, tipo, valor, aplica_sobre, activo, tipo_comision, asesores_equipo, tramos_escalada, subtipo, nombre_proyecto, pct_division, forma_pago, socios_split, notas } = body;

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
      subtipo: subtipo ?? "estandar",
      nombre_proyecto: nombre_proyecto ?? null,
      pct_division: String(pct_division ?? 100),
      forma_pago: forma_pago ?? "transferencia",
      socios_split: socios_split ?? [],
      notas: notas ?? null,
    };

    if (id) {
      await db.update(comisionesConfig).set(updateData).where(and(eq(comisionesConfig.id, id), eq(comisionesConfig.id_cuenta, idCuenta)));
      return NextResponse.json({ ok: true, action: "updated" });
    } else {
      const [inserted] = await db.insert(comisionesConfig).values({ id_cuenta: idCuenta, ...updateData }).returning({ id: comisionesConfig.id });
      return NextResponse.json({ ok: true, action: "created", id: inserted?.id });
    }
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    await db.delete(comisionesConfig).where(and(eq(comisionesConfig.id, parseInt(id, 10)), eq(comisionesConfig.id_cuenta, idCuenta)));
    return NextResponse.json({ ok: true });
  });
}
