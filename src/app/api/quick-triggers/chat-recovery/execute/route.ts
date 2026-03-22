import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getCuentaInternalApiKey } from "@/lib/queries/video-recovery";
import { forwardChatRecoveryRequest } from "../shared";

interface SelectedConversation {
  conversationId: string;
  contactId: string;
  contactName: string;
}

interface ExecuteBody {
  selected_conversations?: SelectedConversation[];
}

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = (await req.json().catch(() => null)) as ExecuteBody | null;

    if (!Array.isArray(body?.selected_conversations) || body.selected_conversations.length === 0) {
      return NextResponse.json(
        { success: false, message: "selected_conversations no puede estar vacío" },
        { status: 400 },
      );
    }

    if (body.selected_conversations.length > 50) {
      return NextResponse.json(
        { success: false, message: "No puedes importar más de 50 conversaciones a la vez" },
        { status: 400 },
      );
    }

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

    const forwarded = await forwardChatRecoveryRequest("execute", internalApiKey, body);
    return NextResponse.json(forwarded.body, { status: forwarded.status });
  });
}
