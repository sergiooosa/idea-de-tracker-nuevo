/**
 * URL base de la API pública (webhooks, integraciones).
 * Usado para construir URLs en documentación y enlaces.
 *
 * Configura NEXT_PUBLIC_API_BASE_URL en .env.local (ej. https://autokpi.net).
 * Si no se define, usa AUTH_URL.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.AUTH_URL ??
  "https://autokpi.net";
