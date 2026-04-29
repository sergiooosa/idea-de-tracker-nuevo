"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LocaleProvider, useT } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n";
import {
  LayoutDashboard,
  BarChart3,
  UserCheck,
  TrendingUp,
  Menu,
  X,
  Sparkles,
  UserCog,
  Target,
  LogOut,
  BookOpen,
  Inbox,
  Eye,
  EyeOff,
  ChevronDown,
  BadgeDollarSign,
  BarChart2,
  Building2,
  Check,
} from "lucide-react";
import clsx from "clsx";
import InsightsChat from "@/components/dashboard/InsightsChat";
import ReportButton from "@/components/dashboard/ReportButton";
import { UserFilterProvider, useUserFilter } from "@/contexts/UserFilterContext";
import { LayoutGrid } from "lucide-react";
import { puedeVerRuta, NAV_PERMISOS } from "@/lib/permisos";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "autokpi.net";

interface AccountItem { id_cuenta: number; nombre_cuenta: string; subdominio: string }

function AccountSwitcher({ currentSubdominio }: { currentSubdominio: string }) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/data/mis-cuentas")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.accounts?.length > 1) setAccounts(d.accounts); })
      .catch(() => {});
  }, []);

  if (accounts.length <= 1) return null;

  const current = accounts.find((a) => a.subdominio === currentSubdominio);

  const switchTo = async (acc: AccountItem) => {
    if (acc.subdominio === currentSubdominio) { setOpen(false); return; }
    setSwitching(acc.subdominio);
    setOpen(false);
    const isLocal = window.location.hostname === "localhost";
    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const target = isLocal
      ? `${protocol}//${acc.subdominio}.localhost${port}/dashboard`
      : `${protocol}//${acc.subdominio}.${ROOT_DOMAIN}/dashboard`;
    // Validar que el subdominio es legítimo para el usuario actual
    const res = await fetch("/api/auth/switch-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subdominio: acc.subdominio }),
    });
    if (!res.ok) { setSwitching(null); return; }
    // El middleware detectará que el JWT tiene otro subdominio y redirigirá al login.
    // Guardamos el subdominio destino en sessionStorage para pre-seleccionarlo en login.
    sessionStorage.setItem("autokpi_switch_subdominio", acc.subdominio);
    window.location.href = target;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-300 hover:bg-surface-700 border border-surface-500/60 transition-all"
      >
        <Building2 className="w-4 h-4 shrink-0 text-accent-cyan" />
        <span className="flex-1 text-left truncate text-xs">{current?.nombre_cuenta ?? currentSubdominio}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl bg-surface-800 border border-surface-500 shadow-2xl overflow-hidden z-50">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider px-3 pt-2 pb-1">Cambiar cuenta</p>
          {accounts.map((acc) => (
            <button
              key={acc.id_cuenta}
              type="button"
              onClick={() => void switchTo(acc)}
              disabled={switching === acc.subdominio}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-700 transition-colors"
            >
              <Building2 className="w-4 h-4 shrink-0 text-gray-500" />
              <span className="flex-1 truncate text-xs text-gray-300">{acc.nombre_cuenta}</span>
              {acc.subdominio === currentSubdominio && <Check className="w-3.5 h-3.5 text-accent-cyan shrink-0" />}
              {switching === acc.subdominio && <span className="w-3.5 h-3.5 border border-accent-cyan border-t-transparent rounded-full animate-spin shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type NavKey = "dashboard" | "performance" | "asesor" | "comisiones" | "bandeja" | "adquisicion" | "ads" | "sistema" | "documentacion" | "configuracion";

const NAV_ITEMS: { path: string; navKey: NavKey; label: string; icon: React.ElementType }[] = [
  { path: "/dashboard", navKey: "dashboard", label: "Panel ejecutivo", icon: LayoutDashboard },
  { path: "/performance", navKey: "performance", label: "Rendimiento", icon: BarChart3 },
  { path: "/asesor", navKey: "asesor", label: "Panel asesor", icon: UserCheck },
  { path: "/comisiones", navKey: "comisiones", label: "Comisiones", icon: BadgeDollarSign },
  { path: "/bandeja", navKey: "bandeja", label: "Bandeja", icon: Inbox },
  { path: "/acquisition", navKey: "adquisicion", label: "Resumen adquisición", icon: TrendingUp },
  { path: "/ads", navKey: "ads", label: "Ads & Inversión", icon: BarChart2 },
  { path: "/system", navKey: "sistema", label: "Control del sistema", icon: Target },
  { path: "/documentacion", navKey: "documentacion", label: "Documentación", icon: BookOpen },
  { path: "/configuracion", navKey: "configuracion", label: "Configuración", icon: UserCog },
];

function SoloMisDatosToggle() {
  const { soloMisDatos, toggleSoloMisDatos, canViewAll, sessionLoading, asesoresSeleccionados, toggleAsesor, asesores, session } = useUserFilter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (sessionLoading || !canViewAll) return null;

  const label =
    asesoresSeleccionados.length === 0
      ? (session?.email ? `Yo (${session.email})` : "Seleccionar asesor")
      : asesoresSeleccionados.length === 1
        ? (asesores.find((a) => (a.email ?? a.id) === asesoresSeleccionados[0])?.name ?? asesoresSeleccionados[0])
        : `${asesoresSeleccionados.length} asesores`;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggleSoloMisDatos}
        className={clsx(
          "flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-medium transition-all border",
          soloMisDatos
            ? "bg-accent-amber/10 text-accent-amber border-accent-amber/30"
            : "bg-surface-700/60 text-gray-400 border-surface-500 hover:text-white hover:bg-surface-600"
        )}
      >
        {soloMisDatos ? <EyeOff className="w-4 h-4 shrink-0" /> : <Eye className="w-4 h-4 shrink-0" />}
        <span className="truncate">Solo data del asesor</span>
        <div
          className={clsx(
            "ml-auto w-8 h-[18px] rounded-full p-[2px] transition-colors shrink-0",
            soloMisDatos ? "bg-accent-amber" : "bg-surface-500"
          )}
        >
          <div
            className={clsx(
              "w-[14px] h-[14px] rounded-full bg-white transition-transform",
              soloMisDatos ? "translate-x-[14px]" : "translate-x-0"
            )}
          />
        </div>
      </button>
      {soloMisDatos && asesores.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-surface-700/60 border border-surface-500 text-xs text-left"
          >
            <span className="truncate flex-1">{label}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>
          {dropdownOpen && (
            <>
              <div className="absolute inset-0 -top-1 -bottom-1 z-10" onClick={() => setDropdownOpen(false)} aria-hidden />
              <ul className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-lg bg-surface-800 border border-surface-500 shadow-xl z-20 py-1">
                <li>
                  <button
                    type="button"
                    onClick={() => toggleAsesor(session?.email ?? "")}
                    className={clsx("w-full px-3 py-2 text-left text-xs flex items-center gap-2", (asesoresSeleccionados.length === 0 || asesoresSeleccionados.includes(session?.email ?? "")) ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-300 hover:bg-surface-600")}
                  >
                    <span className={clsx("w-3.5 h-3.5 rounded border shrink-0", (asesoresSeleccionados.length === 0 || asesoresSeleccionados.includes(session?.email ?? "")) ? "bg-accent-cyan border-accent-cyan" : "border-surface-400")} />
                    Yo ({session?.email})
                  </button>
                </li>
                {asesores.filter((a) => (a.email ?? a.id) !== session?.email).map((a) => {
                  const email = a.email ?? a.id;
                  const selected = asesoresSeleccionados.includes(email);
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => toggleAsesor(email)}
                        className={clsx("w-full px-3 py-2 text-left text-xs flex items-center gap-2", selected ? "bg-accent-cyan/20 text-accent-cyan" : "text-gray-300 hover:bg-surface-600")}
                      >
                        <span className={clsx("w-3.5 h-3.5 rounded border shrink-0", selected ? "bg-accent-cyan border-accent-cyan" : "border-surface-400")} />
                        {a.name} {a.email && a.email !== a.name ? `(${a.email})` : ""}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function NavFiltered({
  onLinkClick,
  dashboards = [],
  hasAds = null,
}: {
  onLinkClick?: () => void;
  dashboards?: { id: string; nombre: string; icono?: string }[];
  hasAds?: boolean | null;
}) {
  const pathname = usePathname();
  const { session, sessionLoading } = useUserFilter();
  const t = useT();
  const permisos = session?.permisosArray ?? [];
  const navFiltered = useMemo(() => {
    if (sessionLoading) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => puedeVerRuta(permisos, item.path) || session?.rol === "superadmin");
  }, [sessionLoading, permisos, session?.rol]);

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname.endsWith("/dashboard");
    return pathname.includes(path);
  };

  const isDashboardActive = (dashboardId: string) => {
    return pathname.includes(`/dashboard/${dashboardId}`);
  };

  return (
    <>
      {navFiltered.map(({ path, navKey, label, icon: Icon }) => (
        <React.Fragment key={`${path}-${navKey}`}>
          {/* Ads item: grayed out with tooltip when ads not configured */}
          {path === "/ads" && hasAds === false ? (
            <div
              title="Conecta una plataforma de Ads en Sistema → Integraciones de Ads para activar esta sección"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border border-transparent text-gray-600 cursor-not-allowed opacity-50 select-none"
              aria-disabled="true"
            >
              <Icon className="w-5 h-5 shrink-0" />
              {t.nav[navKey] ?? label}
              <span className="ml-auto text-[9px] text-gray-600 uppercase tracking-wide font-semibold border border-gray-700 rounded px-1 py-0.5">No conectado</span>
            </div>
          ) : (
          <Link
            href={path}
            onClick={onLinkClick}
            className={clsx(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              isActive(path)
                ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 shadow-glow-cyan"
                : "text-gray-400 hover:bg-surface-600 hover:text-white border border-transparent"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {t.nav[navKey] ?? label}
          </Link>
          )}
          {path === "/dashboard" && dashboards.length > 0 && (
            <div className="space-y-1 ml-3">
              {dashboards.map((dash) => (
                <Link
                  key={dash.id}
                  href={`/dashboard/${dash.id}`}
                  onClick={onLinkClick}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                    isDashboardActive(dash.id)
                      ? "bg-accent-amber/10 text-accent-amber border border-accent-amber/20"
                      : "text-gray-500 hover:bg-surface-600 hover:text-gray-300 border border-transparent"
                  )}
                >
                  {dash.icono && <span className="text-sm">{dash.icono}</span>}
                  <span className="truncate">{dash.nombre}</span>
                </Link>
              ))}
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function NavFilteredMobile({
  onClose,
  dashboards = [],
  hasAds = null,
}: {
  onClose: () => void;
  dashboards?: { id: string; nombre: string; icono?: string }[];
  hasAds?: boolean | null;
}) {
  return <NavFiltered onLinkClick={onClose} dashboards={dashboards} hasAds={hasAds} />;
}

function PermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, sessionLoading } = useUserFilter();

  useEffect(() => {
    if (sessionLoading || !session) return;
    const path = pathname.replace(/^\/app\/[^/]+/, "") || "/dashboard";
    const basePath = Object.keys(NAV_PERMISOS).find((p) => path === p || (p !== "/dashboard" && path.startsWith(p + "/")));
    const perm = basePath ? NAV_PERMISOS[basePath as keyof typeof NAV_PERMISOS] : null;
    if (!perm) return;
    const puede = session.rol === "superadmin" || puedeVerRuta(session.permisosArray ?? [], basePath!);
    if (!puede) router.replace("/dashboard");
  }, [pathname, session, sessionLoading, router]);

  return <>{children}</>;
}

function TenantLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const currentSubdominio = typeof params?.subdomain === "string" ? params.subdomain : "";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [locale, setLocale] = useState<Locale | null>(null);
  const [dashboardsNav, setDashboardsNav] = useState<{ id: string; nombre: string; icono?: string }[]>([]);
  const [hasAds, setHasAds] = useState<boolean | null>(null); // null = loading
  const { session } = useUserFilter();

  useEffect(() => {
    fetch("/api/data/locale")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.idioma) setLocale(d.idioma as Locale);
        if (typeof d?.hasAds === "boolean") setHasAds(d.hasAds);
      })
      .catch(() => { /* fallback */ });
  }, []);

  useEffect(() => {
    fetch("/api/data/dashboards")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.dashboards) setDashboardsNav(d.dashboards); })
      .catch(() => {});
  }, []);

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
    <LocaleProvider locale={locale}>
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
          <NavFiltered dashboards={dashboardsNav} hasAds={hasAds} />
        </nav>
        <div className="p-2 space-y-1 border-t border-surface-500/80">
          {session?.platformAdmin && (
            <a
              href="/api/super/exit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all w-full"
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              Volver al listado
            </a>
          )}
          <AccountSwitcher currentSubdominio={currentSubdominio} />
          <SoloMisDatosToggle />
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
          <NavFilteredMobile onClose={() => setSidebarOpen(false)} dashboards={dashboardsNav} hasAds={hasAds} />
        </nav>
        <div className="p-2 space-y-1 border-t border-surface-500/80">
          {session?.platformAdmin && (
            <a
              href="/api/super/exit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 transition-all w-full"
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutGrid className="w-5 h-5 shrink-0" />
              Volver al listado
            </a>
          )}
          <AccountSwitcher currentSubdominio={currentSubdominio} />
          <SoloMisDatosToggle />
          {logoutButton}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden pb-20 md:pb-24">
        <div className="flex-1 min-w-0 max-w-full">
          <PermissionGuard>{children}</PermissionGuard>
        </div>
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
    </LocaleProvider>
  );
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserFilterProvider>
      <TenantLayoutInner>{children}</TenantLayoutInner>
    </UserFilterProvider>
  );
}
