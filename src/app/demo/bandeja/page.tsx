"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import BandejaPage from "@/app/app/[subdomain]/bandeja/page";

export default function DemoBandejaPage() {
  return (
    <DemoSessionProvider>
      <BandejaPage />
    </DemoSessionProvider>
  );
}
