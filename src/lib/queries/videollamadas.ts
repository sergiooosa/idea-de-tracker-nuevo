import { db } from "@/lib/db";
import { resumenesDiariosAgendas, cuentas, usuariosDashboard } from "@/lib/db/schema";
import type { EmbudoEtapa, MetricaConfig } from "@/lib/db/schema";
import { calcMetricaManual, calcMetricaAutomatica, parseMetricasConfig } from "@/lib/metricas-engine";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";
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
  const cl = c.toLowerCase();

  // Embudo personalizado primero — buscar por nombre, name legacy o id (con fallback case-insensitive)
  if (embudo && embudo.length > 0) {
    const match = embudo.find(
      (e) =>
        (e.nombre != null && e.nombre === c) ||
        ((e as any).name != null && (e as any).name === c) ||
        (e.id != null && e.id === c) ||
        // case-insensitive fallback
        (e.nombre != null && e.nombre.toLowerCase() === cl) ||
        (e.id != null && e.id.toLowerCase() === cl),
    );
    if (match) {
      const label = match.nombre ?? (match as any).name ?? c;
      // Usar flags es_calificada, es_cerrada si están presentes
      const isCanceled = label.toLowerCase().includes("cancel");
      const isQualified = match.es_calificada !== undefined ? match.es_calificada : (label.toLowerCase().includes("cerrad") || label.toLowerCase().includes("closed"));
      const isClosed = match.es_cerrada !== undefined ? match.es_cerrada : (label.toLowerCase().includes("cerrad") || label.toLowerCase().includes("closed"));
      return {
        attended: !isCanceled,
        qualified: isQualified || isClosed,
        canceled: isCanceled,
        outcome: label.toLowerCase(),
      };
    }
  }

  // Comparaciones case-insensitive (fallback)
  if (cl === "cerrada" || cl === "closed") return { attended: true, qualified: true, canceled: false, outcome: "cerrado" };
  if (cl === "ofertada" || cl === "offered") return { attended: true, qualified: true, canceled: false, outcome: "seguimiento" };
  if (cl === "no_ofertada" || cl === "no ofertada") return { attended: true, qualified: false, canceled: false, outcome: "seguimiento" };
  if (cl === "no_show" || cl === "noshow") return { attended: false, qualified: false, canceled: false, outcome: "no_show" };
  if (cl.includes("cancel")) return { attended: false, qualified: false, canceled: true, outcome: "cancelada" };
  if (cl === "pdte" || cl === "pendiente") return { attended: false, qualified: false, canceled: false, outcome: "pendiente" };
  return { attended: false, qualified: false, canceled: false, outcome: cl };
}

export async function getVideollamadas(
  idCuenta: number,
  dateFrom: string,
  dateTo: string,
  closerEmails?: string[],
): Promise<VideollamadasResponse> {
  const emails = (closerEmails ?? []).map((e) => e.trim()).filter(Boolean);

  // Resolver nombre_closer para cada email — Fathom a veces guarda nombre en lugar de email
  let closerValues: string[] = [...emails];
  if (emails.length > 0) {
    const usuariosRows = await db
      .select({ email: usuariosDashboard.email, nombre_closer: usuariosDashboard.nombre_closer })
      .from(usuariosDashboard)
      .where(and(eq(usuariosDashboard.id_cuenta, idCuenta), inArray(usuariosDashboard.email, emails)));
    for (const u of usuariosRows) {
      if (u.nombre_closer) closerValues.push(u.nombre_closer);
    }
  }

  // Filtrar siempre por `fecha` (date string asignado por Cerebro al procesar el webhook).
  // No usar `fecha_reunion` para el rango de fechas porque es un timestamp UTC que puede
  // caer en un día distinto al de la fecha local del cliente (ej: reunión 22:30 UTC = 00:30
  // del día siguiente en UTC+2). `fecha` es la fecha canónica que ve el usuario.
  const agendaConditions = [
    eq(resumenesDiariosAgendas.id_cuenta, idCuenta),
    gte(resumenesDiariosAgendas.fecha, dateFrom),
    lte(resumenesDiariosAgendas.fecha, dateTo),
  ];
  if (closerValues.length > 0) agendaConditions.push(inArray(resumenesDiariosAgendas.closer, closerValues));

  const [[cuentaRow], rows] = await Promise.all([
    db
      .select({
        embudo_personalizado: cuentas.embudo_personalizado,
        metricas_config: cuentas.metricas_config,
        metricas_manual_data: cuentas.metricas_manual_data,
      })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1),
    db
      .select()
      .from(resumenesDiariosAgendas)
      .where(and(...agendaConditions))
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
      idcliente: r.idcliente ?? null,
      ghl_contact_id: r.ghl_contact_id ?? null,
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
  // Deduplicar canceladas por lead único (igual que agendadas y noShows)
  const uniqueCanceledLeads = new Set(
    registros
      .filter((r) => r.canceled)
      .map((r) =>
        r.idcliente?.trim() ||
        r.ghl_contact_id?.trim() ||
        r.leadEmail?.trim().toLowerCase() ||
        `nokey_${r.id}`
      )
  );
  const canceladas = uniqueCanceledLeads.size;
  // Deduplicar no-shows por lead único (GHL puede enviar el mismo evento múltiples veces)
  const uniqueNoShowLeads = new Set(
    registros
      .filter((r) => r.outcome === "no_show")
      .map((r) =>
        r.idcliente?.trim() ||
        r.ghl_contact_id?.trim() ||
        r.leadEmail?.trim().toLowerCase() ||
        `nokey_${r.id}`
      )
  );
  const noShows = uniqueNoShowLeads.size;
  const efectivas = registros.filter((r) => r.attended && r.qualified).length;
  const cerradas = registros.filter((r) => r.outcome === "cerrado").length;
  const revenue = registros.reduce((s, r) => s + r.facturacion, 0);
  const cash = registros.reduce((s, r) => s + r.cashCollected, 0);

  // Leads únicos agendados: deduplicar por idcliente/email — mismo criterio que dashboard
  const uniqueBookedLeads = new Set(
    registros
      .filter((r) => !r.canceled)
      .map((r) =>
        r.idcliente?.trim() ||
        r.leadEmail?.trim().toLowerCase() ||
        r.ghl_contact_id?.trim() ||
        `nokey_${r.id}`
      )
  );

  const agg = {
    agendadas: uniqueBookedLeads.size,
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
    // Deduplicar por asesor también
    const uniqueBooked = new Set(
      meetings
        .filter((m) => !m.canceled)
        .map((m) => m.idcliente?.trim() || m.leadEmail?.trim().toLowerCase() || m.ghl_contact_id?.trim() || `nokey_${m.id}`)
    );
    advisorMetrics[name] = {
      advisorName: name,
      agendadas: uniqueBooked.size,
      asistencias: asist,
      pctCierre: asist > 0 ? (cerr / asist) * 100 : 0,
      facturacion: meetings.reduce((s, m) => s + m.facturacion, 0),
      cashCollected: meetings.reduce((s, m) => s + m.cashCollected, 0),
    };
    advisors.push({ id: name, name });
  }

  const configs: MetricaConfig[] = parseMetricasConfig(cuentaRow?.metricas_config);
  const manualData = (cuentaRow?.metricas_manual_data && typeof cuentaRow.metricas_manual_data === "object")
    ? (cuentaRow.metricas_manual_data as Record<string, { [k: string]: string | number | boolean | null }[]>)
    : {};
  const kpiKeysVideollamadas = new Set(["agendadas", "asistidas", "canceladas", "efectivas", "noShows", "revenue", "cashCollected", "ticket"]);
  const metricasValores: Record<string, string | number> = {};
  const metricasComputadas: { id: string; nombre: string; valor: string | number; descripcion?: string; ubicacion?: string }[] = [];

  const getDeps = (m: MetricaConfig): string[] => {
    if (m.tipo === "fija") return [];
    if (m.tipo !== "automatica" || !m.formula) return [];
    const f = m.formula;
    if (f.fuente && !kpiKeysVideollamadas.has(f.fuente)) return [f.fuente];
    if (f.fuentes) return f.fuentes.filter((k) => !kpiKeysVideollamadas.has(k));
    return [];
  };

  const sorted = [...configs]
    .filter((m) => m.ubicacion === "rendimiento" || m.ubicacion === "ambos")
    .sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const computed = new Set<string>();
  let pass = 0;
  const maxPasses = sorted.length + 1;

  while (computed.size < sorted.length && pass < maxPasses) {
    pass++;
    for (const m of sorted) {
      if (computed.has(m.id)) continue;
      const deps = getDeps(m);
      if (deps.some((d) => !computed.has(d))) continue;
      let valor: string | number;
      if (m.tipo === "fija") {
        valor = m.valorFijo ?? 0;
      } else if (m.tipo === "manual") {
        const entries = manualData[m.id] ?? [];
        valor = calcMetricaManual(m, entries, dateFrom, dateTo);
      } else {
        valor = calcMetricaAutomatica(m, agg as Record<string, number>, metricasValores, dateFrom, dateTo);
      }
      metricasValores[m.id] = typeof valor === "number" ? valor : parseFloat(String(valor)) || 0;
      metricasComputadas.push({ id: m.id, nombre: m.nombre, valor, descripcion: m.descripcion, ubicacion: m.ubicacion });
      computed.add(m.id);
    }
  }

  for (const m of sorted) {
    if (computed.has(m.id)) continue;
    metricasComputadas.push({ id: m.id, nombre: m.nombre, valor: "—", descripcion: m.descripcion, ubicacion: m.ubicacion });
  }

  return { registros, agg, advisorMetrics, advisors, metricasComputadas };
}

export async function updateVideollamada(
  id: number,
  idCuenta: number,
  data: { nombre_lead?: string; closer?: string; estado?: string; facturacion?: number; cash_collected?: number },
): Promise<boolean> {
  const [row] = await db
    .select({ id: resumenesDiariosAgendas.id_registro_agenda, id_cuenta: resumenesDiariosAgendas.id_cuenta })
    .from(resumenesDiariosAgendas)
    .where(eq(resumenesDiariosAgendas.id_registro_agenda, id))
    .limit(1);

  if (!row || row.id_cuenta !== idCuenta) return false;

  const setClause: Record<string, unknown> = {};
  if (data.nombre_lead !== undefined) setClause.nombre_de_lead = data.nombre_lead;
  if (data.closer !== undefined) setClause.closer = data.closer;
  if (data.estado !== undefined) setClause.categoria = data.estado;
  if (data.facturacion !== undefined) setClause.facturacion = String(data.facturacion);
  if (data.cash_collected !== undefined) setClause.cash_collected = String(data.cash_collected);

  if (Object.keys(setClause).length > 0) {
    await db
      .update(resumenesDiariosAgendas)
      .set(setClause)
      .where(eq(resumenesDiariosAgendas.id_registro_agenda, id));
  }

  return true;
}
