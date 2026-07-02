// Supabase Cloud Storage, Local Disk Partitioning, Rehydration, Profile Sync & Account Isolation Engine
"use client";
import { supabase } from "./supabase";
import { useAppStore } from "./store";

let syncTimeout: NodeJS.Timeout | null = null;

// Save display name locally & transmit to Supabase cloud profile (UID scoped)
export async function syncUserProfileName(cleanName: string): Promise<{ success: boolean; offline: boolean }> {
  if (typeof window === "undefined") return { success: false, offline: true };
  const state = useAppStore.getState();
  const now = Date.now();

  // 1. Update local Zustand memory & disk cache immediately
  if (state.user) {
    useAppStore.setState({
      user: { ...state.user, name: cleanName, updatedAt: now }
    });
  }

  // 2. If offline or guest browsing ("local"), flag as offline local save
  if (!supabase || !state.user?.id || state.user.id === "local") {
    return { success: true, offline: true };
  }

  try {
    // 3. Save to authenticated user's cloud profile metadata immediately
    const { error } = await supabase.auth.updateUser({
      data: { name: cleanName, profileUpdatedAt: now }
    });
    if (error) throw error;

    triggerCloudSync();

    console.log("[Cloud Profile] Successfully secured display name to cloud profile UID:", state.user.id);
    return { success: true, offline: false };
  } catch (err) {
    console.error("[Cloud Profile] Name sync transmission exception:", err);
    return { success: false, offline: false };
  }
}

// Auto-sync active workspace state to Supabase User Metadata (Scoped strictly to authenticated UID)
export function triggerCloudSync() {
  if (typeof window === "undefined" || !supabase) return;
  const state = useAppStore.getState();

  if (!state.isAuthenticated || !state.user?.id || state.user.id === "local") return;

  // Also continuously backup current user partition locally to disk
  saveLocalUserPartition(state);

  if (!state.cloudSyncEnabled) {
    supabase.auth.updateUser({
      data: {
        name: state.user.name,
        profileUpdatedAt: state.user.updatedAt || Date.now(),
        trac_cloud_backup: { cloudSyncEnabled: false, userName: state.user.name, cloudUpdatedAt: new Date().toISOString() }
      }
    });
    return;
  }

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    await performCloudSync();
  }, 1500);
}

// Flush pending sync IMMEDIATELY, bypassing the debounce, and wait for it
// to complete. Use this before any navigation that would cause the next
// restore-from-cloud to overwrite unsynced local state (e.g. finishing
// onboarding).
export async function flushCloudSync(): Promise<void> {
  if (typeof window === "undefined" || !supabase) return;
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  await performCloudSync();
}

async function performCloudSync(): Promise<void> {
  const state = useAppStore.getState();
  if (!state.isAuthenticated || !state.user?.id || state.user.id === "local") return;
  // Always mirror to local partition even if we bail on cloud below
  saveLocalUserPartition(state);
  if (!supabase) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== state.user?.id) return;

    const cloudPayload = {
      habits: state.habits,
      todos: state.todos,
      timeBlocks: state.timeBlocks,
      moodEntries: state.moodEntries,
      sleepEntries: state.sleepEntries,
      focusSessions: state.focusSessions,
      pomodoroSettings: state.pomodoroSettings,
      theme: state.theme,
      notificationsEnabled: state.notificationsEnabled,
      userName: state.user.name,
      userUpdatedAt: state.user.updatedAt || Date.now(),
      cloudSyncEnabled: state.cloudSyncEnabled,
      onboardingDone: state.onboardingDone,
      cloudUpdatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.auth.updateUser({
      data: {
        trac_cloud_backup: cloudPayload,
        name: state.user.name,
        profileUpdatedAt: state.user.updatedAt || Date.now(),
      }
    });

    if (error) {
      console.error("[Cloud Database] Sync transmission failed:", error.message);
    } else {
      console.log("[Cloud Database] State & profile secured for UID:", session.user.id);
    }
  } catch (err) {
    console.error("[Cloud Database] Sync exception:", err);
  }
}

// Helper: Save local disk cache partitioned strictly by UID
function saveLocalUserPartition(state: any) {
  if (typeof window === "undefined" || !state.user?.id || state.user.id === "local") return;
  const partKey = `trac_local_part_${state.user.id}`;
  const payload = {
    habits: state.habits,
    todos: state.todos,
    timeBlocks: state.timeBlocks,
    moodEntries: state.moodEntries,
    sleepEntries: state.sleepEntries,
    focusSessions: state.focusSessions,
    pomodoroSettings: state.pomodoroSettings,
    theme: state.theme,
    notificationsEnabled: state.notificationsEnabled,
    cloudSyncEnabled: state.cloudSyncEnabled,
    onboardingDone: state.onboardingDone,
    userName: state.user.name,
    userUpdatedAt: state.user.updatedAt || Date.now(),
  };
  localStorage.setItem(partKey, JSON.stringify(payload));
}

// Restore saved cloud or local partition state upon sign in or app startup
export async function restoreFromCloudDatabase(): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return false;

    const uid = session.user.id;
    const metadata = session.user.user_metadata || {};
    const backup = metadata?.trac_cloud_backup;
    const currentState = useAppStore.getState();
    const localUser = currentState.user;

    // Load Local Disk Partition for this specific UID
    let localPart: any = null;
    if (typeof window !== "undefined") {
      const savedPart = localStorage.getItem(`trac_local_part_${uid}`);
      if (savedPart) {
        try { localPart = JSON.parse(savedPart); } catch {}
      }
    }

    // Display Name Conflict Resolution (Timestamp Deterministic Merge)
    const cloudName = backup?.userName || metadata?.name || session.user.email?.split("@")[0] || "User";
    const cloudTime = Math.max((metadata?.profileUpdatedAt as number) || 0, (backup?.userUpdatedAt as number) || 0);
    const localPartTime = localPart?.userUpdatedAt || 0;
    const storeTime = localUser?.updatedAt || 0;
    const peakLocalTime = Math.max(localPartTime, storeTime);

    let definitiveName = cloudName;
    let definitiveTime = cloudTime;

    if (peakLocalTime > cloudTime) {
      definitiveName = localPart?.userName || localUser?.name || cloudName;
      definitiveTime = peakLocalTime;
      supabase.auth.updateUser({ data: { name: definitiveName, profileUpdatedAt: definitiveTime } });
    }

    // SCENARIO 1: Cloud Sync is active for this account on Supabase
    if (backup && backup.cloudSyncEnabled === true && backup.habits) {
      useAppStore.setState({
        habits: backup.habits || [],
        todos: backup.todos || [],
        timeBlocks: backup.timeBlocks || [],
        moodEntries: backup.moodEntries || [],
        sleepEntries: backup.sleepEntries || [],
        focusSessions: backup.focusSessions || [],
        pomodoroSettings: backup.pomodoroSettings || currentState.pomodoroSettings,
        theme: backup.theme || currentState.theme,
        notificationsEnabled: backup.notificationsEnabled !== undefined ? backup.notificationsEnabled : true,
        isAuthenticated: true,
        cloudSyncEnabled: true,
        onboardingDone: backup.onboardingDone || true,
        user: {
          id: uid,
          email: session.user.email || "",
          name: definitiveName,
          updatedAt: definitiveTime,
        },
      });
      console.log("[Cloud Database] Restored cloud backup for UID:", uid);
      return true;
    }
    // SCENARIO 2: Cloud Sync is OFF, but local partition records exist on device for this UID!
    else if (localPart && (localPart.habits?.length > 0 || localPart.onboardingDone)) {
      useAppStore.setState({
        habits: localPart.habits || [],
        todos: localPart.todos || [],
        timeBlocks: localPart.timeBlocks || [],
        moodEntries: localPart.moodEntries || [],
        sleepEntries: localPart.sleepEntries || [],
        focusSessions: localPart.focusSessions || [],
        pomodoroSettings: localPart.pomodoroSettings || currentState.pomodoroSettings,
        theme: localPart.theme || currentState.theme,
        notificationsEnabled: localPart.notificationsEnabled !== undefined ? localPart.notificationsEnabled : true,
        isAuthenticated: true,
        cloudSyncEnabled: false, // Remains optional OFF as user preferred
        onboardingDone: localPart.onboardingDone || true,
        user: {
          id: uid,
          email: session.user.email || "",
          name: definitiveName,
          updatedAt: definitiveTime,
        },
      });
      console.log("[Local Partition] Restored local un-synced data partition for UID:", uid);
      return true;
    }
    // SCENARIO 3: Brand new login or guest upload
    else {
      const wasLocalGuest = !currentState.user || currentState.user.id === "local";
      const isAlreadyOnboarded = metadata?.onboarding_completed === true;

      if (wasLocalGuest && currentState.habits.length > 0) {
        useAppStore.setState({
          isAuthenticated: true,
          cloudSyncEnabled: false,
          onboardingDone: isAlreadyOnboarded || currentState.onboardingDone,
          user: {
            id: uid,
            email: session.user.email || "",
            name: definitiveName,
            updatedAt: definitiveTime,
          }
        });
        saveLocalUserPartition(useAppStore.getState());
      } else {
        useAppStore.setState({
          habits: [],
          todos: [],
          timeBlocks: [],
          moodEntries: [],
          sleepEntries: [],
          focusSessions: [],
          isAuthenticated: true,
          cloudSyncEnabled: false,
          onboardingDone: isAlreadyOnboarded,
          user: {
            id: uid,
            email: session.user.email || "",
            name: definitiveName,
            updatedAt: definitiveTime,
          }
        });
      }
      return true;
    }
  } catch (err) {
    console.error("[Cloud Database] Restore exception:", err);
  }
  return false;
}

// Complete Account Sign Out & Isolated Local Working Cache Purge
export async function performIsolatedSignOut(): Promise<void> {
  if (syncTimeout) clearTimeout(syncTimeout);
  const state = useAppStore.getState();

  // Cancel every currently-scheduled OneSignal reminder for this user's
  // habits / todos / timeblocks BEFORE we log out. Otherwise those pushes
  // remain in OneSignal's queue and — because the next user to sign in on
  // this same device will inherit the push subscription — would end up
  // delivered to the wrong person.
  try {
    const { cancelHabitReminder, cancelTaskReminder, cancelTimeBlockReminder } = await import("./scheduler");
    await Promise.allSettled([
      ...state.habits.map((h) => cancelHabitReminder(h)),
      ...state.todos.map((t) => cancelTaskReminder(t)),
      ...state.timeBlocks.map((b) => cancelTimeBlockReminder(b)),
    ]);
  } catch (err) {
    console.warn("[Sign Out] Reminder cleanup error:", err);
  }

  // Unlink the OneSignal external_user_id from this device so any future
  // pushes targeted at the previous user's id do NOT arrive on this device.
  try {
    const { clearOneSignalExternalUserId } = await import("./onesignal");
    clearOneSignalExternalUserId();
  } catch (err) {
    console.warn("[Sign Out] OneSignal logout error:", err);
  }

  // Save current user partition to disk before logging out (so re-login
  // restores the user's data). We do this AFTER the reminder cleanup so
  // the ids we just cancelled are not lingering in the saved partition.
  saveLocalUserPartition(state);

  if (typeof window !== "undefined" && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }

  // Purge active shared working memory
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
    onboardingDone: false,
    cloudSyncEnabled: false,
    habits: [],
    todos: [],
    timeBlocks: [],
    moodEntries: [],
    sleepEntries: [],
    focusSessions: [],
  });

  if (typeof window !== "undefined") {
    localStorage.removeItem("habitflow-storage");
    // Also blow away the daily-refresh guard, the per-day sent markers, and
    // the reminder ledger keys so the NEXT signed-in user starts fresh.
    localStorage.removeItem("trac-last-daily-refresh");
    Object.keys(localStorage).forEach((k) => {
      if (
        k.startsWith("trac-intel-remind-") ||
        k.startsWith("trac-intel-follow-") ||
        k.startsWith("trac-intel-sum-") ||
        k.startsWith("trac-intel-rev-") ||
        k.startsWith("trac-reminder-ledger-")
      ) {
        localStorage.removeItem(k);
      }
    });
  }
}
