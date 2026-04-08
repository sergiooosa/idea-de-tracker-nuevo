import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getLlamadas, updateLlamada, updateRegistroLlamada, deleteRegistroLlamada } from "@/lib/queries/llamadas";
import { db } from "@/lib/db";
import { logLlamadas } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const requestedEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    const closerEmails = enforceCloserFilter(requestedEmails, email, session?.user?.permisosArray ?? [], session?.user?.rol ?? "");
    const data = await getLlamadas(idCuenta, from, to, closerEmails?.length ? closerEmails : undefined);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta, email) => {
    const body = await req.json();
    const { id, id_registro, nombre_lead, closer, estado, mail_lead, phone_raw_format, id_user_ghl } = body;
    if (id_registro != null) {
      const ok = await updateRegistroLlamada(id_registro, idCuenta, {
        nombre_lead, mail_lead, phone_raw_format, estado,
        closer_mail: closer, nombre_closer: closer, id_user_ghl,
      });
      if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      void logAudit(idCuenta, email, "EDIT_LLAMADA", {
        id_registro,
        campos_editados: { nombre_lead, closer, estado, mail_lead, phone_raw_format },
      });
      return NextResponse.json({ ok: true });
    }
    if (!id) return NextResponse.json({ error: "id o id_registro requerido" }, { status: 400 });
    const ok = await updateLlamada(id, idCuenta, { nombre_lead, closer, estado });
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    void logAudit(idCuenta, email, "EDIT_LLAMADA", { id, campos_editados: { nombre_lead, closer, estado } });
    return NextResponse.json({ ok: true });
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta, email) => {
    const body = await req.json();
    const { nombre_lead, mail_lead, phone, closer_mail, nombre_closer, tipo_evento, ts } = body;
    const [row] = await db.insert(logLlamadas).values({
      id_cuenta: idCuenta,
      nombre_lead: nombre_lead ?? null,
      mail_lead: mail_lead ?? null,
      phone: phone ?? null,
      closer_mail: closer_mail ?? null,
      nombre_closer: nombre_closer ?? null,
      tipo_evento: tipo_evento ?? "efectiva_manual",
      ts: ts ? new Date(ts) : new Date(),
    }).returning({ id: logLlamadas.id });
    void logAudit(idCuenta, email, "CREATE_LLAMADA", { id: row?.id, nombre_lead, tipo_evento });
    return NextResponse.json({ ok: true, id: row?.id });
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const idReg = searchParams.get("id_registro");
    if (!idReg) return NextResponse.json({ error: "id_registro requerido" }, { status: 400 });
    const id_registro = parseInt(idReg, 10);
    if (Number.isNaN(id_registro)) return NextResponse.json({ error: "id_registro inválido" }, { status: 400 });
    const ok = await deleteRegistroLlamada(id_registro, idCuenta);
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    void logAudit(idCuenta, email, "DELETE_LLAMADA", { id_registro });
    return NextResponse.json({ ok: true });
  });
}
