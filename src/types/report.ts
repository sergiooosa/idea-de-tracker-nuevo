// AutoKPI — Tipos TypeScript para Reportes v2
// Ver plan completo en AUT-377 / AUT-382
// Cada bloque es `T | null` — null significa sin datos, el frontend no lo renderiza.

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartidos
// ─────────────────────────────────────────────────────────────────────────────

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type ReportSemaforo = 'verde' | 'amarillo' | 'rojo';

export interface ReportPeriod {
  from: string; // ISO date "YYYY-MM-DD"
  to: string;   // ISO date "YYYY-MM-DD"
  type: ReportPeriodType;
}

/** Variación de una métrica respecto al período anterior. */
export interface ReportDelta {
  /** Valor en el período actual */
  actual: number;
  /** Valor en el período anterior */
  anterior: number;
  /** Cambio porcentual: (actual - anterior) / anterior * 100 */
  delta: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 0 — Resumen Ejecutivo (generado por IA)
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportExecutiveSummaryMejorAsesor {
  nombre: string;
  /** Métrica destacada (ej. "tasa de contacto", "cierres") */
  metrica: string;
  valor: number;
  unidad: string;
}

export interface ReportExecutiveSummaryMejorAnuncio {
  nombre: string;
  leads: number;
  tasaConversion: number;
}

export interface ReportExecutiveSummary {
  /** Una línea de resumen (ej. "Semana con 143 leads, 62% contactados") */
  headline: string;
  totalLeads: number;
  leadsContactados: number;
  leadsSinContacto: number;
  tasaContacto: number;
  mejorAsesor: ReportExecutiveSummaryMejorAsesor | null;
  mejorAnuncio: ReportExecutiveSummaryMejorAnuncio | null;
  /** Alerta más crítica del período (ej. "34% de leads sin contactar en 48h") */
  alertaCritica: string | null;
  /** Párrafo completo generado por GPT-4o-mini */
  narrativa: string;
  semaforo: ReportSemaforo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 1 — Rendimiento de Anuncios
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportAdsCampana {
  campana: string;
  plataforma: string;
  gastoTotal: number;
  impresiones: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  agendamientos: number;
  /** Leads generados que llegaron desde esta campaña (via creativo_origen) */
  leadsGenerados: number;
  /** % leads que cerraron / total leads de esta campaña */
  tasaConversionCliente: number | null;
}

export interface ReportAdsCreativo {
  nombre: string;
  campana: string | null;
  gastoTotal: number;
  /** Leads atribuidos a este creativo via creativo_origen */
  leadsAtribuidos: number;
  tasaConversionCliente: number | null;
}

export interface ReportAdsBlock {
  /** Totales del período */
  gastoTotal: number;
  impresiones: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  agendamientos: number;
  /** Plataformas activas en el período (ej. ["meta", "google"]) */
  plataformas: string[];
  porCampana: ReportAdsCampana[];
  porCreativo: ReportAdsCreativo[];
  /** Campos extra de datos_extra JSONB agregados (frequency, unique_ctr, etc.) */
  datosExtra: Record<string, number>;
  comparacion: ReportDelta & { label: 'gastoTotal' } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 2 — Asesores: Llamadas
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportCallsAsesor {
  nombre: string;
  email: string | null;
  leadsAsignados: number;
  llamadasRealizadas: number;
  llamadasContestadas: number;
  /** Porcentaje 0-100 */
  tasaContacto: number;
  /** Minutos promedio desde que llega el lead hasta primer llamada */
  speedToLeadAvgMin: number | null;
  intentosPromedio: number;
  /** Leads nuevos (fecha_evento en el período) vs leads en seguimiento */
  leadsNuevos: number;
  leadsSeguimiento: number;
  /** Puntaje compuesto 0-100 (tasa contacto + speed-to-lead + tasa agendamiento) */
  puntajeCompuesto: number | null;
  semaforo: ReportSemaforo;
}

export interface ReportCallsBlock {
  totalLeads: number;
  llamadasRealizadas: number;
  contestadas: number;
  answerRate: number;
  speedToLeadAvgMin: number | null;
  intentosPromedio: number;
  porAsesor: ReportCallsAsesor[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 3 — Asesores: Chats
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportChatsAsesor {
  nombre: string;
  chatsAsignados: number;
  chatsConRespuesta: number;
  /** Porcentaje 0-100 */
  tasaRespuesta: number;
  /** Segundos promedio hasta primer mensaje del agente */
  speedToLeadAvgSeg: number | null;
  /** Duración promedio de conversación en mensajes */
  duracionPromMensajes: number | null;
  /** Categorías de resultado: cerrada, calificada, no_calificada, etc. */
  distribucionResultados: Record<string, number>;
  /** Puntaje compuesto 0-100 */
  puntajeCompuesto: number | null;
  semaforo: ReportSemaforo;
}

export interface ReportChatsBlock {
  totalChats: number;
  conRespuesta: number;
  tasaRespuesta: number;
  speedToLeadAvgSeg: number | null;
  /** Aviso: fill rate bajo en asesor_asignado (<50%) — mostrar advertencia en UI */
  fillRateBajo: boolean;
  porAsesor: ReportChatsAsesor[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 4 — Asesores: Videollamadas
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportVideocallsAsesor {
  nombre: string;
  agendadas: number;
  asistidas: number;
  noShows: number;
  canceladas: number;
  calificadas: number;
  cerradas: number;
  /** Porcentaje 0-100 */
  tasaAsistencia: number;
  /** Porcentaje 0-100 */
  tasaCierre: number;
  facturacion: number;
  cashCollected: number;
  semaforo: ReportSemaforo;
}

export interface ReportVideocallsBlock {
  agendadas: number;
  asistidas: number;
  noShows: number;
  canceladas: number;
  calificadas: number;
  cerradas: number;
  tasaAsistencia: number;
  tasaCierre: number;
  facturacionTotal: number;
  cashCollectedTotal: number;
  porAsesor: ReportVideocallsAsesor[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 5 — Funnel de Leads
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportFunnelEtapa {
  id: string;
  label: string;
  count: number;
  /** Porcentaje sobre totalLeads */
  pct: number;
}

export interface ReportFunnelBlock {
  totalLeads: number;
  etapas: ReportFunnelEtapa[];
  /** Análisis narrativo de IA sobre el funnel (opcional, puede ser null si no se generó) */
  analisis: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 6 — Higiene CRM
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportCrmHealthAsesor {
  nombre: string;
  leadsEnLimbo: number;
  leadsSinAccion: number;
  leadsSinEstado: number;
}

export interface ReportCrmHealthBlock {
  /** Leads sin estado (estado IS NULL o vacío) */
  leadsSinEstado: number;
  /** Leads con registro pero cero llamadas/chats/citas */
  leadsAsignadosSinAccion: number;
  /** Leads en seguimiento sin actividad en los últimos 5 días */
  leadsEnLimbo: number;
  porAsesor: ReportCrmHealthAsesor[];
  /** Score de 0-100 (100 = CRM limpio) */
  puntajeSalud: number;
  /** Alertas de texto (ej. "34 leads sin estado asignado") */
  alertas: string[];
  semaforo: ReportSemaforo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 7 — Análisis de Conversaciones
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportConversationObjecion {
  categoria: string;
  count: number;
  /** Porcentaje sobre conversaciones analizadas */
  pct: number;
}

export interface ReportConversationSenal {
  senal: string;
  count: number;
}

export interface ReportConversationSentimiento {
  positivo: number;
  neutral: number;
  negativo: number;
}

export interface ReportConversationAnalysisBlock {
  /** Cantidad de conversaciones analizadas (transcripciones de llamadas + chats) */
  conversacionesAnalizadas: number;
  objecionesTop: ReportConversationObjecion[];
  sentimientoDistribucion: ReportConversationSentimiento;
  senalesCompra: ReportConversationSenal[];
  /** Análisis narrativo generado por IA sobre las conversaciones del período */
  analisisNarrativo: string | null;
  /** Advertencia si los datos son pre-computados de >24h atrás */
  datosDesactualizados: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 8 — Comparativo con período anterior
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportComparisonMetrica {
  /** Label visible en UI (ej. "Leads totales", "Tasa de contacto") */
  label: string;
  actual: number;
  anterior: number;
  /** (actual - anterior) / anterior * 100 */
  delta: number;
  unidad: string;
  /** Define qué dirección es "mejor" para colorear la tendencia */
  mejor: 'mayor' | 'menor';
  semaforo: ReportSemaforo;
}

export interface ReportComparisonBlock {
  periodoActual: ReportPeriod;
  periodoAnterior: ReportPeriod;
  metricas: ReportComparisonMetrica[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ReportResponse — Wrapper principal
// ─────────────────────────────────────────────────────────────────────────────

export interface ReportResponse {
  /** Período consultado */
  periodo: ReportPeriod;
  /** ID de la cuenta (tenant) */
  idCuenta: number;
  /** Timestamp de generación del reporte */
  generadoEn: string; // ISO datetime

  /** Bloque 0: Resumen ejecutivo (generado por IA) — null si no se solicitó */
  resumenEjecutivo: ReportExecutiveSummary | null;

  /** Bloque 1: Rendimiento de anuncios — null si la cuenta no tiene ads configurados */
  ads: ReportAdsBlock | null;

  /** Bloque 2: Asesores de llamadas — null si no hay llamadas en el período */
  llamadas: ReportCallsBlock | null;

  /** Bloque 3: Asesores de chats — null si no hay chats en el período */
  chats: ReportChatsBlock | null;

  /** Bloque 4: Videollamadas — null si no hay videollamadas en el período */
  videollamadas: ReportVideocallsBlock | null;

  /** Bloque 5: Funnel de leads — null si no hay leads en el período */
  funnel: ReportFunnelBlock | null;

  /** Bloque 6: Higiene CRM — null si no hay datos de leads */
  crmHealth: ReportCrmHealthBlock | null;

  /** Bloque 7: Análisis de conversaciones — null si no hay datos pre-computados disponibles */
  conversaciones: ReportConversationAnalysisBlock | null;

  /** Bloque 8: Comparativo con período anterior — null si no hay período anterior con datos */
  comparacion: ReportComparisonBlock | null;
}
