import { NextResponse } from "next/server";
import { withAuthAndPermission } from "@/lib/api-auth";
import { getDashboard } from "@/lib/queries/dashboard";

export async function GET(req: Request) {
  return withAuthAndPermission(req, "ver_dashboard", async (idCuenta) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10);
    const closerEmailsParam = searchParams.get("closerEmails") || searchParams.get("closerEmail") || undefined;
    const closerEmails = closerEmailsParam ? closerEmailsParam.split(",").map((e) => e.trim()).filter(Boolean) : undefined;
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
