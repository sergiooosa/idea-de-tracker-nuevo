import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getToken, encode } from "@auth/core/jwt";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProduction
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";
const cookieDomain = isProduction ? `.${ROOT_DOMAIN}` : undefined;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.platformAdmin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const token = await getToken({
    req,
    cookieName: COOKIE_NAME,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const newToken = {
    ...token,
    subdominio: null,
    id_cuenta: null,
  };

  const encoded = await encode({
    token: newToken,
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
  });

  const isLocalDev = req.headers.get("host")?.includes("localhost") ?? false;
  const baseUrl = isLocalDev
    ? `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`
    : `https://${ROOT_DOMAIN}`;

  const res = NextResponse.redirect(`${baseUrl}/super`);
  res.cookies.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isProduction,
    domain: cookieDomain,
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
