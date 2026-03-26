"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import PerformanceLlamadasPage from "@/app/app/[subdomain]/performance/llamadas/page";

export default function DemoLlamadasPage() {
  return (
    <DemoSessionProvider>
      <PerformanceLlamadasPage />
    </DemoSessionProvider>
  );
}
