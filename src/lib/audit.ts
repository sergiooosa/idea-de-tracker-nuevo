/**
 * audit.ts — Registro inmutable de todas las acciones de usuario en el tracker.
 *
 * Acciones registradas:
 *   LOGIN                 — inicio de sesión
 *   EDIT_VIDEOLLAMADA     — edición de campos de una videollamada (categoría, facturación, cash, closer)
 *   EDIT_LLAMADA          — edición de un registro de llamada
 *   EDIT_CHAT             — edición de asesor/estado en chats
 *   DELETE_LLAMADA        — eliminación de registro de llamada
 *   CREATE_VIDEOLLAMADA   — creación manual de videollamada
 *   CREATE_LLAMADA        — creación manual de llamada
 *   EDIT_SISTEMA          — cambio de configuración del sistema
 *   EDIT_META             — cambio de metas
 *   EDIT_ROL_USUARIO      — cambio de permisos/rol de usuario
 *   CREATE_USER           — creación de usuario
 *   DELETE_USER           — eliminación de usuario
 *   CREATE_API_KEY        — creación de API key
 *   DELETE_API_KEY        — eliminación de API key
 *   MERGE_ASESORES        — fusión de asesores duplicados
 *   ANALIZAR_CHATS        — análisis IA de chats
 */

import { db } from "@/lib/db";
import { historialAcciones } from "@/lib/db/schema";

export type AuditAccion =
  | "LOGIN"
  | "EDIT_VIDEOLLAMADA"
  | "EDIT_LLAMADA"
  | "EDIT_CHAT"
  | "DELETE_LLAMADA"
  | "CREATE_VIDEOLLAMADA"
  | "CREATE_LLAMADA"
  | "EDIT_SISTEMA"
  | "EDIT_META"
  | "EDIT_ROL_USUARIO"
  | "UPDATE_USER"
  | "CREATE_USER"
  | "DELETE_USER"
  | "CREATE_API_KEY"
  | "DELETE_API_KEY"
  | "MERGE_ASESORES"
  | "ANALIZAR_CHATS";

export async function logAudit(
  idCuenta: number,
  usuario: string | null | undefined,
  accion: AuditAccion,
  detalles: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(historialAcciones).values({
      id_cuenta: idCuenta,
      usuario_asociado: usuario ?? "sistema",
      accion,
      detalles,
    });
  } catch (err) {
    // Nunca bloquear el flujo principal por un fallo de audit
    console.error("[audit] Error insertando en historial_acciones:", err);
  }
}
