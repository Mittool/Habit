// OneSignal Integration — dual mode
//
//   Web browsers / PWA install → uses the OneSignal Web SDK (window.OneSignal)
//   Median.co native wrapper   → uses the Median JS Bridge (window.median.onesignal)
//
// The two SDKs have completely different APIs and completely different
// permission / subscription models. Detecting which one is present is the
// difference between "notifications work" and "the button says UNSUPPORTED
// and nothing happens" (which is exactly what happened in the last test).
"use client";

// Note on runtime detection: we intentionally avoid isWebViewApp() from
// median-webview.ts here because it also returns true for a plain PWA
// installed via 'Add to Home Screen', which still needs the Web SDK path.
// probablyMedian() below is stricter — it only returns true when the
// window.median / window.gonative globals or userAgent flag are present.

export const ONESIGNAL_APP_ID = "ad5bb9f0-fe63-460c-8a8d-cf5331800d5c";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
    median?: any;
  }
}

let webInitStarted = false;
let pendingExternalId: string | null = null;

// ─────────────────────────────────────────────────────────────
// Runtime helpers
// ─────────────────────────────────────────────────────────────

function inMedian(): boolean {
  return typeof window !== "undefined" && !!window.median?.onesignal;
}

// True when we're clearly inside a native wrapper.
// Detection signals (any one is enough):
//   - window.median or window.gonative globals exist
//   - userAgent explicitly includes "median" or "gonative"
//   - userAgent looks like an Android WebView ("; wv)")
//   - iOS in-app WebView (iPhone/iPad UA but Safari missing)
//   - Notification API missing entirely (browsers all have it — its
//     absence is a strong tell of a stripped WebView)
function probablyMedian(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  if (w.median || w.gonative) return true;
  const ua = navigator?.userAgent?.toLowerCase() ?? "";
  if (ua.includes("median") || ua.includes("gonative")) return true;
  if (ua.includes("; wv)")) return true; // Android WebView
  const isIOSDevice = /iphone|ipad|ipod/.test(ua);
  const looksLikeSafari = ua.includes("safari") && !ua.includes("crios") && !ua.includes("fxios");
  if (isIOSDevice && !looksLikeSafari) return true; // iOS in-app WebView
  // Last-resort: real browsers ALWAYS expose window.Notification.
  // If it's missing we cannot be on the web path anyway.
  if (typeof (w as any).Notification === "undefined") return true;
  return false;
}

// Expose the raw signals for the on-screen diagnostic panel so we can see
// exactly why a user is (or is not) being routed to the Median path.
export function getRuntimeDiagnostics() {
  if (typeof window === "undefined") {
    return { ssr: true } as const;
  }
  const w = window as any;
  return {
    userAgent: navigator?.userAgent ?? "",
    hasMedianGlobal: !!w.median,
    hasMedianOneSignal: !!w.median?.onesignal,
    hasGonativeGlobal: !!w.gonative,
    hasNotificationApi: typeof (w as any).Notification !== "undefined",
    probablyMedian: probablyMedian(),
    inMedian: inMedian(),
  };
}

// Wait until window.median.onesignal is available (Median injects it a moment
// after the page loads, not synchronously).
function waitForMedian(timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    if (inMedian()) return resolve(true);
    if (typeof window === "undefined") return resolve(false);
    const start = Date.now();
    const iv = setInterval(() => {
      if (inMedian()) {
        clearInterval(iv);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(iv);
        resolve(false);
      }
    }, 100);
  });
}

function safeLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────

export async function initOneSignal() {
  if (typeof window === "undefined") return;

  // In the Median wrapper the native SDK is initialised by the app shell.
  // Nothing for us to do — we just call the bridge methods when needed.
  // We still wait briefly so subsequent calls (like login) find the bridge.
  if (probablyMedian()) {
    await waitForMedian(4000);
    if (inMedian() && pendingExternalId) {
      try {
        await window.median.onesignal.login(pendingExternalId);
        console.log("[OneSignal/Median] retro-linked external_id:", pendingExternalId);
      } catch (err) {
        console.error("[OneSignal/Median] retro-link error:", err);
      }
    }
    return;
  }

  // Web SDK path
  if (webInitStarted) return;
  webInitStarted = true;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: "/" },
        serviceWorkerPath: "OneSignalSDKWorker.js",
      });
      console.log("[OneSignal/Web] init complete");
      if (pendingExternalId) {
        try {
          await OneSignal.login(pendingExternalId);
          console.log("[OneSignal/Web] retro-linked external_id:", pendingExternalId);
        } catch (err) {
          console.error("[OneSignal/Web] retro-link error:", err);
        }
      }
    } catch (err) {
      console.error("[OneSignal/Web] init error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// User tags
// ─────────────────────────────────────────────────────────────

export function syncOneSignalUserTags(tags: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  if (probablyMedian()) {
    waitForMedian().then((ready) => {
      if (!ready) return;
      try {
        // Median exposes addTags via median.onesignal.tags
        if (window.median?.onesignal?.tags?.add) {
          window.median.onesignal.tags.add({ tags });
        }
      } catch (err) {
        console.error("[OneSignal/Median] tag error:", err);
      }
    });
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.User?.addTags) await OneSignal.User.addTags(tags);
    } catch (err) {
      console.error("[OneSignal/Web] tag error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Permission prompt
// ─────────────────────────────────────────────────────────────

export async function promptOneSignalPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (probablyMedian()) {
    const ready = await waitForMedian();
    if (!ready) return false;
    try {
      // register() triggers the native iOS/Android permission dialog
      await window.median.onesignal.register();
      // Give the OS a moment then read back the state
      await new Promise((r) => setTimeout(r, 500));
      const info = await getMedianInfo();
      return !!info?.subscription?.optedIn || !!info?.oneSignalSubscribed;
    } catch (err) {
      console.error("[OneSignal/Median] register error:", err);
      return false;
    }
  }

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        if (OneSignal?.Notifications?.requestPermission) {
          const granted = await OneSignal.Notifications.requestPermission();
          resolve(!!granted);
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// External user id (Supabase user id) linking
// ─────────────────────────────────────────────────────────────

export function setOneSignalExternalUserId(userId: string | null | undefined) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem("trac-one-signal-external-id", userId);
  } catch {}
  pendingExternalId = userId;

  if (probablyMedian()) {
    waitForMedian().then(async (ready) => {
      if (!ready) return;
      try {
        await window.median.onesignal.login(userId);
        console.log("[OneSignal/Median] linked external_id:", userId);
      } catch (err) {
        console.error("[OneSignal/Median] login error:", err);
      }
    });
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.login) {
        await OneSignal.login(userId);
        console.log("[OneSignal/Web] linked external_id:", userId);
      }
    } catch (err) {
      console.error("[OneSignal/Web] login error:", err);
    }
  });
}

export function clearOneSignalExternalUserId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("trac-one-signal-external-id");
  } catch {}
  pendingExternalId = null;

  if (probablyMedian()) {
    if (inMedian()) {
      try { window.median.onesignal.logout(); } catch {}
    }
    return;
  }

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try { if (OneSignal?.logout) await OneSignal.logout(); } catch (err) {
      console.error("[OneSignal/Web] logout error:", err);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Status introspection (used by the diagnostics panel)
// ─────────────────────────────────────────────────────────────

export interface OneSignalStatus {
  runtime: "median" | "web" | "unknown";
  sdkReady: boolean;
  permission: "default" | "granted" | "denied" | "unsupported";
  optedIn: boolean;
  onesignalId: string | null;
  externalId: string | null;
  pushSubscriptionId: string | null;
}

async function getMedianInfo(): Promise<any> {
  try {
    if (window.median?.onesignal?.onesignalInfo) {
      return await window.median.onesignal.onesignalInfo();
    }
    if (window.median?.onesignal?.info) {
      return await window.median.onesignal.info();
    }
  } catch (err) {
    console.error("[OneSignal/Median] info error:", err);
  }
  return null;
}

export async function getOneSignalStatus(): Promise<OneSignalStatus> {
  const emptyWeb: OneSignalStatus = {
    runtime: "web",
    sdkReady: false,
    permission: (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported") as any,
    optedIn: false,
    onesignalId: null,
    externalId: safeLocal("trac-one-signal-external-id"),
    pushSubscriptionId: null,
  };
  const emptyMedian: OneSignalStatus = {
    ...emptyWeb,
    runtime: "median",
    permission: "default", // Median controls this natively; assume "default" until we learn otherwise
  };
  if (typeof window === "undefined") {
    return { ...emptyWeb, runtime: "unknown" };
  }

  // ─── Median path ───
  if (probablyMedian()) {
    const ready = await waitForMedian(2500);
    if (!ready) return emptyMedian;
    const info = await getMedianInfo();
    if (!info) return { ...emptyMedian, sdkReady: true };

    // Handle both v5 (subscription.optedIn) and legacy (oneSignalSubscribed) shapes
    const optedIn = !!(info.subscription?.optedIn ?? info.oneSignalSubscribed);
    const onesignalId = info.oneSignalId ?? info.oneSignalUserId ?? null;
    const externalId = info.externalId ?? safeLocal("trac-one-signal-external-id");
    const pushSubscriptionId = info.subscription?.id ?? info.oneSignalPushToken ?? null;

    // Median doesn't always report OS permission directly, but if we have a
    // subscription id AND optedIn, permission has necessarily been granted.
    const permission: OneSignalStatus["permission"] =
      optedIn ? "granted" : "default";

    return {
      runtime: "median",
      sdkReady: true,
      permission,
      optedIn,
      onesignalId,
      externalId,
      pushSubscriptionId,
    };
  }

  // ─── Web path ───
  return new Promise((resolve) => {
    let done = false;
    const finish = (s: OneSignalStatus) => { if (!done) { done = true; resolve(s); } };
    const t = setTimeout(() => finish(emptyWeb), 3000);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      clearTimeout(t);
      try {
        const perm = ("Notification" in window ? Notification.permission : "unsupported") as OneSignalStatus["permission"];
        const optedIn = !!(OneSignal?.User?.PushSubscription?.optedIn);
        finish({
          runtime: "web",
          sdkReady: true,
          permission: perm,
          optedIn,
          onesignalId: OneSignal?.User?.onesignalId ?? null,
          externalId: safeLocal("trac-one-signal-external-id"),
          pushSubscriptionId: OneSignal?.User?.PushSubscription?.id ?? null,
        });
      } catch {
        finish({ ...emptyWeb, sdkReady: true });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// One-shot: request permission → opt in → link Supabase user id
// Used by the "Enable Push & Link My Device" button.
// ─────────────────────────────────────────────────────────────

export async function enableAndLinkPush(supabaseUserId: string | null | undefined): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "not-in-browser" };

  // ─── Median path ───
  if (probablyMedian()) {
    const ready = await waitForMedian(4000);
    if (!ready) return { ok: false, reason: "median-bridge-not-ready" };
    try {
      // Trigger native OS permission dialog
      try { await window.median.onesignal.register(); } catch {}
      // Wait for OS to complete
      await new Promise((r) => setTimeout(r, 700));
      // Link Supabase user id
      if (supabaseUserId) {
        try { localStorage.setItem("trac-one-signal-external-id", supabaseUserId); } catch {}
        pendingExternalId = supabaseUserId;
        try { await window.median.onesignal.login(supabaseUserId); } catch (err) {
          return { ok: false, reason: `login-failed: ${String((err as any)?.message || err)}` };
        }
      }
      // Verify
      await new Promise((r) => setTimeout(r, 500));
      const info = await getMedianInfo();
      const optedIn = !!(info?.subscription?.optedIn ?? info?.oneSignalSubscribed);
      if (!optedIn) return { ok: false, reason: "permission-denied" };
      return { ok: true };
    } catch (err: any) {
      return { ok: false, reason: String(err?.message || err) };
    }
  }

  // ─── Web path ───
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        if (OneSignal?.Notifications?.requestPermission) {
          const granted = await OneSignal.Notifications.requestPermission();
          if (!granted) return resolve({ ok: false, reason: "permission-denied" });
        }
        if (OneSignal?.User?.PushSubscription?.optIn) {
          try { await OneSignal.User.PushSubscription.optIn(); } catch {}
        }
        if (supabaseUserId && OneSignal?.login) {
          try { localStorage.setItem("trac-one-signal-external-id", supabaseUserId); } catch {}
          pendingExternalId = supabaseUserId;
          await OneSignal.login(supabaseUserId);
        }
        resolve({ ok: true });
      } catch (err: any) {
        resolve({ ok: false, reason: String(err?.message || err) });
      }
    });
  });
}
