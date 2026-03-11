import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id_cuenta: number | null;
    rol: string;
    subdominio: string | null;
    permisos: Record<string, boolean> | null;
    permisosArray: string[];
    platformAdmin?: boolean;
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
  }
}
