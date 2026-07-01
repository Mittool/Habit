"use client";

import React, { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";
import { initOneSignal, setOneSignalExternalUserId } from "@/lib/onesignal";
import { restoreFromCloudDatabase } from "@/lib/cloud";
import { initFirebaseAnalytics } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export default function PWALayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerServiceWorker();
    initOneSignal();
    initFirebaseAnalytics();
    restoreFromCloudDatabase();

    // Re-link OneSignal external_user_id on cold start if the user is already
    // signed into Supabase. This runs after OneSignal.init because the SDK
    // queues deferred calls internally.
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) setOneSignalExternalUserId(data.user.id);
      }).catch(() => {});
    }

    // Tell Median.co native iOS & Android app shell to draw Fullscreen Edge-to-Edge!
    if (typeof window !== "undefined") {
      const w = window as any;
      if (w.median?.statusbar?.set) {
        w.median.statusbar.set({ overlay: true, style: "dark" });
      } else if (w.gonative?.statusbar?.set) {
        w.gonative.statusbar.set({ overlay: true, style: "dark" });
      }
      // Android Fullscreen immersive override bridge
      if (w.median?.screen?.setFullscreen) {
        w.median.screen.setFullscreen({ enable: false }); // keep statusbar visible over transparent background
      }
    }
  }, []);

  return <>{children}</>;
}
