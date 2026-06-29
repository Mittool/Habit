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

// Global Interceptor for Context Menus & Android Hardware Back Button
export function setupWebViewNavigationBridge(
  getCurrentTab: () => string,
  navigateToTab: (tab: string) => void
) {
  if (typeof window === "undefined") return;

  // 1. Block default browser long-press context menus on all non-editable UI elements
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !target.matches("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
    }
  };
  window.addEventListener("contextmenu", handleContextMenu);

  // 2. Android Hardware Back Button Bridge Interceptor (Median.co / GoNative SDK)
  // Median calls `window.gonative_back_pressed()` when physical Android back button is tapped
  const handleAndroidBack = () => {
    const current = getCurrentTab();
    
    // If user is inside any subscreen or tab other than Home
    if (current !== "home") {
      navigateToTab("home");
      return true; // Tells Median: We handled navigation in SPA, do NOT exit or go back in browser history!
    }

    // If user is already on Home root screen -> Command Median native OS to exit app cleanly
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
    return true; // Blocks default browser white screen navigation
  };

  // Expose hooks to global window for Median native OS bridge
  (window as any).gonative_back_pressed = handleAndroidBack;
  (window as any).median_back_pressed = handleAndroidBack;

  // Standard HTML5 History popstate back button fallback
  const handlePopState = (e: PopStateEvent) => {
    const current = getCurrentTab();
    if (current !== "home") {
      e.preventDefault();
      navigateToTab("home");
      // Push state back to prevent browser url change
      window.history.pushState(null, "", "/");
    }
  };
  window.addEventListener("popstate", handlePopState);

  // Ensure initial history state is locked at root SPA URL
  if (window.history.state === null) {
    window.history.replaceState({ root: true }, "", "/");
  }

  return () => {
    window.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("popstate", handlePopState);
    delete (window as any).gonative_back_pressed;
    delete (window as any).median_back_pressed;
  };
}
