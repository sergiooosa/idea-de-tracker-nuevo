// Claves canónicas de los paneles del dashboard del cliente.
// Se usan junto con `configuracion_ui.secciones_ocultas` (marcadas por tenant
// desde el super-admin) para ocultar paneles por cuenta (AUT-1566 / AUT-1567).
// Vive en lib (no en page.tsx) porque Next.js App Router prohíbe exports
// nombrados arbitrarios desde un módulo `page.tsx` — rompe `next build`.
export const DASHBOARD_PANEL_KEYS = [
  'panel_ads',
  'panel_kpis',
  'panel_ventas',
  'panel_metas',
  'panel_etiquetas',
  'panel_objeciones',
  'panel_volumen',
  'panel_ranking',
  'panel_razones_perdida',
] as const;

export type DashboardPanelKey = typeof DASHBOARD_PANEL_KEYS[number];
