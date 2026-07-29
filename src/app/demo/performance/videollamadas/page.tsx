"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import { PerformanceFilterProvider } from "@/contexts/PerformanceFilterContext";
import PerformancePage from "@/app/app/[subdomain]/performance/page";

export default function DemoVideollamadasPage() {
  return (
    <DemoSessionProvider>
      <PerformanceFilterProvider>
        <PerformancePage />
      </PerformanceFilterProvider>
    </DemoSessionProvider>
  );
}
