import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { getCuentaInternalApiKey, getVideoRecoveryCredential } from "@/lib/queries/video-recovery";
import { forwardVideoRecoveryRequest, parseIdEvento } from "../shared";

interface PreviewBody {
  id_evento?: string;
  from?: string;
  to?: string;
  timezone?: string;
}

export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const body = (await req.json().catch(() => null)) as PreviewBody | null;
    if (!body?.id_evento?.trim() || !body.from?.trim() || !body.to?.trim() || !body.timezone?.trim()) {
      return NextResponse.json(
        { success: false, message: "id_evento, from, to y timezone son obligatorios" },
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

    const forwarded = await forwardVideoRecoveryRequest("preview", internalApiKey, body);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}

