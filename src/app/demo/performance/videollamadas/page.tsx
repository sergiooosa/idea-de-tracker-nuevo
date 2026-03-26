"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import PerformancePage from "@/app/app/[subdomain]/performance/page";

export default function DemoVideollamadasPage() {
  return (
    <DemoSessionProvider>
      <PerformancePage />
    </DemoSessionProvider>
  );
}
