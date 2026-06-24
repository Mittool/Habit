"use client";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              // New service worker activated — could show update toast
              console.log("[PWA] New service worker activated");
            }
          });
        }
      });

      console.log("[PWA] Service Worker registered with scope:", registration.scope);
    } catch (error) {
      console.error("[PWA] Service Worker registration failed:", error);
    }
  });
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}
