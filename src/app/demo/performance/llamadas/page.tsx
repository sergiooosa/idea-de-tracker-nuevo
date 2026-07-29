"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import { PerformanceFilterProvider } from "@/contexts/PerformanceFilterContext";
import PerformanceLlamadasPage from "@/app/app/[subdomain]/performance/llamadas/page";

export default function DemoLlamadasPage() {
  return (
    <DemoSessionProvider>
      <PerformanceFilterProvider>
        <PerformanceLlamadasPage />
      </PerformanceFilterProvider>
    </DemoSessionProvider>
  );
}
