// Lead Compass - Data Model V1 (GHL-ready)

export type AdvisorRole = 'closer' | 'setter' | 'admin';

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
  answered: number;
  booked: number;
  attended: number;
  closed?: number; // reuniones cerradas (venta)
  revenue: number;
  roas?: number;
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
}
