import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import type { RolConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PERMISOS_DISPONIBLES } from "@/lib/permisos";

const ALL_PERMISOS = PERMISOS_DISPONIBLES.map((p) => p.id);

const DEFAULT_ROLES_CONFIG: RolConfig[] = [
  { id: "superadmin", nombre: "Administrador General", permisos: ["ver_todo", "editar_registros", "configurar_sistema", "gestionar_usuarios", "gestionar_roles"] },
  { id: "usuario", nombre: "Usuario", permisos: ["ver_solo_propios", "ver_dashboard", "ver_rendimiento", "ver_asesor", "ver_bandeja", "ver_acquisition", "ver_documentacion"] },
];

function resolvePermisos(rol: string, rolesConfig: RolConfig[] | null): string[] {
  if (rol === "superadmin") return ALL_PERMISOS;
  const config = Array.isArray(rolesConfig) && rolesConfig.length > 0
    ? rolesConfig
    : DEFAULT_ROLES_CONFIG;
  const match = config.find((r) => r.id === rol);
  if (match) return match.permisos;
  if (rol === "usuario") return DEFAULT_ROLES_CONFIG[1]!.permisos;
  return [];
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;

        try {
          const result = await db
            .select({
              id_evento: usuariosDashboard.id_evento,
              id_cuenta: usuariosDashboard.id_cuenta,
              nombre: usuariosDashboard.nombre,
              email: usuariosDashboard.email,
              pass: usuariosDashboard.pass,
              rol: usuariosDashboard.rol,
              permisos: usuariosDashboard.permisos,
              subdominio: cuentas.subdominio,
              roles_config: cuentas.roles_config,
            })
            .from(usuariosDashboard)
            .innerJoin(
              cuentas,
              eq(usuariosDashboard.id_cuenta, cuentas.id_cuenta),
            )
            .where(eq(usuariosDashboard.email, email))
            .limit(1);

          if (result.length === 0) {
            console.error("[auth] usuario no encontrado:", email);
            return null;
          }

          const user = result[0];

          let passwordMatch = false;
          try {
            passwordMatch = await compare(password, user.pass);
          } catch (bcryptErr) {
            console.error("[auth] bcrypt compare falló:", bcryptErr);
            return null;
          }

          if (!passwordMatch) {
            console.error("[auth] password incorrecta para:", email);
            return null;
          }

          const permisosArray = resolvePermisos(user.rol, user.roles_config);

          return {
            id: String(user.id_evento),
            id_cuenta: user.id_cuenta!,
            email: user.email,
            name: user.nombre,
            rol: user.rol,
            subdominio: user.subdominio,
            permisos: user.permisos,
            permisosArray,
          };
        } catch (dbErr) {
          console.error("[auth] error de DB en authorize:", dbErr);
          return null;
        }
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.id_cuenta = (user as any).id_cuenta;
        token.rol = (user as any).rol;
        token.subdominio = (user as any).subdominio;
        token.permisos = (user as any).permisos;
        token.permisosArray = (user as any).permisosArray;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.id_cuenta = token.id_cuenta as number;
      session.user.rol = token.rol as string;
      session.user.subdominio = token.subdominio as string;
      session.user.permisos = token.permisos as Record<string, boolean> | null;
      session.user.permisosArray = (token.permisosArray as string[]) ?? [];
      return session;
    },
  },
};
