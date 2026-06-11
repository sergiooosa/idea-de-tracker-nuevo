"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import EnfoquePantalla from "@/components/enfoque/EnfoquePantalla";
import { Loader2 } from "lucide-react";

export default function EnfoquePage() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading || !session) return;
    if (session.tipoUsuario === "analista") {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (session?.tipoUsuario === "analista") {
    return null;
  }

  return <EnfoquePantalla />;
}
