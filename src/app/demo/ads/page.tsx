"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoAdsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/demo/acquisition');
  }, [router]);
  return null;
}
