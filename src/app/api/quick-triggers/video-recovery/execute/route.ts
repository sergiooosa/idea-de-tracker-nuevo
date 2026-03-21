import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { getVideoRecoveryCredential } from "@/lib/queries/video-recovery";
import { forwardVideoRecoveryRequest, parseIdEvento } from "../shared";

interface ExecuteBody {
  id_evento?: string;
  request_id?: string;
  selected_recordings?: unknown[];
}

export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const body = (await req.json().catch(() => null)) as ExecuteBody | null;
    if (!body?.id_evento?.trim() || !body.request_id?.trim()) {
      return NextResponse.json(
        { success: false, message: "id_evento y request_id son obligatorios" },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.selected_recordings) || body.selected_recordings.length === 0) {
      return NextResponse.json(
        { success: false, message: "selected_recordings no puede estar vacio" },
        { status: 400 },
      );
    }
    if (body.selected_recordings.length > 20) {
      return NextResponse.json(
        { success: false, message: "selected_recordings no puede exceder 20 por request" },
        { status: 400 },
      );
    }

    const idEvento = parseIdEvento(body.id_evento);
    if (!idEvento) {
      return NextResponse.json({ success: false, message: "id_evento invalido" }, { status: 400 });
    }

    const credential = await getVideoRecoveryCredential(ctx.idCuenta, idEvento);
    if (!credential) {
      return NextResponse.json({ success: false, message: "Usuario no pertenece al tenant" }, { status: 404 });
    }
    if (!credential.fathom?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: `El usuario ${credential.email} no tiene API key de Fathom configurada`,
        },
        { status: 422 },
      );
    }

    const forwarded = await forwardVideoRecoveryRequest("execute", credential.fathom.trim(), body);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}

