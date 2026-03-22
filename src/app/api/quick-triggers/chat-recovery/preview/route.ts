import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getCuentaInternalApiKey } from "@/lib/queries/video-recovery";
import { forwardChatRecoveryRequest } from "../shared";

interface PreviewBody {
  limit?: number;
  channel_filter?: string;
}

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = (await req.json().catch(() => null)) as PreviewBody | null;

    const internalApiKey = await getCuentaInternalApiKey(idCuenta);
    if (!internalApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "La cuenta no tiene API key interna activa para autenticar con Cerebro",
        },
        { status: 422 },
      );
    }

    const payload: PreviewBody = {};
    if (typeof body?.limit === "number") payload.limit = body.limit;
    if (typeof body?.channel_filter === "string") payload.channel_filter = body.channel_filter;

    const forwarded = await forwardChatRecoveryRequest("preview", internalApiKey, payload);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}
