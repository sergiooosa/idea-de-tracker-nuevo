import NextAuth from "next-auth";

const isProduction = process.env.NODE_ENV === "production";
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

export const { auth } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: isProduction
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
        domain: isProduction ? `.${rootDomain}` : undefined,
      },
    },
  },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).id_cuenta = token.id_cuenta;
        (session.user as any).rol = token.rol;
        (session.user as any).subdominio = token.subdominio;
        (session.user as any).permisos = token.permisos;
      }
      return session;
    },
  },
});
