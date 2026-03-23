"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import clsx from "clsx";
import { useT } from "@/contexts/LocaleContext";

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useT();
  const basePath = pathname.split("/performance")[0] + "/performance";

  const tabs = [
    { path: "", label: t.performance.videollamadas.titulo },
    { path: "/llamadas", label: t.performance.llamadas.titulo },
    { path: "/chats", label: t.performance.chats.titulo },
  ];

  return (
    <>
      <PageHeader title={t.performance.titulo} subtitle={`${t.performance.llamadas.titulo}, ${t.performance.videollamadas.titulo.toLowerCase()} y ${t.performance.chats.titulo.toLowerCase()}`} />
      <div className="px-4 md:px-6 border-b border-surface-500">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(({ path, label }) => {
            const fullPath = basePath + path;
            const isActive = path === "" ? pathname === basePath : pathname.startsWith(fullPath);
            return (
              <Link
                key={path}
                href={fullPath}
                className={clsx(
                  "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                  isActive
                    ? "border-accent-cyan text-accent-cyan"
                    : "border-transparent text-gray-400 hover:text-white"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1">{children}</div>
    </>
  );
}
