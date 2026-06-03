"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import ComparacionesPage from "@/app/app/[subdomain]/comparaciones/page";

export default function DemoComparacionesPage() {
  return (
    <DemoSessionProvider>
      <ComparacionesPage />
    </DemoSessionProvider>
  );
}
