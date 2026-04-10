/**
 * AutoKPI Demo Data Generator
 * Genera datos falsos realistas para el modo demo público.
 * No requiere auth ni BD. Cada llamada produce datos distintos (seed aleatorio).
 */

import { faker } from "@faker-js/faker/locale/es";
import type {
  DashboardResponse,
  LlamadasResponse,
  VideollamadasResponse,
  ChatsResponse,
  AcquisitionResponse,
  AsesorResponse,
} from "@/types";

// Nombres de asesores ficticios consistentes por sesión
const ASESORES = [
  { name: "Valentina Ríos", email: "valentina@demo.autokpi.net" },
  { name: "Sebastián Mora", email: "sebastian@demo.autokpi.net" },
  { name: "Camila Torres", email: "camila@demo.autokpi.net" },
  { name: "Diego Herrera", email: "diego@demo.autokpi.net" },
  { name: "Mariana Castro", email: "mariana@demo.autokpi.net" },
];

const OBJECIONES = ["precio", "tiempo", "competencia", "no necesito", "lo pienso", "hablar con pareja"];
const CANALES = ["WhatsApp", "FB", "IG", "SMS"];
const FUENTES = ["Facebook Ads", "Instagram Ads", "Google Ads", "Referido", "Orgánico"];
const CATEGORIAS = ["primera_llamada", "seguimiento", "interesados", "no_interesados"];
const ETIQUETAS = ["*autoia", "*hot", "*seguimiento", "*propuesta", "*cerrado"];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pct(a: number, b: number) {
  return b === 0 ? 0 : a / b;
}

function dateRange(days = 30): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export function generateDashboard(): DashboardResponse {
  const totalLeads = rnd(120, 400);
  const callsMade = rnd(totalLeads, totalLeads * 3);
  const contestadas = Math.floor(callsMade * (0.45 + Math.random() * 0.3));
  const meetingsBooked = Math.floor(totalLeads * (0.2 + Math.random() * 0.25));
  const meetingsAttended = Math.floor(meetingsBooked * (0.55 + Math.random() * 0.3));
  const meetingsCanceled = meetingsBooked - meetingsAttended - rnd(0, 5);
  const meetingsClosed = Math.floor(meetingsAttended * (0.2 + Math.random() * 0.3));
  const revenue = meetingsClosed * rnd(1500000, 8000000);
  const cashCollected = Math.floor(revenue * (0.6 + Math.random() * 0.3));
  const avgTicket = meetingsClosed > 0 ? revenue / meetingsClosed : 0;
  const speedToLeadAvg = rnd(2, 45) + Math.random();

  const dates = dateRange(14);
  const volumeByDay = dates.map((date) => ({
    date: date.slice(5),
    llamadas: rnd(5, 40),
    citasPresentaciones: rnd(1, 12),
    cierres: rnd(0, 4),
  }));

  const objecionCounts = OBJECIONES.map((name) => ({
    name,
    count: rnd(2, 30),
    tipos: rnd(1, 5),
  }));
  const totalObj = objecionCounts.reduce((s, o) => s + o.count, 0);
  const objeciones = objecionCounts.map((o) => ({
    ...o,
    percent: Math.round((o.count / totalObj) * 100),
  }));

  const advisorRanking = ASESORES.map((a) => {
    const leads = rnd(20, 80);
    const calls = rnd(leads, leads * 3);
    const booked = Math.floor(leads * (0.15 + Math.random() * 0.3));
    const attended = Math.floor(booked * (0.5 + Math.random() * 0.35));
    const rev = Math.floor(attended * (0.2 + Math.random() * 0.3)) * rnd(1500000, 7000000);
    return {
      advisorName: a.name,
      advisorEmail: a.email,
      totalLeads: leads,
      callsMade: calls,
      speedToLeadAvg: rnd(2, 50) + Math.random(),
      meetingsBooked: booked,
      meetingsAttended: attended,
      revenue: rev,
      cashCollected: Math.floor(rev * 0.7),
      contactRate: pct(contestadas, callsMade),
      bookingRate: pct(booked, leads),
    };
  });

  const tagsDisponibles = ETIQUETAS;
  const tagCounts: Record<string, number> = {};
  ETIQUETAS.forEach((t) => { tagCounts[t] = rnd(5, 60); });

  const chatKpis = {
    total: rnd(80, 300),
    leadsUnicos: rnd(60, 200),
    conRespuesta: rnd(40, 150),
    tasaRespuesta: 0.6 + Math.random() * 0.35,
    speedToLeadAvg: rnd(30, 600),
    distribucionCanales: {
      WhatsApp: rnd(40, 150),
      FB: rnd(10, 60),
      IG: rnd(5, 40),
    },
    topClosers: ASESORES.slice(0, 3).map((a) => ({
      name: a.name,
      count: rnd(10, 60),
    })),
  };

  const alertasMetas = [
    {
      label: "Llamadas realizadas",
      actual: callsMade,
      meta: 300,
      cumple: callsMade >= 300,
      pct: Math.min(100, Math.round((callsMade / 300) * 100)),
      unidad: "llamadas",
      canal: "llamadas" as const,
    },
    {
      label: "Tasa de agendamiento",
      actual: Math.round(pct(meetingsBooked, totalLeads) * 100 * 10) / 10,
      meta: 30,
      cumple: pct(meetingsBooked, totalLeads) >= 0.3,
      pct: Math.min(100, Math.round((pct(meetingsBooked, totalLeads) / 0.3) * 100)),
      unidad: "%",
      canal: "llamadas" as const,
    },
    {
      label: "Cierres del mes",
      actual: meetingsClosed,
      meta: 20,
      cumple: meetingsClosed >= 20,
      pct: Math.min(100, Math.round((meetingsClosed / 20) * 100)),
      unidad: "cierres",
      canal: "videollamadas" as const,
    },
  ];

  const metricasComputadas = [
    { id: "leads", nombre: "Leads totales", valor: totalLeads, formato: "numero", color: "cyan", ubicacion: "panel_ejecutivo" },
    { id: "llamadas", nombre: "Llamadas", valor: callsMade, formato: "numero", color: "blue", ubicacion: "panel_ejecutivo" },
    { id: "agendadas", nombre: "Citas agendadas", valor: meetingsBooked, formato: "numero", color: "purple", ubicacion: "panel_ejecutivo" },
    { id: "asistidas", nombre: "Citas asistidas", valor: meetingsAttended, formato: "numero", color: "cyan", ubicacion: "panel_ejecutivo" },
    { id: "cerradas", nombre: "Cierres", valor: meetingsClosed, formato: "numero", color: "green", ubicacion: "panel_ejecutivo" },
    { id: "revenue", nombre: "Facturación", valor: revenue, formato: "moneda", color: "green", ubicacion: "panel_ejecutivo" },
    { id: "cash", nombre: "Efectivo", valor: cashCollected, formato: "moneda", color: "green", ubicacion: "panel_ejecutivo" },
    { id: "ticket", nombre: "Ticket promedio", valor: avgTicket, formato: "moneda", color: "amber", ubicacion: "panel_ejecutivo" },
    { id: "tasa_cierre", nombre: "Tasa de cierre", valor: pct(meetingsClosed, meetingsAttended), formato: "porcentaje", color: "green", ubicacion: "panel_ejecutivo" },
    { id: "speed", nombre: "Speed to lead", valor: speedToLeadAvg, formato: "tiempo", color: "amber", ubicacion: "panel_ejecutivo" },
    { id: "tasa_agend", nombre: "Tasa agend.", valor: pct(meetingsBooked, totalLeads), formato: "porcentaje", color: "purple", ubicacion: "panel_ejecutivo" },
    { id: "answer_rate", nombre: "Tasa contacto", valor: pct(contestadas, callsMade), formato: "porcentaje", color: "cyan", ubicacion: "panel_ejecutivo" },
  ];

  return {
    kpis: {
      totalLeads, callsMade, contestadas, answerRate: pct(contestadas, callsMade),
      meetingsBooked, meetingsAttended, meetingsCanceled: Math.max(0, meetingsCanceled),
      meetingsClosed, effectiveAppointments: meetingsAttended,
      tasaCierre: pct(meetingsClosed, meetingsAttended),
      tasaAgendamiento: pct(meetingsBooked, totalLeads),
      revenue, cashCollected, avgTicket, speedToLeadAvg,
      avgAttempts: rnd(2, 6) + Math.random(),
      attemptsToFirstContactAvg: rnd(1, 3) + Math.random(),
      noShows: rnd(0, 8),
    },
    advisorRanking,
    volumeByDay,
    objeciones,
    advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
    fuenteDatosFinancieros: "nativa",
    tagsDisponibles,
    tagCounts,
    metricasComputadas,
    chatKpis,
    alertasMetas,
    embudoPersonalizado: [
      { id: "e1", nombre: "Lead nuevo", color: "#06b6d4", orden: 1 },
      { id: "e2", nombre: "Contactado", color: "#8b5cf6", orden: 2 },
      { id: "e3", nombre: "Agendado", color: "#f97316", orden: 3 },
      { id: "e4", nombre: "Asistió", color: "#22c55e", orden: 4 },
      { id: "e5", nombre: "Cerrado", color: "#eab308", orden: 5 },
    ],
    distribucionEmbudo: {
      "Lead nuevo": totalLeads,
      "Contactado": contestadas,
      "Agendado": meetingsBooked,
      "Asistió": meetingsAttended,
      "Cerrado": meetingsClosed,
    },
    configuracion_ui: {
      modulos_activos: { seccion_chats_dashboard: true },
      fuente_datos_financieros: "nativa",
    },
    fuente_llamadas: "twilio",
  };
}

// ─── LLAMADAS ─────────────────────────────────────────────────────────────────

export function generateLlamadas(): LlamadasResponse {
  const count = rnd(60, 180);
  const registros = Array.from({ length: count }, (_, i) => {
    const asesor = ASESORES[rnd(0, ASESORES.length - 1)];
    const outcome = Math.random() > 0.45 ? "answered" : Math.random() > 0.5 ? "no_answer" : "voicemail";
    return {
      id: i + 1,
      id_registro: i + 1,
      datetime: faker.date.recent({ days: 30 }).toISOString(),
      leadName: faker.person.fullName(),
      leadEmail: faker.internet.email(),
      phone: faker.phone.number(),
      closerMail: asesor.email,
      closerName: asesor.name,
      tipoEvento: "llamada_telefonica",
      outcome: outcome as "answered" | "no_answer" | "voicemail" | "pending",
      transcripcion: outcome === "answered" ? faker.lorem.sentences(3) : null,
      iaDescripcion: outcome === "answered" ? faker.lorem.sentence() : null,
      speedToLeadMinutes: Math.random() > 0.2 ? rnd(1, 120) + Math.random() : null,
      creativoOrigen: FUENTES[rnd(0, FUENTES.length - 1)],
    };
  });

  const leads = Array.from({ length: rnd(40, 120) }, (_, i) => {
    const asesor = ASESORES[rnd(0, ASESORES.length - 1)];
    return {
      id_registro: i + 1,
      nombre_lead: faker.person.fullName(),
      mail_lead: faker.internet.email(),
      estado: CATEGORIAS[rnd(0, CATEGORIAS.length - 1)],
      phone: faker.phone.number(),
      speed_to_lead_min: Math.random() > 0.2 ? rnd(1, 120) + Math.random() : null,
      closer_mail: asesor.email,
      fecha_evento: faker.date.recent({ days: 30 }).toISOString(),
      id_user_ghl: faker.string.uuid(),
    };
  });

  const answered = registros.filter((r) => r.outcome === "answered").length;
  const advisorMetrics: Record<string, ReturnType<typeof generateLlamadas>["advisorMetrics"][string]> = {};
  ASESORES.forEach((a) => {
    const mine = registros.filter((r) => r.closerMail === a.email);
    const myAnswered = mine.filter((r) => r.outcome === "answered").length;
    advisorMetrics[a.email] = {
      advisorName: a.name,
      advisorEmail: a.email,
      llamadas: mine.length,
      contestadas: myAnswered,
      pctContestacion: pct(myAnswered, mine.length),
      tiempoAlLead: rnd(5, 80) + Math.random(),
      leadsAsignados: Math.floor(mine.length / 2),
    };
  });

  return {
    registros,
    leads,
    agg: {
      totalLeads: leads.length,
      totalCalls: count,
      answered,
      speedAvg: rnd(10, 60) + Math.random(),
      attemptsAvg: rnd(2, 5) + Math.random(),
      firstContactAttempts: rnd(1, 3) + Math.random(),
      answerRate: pct(answered, count),
    },
    advisorMetrics,
    advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
    fuente_llamadas: "twilio",
  };
}

// ─── VIDEOLLAMADAS ────────────────────────────────────────────────────────────

export function generateVideollamadas(): VideollamadasResponse {
  const count = rnd(30, 100);
  const registros = Array.from({ length: count }, (_, i) => {
    const asesor = ASESORES[rnd(0, ASESORES.length - 1)];
    const attended = Math.random() > 0.35;
    const canceled = !attended && Math.random() > 0.4;
    const closed = attended && Math.random() > 0.65;
    const facturacion = closed ? rnd(1500000, 12000000) : 0;
    const objecionesCount = rnd(0, 3);
    const objeciones = Array.from({ length: objecionesCount }, () => ({
      objecion: faker.lorem.words(3),
      categoria: OBJECIONES[rnd(0, OBJECIONES.length - 1)],
    }));
    return {
      id: i + 1,
      datetime: faker.date.recent({ days: 30 }).toISOString(),
      leadName: faker.person.fullName(),
      leadEmail: faker.internet.email(),
      idcliente: faker.string.alphanumeric(12),
      ghl_contact_id: faker.string.alphanumeric(16),
      closer: asesor.name,
      categoria: closed ? "cerrado" : attended ? "asistio" : canceled ? "cancelado" : "agendado",
      attended,
      qualified: attended && Math.random() > 0.4,
      canceled,
      outcome: closed ? "cerrado" : attended ? "no_cerrado" : canceled ? "cancelado" : "agendado",
      facturacion,
      cashCollected: Math.floor(facturacion * (0.5 + Math.random() * 0.4)),
      resumenIa: attended ? faker.lorem.sentences(2) : null,
      linkLlamada: attended ? `https://fathom.video/call/${faker.string.alphanumeric(10)}` : null,
      objeciones,
      reportmarketing: Math.random() > 0.7 ? faker.lorem.sentence() : null,
      origen: FUENTES[rnd(0, FUENTES.length - 1)],
      tags: Math.random() > 0.6 ? ETIQUETAS[rnd(0, ETIQUETAS.length - 1)] : null,
    };
  });

  const agendadas = count;
  const asistidas = registros.filter((r) => r.attended).length;
  const canceladas = registros.filter((r) => r.canceled).length;
  const efectivas = asistidas;
  const noShows = agendadas - asistidas - canceladas;
  const revenue = registros.reduce((s, r) => s + r.facturacion, 0);
  const cashCollected = registros.reduce((s, r) => s + r.cashCollected, 0);
  const cierres = registros.filter((r) => r.facturacion > 0).length;
  const ticket = cierres > 0 ? revenue / cierres : 0;

  const advisorMetrics: Record<string, ReturnType<typeof generateVideollamadas>["advisorMetrics"][string]> = {};
  ASESORES.forEach((a) => {
    const mine = registros.filter((r) => r.closer === a.name);
    const myRev = mine.reduce((s, r) => s + r.facturacion, 0);
    const myAttended = mine.filter((r) => r.attended).length;
    const myCierres = mine.filter((r) => r.facturacion > 0).length;
    advisorMetrics[a.name] = {
      advisorName: a.name,
      agendadas: mine.length,
      asistencias: myAttended,
      pctCierre: pct(myCierres, myAttended),
      facturacion: myRev,
      cashCollected: Math.floor(myRev * 0.7),
    };
  });

  return {
    registros,
    agg: { agendadas, asistidas, canceladas, efectivas, noShows: Math.max(0, noShows), revenue, cashCollected, ticket },
    advisorMetrics,
    advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
  };
}

// ─── CHATS ────────────────────────────────────────────────────────────────────

export function generateChats(): ChatsResponse {
  const count = rnd(40, 150);
  const chats = Array.from({ length: count }, (_, i) => {
    const asesor = ASESORES[rnd(0, ASESORES.length - 1)];
    const msgCount = rnd(3, 25);
    const agentMsgs = rnd(1, msgCount - 1);
    const messages = Array.from({ length: msgCount }, (_, j) => ({
      name: j % 2 === 0 ? faker.person.fullName() : asesor.name,
      role: j % 2 === 0 ? "lead" : "agent",
      type: "text",
      message: faker.lorem.sentence(),
      timestamp: faker.date.recent({ days: 7 }).toISOString(),
    }));
    return {
      id: i + 1,
      leadName: faker.person.fullName(),
      leadId: faker.string.uuid(),
      agentName: asesor.name,
      datetime: faker.date.recent({ days: 30 }).toISOString(),
      totalMessages: msgCount,
      agentMessages: agentMsgs,
      leadMessages: msgCount - agentMsgs,
      speedToLeadSeconds: Math.random() > 0.3 ? rnd(30, 1800) : null,
      estado: CATEGORIAS[rnd(0, CATEGORIAS.length - 1)],
      notasExtra: Math.random() > 0.7 ? faker.lorem.sentence() : null,
      messages,
      tagsInternos: Math.random() > 0.6 ? [ETIQUETAS[rnd(0, ETIQUETAS.length - 1)]] : [],
      triggerAplicado: Math.random() > 0.8 ? faker.lorem.words(2) : undefined,
      asesorAsignado: Math.random() > 0.5 ? ASESORES[rnd(0, ASESORES.length - 1)].name : null,
      minutesSinceLastLeadMsg: Math.random() > 0.5 ? rnd(5, 180) : null,
      humanTookOver: agentMsgs > 0 && Math.random() > 0.3,
    };
  });

  const chatsConRespuesta = chats.filter((c) => c.agentMessages > 0).length;
  const advisorMetrics: Record<string, ReturnType<typeof generateChats>["advisorMetrics"][string]> = {};
  ASESORES.forEach((a) => {
    const mine = chats.filter((c) => c.agentName === a.name);
    advisorMetrics[a.name] = {
      advisorName: a.name,
      asignados: mine.length,
      activos: Math.floor(mine.length * 0.7),
      seguimientos: Math.floor(mine.length * 0.3),
      speedToLead: mine.length > 0 ? rnd(60, 900) : null,
    };
  });

  return {
    chats,
    agg: {
      assigned: count,
      activos: Math.floor(count * 0.65),
      seguimientosTotal: Math.floor(count * 0.35),
      speedAvg: rnd(120, 900),
    },
    advisorMetrics,
    advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
  };
}

// ─── ACQUISITION ──────────────────────────────────────────────────────────────

export function generateAcquisition(): AcquisitionResponse {
  const rows = FUENTES.map((fuente, i) => {
    const leads = rnd(20, 120);
    const called = Math.floor(leads * (0.7 + Math.random() * 0.25));
    const answered = Math.floor(called * (0.4 + Math.random() * 0.3));
    const booked = Math.floor(answered * (0.2 + Math.random() * 0.3));
    const attended = Math.floor(booked * (0.5 + Math.random() * 0.35));
    const closed = Math.floor(attended * (0.2 + Math.random() * 0.3));
    const revenue = closed * rnd(2000000, 8000000);
    return {
      id: String(i + 1),
      utm_source: fuente.toLowerCase().replace(" ", "_"),
      utm_medium: "paid",
      utm_campaign: `campaña_${faker.word.noun()}`,
      ad_name: faker.commerce.productName(),
      medium: fuente,
      leads, called, answered, booked, attended, closed, revenue,
      contactRate: pct(answered, called),
      bookingRate: pct(booked, leads),
      attendanceRate: pct(attended, booked),
      closingRate: pct(closed, attended),
    };
  });

  return {
    rows,
    sources: FUENTES,
    byChannel: {
      llamadas: {
        leads: rows.reduce((s, r) => s + r.leads, 0),
        contactRate: 0.55 + Math.random() * 0.2,
        bookingRate: 0.2 + Math.random() * 0.2,
        closingRate: 0.2 + Math.random() * 0.2,
      },
      videollamadas: {
        leads: rnd(50, 150),
        attendanceRate: 0.55 + Math.random() * 0.3,
        closingRate: 0.2 + Math.random() * 0.25,
        revenue: rnd(20, 80) * 3000000,
      },
      chats: {
        leads: rnd(60, 200),
        conRespuesta: rnd(40, 150),
        tasaRespuesta: 0.6 + Math.random() * 0.3,
        topOrigen: "WhatsApp",
      },
    },
  };
}

// ─── ASESOR (panel asesor individual) ─────────────────────────────────────────

export function generateAsesor(): AsesorResponse {
  const asesor = ASESORES[0];
  const leads = rnd(20, 80);
  const llamadas = rnd(leads, leads * 3);
  const contestadas = Math.floor(llamadas * (0.45 + Math.random() * 0.3));
  const agendadas = Math.floor(leads * (0.2 + Math.random() * 0.25));

  const leadsList = Array.from({ length: leads }, (_, i) => ({
    id: String(i + 1),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    estado: CATEGORIAS[rnd(0, CATEGORIAS.length - 1)],
    categoria: CATEGORIAS[rnd(0, CATEGORIAS.length - 1)] as "primera_llamada" | "seguimiento" | "interesados" | "no_interesados",
    intentosContacto: rnd(1, 8),
    speedToLead: `${rnd(1, 120)} min`,
    notasLlamadas: Array.from({ length: rnd(0, 3) }, () => ({
      date: faker.date.recent({ days: 14 }).toISOString(),
      text: faker.lorem.sentence(),
    })),
    leadNote: Math.random() > 0.6 ? faker.lorem.sentence() : null,
    ghlContactId: null,
  }));

  return {
    kpis: {
      leadsAsignados: leads,
      llamadasRealizadas: llamadas,
      llamadasContestadas: contestadas,
      reunionesAgendadas: agendadas,
      tasaContacto: pct(contestadas, llamadas),
      tasaAgendamiento: pct(agendadas, leads),
      totalChats: rnd(10, 50),
      chatsConRespuesta: rnd(8, 40),
    },
    leads: leadsList,
    advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
    advisorsList: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })),
    fuente_llamadas: "twilio",
  };
}

// ─── API ROUTES MAP ───────────────────────────────────────────────────────────
// Mapea cada endpoint a su generador

export const DEMO_GENERATORS: Record<string, () => unknown> = {
  "/api/data/dashboard": generateDashboard,
  "/api/data/llamadas": generateLlamadas,
  "/api/data/videollamadas": generateVideollamadas,
  "/api/data/chats": generateChats,
  "/api/data/acquisition": generateAcquisition,
  "/api/data/asesor": generateAsesor,
  "/api/data/asesores": () => ({ advisors: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email })) }),
  "/api/data/locale": () => ({ idioma: "es" }),
  "/api/data/metas": () => ({ metas: [] }),
  "/api/data/roles": () => ({ rol: "admin", permisos: [] }),
  "/api/data/usuarios": () => ({ usuarios: ASESORES.map((a, i) => ({ id: String(i + 1), name: a.name, email: a.email, rol: "closer" })) }),
  "/api/data/ads": () => ({
    rows: [],
    totales: { inversion: 0, leads: 0, cpm: 0, cpl: 0, ctr: 0 },
    cuentas: [],
  }),
  "/api/data/comisiones": () => ({
    asesores: ASESORES.map((a) => ({ nombre: a.name, comision: rnd(500000, 3000000), cierres: rnd(1, 8) })),
  }),
  "/api/data/weekly-report": () => ({
    semana: "Semana demo",
    resumen: "Este es un reporte demo generado automáticamente.",
    metricas: {},
  }),
};
