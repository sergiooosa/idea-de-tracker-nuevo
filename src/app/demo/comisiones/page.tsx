"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import ComisionesPage from "@/app/app/[subdomain]/comisiones/page";

export default function DemoComisionesPage() {
  return (
    <DemoSessionProvider>
      <ComisionesPage />
    </DemoSessionProvider>
  );
}
