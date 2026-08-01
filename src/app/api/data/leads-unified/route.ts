import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getUnifiedLeads } from "@/lib/queries/leads-unified";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_rendimiento", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || undefined;
    const requestedEmails = closerEmailsParam
      ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean)
      : undefined;
    const closerEmails = enforceCloserFilter(
      requestedEmails,
      email,
      session?.user?.permisosArray ?? [],
      session?.user?.rol ?? "",
    );
    const data = await getUnifiedLeads(
      idCuenta,
      from,
      to,
      closerEmails?.length ? closerEmails : undefined,
    );
    return NextResponse.json(data);
  });
}
