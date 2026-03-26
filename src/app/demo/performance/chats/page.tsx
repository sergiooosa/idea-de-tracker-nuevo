"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import PerformanceChatsPage from "@/app/app/[subdomain]/performance/chats/page";

export default function DemoChatsPage() {
  return (
    <DemoSessionProvider>
      <PerformanceChatsPage />
    </DemoSessionProvider>
  );
}
