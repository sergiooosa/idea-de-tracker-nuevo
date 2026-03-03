import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id_cuenta: number;
    rol: string;
    subdominio: string;
    permisos: Record<string, boolean> | null;
    permisosArray: string[];
  }
  interface Session {
    user: {
      id: string;
      id_cuenta: number;
      email: string;
      name: string | null;
      rol: string;
      subdominio: string;
      permisos: Record<string, boolean> | null;
      permisosArray: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    id_cuenta: number;
    rol: string;
    subdominio: string;
    permisos: Record<string, boolean> | null;
    permisosArray: string[];
  }
}
