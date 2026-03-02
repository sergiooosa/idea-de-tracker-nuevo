import { signOut } from "@/lib/auth";

export async function POST() {
  await signOut({ redirect: false });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
