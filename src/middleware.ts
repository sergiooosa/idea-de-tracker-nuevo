import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";
import { normalizeSubdominio } from "@/lib/subdomain";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProduction
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

type SessionPayload = {
  subdominio?: string | null;
  rol?: string;
  id_cuenta?: number | null;
  platformAdmin?: boolean;
  [key: string]: unknown;
};

async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  try {
    const decoded = await decode({
      token: cookieValue,
      secret: process.env.AUTH_SECRET!,
      salt: COOKIE_NAME,
    });
    return decoded as SessionPayload | null;
  } catch {
    return null;
  }
}

function getHostnameData(req: NextRequest): {
  isRoot: boolean;
  subdomain: string | null;
} {
  const hostname = req.headers.get("host") || "";
  const hostnameWithoutPort = hostname.split(":")[0].toLowerCase();

  if (
    hostnameWithoutPort === "localhost" ||
    hostnameWithoutPort === "127.0.0.1"
  ) {
    return { isRoot: true, subdomain: null };
  }

  if (hostnameWithoutPort.endsWith(".localhost")) {
    const sub = hostnameWithoutPort.replace(".localhost", "");
    if (!sub || sub === "www") return { isRoot: true, subdomain: null };
    return { isRoot: false, subdomain: sub };
  }

  if (
    hostnameWithoutPort === ROOT_DOMAIN ||
    hostnameWithoutPort === `www.${ROOT_DOMAIN}`
  ) {
    return { isRoot: true, subdomain: null };
  }

  if (hostnameWithoutPort.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostnameWithoutPort.replace(`.${ROOT_DOMAIN}`, "");
    if (!sub || sub === "www") return { isRoot: true, subdomain: null };
    return { isRoot: false, subdomain: sub };
  }

  return { isRoot: true, subdomain: null };
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { isRoot, subdomain } = getHostnameData(req);

  // ── Dominio raíz (autokpi.net) ──────────────────────────────────────────
  if (isRoot) {
    if (pathname.startsWith("/api/auth")) return NextResponse.next();

    // /demo → público en dominio raíz también
    if (pathname === "/demo" || pathname.startsWith("/demo/")) {
      return NextResponse.next();
    }

    const session = await getSession(req);

    if (pathname === "/login") {
      if (session?.platformAdmin) {
        return NextResponse.redirect(new URL("/super", req.url));
      }
      if (session?.subdominio) {
        const slug = normalizeSubdominio(session.subdominio);
        if (slug) {
          const protocol = req.nextUrl.protocol;
          const port = req.nextUrl.port ? `:${req.nextUrl.port}` : "";
          const isLocalDev = (req.headers.get("host") ?? "").includes(
            "localhost"
          );
          const targetHost = isLocalDev
            ? `${slug}.localhost${port}`
            : `${slug}.${ROOT_DOMAIN}`;
          return NextResponse.redirect(
            new URL(`${protocol}//${targetHost}/dashboard`)
          );
        }
      }
    }

    if (pathname.startsWith("/super")) {
      if (!session) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
      if (!session.platformAdmin) {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  }

  // ── Subdominio tenant (ej. testv1.autokpi.net) ──────────────────────────
  // Todas las rutas /api/* pasan directo sin reescribir
  if (pathname.startsWith("/api")) return NextResponse.next();

  // Ruta /demo → pública, sin auth
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return NextResponse.next();
  }

  const session = await getSession(req);

  // Sin sesión → redirigir al login central
  if (!session) {
    const protocol = req.nextUrl.protocol;
    const port = req.nextUrl.port ? `:${req.nextUrl.port}` : "";
    const isLocalDev = (req.headers.get("host") ?? "").includes("localhost");
    const loginHost = isLocalDev ? `localhost${port}` : ROOT_DOMAIN;
    return NextResponse.redirect(
      new URL(`${protocol}//${loginHost}/login`)
    );
  }

  const sessionSubdomainSlug = normalizeSubdominio(session.subdominio);
  if (sessionSubdomainSlug !== subdomain) {
    return new NextResponse("Acceso no autorizado a este tenant.", {
      status: 403,
    });
  }

  // Raíz del subdominio → /dashboard
  if (pathname === "/" || pathname === "") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // /demo no se reescribe — la ruta vive en /app/demo directamente
  // (ya fue permitida sin auth arriba, pero si llega aquí por otra razón, la dejamos pasar)
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return NextResponse.next();
  }

  // Rewrite interno: testv1.autokpi.net/dashboard → /app/testv1/dashboard
  const url = req.nextUrl.clone();
  url.pathname = `/app/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
