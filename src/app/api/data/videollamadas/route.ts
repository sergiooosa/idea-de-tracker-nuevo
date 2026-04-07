import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getVideollamadas, updateVideollamada } from "@/lib/queries/videollamadas";
import { db } from "@/lib/db";
import { resumenesDiariosAgendas } from "@/lib/db/schema";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const requestedEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    const closerEmails = enforceCloserFilter(requestedEmails, email, session?.user?.permisosArray ?? [], session?.user?.rol ?? "");
    const data = await getVideollamadas(idCuenta, from, to, closerEmails?.length ? closerEmails : undefined);
    return NextResponse.json(data);
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const body = await req.json();
    const { nombre_lead, email_lead, closer, categoria, fecha_reunion, notas, facturacion, cash_collected } = body;
    if (!nombre_lead) return NextResponse.json({ error: "nombre_lead requerido" }, { status: 400 });
    const today = new Date().toISOString().slice(0, 10);
    const [row] = await db.insert(resumenesDiariosAgendas).values({
      id_cuenta: idCuenta,
      nombre_de_lead: nombre_lead,
      email_lead: email_lead ?? null,
      closer: closer ?? null,
      categoria: categoria ?? null,
      fecha: today,
      fecha_reunion: fecha_reunion ? new Date(fecha_reunion) : null,
      facturacion: facturacion ? String(facturacion) : null,
      cash_collected: cash_collected ? String(cash_collected) : null,
      origen: "manual",
    }).returning({ id: resumenesDiariosAgendas.id_registro_agenda });
    return NextResponse.json({ ok: true, id: row?.id });
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "editar_registros", async (idCuenta) => {
    const body = await req.json();
    const { id, nombre_lead, closer, estado, facturacion, cash_collected } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
    const ok = await updateVideollamada(id, idCuenta, { nombre_lead, closer, estado, facturacion, cash_collected });
    if (!ok) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
