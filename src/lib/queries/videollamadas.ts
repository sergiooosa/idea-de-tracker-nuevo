import { db } from "@/lib/db";
import { resumenesDiariosAgendas, cuentas } from "@/lib/db/schema";
import type { EmbudoEtapa } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import type {
  ApiVideollamada,
  VideollamadasAdvisorMetrics,
  VideollamadasResponse,
  ApiAdvisor,
} from "@/types";

const DEFAULT_ATTENDED_CATS = new Set(["Cerrada", "Ofertada", "No_Ofertada"]);

function mapCategoria(cat: string | null, embudo: EmbudoEtapa[] | null) {
  if (!cat) return { attended: false, qualified: false, canceled: false, outcome: "pendiente" };
  const c = cat.trim();

  if (embudo && embudo.length > 0) {
    const match = embudo.find((e) => e.nombre === c);
    if (match) {
      const isClosed = c.toLowerCase().includes("cerrad");
      return { attended: true, qualified: isClosed, canceled: false, outcome: c.toLowerCase() };
    }
  }

  switch (c) {
    case "Cerrada":
      return { attended: true, qualified: true, canceled: false, outcome: "cerrado" };
    case "Ofertada":
      return { attended: true, qualified: true, canceled: false, outcome: "seguimiento" };
    case "No_Ofertada":
      return { attended: true, qualified: false, canceled: false, outcome: "seguimiento" };
    case "no_show":
      return { attended: false, qualified: false, canceled: false, outcome: "no_show" };
    case "CANCELADA":
      return { attended: false, qualified: false, canceled: true, outcome: "cancelada" };
    case "PDTE":
      return { attended: false, qualified: false, canceled: false, outcome: "pendiente" };
    default:
      return { attended: false, qualified: false, canceled: false, outcome: c };
  }
}

export async function getVideollamadas(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
): Promise<VideollamadasResponse> {
  const fromDate = new Date(`${dateFrom}T00:00:00Z`);
  const toDate = new Date(`${dateTo}T23:59:59.999Z`);

  const [[cuentaRow], rows] = await Promise.all([
    db
      .select({ embudo_personalizado: cuentas.embudo_personalizado })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1),
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(
        and(
          eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
          gte(resumenesDiariosAgendas.fecha_reunion, fromDate),
          lte(resumenesDiariosAgendas.fecha_reunion, toDate),
        ),
      )
      .orderBy(sql`${resumenesDiariosAgendas.fecha_reunion} DESC`),
  ]);

  const embudo = Array.isArray(cuentaRow?.embudo_personalizado)
    ? cuentaRow.embudo_personalizado
    : null;

  const registros: ApiVideollamada[] = rows.map((r) => {
    const m = mapCategoria(r.categoria, embudo);
    return {
      id: r.id_registro_agenda,
      datetime: r.fecha_reunion?.toISOString() ?? r.fecha,
      leadName: r.nombre_de_lead,
      leadEmail: r.email_lead,
      closer: r.closer,
      categoria: r.categoria,
      attended: m.attended,
      qualified: m.qualified,
      canceled: m.canceled,
      outcome: m.outcome,
      facturacion: parseFloat(r.facturacion || "0") || 0,
      cashCollected: parseFloat(r.cash_collected || "0") || 0,
      resumenIa: r.resumen_ia,
      linkLlamada: r.link_llamada,
      objeciones: Array.isArray(r.objeciones_ia) ? r.objeciones_ia : [],
      reportmarketing: r.reportmarketing,
      origen: r.origen,
      tags: r.tags,
    };
  });

  const asistidas = registros.filter((r) => r.attended).length;
  const canceladas = registros.filter((r) => r.canceled).length;
  const noShows = registros.filter((r) => r.outcome === "no_show").length;
  const efectivas = registros.filter((r) => r.attended && r.qualified).length;
  const cerradas = registros.filter((r) => r.outcome === "cerrado").length;
  const revenue = registros.reduce((s, r) => s + r.facturacion, 0);
  const cash = registros.reduce((s, r) => s + r.cashCollected, 0);

  const agg = {
    agendadas: registros.length,
    asistidas,
    canceladas,
    efectivas,
    noShows,
    revenue,
    cashCollected: cash,
    ticket: asistidas > 0 ? Math.round(revenue / asistidas) : 0,
  };

  const byAdvisor: Record<string, ApiVideollamada[]> = {};
  for (const r of registros) {
    const key = r.closer ?? "Sin asignar";
    if (!byAdvisor[key]) byAdvisor[key] = [];
    byAdvisor[key].push(r);
  }

  const advisorMetrics: Record<string, VideollamadasAdvisorMetrics> = {};
  const advisors: ApiAdvisor[] = [];

  for (const [name, meetings] of Object.entries(byAdvisor)) {
    const asist = meetings.filter((m) => m.attended).length;
    const cerr = meetings.filter((m) => m.outcome === "cerrado" || m.qualified).length;
    advisorMetrics[name] = {
      advisorName: name,
      agendadas: meetings.length,
      asistencias: asist,
      pctCierre: asist > 0 ? (cerr / asist) * 100 : 0,
      facturacion: meetings.reduce((s, m) => s + m.facturacion, 0),
      cashCollected: meetings.reduce((s, m) => s + m.cashCollected, 0),
    };
    advisors.push({ id: name, name });
  }

  return { registros, agg, advisorMetrics, advisors };
}
