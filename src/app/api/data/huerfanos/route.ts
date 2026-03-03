import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getHuerfanos, getHuerfanoById, updateHuerfanoEstado } from "@/lib/queries/huerfanos";
import { API_BASE_URL } from "@/lib/api-config";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") || undefined;
    const data = await getHuerfanos(idCuenta, estado);
    return NextResponse.json(data);
  });
}

export async function PATCH(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = await req.json();
    const { id_huerfano, correo_corregido, accion } = body as {
      id_huerfano: number;
      correo_corregido?: string;
      accion: "corregir" | "descartar";
    };

    if (!id_huerfano) {
      return NextResponse.json({ error: "id_huerfano requerido" }, { status: 400 });
    }

    const huerfano = await getHuerfanoById(id_huerfano);
    if (!huerfano || huerfano.id_cuenta !== idCuenta) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (accion === "descartar") {
      await updateHuerfanoEstado(id_huerfano, "descartado");
      return NextResponse.json({ ok: true, estado: "descartado" });
    }

    if (!correo_corregido) {
      return NextResponse.json({ error: "correo_corregido requerido" }, { status: 400 });
    }

    try {
      const cerebroUrl = `${API_BASE_URL}/webhooks/retry-orphan/${id_huerfano}`;
      const cerebroRes = await fetch(cerebroUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo_corregido }),
      });

      if (!cerebroRes.ok) {
        const errorText = await cerebroRes.text().catch(() => "Error desconocido");
        return NextResponse.json(
          { error: `Cerebro respondió ${cerebroRes.status}: ${errorText}` },
          { status: 502 },
        );
      }
    } catch (err) {
      console.error("[huerfanos] Error llamando al Cerebro:", err);
    }

    await updateHuerfanoEstado(id_huerfano, "resuelto");
    return NextResponse.json({ ok: true, estado: "resuelto" });
  });
}
