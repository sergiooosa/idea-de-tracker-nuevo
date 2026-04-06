/**
 * URL base de la API pública (webhooks, integraciones).
 * Usado para construir URLs en documentación y enlaces.
 *
 * IMPORTANTE: Esta variable debe apuntar al dominio público (autokpi.net),
 * NUNCA a la URL interna del Cerebro (Cloud Run). El proxy /webhooks/proxy/*
 * se encarga de forwarding interno para ocultar el backend.
 *
 * Configura NEXT_PUBLIC_APP_URL en Coolify para sobreescribir.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  "https://autokpi.net";

/**
 * URL del proxy de webhooks — siempre usa el dominio público.
 * Los clientes deben usar esta URL en sus integraciones.
 */
export const WEBHOOK_PROXY_URL = `${API_BASE_URL}/webhooks/proxy`;
