// AutoKPI - Data Model V2 (GHL-ready, Marca Blanca)

export type AdvisorRole = 'closer' | 'setter' | 'admin' | 'gerente' | 'director_comercial';

export interface Advisor {
  id: string;
  name: string;
  team: string;
  role: AdvisorRole;
  avatar?: string;
}

export type LeadStatus =
  | 'nuevo'
  | 'contactado'
  | 'interesado'
  | 'no_interesado'
  | 'agendado'
  | 'asistio'
  | 'cerrado'
  | 'pdte'
  | 'en_seguimiento';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ad_name?: string;
  createdAt: string; // ISO
  assignedAdvisorId: string;
  lastContactAt?: string;
  notes?: string;
  tags: string[];
}

export interface CallPhone {
  id: string;
  leadId: string;
  advisorId: string;
  datetime: string;
  duration: number; // seconds
  outcome: 'answered' | 'no_answer' | 'busy' | 'completed';
  attemptsCountForLead: number;
  firstContactAt?: string;
  speedToLeadSeconds?: number;
  recordingUrl?: string;
  notes?: string;
  tags: string[];
  summary?: string;
  objections?: string[];
}

export interface VideoMeeting {
  id: string;
  leadId: string;
  advisorId: string;
  datetime: string;
  attended: boolean;
  qualified: boolean;
  booked: boolean;
  canceled: boolean;
  outcome?: string;
  amountBought?: number;
  amountPaid?: number;
  cashCollected?: number;
  ticket?: number;
  notes?: string;
  tags: string[];
  source?: string;
  utm_source?: string;
  utm_campaign?: string;
  ad_name?: string;
  objections?: string[];
  /** Por cada objeción, la cita exacta de lo que dijo el lead (IA/transcripción). */
  objectionDetails?: { category: string; quote: string }[];
  /** URL de la grabación de la videollamada (ej. Fathom, Zoom). */
  recordingUrl?: string;
}

export type EmojiStatus = '👍' | '👎' | '💡' | '💰' | '⏳' | '💬' | '☀️';

export interface ChatEvent {
  id: string;
  leadId: string;
  advisorId: string;
  datetime: string;
  assigned: boolean;
  contacted: boolean;
  emojiStatus?: EmojiStatus;
  qualified: boolean;
  interested: boolean;
  bought: boolean;
  notes?: string;
  tags: string[];
  speedToLeadSeconds?: number;
  messageCount?: number;
}

export interface MetricsAggregate {
  period: 'day' | 'week' | 'month';
  dateFrom: string;
  dateTo: string;
  advisorId?: string;
  totalLeads: number;
  callsMade: number;
  meetingsBooked: number;
  meetingsAttended: number;
  meetingsCanceled: number;
  effectiveAppointments: number;
  revenue: number;
  cashCollected: number;
  avgTicket: number;
  ROAS?: number;
  speedToLeadAvg: number;
  avgAttempts: number;
  attemptsToFirstContactAvg: number;
  contactRate: number;
  bookingRate: number;
  attendanceRate: number;
  answerRate: number;
}

export interface ByChannelStats {
  llamadas: {
    leads: number;
    contactRate: number;
    bookingRate: number;
    closingRate: number;
  };
  videollamadas: {
    leads: number;
    attendanceRate: number;
    closingRate: number;
    revenue: number;
  };
  chats: {
    leads: number;
    conRespuesta: number;
    tasaRespuesta: number;
    topOrigen: string | null;
  };
}

export interface AcquisitionResponse {
  rows: AcquisitionRow[];
  sources: string[];
  byChannel: ByChannelStats;
}

export interface AcquisitionRow {
  id: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  ad_name?: string;
  medium?: string;
  leads: number;
  called: number; // leads a los que se les llamó
  answered: number;
  booked: number;
  attended: number;
  closed?: number; // reuniones cerradas (venta)
  revenue: number;
  contactRate: number;
  bookingRate: number;
  attendanceRate: number;
  closingRate?: number; // tasa de cierre = closed / attended
}

export interface TagRule {
  id: string;
  name: string;
  condition: string; // e.g. "amountPaid > 5000000"
  tag: string;
  source: 'call' | 'chat' | 'meeting';
}

export interface CustomMetricRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  increment: number;
  source: 'call' | 'chat' | 'meeting';
  whenMeasured?: string;
  isRecurring?: 'recurrente' | 'unica';
  section?: string;
  panel?: string;
}

/* ================================================================== */
/*  API response types — datos reales de PostgreSQL                   */
/* ================================================================== */

export interface ApiAdvisor {
  id: string;
  name: string;
  email?: string;
}

export interface ApiVideollamada {
  id: number;
  datetime: string;
  leadName: string;
  leadEmail: string | null;
  /** IDs en GHL / CRM — útiles para búsqueda */
  idcliente: string | null;
  ghl_contact_id: string | null;
  closer: string | null;
  categoria: string | null;
  attended: boolean;
  qualified: boolean;
  canceled: boolean;
  outcome: string;
  facturacion: number;
  cashCollected: number;
  resumenIa: string | null;
  linkLlamada: string | null;
  objeciones: { objecion: string; categoria: string }[];
  reportmarketing: string | null;
  origen: string | null;
  tags: string | null;
}

export interface VideollamadasAdvisorMetrics {
  advisorName: string;
  agendadas: number;
  asistencias: number;
  pctCierre: number;
  facturacion: number;
  cashCollected: number;
}

export interface MetricaComputada {
  id: string;
  nombre: string;
  valor: string | number;
  descripcion?: string;
  ubicacion?: string;
}

export interface VideollamadasResponse {
  registros: ApiVideollamada[];
  agg: {
    agendadas: number;
    asistidas: number;
    canceladas: number;
    efectivas: number;
    noShows: number;
    revenue: number;
    cashCollected: number;
    ticket: number;
  };
  advisorMetrics: Record<string, VideollamadasAdvisorMetrics>;
  advisors: ApiAdvisor[];
  metricasComputadas?: MetricaComputada[];
}

export interface ApiLlamadaLog {
  id: number;
  /** Enlace a registros_de_llamada; prioridad para asociar historial al lead correcto */
  id_registro: number | null;
  datetime: string;
  leadName: string | null;
  leadEmail: string | null;
  phone: string | null;
  closerMail: string | null;
  closerName: string | null;
  tipoEvento: string;
  outcome: 'answered' | 'no_answer' | 'voicemail' | 'pending';
  transcripcion: string | null;
  iaDescripcion: string | null;
  speedToLeadMinutes: number | null;
  creativoOrigen: string | null;
}

export interface LlamadasAdvisorMetrics {
  advisorName: string;
  advisorEmail: string;
  llamadas: number;
  contestadas: number;
  pctContestacion: number;
  tiempoAlLead: number | null;
  /** Número de leads (registros_de_llamada) asignados a este closer en el rango */
  leadsAsignados: number;
}

/** Lead desde registros_de_llamada (una fila por persona en Performance > Llamadas) */
export interface LlamadaLead {
  id_registro: number;
  nombre_lead: string | null;
  mail_lead: string | null;
  estado: string | null;
  phone: string | null;
  speed_to_lead_min: number | null;
  closer_mail: string | null;
  fecha_evento: string | null;
  id_user_ghl: string | null;
}

export interface LlamadasResponse {
  registros: ApiLlamadaLog[];
  /** Leads desde registros_de_llamada (mismo rango y asesor); el listado expandido muestra esto */
  leads: LlamadaLead[];
  agg: {
    totalLeads: number;
    totalCalls: number;
    answered: number;
    speedAvg: number;
    attemptsAvg: number;
    firstContactAttempts: number;
    answerRate: number;
  };
  advisorMetrics: Record<string, LlamadasAdvisorMetrics>;
  advisors: ApiAdvisor[];
  fuente_llamadas?: "twilio" | "ghl";
  embudoEtapas?: { id: string; nombre: string }[];
}

export interface ApiChatMessage {
  name: string;
  role: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface ApiChatLead {
  id: number;
  leadName: string | null;
  leadId: string | null;
  agentName: string | null;
  asesorAsignado: string | null;
  datetime: string;
  totalMessages: number;
  agentMessages: number;
  leadMessages: number;
  speedToLeadSeconds: number | null;
  estado: string | null;
  notasExtra: string | null;
  messages: ApiChatMessage[];
  tagsInternos?: string[];
  triggerAplicado?: string;
  /** Minutos transcurridos desde el último mensaje del lead sin respuesta del agente.
   *  null si el agente ya respondió después del último mensaje del lead, o si no hay mensajes del lead. */
  minutesSinceLastLeadMsg: number | null;
  /**
   * true si un humano realmente atendió el chat.
   * - Con chatbot (emojiTomaAtencion configurado): solo true si el emoji de toma de atención
   *   apareció en un mensaje del agente (un humano tomó el control).
   * - Sin chatbot: true si hay al menos un mensaje de role="agent".
   */
  humanTookOver: boolean;
}

export interface ChatsAdvisorMetrics {
  advisorName: string;
  asignados: number;
  activos: number;
  seguimientos: number;
  speedToLead: number | null;
}

export interface ChatsResponse {
  chats: ApiChatLead[];
  agg: {
    assigned: number;
    activos: number;
    seguimientosTotal: number;
    speedAvg: number;
  };
  advisorMetrics: Record<string, ChatsAdvisorMetrics>;
  advisors: ApiAdvisor[];
}

export interface DashboardKpis {
  totalLeads: number;
  callsMade: number;
  contestadas: number;
  answerRate: number;
  meetingsBooked: number;
  meetingsAttended: number;
  meetingsCanceled: number;
  meetingsClosed: number;
  effectiveAppointments: number;
  tasaCierre: number;
  tasaAgendamiento: number;
  revenue: number;
  cashCollected: number;
  avgTicket: number;
  speedToLeadAvg: number;
  avgAttempts: number;
  attemptsToFirstContactAvg: number;
  noShows: number;
}

export interface LeadDetailItem {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  ultimaActividad: string | null;
}

export interface DashboardAdvisorRow {
  advisorName: string;
  advisorEmail: string | null;
  totalLeads: number;
  leadsGenerados: number;
  leadsConActividad: number;
  leadsGeneradosDetalle: LeadDetailItem[];
  leadsConActividadDetalle: LeadDetailItem[];
  callsMade: number;
  speedToLeadAvg: number | null;
  meetingsBooked: number;
  meetingsAttended: number;
  revenue: number;
  cashCollected: number;
  contactRate: number;
  bookingRate: number;
}

export interface DashboardVolumeDay {
  date: string;
  llamadas: number;
  citasPresentaciones: number;
  cierres: number;
}

export interface DashboardObjecion {
  name: string;
  count: number;
  percent: number;
  tipos: number;
}

export interface DashboardObjecionDetail {
  leadName: string;
  advisorName: string;
  datetime: string;
  quote: string;
}

export interface EmbudoEtapaUI {
  id: string;
  nombre: string;
  color?: string;
  orden: number;
  condition?: string;
}

export interface MetricaPersonalizadaUI {
  id: string;
  name: string;
  description: string;
  condition: string;
  increment: number;
  whenMeasured: string;
  isRecurring: "recurrente" | "unica";
  section: string;
  panel: string;
  ubicacion?: "panel_ejecutivo" | "rendimiento" | "ambos";
}

export interface ChatKpis {
  total: number;
  leadsUnicos: number;
  conRespuesta: number;
  tasaRespuesta: number;
  speedToLeadAvg: number | null; // segundos
  distribucionCanales: Record<string, number>;
  topClosers: Array<{ name: string; count: number }>;
}

export interface MetaDiariaHistorial {
  fecha: string; // "YYYY-MM-DD"
  actual: number;
  meta: number;
  cumple: boolean;
}

export interface AlertaMeta {
  label: string;
  actual: number;
  meta: number;
  cumple: boolean;
  pct: number; // % de cumplimiento
  unidad?: string; // e.g. "llamadas", "%", "min", "$"
  canal: "llamadas" | "videollamadas" | "chats" | "general";
  invertido?: boolean; // true = menos es mejor (ej. speed to lead)
  sinDatos?: boolean; // true = hay meta pero actual = 0
  historialDiario?: MetaDiariaHistorial[]; // días del rango con cumplimiento
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  advisorRanking: DashboardAdvisorRow[];
  volumeByDay: DashboardVolumeDay[];
  objeciones: DashboardObjecion[];
  advisors: ApiAdvisor[];
  fuenteDatosFinancieros: "nativa" | "api_externa";
  embudoPersonalizado?: EmbudoEtapaUI[];
  distribucionEmbudo?: Record<string, number>;
  tagsDisponibles?: string[];
  tagCounts?: Record<string, number>;
  metricasPersonalizadas?: MetricaPersonalizadaUI[];
  metricasComputadas?: { id: string; nombre: string; valor: string | number; descripcion?: string; ubicacion?: string; paneles?: string[]; formato?: string; color?: string; visualizacion?: "kpi_card" | "barra" | "comparativo"; seriesTiempo?: { fecha: string; valor: number }[] }[];
  dashboardsPersonalizados?: { id: string; nombre: string; icono?: string }[];
  chatKpis?: ChatKpis;
  alertasMetas?: AlertaMeta[];
  configuracion_ui?: {
    modulos_activos?: {
      seccion_chats_dashboard?: boolean;
      [key: string]: boolean | undefined;
    };
    ranking_columnas?: string[];
    [key: string]: unknown;
  };
  fuente_llamadas?: "twilio" | "ghl";
}

export interface AsesorLeadCRM {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ghlContactId: string | null;
  estado: string | null;
  categoria: 'primera_llamada' | 'seguimiento' | 'interesados' | 'no_interesados';
  intentosContacto: number;
  speedToLead: string;
  notasLlamadas: { date: string; text: string }[];
  leadNote: string | null;
}

export interface AsesorKpis {
  leadsAsignados: number;
  llamadasRealizadas: number;
  llamadasContestadas: number;
  reunionesAgendadas: number;
  tasaContacto: number;
  tasaAgendamiento: number;
  /** Total chats asignados al asesor en el período */
  totalChats?: number;
  /** Chats con al menos un mensaje de agente */
  chatsConRespuesta?: number;
}

/** Desglose por canal/origen para KPIs del panel asesor */
export interface AsesorBreakdown {
  leadsAsignados: {
    desdeLlamadas: number;
    desdeAgendas: number;
    /** Leads desde registros_de_llamada (CRM) */
    desdeRegistros: number;
    /** Leads que aparecen solo en llamadas (no en agendas ni registros) */
    soloLlamadas: number;
    /** Leads que aparecen solo en agendas (no en llamadas ni registros) */
    soloAgendas: number;
    /** Leads que aparecen solo en registros (CRM), sin log ni agendas */
    soloRegistros: number;
    /** Leads que aparecen en llamadas y agendas */
    enAmbos: number;
  };
  llamadasRealizadas: {
    total: number;
    porTipo: Record<string, number>;
  };
  llamadasContestadas: {
    total: number;
  };
  reunionesAgendadas: {
    total: number;
  };
}

export interface AsesorResponse {
  kpis: AsesorKpis;
  leads: AsesorLeadCRM[];
  advisors: ApiAdvisor[];
  /** Lista completa de asesores del tenant (para combobox super admin) */
  advisorsList?: ApiAdvisor[];
  breakdown?: AsesorBreakdown;
  fuente_llamadas?: "twilio" | "ghl";
  /** GHL location ID para construir links directos a contactos */
  ghlLocationId?: string | null;
}
