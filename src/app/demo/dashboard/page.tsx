"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import DashboardPage from "@/app/app/[subdomain]/dashboard/page";

export default function DemoDashboardPage() {
  return (
    <DemoSessionProvider>
      <DashboardPage />
    </DemoSessionProvider>
  );
}
