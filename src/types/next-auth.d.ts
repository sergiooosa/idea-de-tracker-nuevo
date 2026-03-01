import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id_cuenta: number;
    rol: "superadmin" | "usuario";
    subdominio: string;
    permisos: Record<string, boolean> | null;
  }
  interface Session {
    user: {
      id: string;
      id_cuenta: number;
      email: string;
      name: string | null;
      rol: "superadmin" | "usuario";
      subdominio: string;
      permisos: Record<string, boolean> | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    id_cuenta: number;
    rol: "superadmin" | "usuario";
    subdominio: string;
    permisos: Record<string, boolean> | null;
  }
}
