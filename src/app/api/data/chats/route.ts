import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getChats, updateChat } from "@/lib/queries/chats";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { chatsLogs } from "@/lib/db/schema";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const requestedEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    const closerEmails = enforceCloserFilter(requestedEmails, email, session?.user?.permisosArray ?? [], session?.user?.rol ?? "");
    const data = await getChats(idCuenta, from, to, closerEmails?.length ? closerEmails : undefined);
    return NextResponse.json(data);
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const body = await req.json();
    const { nombre_lead, asesor_asignado, notas_extra, estado } = body;
    if (!nombre_lead) return NextResponse.json({ error: "nombre_lead requerido" }, { status: 400 });
    const chatid = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(chatsLogs).values({
      id_cuenta: idCuenta,
      nombre_lead,
      asesor_asignado: asesor_asignado ?? null,
      notas_extra: notas_extra ?? null,
      estado: estado ?? "activo",
      chatid,
      chat: [],
      fecha_y_hora_z: new Date(),
    });
    return NextResponse.json({ ok: true, chatid });
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta, email) => {
    const body = await req.json();
    const { id, nombre_lead, closer, estado } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const ok = await updateChat(id, idCuenta, { nombre_lead, closer, estado });
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    void logAudit(idCuenta, email, "EDIT_CHAT", {
      id,
      campos_editados: {
        ...(nombre_lead !== undefined && { nombre_lead }),
        ...(closer !== undefined && { asesor_asignado: closer }),
        ...(estado !== undefined && { estado }),
      },
    });
    return NextResponse.json({ ok: true });
  });
}
