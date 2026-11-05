"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-renders the server component every 10s. Unmounted once the report is finished.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
