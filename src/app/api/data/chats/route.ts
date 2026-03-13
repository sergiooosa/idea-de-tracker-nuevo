import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getChats, updateChat } from "@/lib/queries/chats";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const closerEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    const data = await getChats(idCuenta, from, to, closerEmails?.length ? closerEmails : undefined);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const body = await req.json();
    const { id, nombre_lead, closer, estado } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const ok = await updateChat(id, idCuenta, { nombre_lead, closer, estado });
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
