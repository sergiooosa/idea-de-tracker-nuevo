import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getAsesorData, getAsesoresList } from "@/lib/queries/asesor";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_asesor", async (idCuenta, email) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const allAdvisors = searchParams.get("allAdvisors") === "1";
    const advisorEmail = searchParams.get("advisorEmail") ?? null;
    const closerEmail = searchParams.get("closerEmail") || undefined;

    const effectiveAdvisor = allAdvisors
      ? undefined
      : ((closerEmail ?? advisorEmail ?? email) || undefined);

    const data = await getAsesorData(idCuenta, from, to, effectiveAdvisor || undefined);
    const advisorsList = await getAsesoresList(idCuenta);
    return NextResponse.json({ ...data, advisorsList });
  });
}
