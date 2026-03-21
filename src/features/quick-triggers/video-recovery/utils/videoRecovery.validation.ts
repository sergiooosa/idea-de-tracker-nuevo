import type {
  ExecuteSelectedRecording,
  VideoRecoveryExecuteRequest,
  VideoRecoveryPreviewRequest,
} from "../types/videoRecovery.types";

const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isValidIsoDateTime(value: string): boolean {
  if (!value || !ISO_DATE_TIME_REGEX.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function ensureArrayOfStrings(values: string[] | undefined, field: string): string | null {
  if (!values) return null;
  const isValid = values.every((value) => typeof value === "string" && value.trim().length > 0);
  if (!isValid) return `${field} debe contener strings no vacios`;
  return null;
}

export function validatePreviewRequest(payload: VideoRecoveryPreviewRequest): string | null {
  if (!payload.id_evento?.trim()) return "id_evento es obligatorio";
  if (!isValidIsoDateTime(payload.from)) return "from debe ser datetime ISO valido";
  if (!isValidIsoDateTime(payload.to)) return "to debe ser datetime ISO valido";
  if (new Date(payload.from).getTime() > new Date(payload.to).getTime()) {
    return "from no puede ser mayor que to";
  }
  if (!payload.timezone?.trim()) return "timezone es obligatorio";
  if (payload.limit !== undefined && (payload.limit < 1 || payload.limit > 200)) {
    return "limit debe estar entre 1 y 200";
  }

  const listErrors = [
    ensureArrayOfStrings(payload.teams, "teams"),
    ensureArrayOfStrings(payload.recorded_by, "recorded_by"),
    ensureArrayOfStrings(payload.calendar_invitees_domains, "calendar_invitees_domains"),
  ].filter(Boolean);

  return listErrors.length > 0 ? listErrors[0] ?? "Payload invalido" : null;
}

export function validateExecuteSelection(selected: ExecuteSelectedRecording[]): string | null {
  if (!Array.isArray(selected) || selected.length === 0) {
    return "selected_recordings no puede estar vacio";
  }
  return null;
}

export function validateChunkSize(selected: ExecuteSelectedRecording[]): string | null {
  if (selected.length > 20) return "El tamano del lote no puede exceder 20 items";
  return null;
}

export function validateExecuteRequest(payload: VideoRecoveryExecuteRequest): string | null {
  if (!payload.id_evento?.trim()) return "id_evento es obligatorio";
  if (!payload.request_id?.trim()) return "request_id es obligatorio";
  return validateExecuteSelection(payload.selected_recordings);
}

