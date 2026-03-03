"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  TrendingUp,
  Settings,
  Menu,
  X,
  Sparkles,
  UserCog,
  Target,
  LogOut,
  BookOpen,
} from "lucide-react";
import clsx from "clsx";
import InsightsChat from "@/components/dashboard/InsightsChat";
import ReportButton from "@/components/dashboard/ReportButton";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

const nav = [
  { path: "/dashboard", label: "Panel ejecutivo", icon: LayoutDashboard },
  { path: "/performance", label: "Rendimiento", icon: BarChart3 },
  { path: "/asesor", label: "Panel asesor", icon: UserCheck },
  { path: "/acquisition", label: "Resumen adquisición", icon: TrendingUp },
  { path: "/system", label: "Control del sistema", icon: Target },
  { path: "/documentacion", label: "Documentación", icon: BookOpen },
  { path: "/configuracion", label: "Configuración", icon: UserCog },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname.endsWith("/dashboard");
    return pathname.includes(path);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const loginUrl = isLocal
      ? `${protocol}//localhost${port}/login`
      : `${protocol}//${ROOT_DOMAIN}/login`;
    window.location.href = loginUrl;
  };

  const logoutButton = (
    <button type="button" onClick={handleLogout}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 border border-transparent transition-all w-full">
      <LogOut className="w-5 h-5 shrink-0" />
      Cerrar sesión
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)]" style={{ background: "var(--bg)", backgroundImage: "var(--bg-gradient)" }}>
      <aside className="hidden md:flex md:flex-col w-56 bg-surface-800/95 backdrop-blur-sm border-r border-surface-500 shrink-0 shadow-[2px_0_24px_-8px_rgba(0,240,255,0.12)]">
        <div className="p-4 border-b border-surface-500/80">
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-semibold text-lg text-white">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-cyan flex items-center justify-center shadow-glow-cyan">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">AutoKPI</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link key={`${path}-${label}`} href={path}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive(path)
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 shadow-glow-cyan"
                  : "text-gray-400 hover:bg-surface-600 hover:text-white border border-transparent"
              )}>
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-surface-500/80">
          {logoutButton}
        </div>
      </aside>

      <header className="md:hidden flex items-center justify-between p-3 bg-surface-800 border-b border-surface-500">
        <button type="button" onClick={() => setSidebarOpen((o) => !o)} className="p-2 rounded-lg hover:bg-surface-600">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <Link href="/dashboard" className="font-display font-semibold text-white">AutoKPI</Link>
        <div className="w-10" />
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}
      <aside className={clsx(
        "fixed top-0 left-0 z-50 h-full w-64 bg-surface-800/98 backdrop-blur-sm border-r border-surface-500 transform transition-transform md:hidden shadow-[4px_0_32px_-8px_rgba(0,0,0,0.5)] flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-surface-500/80 flex items-center justify-between">
          <span className="font-display font-semibold text-white">AutoKPI</span>
          <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-surface-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-2">
          {nav.map(({ path, label, icon: Icon }) => (
            <Link key={`${path}-${label}`} href={path} onClick={() => setSidebarOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive(path)
                  ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20"
                  : "text-gray-400 hover:bg-surface-600 hover:text-white"
              )}>
              <Icon className="w-5 h-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-surface-500/80">
          {logoutButton}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden pb-20 md:pb-24">
        <div className="flex-1 min-w-0 max-w-full">{children}</div>
      </main>

      {(pathname.endsWith("/dashboard") || pathname.includes("/asesor")) && (
        <button type="button" onClick={() => setInsightsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-600/95 backdrop-blur border border-accent-cyan/30 text-sm text-white hover:bg-accent-cyan/20 hover:border-accent-cyan/50 shadow-glow-cyan transition-all"
          title="Habla con tus datos">
          <Sparkles className="w-5 h-5 text-accent-cyan" />
          <span className="hidden sm:inline">Habla con tus datos</span>
        </button>
      )}

      {insightsOpen && <InsightsChat onClose={() => setInsightsOpen(false)} />}
      <ReportButton />
    </div>
  );
}
