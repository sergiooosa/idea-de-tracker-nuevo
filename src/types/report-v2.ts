// Report v2 types — matches the v2 data contract from AUT-1298 plan
// All sections are nullable: if the section has no data, the API returns null
// and the component renders nothing. Channels are always labeled.

// ─── KPIs (portada) ──────────────────────────────────────────────────────────

export interface ReportV2KPIs {
  leadsAnalizados: number;
  nuevos: number;
  reactivados: number;
  citasAgendadas: number;
  citasRealizadas: number;
  showRate: number; // 0-1
}

// ─── Funnel (embudo) ─────────────────────────────────────────────────────────

export interface ReportV2FunnelStep {
  label: string;
  count: number;
  pct: number; // 0-1 relative to analizados
}

export interface ReportV2Funnel {
  analizados: number;
  steps: ReportV2FunnelStep[];
}

// ─── Estado final ────────────────────────────────────────────────────────────

export interface ReportV2EstadoFinalItem {
  estado: string;
  count: number;
  pct: number; // 0-1
  canal: string;
}

export type ReportV2EstadoFinal = ReportV2EstadoFinalItem[];

// ─── Origen nuevos/reactivados ───────────────────────────────────────────────

export interface ReportV2Origen {
  nuevos: number;
  reactivados: number;
  narrativaReactivacion: string | null;
  porCanal: Array<{ canal: string; nuevos: number; reactivados: number }>;
}

// ─── Higiene CRM ─────────────────────────────────────────────────────────────

export interface ReportV2HigieneLeadDetalle {
  nombre: string;
  asesor: string | null;
  diasSinActividad: number;
}

export interface ReportV2HigieneCRM {
  leadsSinActividad: number;
  porAsesor: Array<{ nombre: string; count: number }>;
  detalle: ReportV2HigieneLeadDetalle[];
}

// ─── Por canal — Llamadas ────────────────────────────────────────────────────

export interface ReportV2CanalLlamadas {
  realizadas: number;
  leadsLlamados: number;
  contestaronPorLead: number;
  intentosProm: number;
  speedToLeadProm: number | null;
  duracionPromContestadas: number | null;
  mejorFranja: string | null;
}

// ─── Por canal — Chats ───────────────────────────────────────────────────────

export interface ReportV2CanalChats {
  conversaciones: number;
  mensajes: number;
  respondieron: number;
  tPrimeraRespuesta: number | null;
  conBot: number;
  escaladas: number;
}

// ─── Por canal — Video ───────────────────────────────────────────────────────

export interface ReportV2CanalVideo {
  agendadas: number;
  realizadas: number;
  showRate: number; // 0-1
  reagendadas: number;
  noShow: number;
  duracionProm: number | null;
  avanzaron: number;
}

// ─── Demografía ──────────────────────────────────────────────────────────────

export interface ReportV2DemografiaUbicacion {
  zona: string;
  count: number;
  canal: string;
}

export interface ReportV2DemografiaMotivo {
  motivo: string;
  count: number;
}

export interface ReportV2Demografia {
  ubicacion: ReportV2DemografiaUbicacion[];
  motivo: ReportV2DemografiaMotivo[];
  perfil: string[];
  edadDominante: string | null;
  presupuestoProm: number | null;
  denominador: number;
}

// ─── Cobertura / respuesta ───────────────────────────────────────────────────

export interface ReportV2CoberturaCanalesPorLead {
  label: string;
  count: number;
  pct: number; // 0-1
}

export interface ReportV2CoberturaIntentoContesta {
  intento: string;
  count: number;
  pct: number; // 0-1
}

export interface ReportV2CoberturaFranja {
  franja: string;
  tasaRespuesta: number; // 0-1
  total: number;
}

export interface ReportV2Cobertura {
  canalesPorLead: ReportV2CoberturaCanalesPorLead[];
  aQueIntentoContesta: ReportV2CoberturaIntentoContesta[];
  franjasHorarias: ReportV2CoberturaFranja[];
}

// ─── Comparativo ─────────────────────────────────────────────────────────────

export interface ReportV2ComparativoRow {
  metric: string;
  actual: number;
  anterior: number;
  delta: number; // porcentaje de cambio
  subirEsBueno: boolean;
}

export interface ReportV2Comparativo {
  periodoActual: string;
  periodoAnterior: string;
  rows: ReportV2ComparativoRow[];
}

// ─── Conversaciones por canal ────────────────────────────────────────────────

export interface ReportV2ConversacionDistribucion {
  label: string;
  count: number;
  pct: number; // 0-1
}

export interface ReportV2ConversacionesCanal {
  canal: string;
  recepcionTono: ReportV2ConversacionDistribucion[];
  entendiaContexto: ReportV2ConversacionDistribucion[];
  aceptacion: ReportV2ConversacionDistribucion[];
  engagement: ReportV2ConversacionDistribucion[];
  calidadCierre: ReportV2ConversacionDistribucion[];
  narrativa: string | null;
  totalAnalizadas: number;
}

// ─── Ranking de asesores ─────────────────────────────────────────────────────

export interface ReportV2AsesorDestacado {
  nombre: string;
  razon: string;
  valor: string;
}

export interface ReportV2AsesorTabla {
  nombre: string;
  leads: number;
  seguimiento: number;
  llamadas: number;
  contactoPct: number; // 0-1
  spdLead: number | null;
  intProm: number;
  dosIntPct: number; // 0-1
  citas: number;
  asistieron: number;
  score: number; // 0-100
}

export interface ReportV2AsesorAlerta {
  nombre: string;
  alerta: string;
  nivel: 'warning' | 'danger';
}

export interface ReportV2RankingAsesores {
  destacados: ReportV2AsesorDestacado[];
  tabla: ReportV2AsesorTabla[];
  alertas: ReportV2AsesorAlerta[];
}

// ─── Objeciones ──────────────────────────────────────────────────────────────

export interface ReportV2Objecion {
  objecion: string;
  frecuencia: number;
  fraseTextual: string | null;
}

// ─── Frases repetitivas ──────────────────────────────────────────────────────

export interface ReportV2FraseRepetitiva {
  frase: string;
  numLeads: number;
  insight: string | null;
}

// ─── Conclusiones ────────────────────────────────────────────────────────────

export type ReportV2Conclusiones = string[];

// ─── Narrativa ejecutiva ─────────────────────────────────────────────────────

export type ReportV2Narrativa = string;

// ─── Report v2 completo ──────────────────────────────────────────────────────

export interface ReportV2Data {
  cuenta: {
    nombre: string;
    subdominio: string;
    canalesActivos: ('llamadas' | 'chats' | 'video')[];
  };
  periodo: { from: string; to: string; dias: number };
  kpis: ReportV2KPIs | null;
  narrativa: ReportV2Narrativa | null;
  funnel: ReportV2Funnel | null;
  estadoFinal: ReportV2EstadoFinal | null;
  origen: ReportV2Origen | null;
  higieneCRM: ReportV2HigieneCRM | null;
  porCanal: {
    llamadas: ReportV2CanalLlamadas | null;
    chats: ReportV2CanalChats | null;
    video: ReportV2CanalVideo | null;
  };
  demografia: ReportV2Demografia | null;
  comparativo: ReportV2Comparativo | null;
  cobertura: ReportV2Cobertura | null;
  conversaciones: {
    llamadas: ReportV2ConversacionesCanal | null;
    chats: ReportV2ConversacionesCanal | null;
    video: ReportV2ConversacionesCanal | null;
  };
  rankingAsesores: ReportV2RankingAsesores | null;
  objeciones: ReportV2Objecion[] | null;
  frasesRepetitivas: ReportV2FraseRepetitiva[] | null;
  conclusiones: ReportV2Conclusiones | null;
}
