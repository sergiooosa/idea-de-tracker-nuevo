import { db } from "@/lib/db";
import { cuentas } from "@/lib/db/schema";
import type { ReglaEtiqueta, MetricaPersonalizada, ChatTrigger, EmbudoEtapa, TipoEventoConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface SystemConfigData {
  prompt_ventas: string;
  prompt_videollamadas: string;
  prompt_llamadas: string;
  reglas_etiquetas: ReglaEtiqueta[];
  metricas_personalizadas: MetricaPersonalizada[];
  chat_triggers: ChatTrigger[];
  embudo_personalizado: EmbudoEtapa[];
  tipos_eventos_config: TipoEventoConfig[];
  has_openai_key: boolean;
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
  };
}

export async function updateSystemConfig(
  idCuenta: number,
  data: Partial<SystemConfigData>,
): Promise<SystemConfigData> {
  await db
    .update(cuentas)
    .set({
      ...(data.prompt_ventas !== undefined && { prompt_ventas: data.prompt_ventas }),
      ...(data.prompt_videollamadas !== undefined && { prompt_videollamadas: data.prompt_videollamadas }),
      ...(data.prompt_llamadas !== undefined && { prompt_llamadas: data.prompt_llamadas }),
      ...(data.reglas_etiquetas !== undefined && { reglas_etiquetas: data.reglas_etiquetas }),
      ...(data.metricas_personalizadas !== undefined && { metricas_personalizadas: data.metricas_personalizadas }),
    })
    .where(eq(cuentas.id_cuenta, idCuenta));

  return getSystemConfig(idCuenta);
}
