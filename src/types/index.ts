// AutoKPI - Data Model V1 (GHL-ready)

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
}

export interface ApiLlamadaLog {
  id: number;
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
}

export interface LlamadasResponse {
  registros: ApiLlamadaLog[];
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
  datetime: string;
  totalMessages: number;
  agentMessages: number;
  leadMessages: number;
  speedToLeadSeconds: number | null;
  estado: string | null;
  notasExtra: string | null;
  messages: ApiChatMessage[];
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
}

export interface DashboardAdvisorRow {
  advisorName: string;
  advisorEmail: string | null;
  totalLeads: number;
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

export interface DashboardResponse {
  kpis: DashboardKpis;
  advisorRanking: DashboardAdvisorRow[];
  volumeByDay: DashboardVolumeDay[];
  objeciones: DashboardObjecion[];
  advisors: ApiAdvisor[];
}

export interface AsesorLeadCRM {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
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
}

export interface AsesorResponse {
  kpis: AsesorKpis;
  leads: AsesorLeadCRM[];
  advisors: ApiAdvisor[];
}
