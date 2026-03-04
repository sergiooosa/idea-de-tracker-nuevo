import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getDashboard } from "@/lib/queries/dashboard";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmail = searchParams.get("closerEmail") || undefined;
    const data = await getDashboard(idCuenta, from, to, closerEmail);
    return NextResponse.json(data);
  });
}
