import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getLeadsSegmento } from "@/lib/queries/leads-segmento";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const segmento = searchParams.get("segmento") as "calificado" | "no_calificado" | null;
    const canal = searchParams.get("canal") as "chat" | "llamada" | "videollamada" | null;
    const agendo = searchParams.get("agendo") as "si" | "no" | "all" | null;

    if (!segmento || !["calificado", "no_calificado"].includes(segmento)) {
      return NextResponse.json({ error: "Parámetro 'segmento' requerido: calificado | no_calificado" }, { status: 400 });
    }
    if (!canal || !["chat", "llamada", "videollamada"].includes(canal)) {
      return NextResponse.json({ error: "Parámetro 'canal' requerido: chat | llamada | videollamada" }, { status: 400 });
    }

    const closerEmailsParam = searchParams.get("closerEmails") || undefined;
    const requestedEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    const closerEmails = enforceCloserFilter(
      requestedEmails, email,
      session?.user?.permisosArray ?? [],
      session?.user?.rol ?? "",
    );

    try {
      const data = await getLeadsSegmento(idCuenta, from, to, segmento, canal, agendo ?? "all", closerEmails?.length ? closerEmails : undefined);
      return NextResponse.json(data);
    } catch (err) {
      console.error("[leads-segmento] Error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: "Error al cargar leads", debug: message }, { status: 500 });
    }
  });
}
