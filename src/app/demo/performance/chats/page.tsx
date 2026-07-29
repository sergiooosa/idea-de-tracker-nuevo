"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import { PerformanceFilterProvider } from "@/contexts/PerformanceFilterContext";
import PerformanceChatsPage from "@/app/app/[subdomain]/performance/chats/page";

export default function DemoChatsPage() {
  return (
    <DemoSessionProvider>
      <PerformanceFilterProvider>
        <PerformanceChatsPage />
      </PerformanceFilterProvider>
    </DemoSessionProvider>
  );
}
