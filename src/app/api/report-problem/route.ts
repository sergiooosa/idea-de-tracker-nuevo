import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PAPERCLIP_WEBHOOK_URL = process.env.PAPERCLIP_REPORT_WEBHOOK_URL ?? "";
const PAPERCLIP_WEBHOOK_SECRET = process.env.PAPERCLIP_REPORT_WEBHOOK_SECRET ?? "";
const PAPERCLIP_API_BASE = process.env.PAPERCLIP_API_BASE ?? "";
const PAPERCLIP_API_TOKEN = process.env.PAPERCLIP_API_TOKEN ?? "";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per image
const MAX_IMAGES = 3;
const TICKET_LOOKUP_TIMEOUT_MS = 2500;

/**
 * Resuelve el identificador humano (AUT-NNN) de un issue a partir de su UUID.
 * Degradación elegante: ante token faltante, error o timeout devuelve null.
 * NUNCA debe romper el flujo de envío del reporte.
 */
async function resolveTicketIdentifier(linkedIssueId: string): Promise<string | null> {
  if (!PAPERCLIP_API_BASE || !PAPERCLIP_API_TOKEN) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TICKET_LOOKUP_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${PAPERCLIP_API_BASE}/api/issues/${encodeURIComponent(linkedIssueId)}`,
      {
        headers: { Authorization: `Bearer ${PAPERCLIP_API_TOKEN}` },
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      console.error(`[report-problem] Ticket lookup failed: ${res.status}`);
      return null;
    }

    const data = await res.json() as { identifier?: string };
    return typeof data.identifier === "string" && data.identifier ? data.identifier : null;
  } catch (err) {
    console.error("[report-problem] Ticket lookup error:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id_cuenta) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!PAPERCLIP_WEBHOOK_URL || !PAPERCLIP_WEBHOOK_SECRET) {
    console.error("[report-problem] Webhook env vars not configured");
    return NextResponse.json(
      { error: "Funcionalidad no disponible temporalmente" },
      { status: 503 },
    );
  }

  const idCuenta: number = session.user.id_cuenta;
  const email: string = session.user.email ?? "";
  const subdominio: string = session.user.subdominio ?? "";

  let titulo = "";
  let descripcion = "";
  const imagesBase64: string[] = [];

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    titulo = (formData.get("titulo") as string | null) ?? "";
    descripcion = (formData.get("descripcion") as string | null) ?? "";

    const imageFiles = formData.getAll("imagenes");
    for (const file of imageFiles.slice(0, MAX_IMAGES)) {
      if (!(file instanceof File)) continue;
      if (file.size > MAX_IMAGE_SIZE_BYTES) continue;
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = file.type || "image/png";
      imagesBase64.push(`data:${mimeType};base64,${base64}`);
    }
  } else {
    const body = await req.json() as { titulo?: string; descripcion?: string };
    titulo = body.titulo ?? "";
    descripcion = body.descripcion ?? "";
  }

  titulo = titulo.trim();
  descripcion = descripcion.trim();

  if (!titulo || !descripcion) {
    return NextResponse.json(
      { error: "Título y descripción son requeridos" },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = {
    titulo,
    descripcion,
    cliente_subdominio: subdominio,
    cliente_email: email,
    id_cuenta: idCuenta,
  };

  if (imagesBase64.length > 0) {
    payload.imagenes = imagesBase64;
  }

  const webhookRes = await fetch(PAPERCLIP_WEBHOOK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAPERCLIP_WEBHOOK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!webhookRes.ok) {
    const errText = await webhookRes.text().catch(() => "unknown");
    console.error(`[report-problem] Webhook failed: ${webhookRes.status} ${errText}`);
    return NextResponse.json(
      { error: "Error al enviar el reporte. Por favor intenta de nuevo." },
      { status: 500 },
    );
  }

  const result = await webhookRes.json() as { linkedIssueId?: string };
  const linkedIssueId = result.linkedIssueId;

  if (!linkedIssueId) {
    return NextResponse.json({ ok: true });
  }

  const ticket = await resolveTicketIdentifier(linkedIssueId);

  return ticket
    ? NextResponse.json({ ok: true, ticket, issueId: linkedIssueId })
    : NextResponse.json({ ok: true, issueId: linkedIssueId });
}
