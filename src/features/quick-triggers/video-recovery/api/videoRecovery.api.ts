import type {
  VideoRecoveryExecuteRequest,
  VideoRecoveryExecuteResponse,
  VideoRecoveryPreviewRequest,
  VideoRecoveryPreviewResponse,
  VideoRecoveryUserOption,
} from "../types/videoRecovery.types";

interface ApiErrorPayload {
  message?: string;
  error?: string;
}

async function requestJson<TResponse, TBody>(
  endpoint: string,
  method: "GET" | "POST",
  body?: TBody,
): Promise<TResponse> {
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & TResponse;
  if (!response.ok) {
    const message =
      payload.message?.trim() ||
      payload.error?.trim() ||
      `Error ${response.status} al llamar ${endpoint}`;
    throw new Error(message);
  }
  return payload;
}

export async function fetchVideoRecoveryUsers(): Promise<VideoRecoveryUserOption[]> {
  return requestJson<VideoRecoveryUserOption[], undefined>("/api/quick-triggers/video-recovery/users", "GET");
}

export async function previewVideoRecovery(
  payload: VideoRecoveryPreviewRequest,
): Promise<VideoRecoveryPreviewResponse> {
  return requestJson<VideoRecoveryPreviewResponse, VideoRecoveryPreviewRequest>(
    "/api/quick-triggers/video-recovery/preview",
    "POST",
    payload,
  );
}

export async function executeVideoRecovery(
  payload: VideoRecoveryExecuteRequest,
): Promise<VideoRecoveryExecuteResponse> {
  return requestJson<VideoRecoveryExecuteResponse, VideoRecoveryExecuteRequest>(
    "/api/quick-triggers/video-recovery/execute",
    "POST",
    payload,
  );
}

