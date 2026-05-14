import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PAPERCLIP_WEBHOOK_URL = process.env.PAPERCLIP_REPORT_WEBHOOK_URL ?? "";
const PAPERCLIP_WEBHOOK_SECRET = process.env.PAPERCLIP_REPORT_WEBHOOK_SECRET ?? "";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB per image
const MAX_IMAGES = 3;

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
  return NextResponse.json({ ok: true, issueId: result.linkedIssueId });
}
