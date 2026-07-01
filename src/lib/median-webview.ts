// Median.co / WebView back-button + navigation bridge.
//
// Two strategies work together so we cover every Median build:
//
//   A. history.pushState per in-app navigation → Median's default "hardware
//      back = webview back" behavior triggers popstate, which we intercept
//      to call onBack(). This is the primary mechanism.
//
//   B. Legacy global back-press hooks (gonative_back_pressed /
//      median_back_pressed / cordova-style 'backbutton' event) are also
//      registered as belt-and-braces so older Median builds that call
//      the JS bridge directly still route into onBack().
//
// If onBack() returns false (stack already at root), we tell Median to
// exit the app cleanly.
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

// Called every time the user pushes a new page onto the in-app stack.
// Adds a real browser history entry so the OS/webview "back" produces a
// popstate event we can intercept. Safe to call from any component.
export function pushHistoryEntry(page: string) {
  if (typeof window === "undefined") return;
  try {
    window.history.pushState({ trac: true, page }, "", window.location.href);
  } catch {}
}

function exitApp() {
  try {
    const w = window as any;
    if (w.median?.app?.exit) w.median.app.exit();
    else if (w.gonative?.app?.exit) w.gonative.app.exit();
    else window.location.href = "median://app/exit";
  } catch {
    try { window.location.href = "median://app/exit"; } catch {}
  }
}

export function setupWebViewNavigationBridge(onBack: () => boolean) {
  if (typeof window === "undefined") return () => {};

  // Block right-click / long-press context menus on non-editable UI
  const handleContextMenu = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target || !target.matches("input, textarea, [contenteditable='true']")) {
      e.preventDefault();
    }
  };
  window.addEventListener("contextmenu", handleContextMenu);

  // Guard against re-entrance: if our own history.back() triggers another
  // popstate, we should not treat that as a fresh user press.
  let suppressNextPop = false;

  const attemptBack = (): boolean => {
    let handled = false;
    try {
      handled = onBack();
    } catch (err) {
      console.error("[nav] back handler error:", err);
    }
    return handled;
  };

  // Popstate handler (fires for OS back, iOS swipe-back, browser back).
  const handlePopState = () => {
    if (suppressNextPop) {
      suppressNextPop = false;
      return;
    }
    const handled = attemptBack();
    if (handled) {
      // We just consumed one history entry. Push a fresh one so the NEXT
      // press also fires popstate instead of leaving the SPA.
      try {
        window.history.pushState({ trac: true, guard: true }, "", window.location.href);
      } catch {}
    } else {
      // Nothing left in the app stack → exit.
      exitApp();
    }
  };
  window.addEventListener("popstate", handlePopState);

  // Legacy Median / GoNative direct hooks (some builds skip popstate and
  // call these globals). Return true to tell Median "handled, do not exit".
  const legacyBack = (): boolean => {
    const handled = attemptBack();
    if (!handled) {
      exitApp();
      return true;
    }
    // We handled it via onBack (which updated the SPA state), but the
    // browser history entry did NOT get popped by Median (it went straight
    // to the JS bridge). Consume one entry ourselves so history stays in
    // sync with the SPA state.
    try {
      suppressNextPop = true;
      window.history.back();
    } catch {}
    return true;
  };
  (window as any).gonative_back_pressed = legacyBack;
  (window as any).median_back_pressed = legacyBack;

  // Cordova/PhoneGap-style 'backbutton' event — some WebViews emit this
  const cordovaBack = (e: Event) => {
    e.preventDefault?.();
    legacyBack();
  };
  document.addEventListener("backbutton", cordovaBack as any);

  // Seed the history stack so the FIRST back press has something to pop.
  // We push twice: once to establish a stable base, once as the "guard"
  // that popstate consumes.
  try {
    if (window.history.state?.trac !== true) {
      window.history.replaceState({ trac: true, seed: true }, "", window.location.href);
    }
    window.history.pushState({ trac: true, guard: true }, "", window.location.href);
  } catch {}

  return () => {
    window.removeEventListener("contextmenu", handleContextMenu);
    window.removeEventListener("popstate", handlePopState);
    document.removeEventListener("backbutton", cordovaBack as any);
    delete (window as any).gonative_back_pressed;
    delete (window as any).median_back_pressed;
  };
}
