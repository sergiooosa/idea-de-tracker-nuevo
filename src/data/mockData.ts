import type {
  Advisor,
  Lead,
  CallPhone,
  VideoMeeting,
  ChatEvent,
  MetricsAggregate,
  AcquisitionRow,
} from '@/types';
import { subDays, subHours, formatISO, startOfDay } from 'date-fns';

const leadNames = [
  'Pedro García', 'Daniela Rojas', 'Nicolás Vargas', 'Juan López', 'Luis Pérez',
  'Laura Sánchez', 'Mariana Díaz', 'María González', 'Felipe Moreno', 'Carmen Fernández',
  'Sebastián Ruiz', 'Alejandro Mendoza', 'Diego Torres', 'Lead 1', 'Lead 2',
  'Camila Reyes', 'Andrés Castro', 'Valentina Soto', 'Mateo Herrera', 'Isabella López',
];

export const advisors: Advisor[] = [
  { id: 'adv-1', name: 'Sergio', team: 'Ventas', role: 'admin' },
  { id: 'adv-2', name: 'María', team: 'Ventas', role: 'closer' },
  { id: 'adv-3', name: 'Ana', team: 'Ventas', role: 'closer' },
  { id: 'adv-4', name: 'Carlos', team: 'Setters', role: 'setter' },
  { id: 'adv-5', name: 'Sofía', team: 'Setters', role: 'setter' },
  { id: 'adv-6', name: 'Laura', team: 'Chat', role: 'setter' },
  { id: 'adv-7', name: 'Pedro', team: 'Chat', role: 'setter' },
  { id: 'adv-8', name: 'Luis', team: 'Chat', role: 'setter' },
  { id: 'adv-9', name: 'Roberto', team: 'Ventas', role: 'director_comercial' },
];

/** Configuración que define el dueño/gerente: cómo debe trabajar el asesor (meta y reglas de llamadas). */
export const asesorNorthConfig = {
  /** Meta mínima de llamadas diarias (leads en seguimiento). */
  metaLlamadasDiariasSeguimiento: 50,
  /** Llamadas por día para leads nuevos: día 1, 2, 3... (hasta cubrir los primeros días). */
  leadsNuevosLlamadasPorDia: [3, 4, 5] as number[],
  /** Días que se consideran "primeros días" para un lead nuevo. */
  diasSeguimientoLeadNuevo: 3,
};

function leadId(i: number) { return `lead-${40000 + i}`; }
function callId(i: number) { return `call-${i}`; }
function meetingId(i: number) { return `meet-${i}`; }
function chatId(i: number) { return `chat-${i}`; }

const sources = ['facebook', 'google', 'instagram', 'organic', 'landing'];
const campaigns = ['curso_ventas_2026', 'webinar_feb', 'lead_magnet', 'retargeting'];

// Distribuir leads entre todos los asesores (i % 8) para que cada uno tenga leads al hacer clic
const baseLeads: Lead[] = leadNames.slice(0, 25).map((name, i) => ({
  id: leadId(i),
  name,
  phone: `+57 ${300 + (i % 10)}${1234567 + i}`,
  email: `lead${i}@example.com`,
  status: (['nuevo', 'contactado', 'interesado', 'agendado', 'asistio', 'cerrado', 'pdte', 'no_interesado', 'en_seguimiento'] as const)[i % 9],
  source: sources[i % 5],
  utm_source: sources[i % 5],
  utm_medium: 'cpc',
  utm_campaign: campaigns[i % 4],
  ad_name: i % 3 === 0 ? `Anuncio_${i}` : undefined,
  createdAt: formatISO(subDays(new Date(), 2 + (i % 14))),
  assignedAdvisorId: advisors[i % advisors.length].id,
  lastContactAt: formatISO(subHours(new Date(), (i % 48))),
  notes: i % 4 === 0 ? 'Cliente potencial alto' : undefined,
  tags: i % 3 === 0 ? ['caliente', 'interesado'] : i % 5 === 0 ? ['high_ticket'] : [],
}));

// Leads asignados hoy, ayer y antier a adv-1 para demo del panel "Llamadas por día de asignación"
const now = new Date();
const todayStart = startOfDay(now);
const leadsAsignadosRecientes: Lead[] = [
  { id: leadId(25), name: 'Andrea Morales', phone: '+57 310 1234001', email: 'andrea@example.com', status: 'nuevo', source: 'facebook', utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: campaigns[0], createdAt: formatISO(todayStart), assignedAdvisorId: 'adv-1', lastContactAt: undefined, tags: [] },
  { id: leadId(26), name: 'Ricardo Paz', phone: '+57 310 1234002', email: 'ricardo@example.com', status: 'nuevo', source: 'google', utm_source: 'google', utm_medium: 'cpc', utm_campaign: campaigns[1], createdAt: formatISO(todayStart), assignedAdvisorId: 'adv-1', lastContactAt: undefined, tags: [] },
  { id: leadId(27), name: 'Sandra López', phone: '+57 310 1234003', email: 'sandra@example.com', status: 'contactado', source: 'instagram', utm_source: 'instagram', utm_medium: 'cpc', utm_campaign: campaigns[2], createdAt: formatISO(startOfDay(subDays(now, 1))), assignedAdvisorId: 'adv-1', lastContactAt: formatISO(subHours(now, 2)), tags: [] },
  { id: leadId(28), name: 'Fernando Gómez', phone: '+57 310 1234004', email: 'fernando@example.com', status: 'nuevo', source: 'organic', utm_source: 'organic', utm_medium: 'cpc', utm_campaign: campaigns[3], createdAt: formatISO(startOfDay(subDays(now, 1))), assignedAdvisorId: 'adv-1', lastContactAt: undefined, tags: [] },
  { id: leadId(29), name: 'Lucía Martínez', phone: '+57 310 1234005', email: 'lucia@example.com', status: 'interesado', source: 'landing', utm_source: 'landing', utm_medium: 'cpc', utm_campaign: campaigns[0], createdAt: formatISO(startOfDay(subDays(now, 2))), assignedAdvisorId: 'adv-1', lastContactAt: formatISO(subHours(now, 5)), tags: [] },
  { id: leadId(30), name: 'Javier Ruiz', phone: '+57 310 1234006', email: 'javier@example.com', status: 'nuevo', source: 'facebook', utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: campaigns[1], createdAt: formatISO(startOfDay(subDays(now, 2))), assignedAdvisorId: 'adv-1', lastContactAt: undefined, tags: [] },
];

export const leads: Lead[] = [...baseLeads, ...leadsAsignadosRecientes];

const outcomes = ['answered', 'no_answer', 'completed'] as const;
export const calls: CallPhone[] = [];
for (let i = 0; i < 80; i++) {
  const leadIdx = i % leads.length;
  const advIdx = i % 5;
  const dt = subHours(new Date(), 12 + (i % 72));
  const attempts = 1 + (i % 4);
  const firstContact = attempts > 1 ? subHours(dt, 2) : dt;
  const outcome = outcomes[i % 3];
  // Las que no contestan no pueden tener duración (0 seg)
  const duration = outcome === 'no_answer' ? 0 : [45, 120, 180, 300][i % 4];
  calls.push({
    id: callId(i),
    leadId: leads[leadIdx].id,
    advisorId: advisors[advIdx].id,
    datetime: formatISO(dt),
    duration,
    outcome,
    attemptsCountForLead: attempts,
    firstContactAt: formatISO(firstContact),
    speedToLeadSeconds: attempts === 1 ? (i % 3) * 600 + 300 : undefined,
    notes: i % 5 === 0 ? 'Mencionó precio' : undefined,
    tags: i % 7 === 0 ? ['objeción_precio'] : [],
    objections: i % 6 === 0 ? ['precio', 'tiempo'] : i % 8 === 0 ? ['competencia'] : undefined,
  });
}

export const videoMeetings: VideoMeeting[] = [];
for (let i = 0; i < 45; i++) {
  const leadIdx = i % Math.min(20, leads.length);
  const advIdx = i % 3;
  const dt = subDays(new Date(), i % 14);
  const attended = i % 4 !== 0;
  const qualified = attended && i % 3 !== 0;
  const amount = attended && i % 2 === 0 ? (500000 + (i % 10) * 200000) : 0;
  const outcome = attended ? (i % 3 === 0 ? 'cerrado' : 'seguimiento') : 'no_show';
  videoMeetings.push({
    id: meetingId(i),
    leadId: leads[leadIdx].id,
    advisorId: advisors[advIdx].id,
    datetime: formatISO(dt),
    attended,
    qualified,
    booked: true,
    canceled: i % 10 === 0,
    outcome,
    amountBought: amount,
    amountPaid: amount * 0.6,
    cashCollected: amount * 0.4,
    ticket: amount,
    notes: i % 4 === 0 ? 'Muy interesado' : undefined,
    tags: amount > 1000000 ? ['high_ticket'] : [],
    utm_campaign: campaigns[i % 4],
    objections: i % 5 === 0 ? ['precio', 'desconfianza'] : i % 7 === 0 ? ['competencia'] : i % 11 === 0 ? ['tiempo'] : i % 13 === 0 ? ['precio'] : undefined,
    objectionDetails: i % 5 === 0
      ? [
          { category: 'precio', quote: 'Me parece muy caro para lo que ofrecen, no tengo ese presupuesto ahora mismo.' },
          { category: 'desconfianza', quote: 'No conozco bien la marca, he escuchado cosas que me generan dudas.' },
        ]
      : i % 7 === 0
        ? [{ category: 'competencia', quote: 'Ya estoy viendo con otra empresa que me da mejor precio y más flexibilidad.' }]
        : i % 11 === 0
          ? [{ category: 'tiempo', quote: 'Ahora no tengo tiempo para esto, déjame pensarlo y te contacto después.' }]
          : i % 13 === 0
            ? [{ category: 'precio', quote: 'El valor está por encima de lo que puedo invertir en este momento.' }]
            : undefined,
  });
}

// Llamadas extra: mismo lead + mismo asesor para ver selector "Seleccione cuál quiere ver" (varios registros)
const extraCalls: CallPhone[] = [
  { id: callId(80), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subHours(new Date(), 24)), duration: 120, outcome: 'answered', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(new Date(), 24)), notes: 'Primera llamada de seguimiento.', tags: [], objections: undefined },
  { id: callId(81), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subHours(new Date(), 48)), duration: 90, outcome: 'completed', attemptsCountForLead: 2, firstContactAt: formatISO(subHours(new Date(), 50)), notes: 'Mencionó precio.', tags: [], objections: ['precio'] },
  { id: callId(82), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subHours(new Date(), 72)), duration: 180, outcome: 'answered', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(new Date(), 72)), notes: 'Interesado en agendar.', tags: [], objections: undefined },
  { id: callId(83), leadId: leads[2].id, advisorId: advisors[0].id, datetime: formatISO(subHours(new Date(), 12)), duration: 60, outcome: 'answered', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(new Date(), 12)), notes: 'Callback solicitado.', tags: [], objections: undefined },
  { id: callId(84), leadId: leads[2].id, advisorId: advisors[0].id, datetime: formatISO(subHours(new Date(), 36)), duration: 200, outcome: 'completed', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(new Date(), 36)), notes: 'Cita agendada.', tags: [], objections: undefined },
];
// Llamadas de adv-1 a leads asignados hoy/ayer/antier (para panel "Llamadas por día de asignación")
calls.push(
  { id: callId(85), leadId: leadId(25), advisorId: 'adv-1', datetime: formatISO(subHours(now, 1)), duration: 90, outcome: 'answered', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(now, 1)), notes: undefined, tags: [] },
  { id: callId(86), leadId: leadId(27), advisorId: 'adv-1', datetime: formatISO(subHours(now, 3)), duration: 120, outcome: 'completed', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(now, 3)), notes: undefined, tags: [] },
  { id: callId(87), leadId: leadId(27), advisorId: 'adv-1', datetime: formatISO(subHours(now, 24)), duration: 60, outcome: 'answered', attemptsCountForLead: 2, firstContactAt: formatISO(subHours(now, 24)), notes: undefined, tags: [] },
  { id: callId(88), leadId: leadId(28), advisorId: 'adv-1', datetime: formatISO(subHours(now, 12)), duration: 0, outcome: 'no_answer', attemptsCountForLead: 1, firstContactAt: undefined, notes: undefined, tags: [] },
  { id: callId(89), leadId: leadId(29), advisorId: 'adv-1', datetime: formatISO(subHours(now, 6)), duration: 180, outcome: 'completed', attemptsCountForLead: 1, firstContactAt: formatISO(subHours(now, 6)), notes: undefined, tags: [] },
);
calls.push(...extraCalls);

// Videollamadas extra: mismo lead + mismo asesor para ver selector (varios registros)
const extraMeetings: VideoMeeting[] = [
  { id: meetingId(45), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subDays(new Date(), 1)), attended: true, qualified: true, booked: true, canceled: false, outcome: 'seguimiento', amountBought: 500000, amountPaid: 300000, cashCollected: 200000, ticket: 500000, notes: 'Muy interesado.', tags: [], utm_campaign: campaigns[0], objections: ['precio'], objectionDetails: [{ category: 'precio', quote: 'Me parece caro.' }] },
  { id: meetingId(46), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subDays(new Date(), 3)), attended: true, qualified: true, booked: true, canceled: false, outcome: 'cerrado', amountBought: 700000, amountPaid: 420000, cashCollected: 280000, ticket: 700000, notes: 'Cerró en esta reunión.', tags: [], utm_campaign: campaigns[0], objections: undefined, objectionDetails: undefined },
  { id: meetingId(47), leadId: leads[0].id, advisorId: advisors[0].id, datetime: formatISO(subDays(new Date(), 5)), attended: false, qualified: false, booked: true, canceled: false, outcome: 'no_show', amountBought: 0, amountPaid: 0, cashCollected: 0, ticket: 0, notes: 'No asistió.', tags: [], utm_campaign: campaigns[1], objections: undefined, objectionDetails: undefined },
  { id: meetingId(48), leadId: leads[1].id, advisorId: advisors[0].id, datetime: formatISO(subDays(new Date(), 2)), attended: true, qualified: true, booked: true, canceled: false, outcome: 'seguimiento', amountBought: 0, amountPaid: 0, cashCollected: 0, ticket: 0, notes: 'Segunda reunión de seguimiento.', tags: [], utm_campaign: campaigns[0], objections: undefined, objectionDetails: undefined },
  { id: meetingId(49), leadId: leads[1].id, advisorId: advisors[0].id, datetime: formatISO(subDays(new Date(), 4)), attended: true, qualified: false, booked: true, canceled: false, outcome: 'seguimiento', amountBought: 0, amountPaid: 0, cashCollected: 0, ticket: 0, notes: 'Pendiente de cierre.', tags: [], utm_campaign: campaigns[0], objections: ['tiempo'], objectionDetails: [{ category: 'tiempo', quote: 'Necesito pensarlo.' }] },
];
videoMeetings.push(...extraMeetings);

const emojis = ['👍', '👎', '💡', '💰', '⏳', '💬'] as const;
const chatNotes = [
  'Preguntó por precios y descuentos.',
  'Solicitó información del programa.',
  'Duda sobre horarios y modalidad.',
  'Interesado en próxima cohorte.',
  'Pidió callback.',
  undefined,
  undefined,
];
export const chatEvents: ChatEvent[] = [];
for (let i = 0; i < 60; i++) {
  const leadIdx = i % leads.length;
  const advIdx = 4 + (i % 4);
  const dt = subHours(new Date(), (i % 96));
  chatEvents.push({
    id: chatId(i),
    leadId: leads[leadIdx].id,
    advisorId: advisors[advIdx].id,
    datetime: formatISO(dt),
    assigned: true,
    contacted: i % 8 !== 0,
    emojiStatus: emojis[i % 6],
    qualified: i % 3 !== 0,
    interested: i % 4 === 0,
    bought: i % 6 === 0,
    notes: chatNotes[i % chatNotes.length],
    tags: [],
    speedToLeadSeconds: 200 + (i % 60) * 60,
    messageCount: 3 + (i % 15),
  });
}
// Más datos de chat: más leads y más variedad de horarios
for (let i = 60; i < 120; i++) {
  const leadIdx = i % leads.length;
  const advIdx = (4 + (i % 5)) % advisors.length;
  const dt = subHours(new Date(), 12 + (i % 72));
  chatEvents.push({
    id: chatId(i),
    leadId: leads[leadIdx].id,
    advisorId: advisors[advIdx].id,
    datetime: formatISO(dt),
    assigned: true,
    contacted: i % 5 !== 0,
    emojiStatus: emojis[i % 6],
    qualified: i % 4 !== 0,
    interested: i % 5 === 0,
    bought: i % 8 === 0,
    notes: i % 6 === 0 ? 'Quiere agendar llamada' : undefined,
    tags: i % 7 === 0 ? ['caliente'] : [],
    speedToLeadSeconds: 300 + (i % 45) * 40,
    messageCount: 2 + (i % 20),
  });
}

export const metricsGlobal: MetricsAggregate = {
  period: 'week',
  dateFrom: formatISO(subDays(new Date(), 7)),
  dateTo: formatISO(new Date()),
  totalLeads: 275,
  callsMade: 420,
  meetingsBooked: 91,
  meetingsAttended: 69,
  meetingsCanceled: 8,
  effectiveAppointments: 78,
  revenue: 13344.17,
  cashCollected: 6709.41,
  avgTicket: 667.21,
  ROAS: 2.4,
  speedToLeadAvg: 16.6 * 60,
  avgAttempts: 2.3,
  attemptsToFirstContactAvg: 1.8,
  contactRate: 0.72,
  bookingRate: 0.33,
  attendanceRate: 0.715,
  answerRate: 0.68,
};

export const metricsByAdvisor: Record<string, Partial<MetricsAggregate>> = {
  'adv-1': {
    totalLeads: 28,
    callsMade: 28,
    meetingsBooked: 14,
    meetingsAttended: 12,
    revenue: 19746.3,
    cashCollected: 9873,
    speedToLeadAvg: 12 * 60,
    contactRate: 0.85,
    bookingRate: 0.43,
    attendanceRate: 0.86,
  },
  'adv-2': {
    totalLeads: 10,
    callsMade: 10,
    meetingsBooked: 4,
    meetingsAttended: 3,
    revenue: 9430.71,
    cashCollected: 4715,
    speedToLeadAvg: 24 * 60,
    contactRate: 0.8,
    bookingRate: 0.3,
    attendanceRate: 0.75,
  },
  'adv-3': {
    totalLeads: 35,
    callsMade: 35,
    meetingsBooked: 15,
    meetingsAttended: 6,
    revenue: 17573.21,
    cashCollected: 8786,
    speedToLeadAvg: 14 * 60,
    contactRate: 0.9,
    bookingRate: 0.43,
    attendanceRate: 0.4,
  },
  'adv-4': {
    totalLeads: 55,
    callsMade: 150,
    meetingsBooked: 18,
    meetingsAttended: 14,
    revenue: 12500,
    cashCollected: 6200,
    speedToLeadAvg: 9 * 60,
    contactRate: 0.88,
    bookingRate: 0.33,
    attendanceRate: 0.78,
  },
  'adv-5': {
    totalLeads: 69,
    callsMade: 116,
    meetingsBooked: 12,
    meetingsAttended: 8,
    revenue: 8200,
    cashCollected: 4100,
    speedToLeadAvg: 18 * 60,
    contactRate: 0.75,
    bookingRate: 0.17,
    attendanceRate: 0.67,
  },
  'adv-6': { totalLeads: 3, callsMade: 8, meetingsBooked: 2, meetingsAttended: 1, revenue: 500, cashCollected: 200, speedToLeadAvg: 20 * 60, contactRate: 0.7, bookingRate: 0.25, attendanceRate: 0.5 },
  'adv-7': { totalLeads: 3, callsMade: 6, meetingsBooked: 1, meetingsAttended: 1, revenue: 800, cashCollected: 400, speedToLeadAvg: 15 * 60, contactRate: 0.8, bookingRate: 0.33, attendanceRate: 1 },
  'adv-8': { totalLeads: 3, callsMade: 10, meetingsBooked: 3, meetingsAttended: 2, revenue: 1200, cashCollected: 600, speedToLeadAvg: 10 * 60, contactRate: 0.9, bookingRate: 0.3, attendanceRate: 0.67 },
};

export const acquisitionRows: AcquisitionRow[] = [
  { id: 'acq-1', utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'curso_ventas_2026', leads: 120, called: 118, answered: 86, booked: 42, attended: 31, closed: 18, revenue: 18500, contactRate: 0.72, bookingRate: 0.49, attendanceRate: 0.74, closingRate: 31 > 0 ? 18 / 31 : 0 },
  { id: 'acq-2', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'webinar_feb', leads: 85, called: 82, answered: 62, booked: 28, attended: 22, closed: 14, revenue: 14200, contactRate: 0.73, bookingRate: 0.45, attendanceRate: 0.79, closingRate: 22 > 0 ? 14 / 22 : 0 },
  { id: 'acq-3', utm_source: 'instagram', utm_medium: 'social', utm_campaign: 'lead_magnet', leads: 45, called: 44, answered: 38, booked: 15, attended: 10, closed: 5, revenue: 6200, contactRate: 0.84, bookingRate: 0.39, attendanceRate: 0.67, closingRate: 10 > 0 ? 5 / 10 : 0 },
  { id: 'acq-4', utm_source: 'organic', medium: 'organic', leads: 25, called: 24, answered: 20, booked: 6, attended: 6, closed: 3, revenue: 3444.17, contactRate: 0.8, bookingRate: 0.3, attendanceRate: 1, closingRate: 6 > 0 ? 3 / 6 : 0 },
];

// Objeciones agregadas para reportes
export const objectionsByCount: { name: string; count: number }[] = [
  { name: 'precio', count: 19 },
  { name: 'competencia', count: 11 },
  { name: 'desconfianza', count: 9 },
  { name: 'tiempo', count: 8 },
];

// Llamadas por día para gráfico
export const callsVolumeByDay = [
  { date: '2026-02-21', llamadas: 28, citasPresentaciones: 14, cierres: 5 },
  { date: '2026-02-23', llamadas: 32, citasPresentaciones: 18, cierres: 8 },
  { date: '2026-02-25', llamadas: 30, citasPresentaciones: 12, cierres: 4 },
  { date: '2026-02-27', llamadas: 36, citasPresentaciones: 22, cierres: 21 },
];

export function getLeadsByAdvisor(advisorId: string): Lead[] {
  return leads.filter((l) => l.assignedAdvisorId === advisorId);
}

export function getCallsByLead(leadId: string): CallPhone[] {
  return calls.filter((c) => c.leadId === leadId).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getMeetingsByLead(leadId: string): VideoMeeting[] {
  return videoMeetings.filter((m) => m.leadId === leadId).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getChatEventsByLead(leadId: string): ChatEvent[] {
  return chatEvents.filter((e) => e.leadId === leadId).sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getLeadById(id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function getAdvisorById(id: string): Advisor | undefined {
  return advisors.find((a) => a.id === id);
}

/** Filtra por fecha de actividad (datetime del evento). from/to en ISO o Date, inicio y fin de día. */
function inDateRange(isoDate: string, from: string, to: string): boolean {
  const d = new Date(isoDate).getTime();
  const fromStart = new Date(from).setHours(0, 0, 0, 0);
  const toEnd = new Date(to).setHours(23, 59, 59, 999);
  return d >= fromStart && d <= toEnd;
}

export function getCallsByLeadInRange(leadId: string, dateFrom: string, dateTo: string): CallPhone[] {
  return calls
    .filter((c) => c.leadId === leadId && inDateRange(c.datetime, dateFrom, dateTo))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getMeetingsByLeadInRange(leadId: string, dateFrom: string, dateTo: string): VideoMeeting[] {
  return videoMeetings
    .filter((m) => m.leadId === leadId && inDateRange(m.datetime, dateFrom, dateTo))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getCallsInRange(dateFrom: string, dateTo: string): CallPhone[] {
  return calls
    .filter((c) => inDateRange(c.datetime, dateFrom, dateTo))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}

export function getMeetingsInRange(dateFrom: string, dateTo: string): VideoMeeting[] {
  return videoMeetings
    .filter((m) => inDateRange(m.datetime, dateFrom, dateTo))
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
}
