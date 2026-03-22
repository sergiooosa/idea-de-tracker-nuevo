import { API_BASE_URL } from "@/lib/api-config";

interface ForwardResult {
  status: number;
  body: unknown;
}

function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function forwardChatRecoveryRequest(
  path: "preview" | "execute",
  internalApiKey: string,
  payload: unknown,
): Promise<ForwardResult> {
  const maxAttempts = 3;
  const endpoint = `${API_BASE_URL}/api/quick-triggers/chat-recovery/${path}`;
  let lastStatus = 502;
  let lastBody: unknown = { success: false, message: "No se pudo contactar el backend externo" };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${internalApiKey}`,
          "X-Api-Key": internalApiKey,
        },
        body: JSON.stringify(payload),
      });

      const parsedBody = (await response.json().catch(() => null)) ?? {
        success: response.ok,
        message: response.ok ? "OK" : `Error HTTP ${response.status}`,
      };

      if (!shouldRetry(response.status) || attempt === maxAttempts) {
        return { status: response.status, body: parsedBody };
      }

      lastStatus = response.status;
      lastBody = parsedBody;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      lastBody = { success: false, message };
      if (attempt === maxAttempts) {
        break;
      }
    }

    const backoffMs = 250 * 2 ** (attempt - 1);
    const jitterMs = Math.floor(Math.random() * 100);
    await sleep(backoffMs + jitterMs);
  }

  return {
    status: lastStatus,
    body: lastBody,
  };
}
