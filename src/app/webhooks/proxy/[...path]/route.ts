/**
 * Proxy transparente hacia el Cerebro.
 * Mantiene oculta la URL real de Cloud Run.
 *
 * Rutas cubiertas (via next.config rewrite o directamente):
 *   /webhooks/metricas/:subdominio   → Cerebro /webhooks/metricas/:subdominio
 *   /webhooks/external-data/:sub     → Cerebro /webhooks/external-data/:sub
 *   /webhooks/config/:locationId     → Ya existe nativo en /webhooks/config/[locationId]
 *
 * Usage: acceso via POST autokpi.net/webhooks/proxy/metricas/:sub
 * (La documentación apunta al proxy, nunca al Cerebro directamente)
 */

import { NextResponse } from "next/server";

const CEREBRO_BASE = process.env.CEREBRO_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// metricas y external-data viven en la propia app Next.js — NO en el Cerebro
// Se manejan vía rewrite interno, no via este proxy
const ALLOWED_PREFIXES = ["twilio", "ghl", "fathom", "chat", "retry-orphan"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const prefix = path[0] ?? "";

  // metricas y external-data viven en la app Next.js — reenviar internamente
  if (prefix === "metricas" || prefix === "external-data") {
    const internalPath = `/${path.join("/")}`;
    const appBase = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://autokpi.net";
    const target = `${appBase}/webhooks${internalPath}`;
    try {
      const body = await req.text();
      const headers: Record<string, string> = {
        "content-type": req.headers.get("content-type") ?? "application/json",
      };
      const apiKey = req.headers.get("x-api-key");
      if (apiKey) headers["x-api-key"] = apiKey;
      const response = await fetch(target, { method: "POST", headers, body });
      const responseBody = await response.text();
      return new NextResponse(responseBody, {
        status: response.status,
        headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
      });
    } catch (err) {
      console.error("[WebhookProxy] Error forwarding to internal route:", err);
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }
  }

  if (!ALLOWED_PREFIXES.includes(prefix)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!CEREBRO_BASE) {
    console.error("[WebhookProxy] CEREBRO_INTERNAL_URL no configurado");

    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const target = `${CEREBRO_BASE}/webhooks/${path.join("/")}`;

  try {
    const body = await req.text();
    const headers: Record<string, string> = {
      "content-type": req.headers.get("content-type") ?? "application/json",
    };
    // Pasar x-api-key si viene
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) headers["x-api-key"] = apiKey;

    const response = await fetch(target, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    console.error("[WebhookProxy] Error forwarding to Cerebro:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const prefix = path[0] ?? "";

  if (!ALLOWED_PREFIXES.includes(prefix)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!CEREBRO_BASE) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const target = `${CEREBRO_BASE}/webhooks/${path.join("/")}`;
  const qs = new URL(req.url).search;

  try {
    const headers: Record<string, string> = {};
    const apiKey = req.headers.get("x-api-key");
    if (apiKey) headers["x-api-key"] = apiKey;

    const response = await fetch(`${target}${qs}`, { method: "GET", headers });
    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch (err) {
    console.error("[WebhookProxy] Error forwarding to Cerebro:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }
}
