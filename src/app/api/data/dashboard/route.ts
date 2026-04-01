import { NextResponse } from "next/server";
import { withAuthAndPermission, enforceCloserFilter } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { getDashboard } from "@/lib/queries/dashboard";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta, email) => {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const requestedEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
    // Enforce server-side: asesores con ver_solo_propios solo ven sus datos
    const closerEmails = enforceCloserFilter(
      requestedEmails, email,
      session?.user?.permisosArray ?? [],
      session?.user?.rol ?? "",
    );
    const tagsParam = searchParams.get("tags") || undefined;
    const tags = tagsParam ? tagsParam.split(",").filter(Boolean) : undefined;
    try {
      const data = await getDashboard(idCuenta, from, to, closerEmails?.length ? closerEmails : undefined, tags);
      return NextResponse.json(data);
    } catch (err) {
      console.error("[dashboard] Error:", err);
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Error al cargar el panel", debug: message },
        { status: 500 },
      );
    }
  });
}
