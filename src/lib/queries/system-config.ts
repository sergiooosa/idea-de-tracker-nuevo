import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { ReglaEtiqueta, MetricaPersonalizada, ChatTrigger, EmbudoEtapa, TipoEventoConfig, RolConfig, MetricaConfig, MetricaManualEntry } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { parseMetricasConfig } from "@/lib/metricas-engine";

export interface SystemConfigData {
  prompt_ventas: string;
  prompt_videollamadas: string;
  prompt_llamadas: string;
  reglas_etiquetas: ReglaEtiqueta[];
  metricas_personalizadas: MetricaPersonalizada[];
  metricas_config: MetricaConfig[];
  metricas_manual_data: Record<string, MetricaManualEntry[]>;
  chat_triggers: ChatTrigger[];
  embudo_personalizado: EmbudoEtapa[];
  tipos_eventos_config: TipoEventoConfig[];
  has_openai_key: boolean;
  fuente_datos_financieros: "nativa" | "api_externa";
  seccion_chats_dashboard: boolean;
  roles_config: RolConfig[];
}

export interface SystemConfigUpdatePayload extends Partial<Omit<SystemConfigData, "has_openai_key">> {
  openai_api_key?: string;
  seccion_chats_dashboard?: boolean;
}

const DEFAULT_PROMPT_VENTAS =
  "Somos una empresa de formación en ventas. Ofrecemos programas de 90 días con mentoría y seguimiento.";
const DEFAULT_PROMPT_VIDEO =
  "Evalúa la videollamada según: 1) Claridad del valor ofrecido, 2) Manejo de objeciones, 3) Cierre o siguiente paso definido. Asigna puntaje 1-10 por criterio.";
const DEFAULT_PROMPT_LLAMADAS =
  "Evalúa la llamada telefónica según: 1) Saludo y presentación, 2) Calificación del lead (interés, autoridad, necesidad), 3) Manejo de objeciones, 4) Cierre o siguiente paso (agendar, callback). Asigna puntaje 1-10 por criterio.";

export async function getSystemConfig(idCuenta: number): Promise<SystemConfigData> {
  const rows = await db
    .select({
      prompt_ventas: cuentas.prompt_ventas,
      prompt_videollamadas: cuentas.prompt_videollamadas,
      prompt_llamadas: cuentas.prompt_llamadas,
      reglas_etiquetas: cuentas.reglas_etiquetas,
      metricas_personalizadas: cuentas.metricas_personalizadas,
      chat_triggers: cuentas.chat_triggers,
      embudo_personalizado: cuentas.embudo_personalizado,
      tipos_eventos_config: cuentas.tipos_eventos_config,
      openai_api_key: cuentas.openai_api_key,
      configuracion_ui: cuentas.configuracion_ui,
      roles_config: cuentas.roles_config,
      metricas_config: cuentas.metricas_config,
      metricas_manual_data: cuentas.metricas_manual_data,
    })
    .from(cuentas)
    .where(eq(cuentas.id_cuenta, idCuenta))
    .limit(1);

  if (rows.length === 0) {
    return {
      prompt_ventas: DEFAULT_PROMPT_VENTAS,
      prompt_videollamadas: DEFAULT_PROMPT_VIDEO,
      prompt_llamadas: DEFAULT_PROMPT_LLAMADAS,
      reglas_etiquetas: [],
      metricas_personalizadas: [],
      chat_triggers: [],
      embudo_personalizado: [],
      tipos_eventos_config: [],
      has_openai_key: false,
      fuente_datos_financieros: "nativa",
      seccion_chats_dashboard: true,
      roles_config: [],
      metricas_config: [],
      metricas_manual_data: {},
    };
  }

  const r = rows[0];
  return {
    prompt_ventas: r.prompt_ventas ?? DEFAULT_PROMPT_VENTAS,
    prompt_videollamadas: r.prompt_videollamadas ?? DEFAULT_PROMPT_VIDEO,
    prompt_llamadas: r.prompt_llamadas ?? DEFAULT_PROMPT_LLAMADAS,
    reglas_etiquetas: Array.isArray(r.reglas_etiquetas) ? r.reglas_etiquetas : [],
    metricas_personalizadas: Array.isArray(r.metricas_personalizadas) ? r.metricas_personalizadas : [],
    chat_triggers: Array.isArray(r.chat_triggers) ? r.chat_triggers : [],
    embudo_personalizado: Array.isArray(r.embudo_personalizado) ? r.embudo_personalizado : [],
    tipos_eventos_config: Array.isArray(r.tipos_eventos_config) ? r.tipos_eventos_config : [],
    has_openai_key: !!r.openai_api_key,
    fuente_datos_financieros: r.configuracion_ui?.fuente_datos_financieros ?? "nativa",
    seccion_chats_dashboard: r.configuracion_ui?.modulos_activos?.seccion_chats_dashboard !== false,
    roles_config: Array.isArray(r.roles_config) ? r.roles_config : [],
    metricas_config: parseMetricasConfig(r.metricas_config),
    metricas_manual_data: (r.metricas_manual_data && typeof r.metricas_manual_data === "object") ? r.metricas_manual_data as Record<string, MetricaManualEntry[]> : {},
  };
}

export async function updateSystemConfig(
  idCuenta: number,
  data: SystemConfigUpdatePayload,
): Promise<SystemConfigData> {
  const setClause: Record<string, unknown> = {};

  if (data.prompt_ventas !== undefined) setClause.prompt_ventas = data.prompt_ventas;
  if (data.prompt_videollamadas !== undefined) setClause.prompt_videollamadas = data.prompt_videollamadas;
  if (data.prompt_llamadas !== undefined) setClause.prompt_llamadas = data.prompt_llamadas;
  if (data.reglas_etiquetas !== undefined) setClause.reglas_etiquetas = data.reglas_etiquetas;
  if (data.metricas_personalizadas !== undefined) setClause.metricas_personalizadas = data.metricas_personalizadas;
  if (data.chat_triggers !== undefined) setClause.chat_triggers = data.chat_triggers;
  if (data.embudo_personalizado !== undefined) setClause.embudo_personalizado = data.embudo_personalizado;
  if (data.tipos_eventos_config !== undefined) setClause.tipos_eventos_config = data.tipos_eventos_config;
  if (data.openai_api_key !== undefined) setClause.openai_api_key = data.openai_api_key;
  if (data.roles_config !== undefined) setClause.roles_config = data.roles_config;
  if (data.metricas_config !== undefined) setClause.metricas_config = data.metricas_config;
  if (data.metricas_manual_data !== undefined) setClause.metricas_manual_data = data.metricas_manual_data;

  if (data.fuente_datos_financieros !== undefined || (data as Record<string, unknown>).seccion_chats_dashboard !== undefined) {
    const [row] = await db
      .select({ configuracion_ui: cuentas.configuracion_ui })
      .from(cuentas)
      .where(eq(cuentas.id_cuenta, idCuenta))
      .limit(1);
    const existing = row?.configuracion_ui ?? {};
    const existingModulos = existing.modulos_activos ?? {};
    const updatedUi: typeof existing = { ...existing };
    if (data.fuente_datos_financieros !== undefined) {
      updatedUi.fuente_datos_financieros = data.fuente_datos_financieros;
    }
    const dataAny = data as Record<string, unknown>;
    if (dataAny.seccion_chats_dashboard !== undefined) {
      updatedUi.modulos_activos = { ...existingModulos, seccion_chats_dashboard: dataAny.seccion_chats_dashboard as boolean };
    }
    setClause.configuracion_ui = updatedUi;
  }

  if (Object.keys(setClause).length > 0) {
    await db.update(cuentas).set(setClause).where(eq(cuentas.id_cuenta, idCuenta));
  }

  return getSystemConfig(idCuenta);
}
