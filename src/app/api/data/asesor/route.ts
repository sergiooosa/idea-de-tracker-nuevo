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
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const closerEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;

    // advisorEmail tiene prioridad sobre closerEmails (que el hook añade automáticamente)
    // Así el admin puede ver datos de cualquier asesor sin que su propio email interfiera
    const effectiveEmails = allAdvisors
      ? undefined
      : advisorEmail
        ? [advisorEmail]
        : (closerEmails?.length ? closerEmails : (email ? [email] : undefined));

    const data = await getAsesorData(idCuenta, from, to, effectiveEmails ?? undefined);
    const advisorsList = await getAsesoresList(idCuenta);
    return NextResponse.json({ ...data, advisorsList });
  });
}
