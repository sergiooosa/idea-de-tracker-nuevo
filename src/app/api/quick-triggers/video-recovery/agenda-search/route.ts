import { NextResponse } from "next/server";
import { withAuthFull } from "@/lib/api-auth";
import { getCuentaInternalApiKey } from "@/lib/queries/video-recovery";
import { forwardVideoRecoveryRequest } from "../shared";

interface AgendaSearchBody {
  q?: string;
  fecha_from?: string;
  fecha_to?: string;
  categoria?: string;
  limit?: number;
}

export async function POST(req: Request) {
  return withAuthFull(req, async (ctx) => {
    const body = (await req.json().catch(() => null)) as AgendaSearchBody | null;
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Body invalido" },
        { status: 400 },
      );
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

    const forwarded = await forwardVideoRecoveryRequest("agenda-search", internalApiKey, body);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}
