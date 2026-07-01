// OneSignal Push Notification SDK Integration (Web PWA + Mobile WebView)
"use client";

export const ONESIGNAL_APP_ID = "ad5bb9f0-fe63-460c-8a8d-cf5331800d5c";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

// Track init so we don't init twice
let initStarted = false;
// Remember the last requested external id so we can retry if login runs
// before SDK is ready.
let pendingExternalId: string | null = null;

export async function initOneSignal() {
  if (typeof window === "undefined") return;
  if (initStarted) return;
  initStarted = true;

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
      console.log("[OneSignal] init complete for", ONESIGNAL_APP_ID);

      // If a login was requested before init completed, run it now.
      if (pendingExternalId) {
        try {
          await OneSignal.login(pendingExternalId);
          console.log("[OneSignal] retro-linked external_id:", pendingExternalId);
        } catch (err) {
          console.error("[OneSignal] retro-link error:", err);
        }
      }
    } catch (err) {
      console.error("[OneSignal] init error:", err);
    }
  });
}

// Sync user telemetry and streaks to OneSignal User Tags
export function syncOneSignalUserTags(tags: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.User?.addTags) {
        await OneSignal.User.addTags(tags);
      }
    } catch (err) {
      console.error("[OneSignal] tag error:", err);
    }
  });
}

// Trigger OneSignal Web / Mobile Push Permission Request
export async function promptOneSignalPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
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

// Link the current device to a Supabase user so /api/notifications can target
// it by external_user_id. Call from your auth flow immediately after login,
// and after Supabase auth-state resume on cold app start.
export function setOneSignalExternalUserId(userId: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!userId) return;
  try {
    localStorage.setItem("trac-one-signal-external-id", userId);
  } catch {}
  pendingExternalId = userId;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.login) {
        await OneSignal.login(userId);
        console.log("[OneSignal] linked external_id:", userId);
      }
    } catch (err) {
      console.error("[OneSignal] login error:", err);
    }
  });
}

export function clearOneSignalExternalUserId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("trac-one-signal-external-id");
  } catch {}
  pendingExternalId = null;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.logout) await OneSignal.logout();
    } catch (err) {
      console.error("[OneSignal] logout error:", err);
    }
  });
}

// ─── Diagnostics helpers used by the Notifications page ───

export interface OneSignalStatus {
  sdkReady: boolean;
  permission: "default" | "granted" | "denied" | "unsupported";
  optedIn: boolean;
  onesignalId: string | null; // OneSignal's internal user id (once created)
  externalId: string | null;  // what WE set (Supabase user id)
  pushSubscriptionId: string | null;
}

export async function getOneSignalStatus(): Promise<OneSignalStatus> {
  const empty: OneSignalStatus = {
    sdkReady: false,
    permission: "unsupported",
    optedIn: false,
    onesignalId: null,
    externalId: null,
    pushSubscriptionId: null,
  };
  if (typeof window === "undefined") return empty;

  return new Promise((resolve) => {
    let done = false;
    const finish = (s: OneSignalStatus) => { if (!done) { done = true; resolve(s); } };
    // Timeout so the UI never hangs if SDK never loads
    const t = setTimeout(() => finish({
      ...empty,
      permission: ("Notification" in window ? Notification.permission : "unsupported") as OneSignalStatus["permission"],
      externalId: safeLocal("trac-one-signal-external-id"),
    }), 3000);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      clearTimeout(t);
      try {
        const perm: OneSignalStatus["permission"] = (typeof Notification !== "undefined" ? Notification.permission : "unsupported") as any;
        const optedIn = !!(OneSignal?.User?.PushSubscription?.optedIn);
        const onesignalId = OneSignal?.User?.onesignalId ?? null;
        const pushSubscriptionId = OneSignal?.User?.PushSubscription?.id ?? null;
        const externalId = safeLocal("trac-one-signal-external-id");
        finish({
          sdkReady: true,
          permission: perm,
          optedIn,
          onesignalId,
          externalId,
          pushSubscriptionId,
        });
      } catch (err) {
        finish({
          ...empty,
          permission: (typeof Notification !== "undefined" ? Notification.permission : "unsupported") as any,
          externalId: safeLocal("trac-one-signal-external-id"),
        });
      }
    });
  });
}

function safeLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// One-shot: request permission → opt in → link to Supabase user id.
// Used by the "Enable & Link Push" button in the diagnostics panel.
export async function enableAndLinkPush(supabaseUserId: string | null | undefined): Promise<{ ok: boolean; reason?: string }> {
  if (typeof window === "undefined") return { ok: false, reason: "not-in-browser" };

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        // 1. Browser permission
        if (OneSignal?.Notifications?.requestPermission) {
          const granted = await OneSignal.Notifications.requestPermission();
          if (!granted) {
            return resolve({ ok: false, reason: "permission-denied" });
          }
        }
        // 2. Opt in (Web SDK requires explicit opt-in even after permission)
        if (OneSignal?.User?.PushSubscription?.optIn) {
          try {
            await OneSignal.User.PushSubscription.optIn();
          } catch {}
        }
        // 3. Link Supabase user id
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
