import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getDashboard } from "@/lib/queries/dashboard";

export async function GET(req: Request) {
  return withAuth(req, async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const data = await getDashboard(idCuenta, from, to);
    return NextResponse.json(data);
  });
}
