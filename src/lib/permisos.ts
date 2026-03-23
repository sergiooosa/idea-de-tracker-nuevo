/**
 * Permisos granulares por sección del dashboard.
 * ver_todo = atajo que implica todos los ver_*
 * ver_solo_propios = solo ve sus datos, sin toggle
 */

export const PERMISOS_DISPONIBLES = [
  { id: "ver_dashboard", label: "Ver Panel ejecutivo" },
  { id: "ver_rendimiento", label: "Ver Rendimiento" },
  { id: "ver_asesor", label: "Ver Panel asesor" },
  { id: "ver_bandeja", label: "Ver Bandeja" },
  { id: "ver_acquisition", label: "Ver Resumen adquisición" },
  { id: "ver_system", label: "Ver Control del sistema" },
  { id: "ver_configuracion", label: "Ver Configuración" },
  { id: "ver_documentacion", label: "Ver Documentación" },
  { id: "ver_todo", label: "Ver todo (acceso completo a datos)" },
  { id: "ver_solo_propios", label: "Solo ver sus propios datos" },
  { id: "editar_registros", label: "Editar registros (llamadas, videollamadas, chats)" },
  { id: "configurar_sistema", label: "Configurar sistema (prompts, reglas, embudo)" },
  { id: "gestionar_usuarios", label: "Gestionar usuarios" },
  { id: "gestionar_roles", label: "Gestionar roles" },
  { id: "ver_comisiones", label: "Ver Comisiones" },
  { id: "ver_ads", label: "Ver Ads & Inversión" },
] as const;

export type PermisoId = (typeof PERMISOS_DISPONIBLES)[number]["id"];

/** Mapeo ruta → permiso requerido (ver_todo implica todos) */
export const NAV_PERMISOS: Record<string, PermisoId> = {
  "/dashboard": "ver_dashboard",
  "/performance": "ver_rendimiento",
  "/asesor": "ver_asesor",
  "/bandeja": "ver_bandeja",
  "/acquisition": "ver_acquisition",
  "/system": "ver_system",
  "/configuracion": "ver_configuracion",
  "/documentacion": "ver_documentacion",
  "/comisiones": "ver_comisiones",
  // "/ads": "ver_ads",  // visible para todos — solo se activa si hay ads configurados
};

/** Permisos que dan acceso al toggle "Solo data del asesor" (ver datos de todos) */
export const PERMISO_VER_TODO = "ver_todo";

/** Permisos que fuerzan solo datos propios (sin toggle) */
export const PERMISO_VER_SOLO_PROPIOS = "ver_solo_propios";

export function tienePermiso(permisosArray: string[], permiso: PermisoId): boolean {
  if (permisosArray.includes(PERMISO_VER_TODO)) return true;
  return permisosArray.includes(permiso);
}

export function puedeVerRuta(permisosArray: string[], path: string): boolean {
  const permiso = NAV_PERMISOS[path];
  if (!permiso) return true;
  return tienePermiso(permisosArray, permiso);
}

export function canViewAll(permisosArray: string[]): boolean {
  return permisosArray.includes(PERMISO_VER_TODO);
}

export function canEditRecords(permisosArray: string[]): boolean {
  return permisosArray.includes("editar_registros");
}

export function canManageSystem(permisosArray: string[]): boolean {
  return permisosArray.includes("configurar_sistema");
}

export function canManageUsers(permisosArray: string[]): boolean {
  return permisosArray.includes("gestionar_usuarios");
}

export function canManageRoles(permisosArray: string[]): boolean {
  return permisosArray.includes("gestionar_roles");
}
