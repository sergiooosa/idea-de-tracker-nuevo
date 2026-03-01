import {
  pgTable,
  serial,
  bigserial,
  text,
  integer,
  jsonb,
  date,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  cuentas — tabla maestra de tenants                                */
/* ------------------------------------------------------------------ */

export interface ConfiguracionUI {
  logo_url?: string;
  color_primario?: string;
  color_secundario?: string;
  nombre_empresa_display?: string;
  modulos_activos?: {
    chats?: boolean;
    citas_ghl?: boolean;
    llamadas_twilio?: boolean;
    videollamadas_fathom?: boolean;
  };
}

export const cuentas = pgTable("cuentas", {
  id_cuenta: serial("id_cuenta").primaryKey(),
  nombre_cuenta: varchar("nombre_cuenta"),
  subdominio: text("subdominio").unique().notNull(),
  configuracion_ui: jsonb("configuracion_ui").$type<ConfiguracionUI>(),
  estado_cuenta: text("estado_cuenta"),
  zona_horaria_iana: text("zona_horaria_iana"),
  prompt_ventas: text("prompt_ventas"),
});

/* ------------------------------------------------------------------ */
/*  usuarios_dashboard                                                */
/* ------------------------------------------------------------------ */

export const usuariosDashboard = pgTable("usuarios_dashboard", {
  id_evento: serial("id_evento").primaryKey(),
  id_cuenta: integer("id_cuenta").references(() => cuentas.id_cuenta),
  nombre: text("nombre"),
  email: text("email").unique().notNull(),
  pass: text("pass").notNull(),
  rol: text("rol").$type<"superadmin" | "usuario">().notNull(),
  permisos: jsonb("permisos").$type<Record<string, boolean>>(),
  fathom: text("fathom"),
  id_webhook_fathom: text("id_webhook_fathom"),
});

/* ------------------------------------------------------------------ */
/*  resumenes_diarios_agendas — citas y videollamadas (Cerebro)       */
/* ------------------------------------------------------------------ */

export interface ObjecionIA {
  objecion: string;
  categoria: string;
}

export const resumenesDiariosAgendas = pgTable("resumenes_diarios_agendas", {
  id_registro_agenda: serial("id_registro_agenda").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull(),
  fecha: date("fecha").notNull(),
  nombre_de_lead: varchar("nombre_de_lead").notNull(),
  origen: varchar("origen"),
  email_lead: varchar("email_lead"),
  categoria: varchar("categoria"),
  closer: varchar("closer"),
  fecha_reunion: timestamp("fecha_reunion", { withTimezone: true }),
  idcliente: text("idcliente"),
  ghl_contact_id: text("ghl_contact_id"),
  tags: text("tags"),
  cash_collected: text("cash_collected"),
  facturacion: text("facturacion"),
  resumen_ia: text("resumen_ia"),
  link_llamada: text("link_llamada"),
  objeciones_ia: jsonb("objeciones_ia").$type<ObjecionIA[]>(),
  reportmarketing: text("reportmarketing"),
});

/* ------------------------------------------------------------------ */
/*  log_llamadas — historial inmutable de eventos telefónicos         */
/* ------------------------------------------------------------------ */

export const logLlamadas = pgTable("log_llamadas", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  id_registro: integer("id_registro"),
  id_cuenta: integer("id_cuenta").notNull(),
  mail_lead: text("mail_lead"),
  id_user_ghl: text("id_user_ghl"),
  contact_id_ghl: text("contact_id_ghl"),
  nombre_lead: text("nombre_lead"),
  phone: text("phone"),
  tipo_evento: text("tipo_evento").notNull(),
  estado_resultado: text("estado_resultado"),
  call_sid: text("call_sid"),
  transcripcion: text("transcripcion"),
  ia_descripcion: text("ia_descripcion"),
  closer_mail: text("closer_mail"),
  nombre_closer: text("nombre_closer"),
  creativo_origen: text("creativo_origen"),
  speed_to_lead: text("speed_to_lead"),
  ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  registros_de_llamada — estado actual del lead en ciclo llamadas   */
/* ------------------------------------------------------------------ */

export const registrosDeLlamada = pgTable("registros_de_llamada", {
  id_registro: serial("id_registro").primaryKey(),
  fecha_evento: timestamp("fecha_evento", { withTimezone: true }).defaultNow(),
  id_cuenta: varchar("id_cuenta"),
  nombre_lead: varchar("nombre_lead"),
  estado: varchar("estado"),
  mail_lead: varchar("mail_lead"),
  phone_raw_format: varchar("phone_raw_format"),
  creativo_origen: varchar("creativo_origen"),
  closer_mail: varchar("closer_mail"),
  nombre_closer: varchar("nombre_closer"),
  fecha_y_hora_de_seguimiento: timestamp("fecha_y_hora_de_seguimiento", { withTimezone: true }),
  speed_to_lead: text("speed_to_lead"),
  intentos_contacto: integer("intentos_contacto").default(0),
  fecha_primera_llamada: timestamp("fecha_primera_llamada", { withTimezone: true }),
  trancription: text("trancription"),
  callsid: varchar("callsid"),
  iadescripcion: text("iadescripcion"),
  id_user_ghl: text("id_user_ghl"),
});

/* ------------------------------------------------------------------ */
/*  chats_logs — conversaciones de chat (JSONB con mensajes)          */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  name: string;
  role: "lead" | "agent" | string;
  type: string;
  status: string;
  message: string;
  timestamp: string;
}

export const chatsLogs = pgTable("chats_logs", {
  id_evento: serial("id_evento").primaryKey(),
  fecha_y_hora_z: timestamp("fecha_y_hora_z", { withTimezone: true }).defaultNow(),
  id_cuenta: integer("id_cuenta"),
  nombre_lead: text("nombre_lead"),
  chat: jsonb("chat").$type<ChatMessage[]>(),
  estado: text("estado"),
  notas_extra: text("notas_extra"),
  id_lead: text("id_lead"),
  chatid: text("chatid"),
});
