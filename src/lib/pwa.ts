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

const MOTIVATIONS = [
  "Excellence is not an act, but a daily habit engineered with precision.",
  "Small daily victories accumulate into staggering lifelong transformations.",
  "Action is the foundational catalyst to all momentum.",
  "You do not rise to your goals, you fall to the level of your systems.",
  "Discipline is the bridge between intention and mastery.",
  "Show up today. Consistency beats intensity every single time."
];

// Mobile Background Notification Scheduler for iOS & Android
// Dynamically shifts alert times every day to match when you completed the habit yesterday!
export function initMobilePushScheduler(habits: Array<any>, todos: Array<any>) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Check every 30 seconds
  const interval = setInterval(() => {
    const now = new Date();
    const currentHHMM = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const todayStr = now.toISOString().split("T")[0];

    habits.forEach((h) => {
      // If current time matches the habit's dynamic daily notificationTime
      if (h.notificationTime && currentHHMM === h.notificationTime) {
        const isDoneToday = h.completions && h.completions[todayStr];
        const sentKey = `trac-push-dynamic-${todayStr}-${h.name}`;

        if (!isDoneToday && !localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, "true");
          const randomMotiv = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];

          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(`Trac: ${h.name}`, {
                body: `⏰ Time for "${h.name}" (adapting to your daily completion rhythm)!\n\n"${randomMotiv}"`,
                icon: "/logo.png",
                badge: "/logo.png",
                vibrate: [100, 50, 100],
              } as any);
            });
          } else {
            new Notification(`Trac: ${h.name}`, {
              body: `⏰ Time for "${h.name}"!\n"${randomMotiv}"`,
              icon: "/logo.png",
            });
          }
        }
      }
    });
  }, 30000);

  return () => clearInterval(interval);
}
