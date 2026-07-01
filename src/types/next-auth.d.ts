import "next-auth";
import "next-auth/jwt";

export type TipoUsuario = "analista" | "enfoque";

declare module "next-auth" {
  interface User {
    id_cuenta: number | null;
    rol: string;
    subdominio: string | null;
    permisos: Record<string, boolean> | null;
    permisosArray: string[];
    platformAdmin?: boolean;
    tipoUsuario: TipoUsuario;
    mustChangePassword?: boolean;
  }
  interface Session {
    user: {
      id: string;
      id_cuenta: number | null;
      email: string;
      name: string | null;
      rol: string;
      subdominio: string | null;
      permisos: Record<string, boolean> | null;
      permisosArray: string[];
      platformAdmin?: boolean;
      tipoUsuario: TipoUsuario;
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    id_cuenta: number | null;
    rol: string;
    subdominio: string | null;
    permisos: Record<string, boolean> | null;
    permisosArray: string[];
    platformAdmin?: boolean;
    tipoUsuario: TipoUsuario;
    tipoUsuarioCheckedAt?: number;
    mustChangePassword?: boolean;
  }
}
