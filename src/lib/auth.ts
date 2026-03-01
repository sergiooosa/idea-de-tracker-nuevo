import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const isProduction = process.env.NODE_ENV === "production";
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";
const cookieDomain = isProduction ? `.${rootDomain}` : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  cookies: {
    sessionToken: {
      name: isProduction
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: cookieDomain,
      },
    },
  },
});
