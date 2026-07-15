import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { API_BASE_URL } from "@/lib/api-config";
import { db } from "@/lib/db";
import { apiKeysCuenta } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function getCuentaApiKey(idCuenta: number): Promise<string | null> {
  const [keyRow] = await db
    .select({ token: apiKeysCuenta.token })
    .from(apiKeysCuenta)
    .where(and(eq(apiKeysCuenta.id_cuenta, idCuenta), eq(apiKeysCuenta.activa, true)))
    .orderBy(desc(apiKeysCuenta.created_at), desc(apiKeysCuenta.id_key))
    .limit(1);
  return keyRow?.token?.trim() || null;
}

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const apiKey = await getCuentaApiKey(idCuenta);
    if (!apiKey) {
      return NextResponse.json({ error: "Sin API key configurada" }, { status: 400 });
    }

    const res = await fetch(`${API_BASE_URL}/api/cuentas/${idCuenta}/coach/guiones`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Api-Key": apiKey,
      },
    });

    if (res.status === 403) {
      const body = await res.json().catch(() => null);
      return NextResponse.json(
        { error: body?.error ?? "Coach no habilitado", coachDisabled: true },
        { status: 403 },
      );
    }

    if (!res.ok) {
      return NextResponse.json({ error: "Error al obtener guiones" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const apiKey = await getCuentaApiKey(idCuenta);
    if (!apiKey) {
      return NextResponse.json({ error: "Sin API key configurada" }, { status: 400 });
    }

    const body = await req.json();

    const res = await fetch(`${API_BASE_URL}/api/cuentas/${idCuenta}/coach/guiones`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error ?? "Error al guardar guion" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  });
}

export async function DELETE(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const apiKey = await getCuentaApiKey(idCuenta);
    if (!apiKey) {
      return NextResponse.json({ error: "Sin API key configurada" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const categoriaId = searchParams.get("categoriaId");
    if (!categoriaId) {
      return NextResponse.json({ error: "categoriaId requerido" }, { status: 400 });
    }

    const res = await fetch(
      `${API_BASE_URL}/api/cuentas/${idCuenta}/coach/guiones/${encodeURIComponent(categoriaId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "X-Api-Key": apiKey,
        },
      },
    );

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      return NextResponse.json(
        { error: err?.error ?? "Error al eliminar guion" },
        { status: res.status },
      );
    }

    return new NextResponse(null, { status: 204 });
  });
}
