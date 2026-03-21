export type SuggestedAction = "recover_existing" | "create_if_missing" | "skip";

export type ExecuteStatus = "processed" | "skipped" | "error";

export type DomainsType = "all" | "only_internal" | "one_or_more_external";

export interface RecordedBySnapshot {
  email: string;
  name: string;
  email_domain?: string | null;
  team?: string | null;
}

export interface CalendarInviteeSnapshot {
  email: string;
  is_external: boolean;
  name?: string | null;
  matched_speaker_display_name?: string | null;
  email_domain?: string | null;
}

export interface MeetingSnapshot {
  recording_id: number;
  title?: string | null;
  meeting_title?: string | null;
  url?: string | null;
  share_url?: string | null;
  created_at?: string | null;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  recording_start_time?: string | null;
  recording_end_time?: string | null;
  transcript_language?: string | null;
  recorded_by?: RecordedBySnapshot | null;
  calendar_invitees?: CalendarInviteeSnapshot[];
}

export interface VideoRecoveryPreviewItem {
  recording_id: number;
  meeting_title: string | null;
  share_url: string | null;
  scheduled_start_time: string | null;
  lead_email_detected: string | null;
  estado_bd_actual: string;
  accion_sugerida: SuggestedAction;
  motivo: string;
  id_registro_agenda: number | null;
  meeting_snapshot: MeetingSnapshot;
}

export interface VideoRecoveryPreviewRequest {
  id_evento: string;
  from: string;
  to: string;
  timezone: string;
  teams?: string[];
  recorded_by?: string[];
  calendar_invitees_domains?: string[];
  calendar_invitees_domains_type?: DomainsType;
  limit?: number;
}

export interface VideoRecoveryPreviewResponse {
  success: boolean;
  message: string;
  data?: {
    items: VideoRecoveryPreviewItem[];
  };
}

export interface ExecuteSelectedRecording {
  recording_id: number;
  id_registro_agenda?: number;
  action: SuggestedAction;
  meeting_snapshot: MeetingSnapshot;
}

export interface VideoRecoveryExecuteRequest {
  id_evento: string;
  request_id: string;
  selected_recordings: ExecuteSelectedRecording[];
}

export interface VideoRecoveryExecuteItemResult {
  recording_id: number;
  action: SuggestedAction;
  status: ExecuteStatus;
  estado_anterior: string | null;
  estado_final: string | null;
  motivo: string;
}

export interface VideoRecoveryExecuteResponse {
  success: boolean;
  message: string;
  data?: {
    processed: number;
    skipped: number;
    errors: number;
    items: VideoRecoveryExecuteItemResult[];
  };
}

export interface VideoRecoveryExecuteAggregate {
  processed: number;
  skipped: number;
  errors: number;
  items: VideoRecoveryExecuteItemResult[];
}

export interface VideoRecoveryUserOption {
  id_evento: string;
  label: string;
  email: string;
}

export type VideoRecoveryUiState =
  | "idle"
  | "loadingPreview"
  | "previewLoaded"
  | "executing"
  | "executionDone"
  | "errorGlobal";
