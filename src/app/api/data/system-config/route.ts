import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSystemConfig, updateSystemConfig } from "@/lib/queries/system-config";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const data = await getSystemConfig(idCuenta);
    return NextResponse.json(data);
  });
}

export async function PUT(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const body = await req.json();
    const data = await updateSystemConfig(idCuenta, body);
    return NextResponse.json(data);
  });
}
