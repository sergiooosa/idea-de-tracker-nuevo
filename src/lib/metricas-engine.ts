/**
 * Motor de métricas: calcula valores para manuales y automáticas.
 * KPIs por defecto disponibles para fórmulas automáticas.
 */

import type { MetricaConfig, MetricaManualEntry } from "@/lib/db/schema";

export const KPI_DEFAULT_KEYS = [
  "totalLeads",
  "callsMade",
  "contestadas",
  "answerRate",
  "meetingsBooked",
  "meetingsAttended",
  "meetingsCanceled",
  "meetingsClosed",
  "effectiveAppointments",
  "tasaCierre",
  "tasaAgendamiento",
  "revenue",
  "cashCollected",
  "avgTicket",
  "speedToLeadAvg",
  "avgAttempts",
  "agendadas",
  "asistidas",
  "canceladas",
  "efectivas",
  "noShows",
  "ticket",
] as const;

export type KpiDefaultKey = (typeof KPI_DEFAULT_KEYS)[number];

export const KPI_DEFAULT_LABELS: Record<string, string> = {
  totalLeads: "Leads generados",
  callsMade: "Llamadas",
  contestadas: "Contestadas",
  answerRate: "Tasa de contestación",
  meetingsBooked: "Citas agendadas",
  meetingsAttended: "Asistidas",
  meetingsCanceled: "Canceladas",
  meetingsClosed: "Cerradas",
  effectiveAppointments: "Efectivas",
  tasaCierre: "Tasa de cierre",
  tasaAgendamiento: "Tasa agendamiento",
  revenue: "Ingresos",
  cashCollected: "Efectivo cobrado",
  avgTicket: "Ticket promedio",
  speedToLeadAvg: "Tiempo al lead (min)",
  avgAttempts: "Intentos promedio",
  agendadas: "Agendadas (videollamadas)",
  asistidas: "Asistidas (videollamadas)",
  canceladas: "Canceladas (videollamadas)",
  efectivas: "Efectivas (videollamadas)",
  noShows: "No shows",
  ticket: "Ticket (videollamadas)",
};

/** Métricas por defecto para un CEO / líder comercial. Se usan si metricas_config está vacío. */
export const DEFAULT_METRICAS_CONFIG: MetricaConfig[] = [
  // --- Bloque 1: Generación de leads y contacto ---
  { id: "default-leads", nombre: "Leads generados", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 0, formato: "numero", color: "blue", formula: { tipo: "directo", fuente: "totalLeads" }, descripcion: "Emails únicos entre llamadas y citas" },
  { id: "default-llamadas", nombre: "Llamadas realizadas", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 1, formato: "numero", color: "cyan", formula: { tipo: "directo", fuente: "callsMade" } },
  { id: "default-contestadas", nombre: "Contestadas", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 2, formato: "numero", color: "cyan", formula: { tipo: "directo", fuente: "contestadas" } },
  { id: "default-tasa-contestacion", nombre: "Tasa de contestación", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 3, formato: "porcentaje", color: "cyan", formula: { tipo: "directo", fuente: "answerRate" } },
  // --- Bloque 2: Velocidad y esfuerzo ---
  { id: "default-speed", nombre: "Tiempo al lead", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 4, formato: "tiempo", color: "purple", formula: { tipo: "directo", fuente: "speedToLeadAvg" }, descripcion: "Minutos promedio hasta la primera llamada" },
  { id: "default-intentos", nombre: "Intentos promedio", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 5, formato: "decimal", color: "amber", formula: { tipo: "directo", fuente: "avgAttempts" }, descripcion: "Llamadas promedio por lead" },
  // --- Bloque 3: Pipeline de citas ---
  { id: "default-agendadas", nombre: "Citas agendadas", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 6, formato: "numero", color: "purple", formula: { tipo: "directo", fuente: "meetingsBooked" } },
  { id: "default-tasa-agendamiento", nombre: "Tasa de agendamiento", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 7, formato: "porcentaje", color: "purple", formula: { tipo: "directo", fuente: "tasaAgendamiento" }, descripcion: "Citas ÷ Contestadas" },
  { id: "default-no-shows", nombre: "No shows", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 8, formato: "numero", color: "amber", formula: { tipo: "directo", fuente: "noShows" }, descripcion: "Personas que no se presentaron" },
  // --- Bloque 4: Cierre ---
  { id: "default-tasa-cierre", nombre: "Tasa de cierre", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 9, formato: "porcentaje", color: "green", formula: { tipo: "directo", fuente: "tasaCierre" }, descripcion: "Cerradas ÷ Asistidas" },
  // --- Bloque 5: Dinero ---
  { id: "default-revenue", nombre: "Ingresos", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 10, formato: "moneda", color: "green", formula: { tipo: "directo", fuente: "revenue" } },
  { id: "default-cash", nombre: "Efectivo cobrado", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 11, formato: "moneda", color: "green", formula: { tipo: "directo", fuente: "cashCollected" } },
  { id: "default-ticket", nombre: "Ticket promedio", tipo: "automatica", ubicacion: "panel_ejecutivo", orden: 12, formato: "moneda", color: "blue", formula: { tipo: "directo", fuente: "avgTicket" }, descripcion: "Ingresos ÷ Citas efectivas" },
];

/** Obtener métricas que dependen de esta (para aviso al borrar) */
export function getMetricasQueDependenDe(
  metricId: string,
  configs: MetricaConfig[],
): MetricaConfig[] {
  return configs.filter((m) => {
    if (m.tipo !== "automatica" || !m.formula) return false;
    const f = m.formula;
    if (f.fuente === metricId) return true;
    if (Array.isArray(f.fuentes) && f.fuentes.includes(metricId)) return true;
    return false;
  });
}

/** Calcular valor de una métrica manual en un rango de fechas */
export function calcMetricaManual(
  config: MetricaConfig,
  entries: MetricaManualEntry[],
  dateFrom: string,
  dateTo: string,
): string | number {
  if (config.tipo !== "manual" || !config.campos?.length) return 0;

  const campoFecha = config.campos.find((c) => c.tipo === "fecha" || c.esClaveFiltro);
  const campoNumero = config.campos.find((c) => c.tipo === "numero");
  const campoTexto = config.campos.find((c) => c.tipo === "texto");
  const campoBoolean = config.campos.find((c) => c.tipo === "boolean");

  const fromTs = new Date(`${dateFrom}T00:00:00Z`).getTime();
  const toTs = new Date(`${dateTo}T23:59:59.999Z`).getTime();

  let filtered = entries;
  if (campoFecha) {
    const key = campoFecha.id;
    filtered = entries.filter((e) => {
      const v = e[key];
      if (v == null) return false;
      const d = typeof v === "string" ? new Date(v).getTime() : 0;
      return d >= fromTs && d <= toTs;
    });
  }

  if (campoNumero) {
    const key = campoNumero.id;
    const nums = filtered
      .map((e) => {
        const v = e[key];
        if (v == null) return NaN;
        return typeof v === "number" ? v : parseFloat(String(v)) || NaN;
      })
      .filter((n) => !isNaN(n));
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : 0;
  }

  if (campoBoolean) {
    const key = campoBoolean.id;
    const trues = filtered.filter((e) => e[key] === true || e[key] === "true").length;
    return trues;
  }

  if (campoTexto && filtered.length > 0) {
    const last = filtered[filtered.length - 1];
    const v = last[campoTexto.id];
    return typeof v === "string" || typeof v === "number" ? v : v != null ? String(v) : "";
  }

  return filtered.length;
}

/** Calcular valor de una métrica automática */
export function calcMetricaAutomatica(
  config: MetricaConfig,
  kpis: Record<string, unknown>,
  metricasValores: Record<string, string | number>,
  dateFrom: string,
  dateTo: string,
): string | number {
  if (config.tipo !== "automatica" || !config.formula) return 0;

  const f = config.formula;
  const getVal = (key: string): number => {
    if (KPI_DEFAULT_KEYS.includes(key as KpiDefaultKey)) {
      const v = kpis[key];
      return typeof v === "number" ? v : parseFloat(String(v)) || 0;
    }
    const m = metricasValores[key];
    return typeof m === "number" ? m : parseFloat(String(m)) || 0;
  };

  const getValStr = (key: string): string | number => {
    if (KPI_DEFAULT_KEYS.includes(key as KpiDefaultKey)) {
      const v = kpis[key];
      return (typeof v === "string" || typeof v === "number") ? v : (v != null ? Number(v) : 0);
    }
    return metricasValores[key] ?? 0;
  };

  if (f.tipo === "directo" && f.fuente) {
    return getValStr(f.fuente);
  }

  if (f.tipo === "suma" && f.fuentes?.length) {
    return f.fuentes.reduce((s, k) => s + getVal(k), 0);
  }

  if (f.tipo === "promedio" && f.fuentes?.length) {
    const vals = f.fuentes.map(getVal).filter((v) => !isNaN(v));
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }

  if (f.tipo === "division" && f.fuentes?.length === 2) {
    const [a, b] = f.fuentes.map(getVal);
    return b !== 0 ? a / b : 0;
  }

  if (f.tipo === "multiplicacion" && f.fuentes?.length) {
    return f.fuentes.reduce((s, k) => s * getVal(k), 1);
  }

  if (f.tipo === "resta" && f.fuentes?.length === 2) {
    const [a, b] = f.fuentes.map(getVal);
    return a - b;
  }

  if (f.tipo === "condicion" && f.fuente && f.operador != null) {
    const v = getVal(f.fuente);
    const comp = f.valorComparacion;
    const cmp = typeof comp === "number" ? comp : parseFloat(String(comp)) || 0;
    let cumple = false;
    switch (f.operador) {
      case ">": cumple = v > cmp; break;
      case "<": cumple = v < cmp; break;
      case ">=": cumple = v >= cmp; break;
      case "<=": cumple = v <= cmp; break;
      case "==": cumple = Math.abs(v - cmp) < 1e-9; break;
      case "!=": cumple = Math.abs(v - cmp) >= 1e-9; break;
      default: cumple = false;
    }
    const res = cumple ? f.valorSiCumple : f.valorSiNo;
    return typeof res === "number" ? res : parseFloat(String(res)) || 0;
  }

  return 0;
}
