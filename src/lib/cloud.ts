// Supabase Cloud Storage, Rehydration, Profile Sync & Account Isolation Engine
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

    // Also trigger full cloud backup sync to mirror name inside backup payload
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

  // Only sync if user explicitly enabled Cloud Save & is signed in
  if (!state.cloudSyncEnabled || !state.isAuthenticated || !state.user?.id || state.user.id === "local") return;

  if (syncTimeout) clearTimeout(syncTimeout);

  // Debounce sync requests by 1.2 seconds
  syncTimeout = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      // Enforce User Isolation: Never sync data if JWT UID doesn't match active store UID
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
        cloudUpdatedAt: new Date().toISOString(),
      };

      const { error } = await supabase!.auth.updateUser({
        data: { 
          trac_cloud_backup: cloudPayload,
          name: state.user.name,
          profileUpdatedAt: state.user.updatedAt || Date.now()
        }
      });

      if (error) {
        console.error("[Cloud Database] Sync transmission failed:", error.message);
      } else {
        console.log("[Cloud Database] State & profile secured for UID:", session.user.id);
      }
    } catch (err) {
      console.error("[Cloud Database] Runtime sync exception:", err);
    }
  }, 1200);
}

// Restore saved cloud state upon sign in or app startup
export async function restoreFromCloudDatabase(): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return false;

    const metadata = session.user.user_metadata || {};
    const backup = metadata?.trac_cloud_backup;
    const currentState = useAppStore.getState();
    const localUser = currentState.user;

    // Display Name Conflict Resolution (Deterministic Timestamp Merge)
    const cloudName = backup?.userName || metadata?.name || session.user.email?.split("@")[0] || "User";
    const cloudTime = Math.max((metadata?.profileUpdatedAt as number) || 0, (backup?.userUpdatedAt as number) || 0);
    const localTime = localUser?.updatedAt || 0;

    let definitiveName = cloudName;
    let definitiveTime = cloudTime;

    // If local profile name was edited more recently offline while disconnected, prefer local!
    if (localUser && localTime > cloudTime && localUser.name && localUser.id === session.user.id) {
      definitiveName = localUser.name;
      definitiveTime = localTime;
      // Mirror newer local name back up to cloud profile automatically
      supabase.auth.updateUser({ data: { name: definitiveName, profileUpdatedAt: definitiveTime } });
    }

    // If cloud backup exists for this account, restore it strictly isolated
    if (backup && backup.habits) {
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
        onboardingDone: true,
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: definitiveName,
          updatedAt: definitiveTime,
        },
      });
      console.log("[Cloud Database] Restored account records & onboarding status for UID:", session.user.id);
      return true;
    } 
    // If no cloud backup exists for this account
    else {
      const wasLocalGuest = !currentState.user || currentState.user.id === "local";
      const isAlreadyOnboarded = metadata?.onboarding_completed === true;

      if (wasLocalGuest && currentState.habits.length > 0) {
        useAppStore.setState({
          isAuthenticated: true,
          cloudSyncEnabled: true,
          onboardingDone: isAlreadyOnboarded || currentState.onboardingDone,
          user: {
            id: session.user.id,
            email: session.user.email || "",
            name: definitiveName,
            updatedAt: definitiveTime,
          }
        });
        triggerCloudSync();
      } else {
        useAppStore.setState({
          habits: [],
          todos: [],
          timeBlocks: [],
          moodEntries: [],
          sleepEntries: [],
          focusSessions: [],
          isAuthenticated: true,
          cloudSyncEnabled: true,
          onboardingDone: isAlreadyOnboarded,
          user: {
            id: session.user.id,
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

// Complete Account Sign Out & Local Session Purge
export async function performIsolatedSignOut(): Promise<void> {
  if (syncTimeout) clearTimeout(syncTimeout);

  if (typeof window !== "undefined" && supabase) {
    try {
      await supabase.auth.signOut();
    } catch {}
  }

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
  }
}
