/**
 * GET /api/data/report-v2  — Reporte Ejecutivo Comercial v2 (AUT-1302 · WS2)
 *
 * Produce el `report JSON v2` completo (contrato `@/types/reportV2`) para el
 * periodo solicitado, ampliando el motor actual. Coexiste con `/api/data/report`
 * (v1) durante la migración; WS3 (Frontend, AUT-1303) consume este endpoint.
 *
 * Params: from, to (YYYY-MM-DD), period_type (daily|weekly|monthly|custom).
 */

import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildReportV2 } from "@/lib/queries/reportV2";
import type { ReportV2Periodo } from "@/types/reportV2";

function daysBetween(from: string, to: string): number {
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((t - f) / 86400000) + 1;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function calcPrevPeriod(from: string, to: string, periodType: string): { from: string; to: string } {
  const dias = daysBetween(from, to);
  switch (periodType) {
    case "daily":
      return { from: addDays(from, -1), to: addDays(from, -1) };
    case "weekly":
      return { from: addDays(from, -7), to: addDays(to, -7) };
    case "monthly": {
      const f = new Date(`${from}T00:00:00Z`);
      const t = new Date(`${to}T00:00:00Z`);
      f.setUTCMonth(f.getUTCMonth() - 1);
      t.setUTCMonth(t.getUTCMonth() - 1);
      return { from: f.toISOString().slice(0, 10), to: t.toISOString().slice(0, 10) };
    }
    default:
      return { from: addDays(from, -dias), to: addDays(to, -dias) };
  }
}

export async function GET(req: Request): Promise<Response> {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const today = new Date().toISOString().slice(0, 10);
    const from = searchParams.get("from") ?? today;
    const to = searchParams.get("to") ?? today;
    const periodType = (searchParams.get("period_type") ?? "custom") as ReportV2Periodo["type"];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "from y to deben tener formato YYYY-MM-DD" }, { status: 400 });
    }
    if (from > to) {
      return NextResponse.json({ error: "from debe ser anterior o igual a to" }, { status: 400 });
    }

    const cuentaRow = await db
      .select({ nombre_cuenta: cuentas.nombre_cuenta, subdominio: cuentas.subdominio })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .then((rows) => rows[0] ?? null);

    if (!cuentaRow) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    try {
      const report = await buildReportV2(from, to, {
        account: {
          cuentaId: idCuenta,
          nombre: cuentaRow.nombre_cuenta ?? null,
          subdominio: cuentaRow.subdominio,
        },
        periodType,
        periodoPrevio: calcPrevPeriod(from, to, periodType),
        geminiApiKey: null,
      });

      return NextResponse.json(report);
    } catch (err) {
      console.error("[report-v2] buildReportV2 failed", { idCuenta, from, to, err });
      return NextResponse.json(
        { error: "Error interno generando reporte v2" },
        { status: 500 },
      );
    }
  });
}
