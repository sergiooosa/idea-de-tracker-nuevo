import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

const CEREBRO_URL =
  process.env.CEREBRO_API_URL ??
  "https://cerebro-tracker-v6-saas-git-cstkjl7bpa-ue.a.run.app";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

export async function POST(req: Request) {
  return withAuth(req, async (idCuenta) => {
    if (!CRON_SECRET) {
      return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
    }

    try {
      const cerebroRes = await fetch(`${CEREBRO_URL}/cron/analizar-chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
        },
        body: JSON.stringify({ account_ids: [idCuenta] }),
      });

      if (!cerebroRes.ok) {
        const errorText = await cerebroRes.text().catch(() => "Error desconocido");
        console.error("[analizar-chats] Cerebro respondió:", cerebroRes.status, errorText);
        return NextResponse.json(
          { error: `El servidor de análisis respondió ${cerebroRes.status}: ${errorText}` },
          { status: 502 },
        );
      }

      const data = await cerebroRes.json();
      return NextResponse.json(data);
    } catch (err) {
      console.error("[analizar-chats] Error de red:", err);
      return NextResponse.json(
        { error: "No se pudo conectar con el servidor de análisis" },
        { status: 503 },
      );
    }
  });
}
