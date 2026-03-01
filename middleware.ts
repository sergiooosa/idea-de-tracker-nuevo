import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth.edge";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

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

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const { isRoot, subdomain } = getHostnameData(req);

  if (isRoot) {
    if (pathname.startsWith("/api/auth")) return NextResponse.next();

    if (pathname === "/login" && req.auth) {
      const userSubdomain = (req.auth.user as any)?.subdominio;
      if (userSubdomain) {
        const protocol = req.nextUrl.protocol;
        const port = req.nextUrl.port ? `:${req.nextUrl.port}` : "";
        const isLocalDev = (req.headers.get("host") ?? "").includes(
          "localhost"
        );
        const targetHost = isLocalDev
          ? `${userSubdomain}.localhost${port}`
          : `${userSubdomain}.${ROOT_DOMAIN}`;
        return NextResponse.redirect(
          new URL(`${protocol}//${targetHost}/dashboard`)
        );
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) return NextResponse.next();

  if (!req.auth) {
    const protocol = req.nextUrl.protocol;
    const port = req.nextUrl.port ? `:${req.nextUrl.port}` : "";
    const isLocalDev = (req.headers.get("host") ?? "").includes("localhost");
    const loginHost = isLocalDev ? `localhost${port}` : ROOT_DOMAIN;
    return NextResponse.redirect(
      new URL(`${protocol}//${loginHost}/login`)
    );
  }

  const userSubdomain = (req.auth.user as any)?.subdominio;
  if (userSubdomain !== subdomain) {
    return new NextResponse("Acceso no autorizado a este tenant.", {
      status: 403,
    });
  }

  if (pathname === "/" || pathname === "") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/app/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
