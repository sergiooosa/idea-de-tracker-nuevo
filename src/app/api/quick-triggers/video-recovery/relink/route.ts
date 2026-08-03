import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { getCuentaInternalApiKey, getVideoRecoveryCredential } from "@/lib/queries/video-recovery";
import { forwardVideoRecoveryRequest, parseIdEvento } from "../shared";

interface RelinkBody {
  id_evento?: string;
  recording_id?: number;
  id_registro_agenda?: number;
  meeting_snapshot?: unknown;
}

export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const body = (await req.json().catch(() => null)) as RelinkBody | null;
    if (
      !body?.id_evento?.trim() ||
      typeof body.recording_id !== "number" ||
      typeof body.id_registro_agenda !== "number" ||
      !body.meeting_snapshot
    ) {
      return NextResponse.json(
        { success: false, message: "id_evento, recording_id, id_registro_agenda y meeting_snapshot son obligatorios" },
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

    const internalApiKey = await getCuentaInternalApiKey(ctx.idCuenta);
    if (!internalApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "La cuenta no tiene API key interna activa para autenticar con Cerebro",
        },
        { status: 422 },
      );
    }

    const forwarded = await forwardVideoRecoveryRequest("relink", internalApiKey, body);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}
