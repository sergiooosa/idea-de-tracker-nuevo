"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import AsesorPage from "@/app/app/[subdomain]/asesor/page";

export default function DemoAsesorPage() {
  return (
    <DemoSessionProvider>
      <AsesorPage />
    </DemoSessionProvider>
  );
}
