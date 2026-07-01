// OneSignal Push Notification SDK Integration (Web PWA + Mobile WebView)
"use client";

export const ONESIGNAL_APP_ID = "ad5bb9f0-fe63-460c-8a8d-cf5331800d5c";

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export async function initOneSignal() {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    try {
      await OneSignal.init({
        appId: ONESIGNAL_APP_ID,
        notifyButton: {
          enable: false, // We use custom UI buttons in Notifications tab
        },
        allowLocalhostAsSecureOrigin: true,
      });
      console.log("[OneSignal SDK] Core initialized for App ID:", ONESIGNAL_APP_ID);
    } catch (err) {
      console.error("[OneSignal SDK] Init error:", err);
    }
  });
}

// Sync user telemetry and streaks to OneSignal User Tags
export function syncOneSignalUserTags(tags: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function(OneSignal: any) {
    try {
      if (OneSignal?.User?.addTags) {
        await OneSignal.User.addTags(tags);
        console.log("[OneSignal SDK] Updated User Tags:", tags);
      }
    } catch (err) {
      console.error("[OneSignal SDK] Tag sync error:", err);
    }
  });
}

// Trigger OneSignal Web / Mobile Push Permission Request
export async function promptOneSignalPush(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
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
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.login) {
        await OneSignal.login(userId);
        console.log("[OneSignal] linked external_user_id:", userId);
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
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async function (OneSignal: any) {
    try {
      if (OneSignal?.logout) {
        await OneSignal.logout();
        console.log("[OneSignal] logged out");
      }
    } catch (err) {
      console.error("[OneSignal] logout error:", err);
    }
  });
}
