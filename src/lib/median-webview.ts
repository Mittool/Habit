// Median.co (GoNative) Mobile WebView Hardware Back Button & Touch Controller
"use client";

export function isWebViewApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    typeof (window as any).median !== "undefined" ||
    typeof (window as any).gonative !== "undefined" ||
    ua.includes("median") ||
    ua.includes("gonative") ||
    ua.includes("wv") ||
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
  );
}

// Global interceptor for right-click context menus and Android hardware back
// button. `onBack` is the caller's own back handler — it should pop one item
// from an in-app navigation stack and return true if it handled it, or false
// if there is nowhere left to go (we then exit the app).
export function setupWebViewNavigationBridge(onBack: () => boolean) {
  if (typeof window === "undefined") return () => {};

  // 1. Block default browser long-press context menus on non-editable UI
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !target.matches("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
    }
  };
  window.addEventListener("contextmenu", handleContextMenu);

  // 2. Hardware back button interceptor.
  // Median calls `gonative_back_pressed` / `median_back_pressed` on Android
  // physical back. Return true to tell Median "I handled it, don't do the
  // native default action". Return false to let Median exit the app.
  const handleAndroidBack = (): boolean => {
    try {
      const handled = onBack();
      if (handled) return true;
    } catch (err) {
      console.error("[nav] back handler error:", err);
    }
    // Nothing left in the stack — exit the app cleanly
    try {
      const w = window as any;
      if (w.median?.app?.exit) {
        w.median.app.exit();
      } else if (w.gonative?.app?.exit) {
        w.gonative.app.exit();
      } else {
        window.location.href = "median://app/exit";
      }
    } catch {
      window.location.href = "median://app/exit";
    }
    return true; // prevent default white-screen navigation
  };

  (window as any).gonative_back_pressed = handleAndroidBack;
  (window as any).median_back_pressed = handleAndroidBack;

  // 3. HTML5 popstate — browser / iOS swipe-back / PWA back gesture.
  // We push one extra history entry per in-app navigation (see nav-stack.ts)
  // so popstate corresponds one-to-one with the user pressing back.
  const handlePopState = (e: PopStateEvent) => {
    const handled = onBack();
    if (!handled) {
      // Let the browser actually go back / exit the PWA
      return;
    }
    // We consumed the back event. Push a fresh entry so the NEXT back press
    // also fires popstate instead of leaving the app.
    window.history.pushState({ trac: true }, "", window.location.href);
    e.preventDefault?.();
  };
  window.addEventListener("popstate", handlePopState);

  // Seed a history entry so the very first back press fires popstate
  // (some engines skip popstate if the stack has only the initial entry).
  if (window.history.state === null) {
    window.history.replaceState({ trac: true, seed: true }, "", window.location.href);
    window.history.pushState({ trac: true }, "", window.location.href);
  }

  return () => {
    window.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("popstate", handlePopState);
    delete (window as any).gonative_back_pressed;
    delete (window as any).median_back_pressed;
  };
}
