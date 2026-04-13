import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { usuariosDashboard, cuentas } from "@/lib/db/schema";
import type { RolConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PERMISOS_DISPONIBLES } from "@/lib/permisos";
import { normalizeSubdominio } from "@/lib/subdomain";

const ALL_PERMISOS = PERMISOS_DISPONIBLES.map((p) => p.id);

const DEFAULT_ROLES_CONFIG: RolConfig[] = [
  { id: "superadmin", nombre: "Administrador General", permisos: ["ver_todo", "editar_registros", "configurar_sistema", "gestionar_usuarios", "gestionar_roles"] },
  { id: "usuario", nombre: "Usuario", permisos: ["ver_solo_propios", "ver_dashboard", "ver_rendimiento", "ver_asesor", "ver_bandeja", "ver_acquisition", "ver_documentacion"] },
];

function resolvePermisos(rol: string, rolesConfig: RolConfig[] | null): string[] {
  if (rol === "superadmin") return ALL_PERMISOS;
  const hasCustomConfig = Array.isArray(rolesConfig) && rolesConfig.length > 0;
  const config = hasCustomConfig ? rolesConfig : DEFAULT_ROLES_CONFIG;
  const match = config.find((r) => r.id === rol);
  if (match) return match.permisos;
  // Si hay config personalizada pero el rol del usuario no existe en ella,
  // dar acceso de lectura completo (ver_todo) sin permisos de edición ni restricción
  // a datos propios. Evita que usuarios legítimos vean 0 data por rol desconocido.
  if (hasCustomConfig) {
    return ["ver_todo", "ver_dashboard", "ver_rendimiento", "ver_asesor", "ver_bandeja", "ver_acquisition", "ver_documentacion"];
  }
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
        subdominio_override: { label: "Subdominio Override", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const password = credentials.password as string;
        const subdominioOverride = (credentials.subdominio_override as string | undefined)?.trim() || null;

        // Usuario plataforma (super admin global): credenciales desde env
        const platformEmail = process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
        const platformPassword = process.env.PLATFORM_ADMIN_PASSWORD;
        if (platformEmail && platformPassword && email === platformEmail && password === platformPassword) {
          return {
            id: "platform-admin",
            id_cuenta: null,
            email: platformEmail,
            name: "Administrador Plataforma",
            rol: "superadmin",
            subdominio: null,
            permisos: null,
            permisosArray: ALL_PERMISOS,
            platformAdmin: true,
          };
        }

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

          // Si el usuario tiene múltiples cuentas y se especificó un subdominio,
          // usarlo en vez del que retornó el .limit(1)
          const subdominioFinal = subdominioOverride
            ? normalizeSubdominio(subdominioOverride) ?? subdominioOverride
            : (normalizeSubdominio(user.subdominio) ?? user.subdominio);

          return {
            id: String(user.id_evento),
            id_cuenta: user.id_cuenta!,
            email: user.email,
            name: user.nombre,
            rol: user.rol,
            subdominio: subdominioFinal,
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
        token.id_cuenta = (user as any).id_cuenta ?? null;
        token.rol = (user as any).rol;
        token.subdominio = (user as any).subdominio ?? null;
        token.permisos = (user as any).permisos;
        token.permisosArray = (user as any).permisosArray;
        token.platformAdmin = (user as any).platformAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.id_cuenta = token.id_cuenta as number | null;
      session.user.rol = token.rol as string;
      session.user.subdominio = token.subdominio as string | null;
      session.user.permisos = token.permisos as Record<string, boolean> | null;
      session.user.permisosArray = (token.permisosArray as string[]) ?? [];
      session.user.platformAdmin = token.platformAdmin as boolean | undefined;
      return session;
    },
  },
};
