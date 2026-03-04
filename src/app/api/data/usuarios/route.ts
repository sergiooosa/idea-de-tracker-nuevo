import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { listUsuarios, createUsuario, updateUsuario, deleteUsuario } from "@/lib/queries/usuarios";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "gestionar_usuarios", async (idCuenta) => {
    const data = await listUsuarios(idCuenta);
    return NextResponse.json(data);
  });
}

export async function POST(req: Request) {
  return withAuthAndPermission(req, "gestionar_usuarios", async (idCuenta) => {
    const body = await req.json();
    if (!body.email || !body.password) {
      return NextResponse.json({ error: "Email y password son obligatorios" }, { status: 400 });
    }
    try {
      const user = await createUsuario(idCuenta, body);
      return NextResponse.json(user, { status: 201 });
    } catch (e: any) {
      if (e?.code === "23505") {
        return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
      }
      throw e;
    }
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "gestionar_usuarios", async (idCuenta) => {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Se requiere id del usuario" }, { status: 400 });
    }
    await updateUsuario(idCuenta, body.id, body);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return withAuthAndPermission(req, "gestionar_usuarios", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Se requiere ?id=" }, { status: 400 });
    }
    await deleteUsuario(idCuenta, Number(id));
    return NextResponse.json({ ok: true });
  });
}
