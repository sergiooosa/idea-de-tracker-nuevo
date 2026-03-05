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
  numeric,
  boolean,
  uniqueIndex,
  index,
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
  nombres_secciones?: Record<string, string>;
  columnas_visibles?: Record<string, string[]>;
  kpis_visibles?: Record<string, string[]>;
  fuente_datos_financieros?: "nativa" | "api_externa";
}

export interface ReglaEtiqueta {
  id: string;
  condition: string;
  tag: string;
  source: string;
}

export interface MetricaPersonalizada {
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

/** Campo de una métrica manual (texto, número, fecha, boolean) */
export interface MetricaCampoConfig {
  id: string;
  nombre: string;
  tipo: "texto" | "numero" | "fecha" | "boolean";
  esClaveFiltro?: boolean;
}

/** Fórmula de métrica automática */
export interface MetricaFormulaConfig {
  tipo: "directo" | "suma" | "promedio" | "division" | "multiplicacion" | "resta" | "condicion";
  fuente?: string;
  fuentes?: string[];
  operador?: ">" | "<" | ">=" | "<=" | "==" | "!=";
  valorComparacion?: number | string | boolean;
  valorSiCumple?: number | string;
  valorSiNo?: number | string;
}

/** Configuración de métrica (manual, automática o fija) */
export interface MetricaConfig {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: "manual" | "automatica" | "fija";
  ubicacion?: "panel_ejecutivo" | "rendimiento" | "ambos";
  orden?: number;
  campos?: MetricaCampoConfig[];
  formula?: MetricaFormulaConfig;
  valorFijo?: number | string;
  formato?: "numero" | "moneda" | "porcentaje" | "tiempo" | "decimal";
  color?: string;
}

/** Entrada manual: valores por campo */
export type MetricaManualEntry = Record<string, string | number | boolean | null>;

export interface EmbudoEtapa {
  id: string;
  nombre: string;
  color?: string;
  orden: number;
  condition?: string;
}

export interface ChatTrigger {
  trigger: string;
  accion: string;
  valor: string;
}

export interface TipoEventoConfig {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface RolConfig {
  id: string;
  nombre: string;
  permisos: string[];
}

export const cuentas = pgTable("cuentas", {
  id_cuenta: serial("id_cuenta").primaryKey(),
  nombre_cuenta: varchar("nombre_cuenta"),
  subdominio: text("subdominio").unique().notNull(),
  configuracion_ui: jsonb("configuracion_ui").$type<ConfiguracionUI>(),
  estado_cuenta: text("estado_cuenta"),
  zona_horaria_iana: text("zona_horaria_iana"),
  prompt_ventas: text("prompt_ventas"),
  prompt_videollamadas: text("prompt_videollamadas"),
  prompt_llamadas: text("prompt_llamadas"),
  reglas_etiquetas: jsonb("reglas_etiquetas").$type<ReglaEtiqueta[]>(),
  metricas_personalizadas: jsonb("metricas_personalizadas").$type<MetricaPersonalizada[]>(),
  openai_api_key: text("openai_api_key"),
  embudo_personalizado: jsonb("embudo_personalizado").$type<EmbudoEtapa[]>(),
  chat_triggers: jsonb("chat_triggers").$type<ChatTrigger[]>(),
  tipos_eventos_config: jsonb("tipos_eventos_config").$type<TipoEventoConfig[]>(),
  roles_config: jsonb("roles_config").$type<RolConfig[]>(),
  metricas_config: jsonb("metricas_config").$type<MetricaConfig[]>(),
  metricas_manual_data: jsonb("metricas_manual_data").$type<Record<string, MetricaManualEntry[]>>(),
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
  rol: text("rol").notNull(),
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
  tags_internos: jsonb("tags_internos").$type<string[]>(),
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
  tags_internos: jsonb("tags_internos").$type<string[]>(),
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
  tags_internos: jsonb("tags_internos").$type<string[]>(),
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
  origen: text("origen"),
  tags_internos: jsonb("tags_internos").$type<string[]>(),
});

/* ------------------------------------------------------------------ */
/*  metas_cuenta — metas persistentes multi-tenant                    */
/* ------------------------------------------------------------------ */

export interface MetaPorAsesor {
  email: string;
  meta_llamadas_diarias?: number;
  meta_cierres_semanales?: number;
}

export const metasCuenta = pgTable("metas_cuenta", {
  id_meta: serial("id_meta").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull().references(() => cuentas.id_cuenta),
  meta_llamadas_diarias: integer("meta_llamadas_diarias").notNull().default(50),
  leads_nuevos_dia_1: integer("leads_nuevos_dia_1").notNull().default(3),
  leads_nuevos_dia_2: integer("leads_nuevos_dia_2").notNull().default(4),
  leads_nuevos_dia_3: integer("leads_nuevos_dia_3").notNull().default(5),
  meta_citas_semanales: integer("meta_citas_semanales"),
  meta_cierres_semanales: integer("meta_cierres_semanales"),
  meta_revenue_mensual: numeric("meta_revenue_mensual", { precision: 12, scale: 2 }),
  meta_cash_collected_mensual: numeric("meta_cash_collected_mensual", { precision: 12, scale: 2 }),
  meta_tasa_cierre: numeric("meta_tasa_cierre", { precision: 5, scale: 4 }),
  meta_tasa_contestacion: numeric("meta_tasa_contestacion", { precision: 5, scale: 4 }),
  meta_speed_to_lead_min: numeric("meta_speed_to_lead_min", { precision: 8, scale: 2 }),
  metas_por_asesor: jsonb("metas_por_asesor").$type<MetaPorAsesor[]>(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("metas_cuenta_id_cuenta_unique").on(table.id_cuenta),
]);

/* ------------------------------------------------------------------ */
/*  kpis_externos — datos financieros inyectados vía API externa       */
/* ------------------------------------------------------------------ */

export const kpisExternos = pgTable("kpis_externos", {
  id_registro: serial("id_registro").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull().references(() => cuentas.id_cuenta),
  fecha: date("fecha").notNull(),
  origen: text("origen").default("api_externa"),
  metricas: jsonb("metricas").$type<Record<string, number>>().notNull().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  api_keys_cuenta — tokens de autenticación para webhooks externos   */
/* ------------------------------------------------------------------ */

export const apiKeysCuenta = pgTable("api_keys_cuenta", {
  id_key: serial("id_key").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull().references(() => cuentas.id_cuenta),
  nombre_key: text("nombre_key").notNull(),
  token: text("token").unique().notNull(),
  activa: boolean("activa").default(true),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  uso_api_mensual — tracking de consumo mensual por cuenta           */
/* ------------------------------------------------------------------ */

export const usoApiMensual = pgTable("uso_api_mensual", {
  id_uso: serial("id_uso").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull().references(() => cuentas.id_cuenta),
  mes_anio: text("mes_anio").notNull(),
  tipo_consumo: text("tipo_consumo").notNull(),
  cantidad: integer("cantidad").default(0),
}, (table) => [
  uniqueIndex("uso_api_mensual_unique").on(table.id_cuenta, table.mes_anio, table.tipo_consumo),
]);

/* ------------------------------------------------------------------ */
/*  eventos_huerfanos — sala de espera de eventos fallidos             */
/* ------------------------------------------------------------------ */

export const eventosHuerfanos = pgTable("eventos_huerfanos", {
  id_huerfano: serial("id_huerfano").primaryKey(),
  id_cuenta: integer("id_cuenta").notNull().references(() => cuentas.id_cuenta, { onDelete: "cascade" }),
  origen: text("origen").notNull(),
  motivo: text("motivo").notNull(),
  payload_original: jsonb("payload_original").notNull(),
  estado: text("estado").default("pendiente"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_huerfanos_cuenta_estado").on(table.id_cuenta, table.estado),
]);
