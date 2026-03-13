import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getHuerfanos, getHuerfanoById, updateHuerfanoEstado } from "@/lib/queries/huerfanos";
import { API_BASE_URL } from "@/lib/api-config";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_bandeja", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") || undefined;
    const data = await getHuerfanos(idCuenta, estado);
    return NextResponse.json(data);
  });
}

export async function PATCH(req: Request) {
  return withAuthAndPermission(req, "ver_bandeja", async (idCuenta) => {
    const body = await req.json();
    const { id_huerfano, correo_corregido, accion, nombrecloser, correocloser } = body as {
      id_huerfano: number;
      correo_corregido?: string;
      accion: "corregir" | "descartar";
      nombrecloser?: string;
      correocloser?: string;
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

    const isReasignacion = String(huerfano.origen).toLowerCase() === "reasignacion";
    if (isReasignacion) {
      if (!nombrecloser?.trim() || !correocloser?.trim() || !correocloser.includes("@")) {
        return NextResponse.json(
          { error: "Reasignación requiere nombrecloser y correocloser válido" },
          { status: 400 },
        );
      }
    } else if (!correo_corregido?.trim() || !correo_corregido.includes("@")) {
      return NextResponse.json({ error: "correo_corregido requerido" }, { status: 400 });
    }

    try {
      const cerebroUrl = `${API_BASE_URL}/webhooks/retry-orphan/${id_huerfano}`;
      const cerebroBody: Record<string, unknown> = isReasignacion
        ? { nombrecloser: nombrecloser!.trim(), correocloser: correocloser!.trim() }
        : { correo: correo_corregido!.trim() };
      const cerebroRes = await fetch(cerebroUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cerebroBody),
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
