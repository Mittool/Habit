"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

export default function PWALayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return <>{children}</>;
}
