import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getLlamadas, updateLlamada, updateRegistroLlamada, deleteRegistroLlamada } from "@/lib/queries/llamadas";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmail = searchParams.get("closerEmail") || undefined;
    const data = await getLlamadas(idCuenta, from, to, closerEmail);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const body = await req.json();
    const { id, id_registro, nombre_lead, closer, estado, mail_lead, phone_raw_format, id_user_ghl } = body;
    if (id_registro != null) {
      const ok = await updateRegistroLlamada(id_registro, idCuenta, {
        nombre_lead,
        mail_lead,
        phone_raw_format,
        estado,
        closer_mail: closer,
        nombre_closer: closer,
        id_user_ghl,
      });
      if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    if (!id) return NextResponse.json({ error: "id o id_registro requerido" }, { status: 400 });
    const ok = await updateLlamada(id, idCuenta, { nombre_lead, closer, estado });
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const idReg = searchParams.get("id_registro");
    if (!idReg) return NextResponse.json({ error: "id_registro requerido" }, { status: 400 });
    const id_registro = parseInt(idReg, 10);
    if (Number.isNaN(id_registro)) return NextResponse.json({ error: "id_registro inválido" }, { status: 400 });
    const ok = await deleteRegistroLlamada(id_registro, idCuenta);
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
