"use client";

import { DemoSessionProvider } from "@/contexts/DemoSessionContext";
import AdsPage from "@/app/app/[subdomain]/ads/page";

export default function DemoAdsPage() {
  return (
    <DemoSessionProvider>
      <AdsPage />
    </DemoSessionProvider>
  );
}
