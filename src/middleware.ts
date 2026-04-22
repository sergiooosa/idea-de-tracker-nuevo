import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decode } from "@auth/core/jwt";
import { normalizeSubdominio } from "@/lib/subdomain";

// Dominios GHL estándar permitidos para embedding como iframe
const GHL_FRAME_ORIGINS = [
  "https://*.myghl.com",
  "https://*.gohighlevel.com",
  "https://*.leadconnectorhq.com",
  "https://*.msgsndr.com",
].join(" ");

// Dominios embed personalizados por subdominio (para clientes WL y CRMs externos).
// Formato env: EMBED_DOMAINS={"tracker-ikigai":"https://app.ikigai.com.ec","patrimonio-para-tu-familia":"https://crmpatrimonioparatufamilia.netlify.app"}
let embedDomainsMap: Record<string, string> = {};
try {
  embedDomainsMap = JSON.parse(process.env.EMBED_DOMAINS ?? "{}");
} catch {
  // Env var malformada — continuar sin dominios custom
}

function buildFrameAncestorsCsp(subdomain: string): string {
  const extra = embedDomainsMap[subdomain];
  const origins = extra ? `${GHL_FRAME_ORIGINS} ${extra}` : GHL_FRAME_ORIGINS;
  return `frame-ancestors 'self' ${origins}`;
}

function setCspHeaders(response: NextResponse, subdomain: string | null): NextResponse {
  response.headers.set("Content-Security-Policy", buildFrameAncestorsCsp(subdomain ?? ""));
  return response;
}

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
    if (pathname.startsWith("/api/auth")) return setCspHeaders(NextResponse.next(), subdomain);

    // /demo → público en dominio raíz también
    if (pathname === "/demo" || pathname.startsWith("/demo/")) {
      return setCspHeaders(NextResponse.next(), subdomain);
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

    return setCspHeaders(NextResponse.next(), subdomain);
  }

  // ── Subdominio tenant (ej. testv1.autokpi.net) ──────────────────────────
  // Todas las rutas /api/* pasan directo sin reescribir
  if (pathname.startsWith("/api")) return setCspHeaders(NextResponse.next(), subdomain);

  // Ruta /demo → pública, sin auth
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    return setCspHeaders(NextResponse.next(), subdomain);
  }

  const session = await getSession(req);

  // Construir URL de login
  const buildLoginUrl = () => {
    const protocol = req.nextUrl.protocol;
    const port = req.nextUrl.port ? `:${req.nextUrl.port}` : "";
    const isLocalDev = (req.headers.get("host") ?? "").includes("localhost");
    const loginHost = isLocalDev ? `localhost${port}` : ROOT_DOMAIN;
    return `${protocol}//${loginHost}/login`;
  };

  // Sin sesión o sesión de otro tenant → redirigir al login
  const sessionSubdomain = session ? normalizeSubdominio(session.subdominio) : null;
  const needsLogin = !session || sessionSubdomain !== subdomain;
  const staleSession = !!session && sessionSubdomain !== subdomain; // cookie de otro tenant

  if (needsLogin) {
    if (pathname !== "/login") {
      // Redirigir siempre al login del dominio raíz (no al login del subdominio).
      // El login de subdominio causaba bucles con usuarios multi-cuenta: la cookie
      // se establecía para .autokpi.net pero el flujo de switch-account fallaba
      // en ciertos contextos de subdominio. El parámetro `from` permite al login
      // pre-seleccionar automáticamente la cuenta correcta.
      const loginUrlStr = buildLoginUrl();
      const loginUrl = new URL(loginUrlStr);
      if (subdomain) loginUrl.searchParams.set("from", subdomain);
      const response = NextResponse.redirect(loginUrl);

      // Cookie de otro tenant → limpiarla antes de ir al login
      // Evita que el login post-redirect se confunda y redirija al subdominio equivocado
      if (staleSession) {
        response.cookies.delete({
          name: COOKIE_NAME,
          domain: isProduction ? `.${ROOT_DOMAIN}` : undefined,
          path: "/",
        });
      }

      return response;
    }


    // Ya estamos en /login del dominio raíz (o acceso directo a subdomain/login)
    // → servir normalmente
    return setCspHeaders(NextResponse.next(), subdomain);
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
    return setCspHeaders(NextResponse.next(), subdomain);
  }

  // Rewrite interno: testv1.autokpi.net/dashboard → /app/testv1/dashboard
  const url = req.nextUrl.clone();
  url.pathname = `/app/${subdomain}${pathname}`;
  return setCspHeaders(NextResponse.rewrite(url), subdomain);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
