"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import AcquisitionPage from "@/app/app/[subdomain]/acquisition/page";

export default function DemoAcquisitionPage() {
  return (
    <DemoSessionProvider>
      <AcquisitionPage />
    </DemoSessionProvider>
  );
}
