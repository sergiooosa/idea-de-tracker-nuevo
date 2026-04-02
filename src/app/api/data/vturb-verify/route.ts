/**
 * POST /api/data/vturb-verify
 * Proxy server-side para verificar conexión con Vturb y listar players.
 * Evita problemas de CORS al hacer la llamada desde el servidor.
 */
import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";

export async function POST(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async () => {
    const body = await req.json() as { api_token: string; nombre_player?: string };
    const { api_token, nombre_player } = body;

    if (!api_token?.trim()) {
      return NextResponse.json({ error: "api_token requerido" }, { status: 400 });
    }

    try {
      const res = await fetch("https://analytics.vturb.net/players/list", {
        headers: {
          "X-Api-Version": "v1",
          "x-api-token": api_token.trim(),
        },
      });

      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          error: `Vturb respondió ${res.status}`,
          players: [],
        });
      }

      const raw = await res.json() as unknown;
      const players: Array<{ id: string; name: string }> = Array.isArray(raw)
        ? raw as Array<{ id: string; name: string }>
        : ((raw as Record<string, unknown>)?.data as Array<{ id: string; name: string }>) ?? [];

      const playerNames = players.map((p) => p.name);

      if (nombre_player) {
        const found = players.find(
          (p) => p.name.trim().toLowerCase() === nombre_player.trim().toLowerCase(),
        );
        return NextResponse.json({
          ok: true,
          found: !!found,
          player_id: found?.id ?? null,
          players: playerNames,
        });
      }

      return NextResponse.json({ ok: true, players: playerNames });
    } catch (err) {
      return NextResponse.json({
        ok: false,
        error: String(err),
        players: [],
      });
    }
  });
}
