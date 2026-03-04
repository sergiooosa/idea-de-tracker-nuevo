import { NextResponse } from "next/server";
import { withAuthAndPermission, withAuthAndAnyPermission } from "@/lib/api-auth";
import { getSystemConfig, updateSystemConfig } from "@/lib/queries/system-config";

export async function GET(req: Request) {
  return withAuthAndAnyPermission(req, ["configurar_sistema", "ver_documentacion", "ver_rendimiento", "ver_dashboard"], async (idCuenta) => {
    const data = await getSystemConfig(idCuenta);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuthAndPermission(req, "configurar_sistema", async (idCuenta) => {
    const body = await req.json();
    const data = await updateSystemConfig(idCuenta, body);
    return NextResponse.json(data);
  });
}
