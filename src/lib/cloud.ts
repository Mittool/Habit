// Supabase Cloud Storage, Rehydration & Account Isolation Engine
"use client";
import { supabase } from "./supabase";
import { useAppStore } from "./store";

let syncTimeout: NodeJS.Timeout | null = null;

// Auto-sync active workspace state to Supabase User Metadata (Scoped strictly to authenticated UID)
export function triggerCloudSync() {
  if (typeof window === "undefined" || !supabase) return;
  const state = useAppStore.getState();

  // Only sync if user explicitly enabled Cloud Save & is signed in
  if (!state.cloudSyncEnabled || !state.isAuthenticated || !state.user?.id) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  // Debounce sync requests by 1.5 seconds
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
        cloudUpdatedAt: new Date().toISOString(),
      };

      const { error } = await supabase!.auth.updateUser({
        data: { trac_cloud_backup: cloudPayload }
      });

      if (error) {
        console.error("[Cloud Database] Sync transmission failed:", error.message);
      } else {
        console.log("[Cloud Database] State secured for UID:", session.user.id);
      }
    } catch (err) {
      console.error("[Cloud Database] Runtime sync exception:", err);
    }
  }, 1500);
}

// Restore saved cloud state upon sign in or app startup
export async function restoreFromCloudDatabase(): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return false;

    const metadata = session.user.user_metadata;
    const backup = metadata?.trac_cloud_backup;
    const currentState = useAppStore.getState();

    // If cloud backup exists for this account, restore it strictly
    if (backup && backup.habits) {
      useAppStore.setState({
        habits: backup.habits || [],
        todos: backup.todos || [],
        timeBlocks: backup.timeBlocks || [],
        moodEntries: backup.moodEntries || [],
        sleepEntries: backup.sleepEntries || [],
        focusSessions: backup.focusSessions || [],
        pomodoroSettings: backup.pomodoroSettings || currentState.pomodoroSettings,
        isAuthenticated: true,
        cloudSyncEnabled: true,
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: metadata.name || session.user.email?.split("@")[0] || "User",
        },
      });
      console.log("[Cloud Database] Restored isolated account backup for UID:", session.user.id);
      return true;
    } 
    // If no cloud backup exists for this newly signed in account
    else {
      // Check if local data belonged to a guest session ("local" or unauthenticated)
      const wasLocalGuest = !currentState.user || currentState.user.id === "local";

      // If there is local guest data, upload it as this account's inaugural cloud backup
      if (wasLocalGuest && currentState.habits.length > 0) {
        useAppStore.setState({
          isAuthenticated: true,
          cloudSyncEnabled: true,
          user: {
            id: session.user.id,
            email: session.user.email || "",
            name: metadata?.name || session.user.email?.split("@")[0] || "User",
          }
        });
        triggerCloudSync();
      } else {
        // Start fresh for this account to guarantee zero data leaks from previous sessions
        useAppStore.setState({
          habits: [],
          todos: [],
          timeBlocks: [],
          moodEntries: [],
          sleepEntries: [],
          focusSessions: [],
          isAuthenticated: true,
          cloudSyncEnabled: true,
          user: {
            id: session.user.id,
            email: session.user.email || "",
            name: metadata?.name || session.user.email?.split("@")[0] || "User",
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

  // Purge in-memory state and reset local cache
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
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
