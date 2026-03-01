"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PageHeader from "@/components/dashboard/PageHeader";
import clsx from "clsx";

const tabs = [
  { path: "", label: "Videollamadas" },
  { path: "/llamadas", label: "Llamadas" },
  { path: "/chats", label: "Chats" },
];

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const basePath = pathname.split("/performance")[0] + "/performance";

  return (
    <>
      <PageHeader title="Rendimiento" subtitle="Llamadas, videollamadas y chats" />
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
