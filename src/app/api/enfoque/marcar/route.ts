import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { marcarLead } from "@/lib/queries/enfoque";

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta, email) => {
    const body = await req.json();
    const { id_sesion, id_registro, call_sid } = body as {
      id_sesion: string;
      id_registro: number;
      call_sid?: string;
    };

    if (!id_sesion || !id_registro) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const result = await marcarLead(idCuenta, email, id_sesion, id_registro, call_sid);

    if (!result.ok) {
      const status = result.error === "sesion_no_encontrada" || result.error === "registro_no_encontrado" ? 404 : 409;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      lockId: result.lockId,
      dial_ts: result.dial_ts,
      snapshot_canonico: result.snapshot_canonico,
    });
  });
}
