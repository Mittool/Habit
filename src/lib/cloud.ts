// Supabase Cloud Storage & Rehydration Engine
"use client";
import { supabase } from "./supabase";
import { useAppStore } from "./store";

let syncTimeout: NodeJS.Timeout | null = null;

// Auto-sync active workspace state to Supabase User Metadata
export function triggerCloudSync() {
  if (typeof window === "undefined" || !supabase) return;
  const state = useAppStore.getState();

  // Only sync if user explicitly enabled Cloud Save & is signed in
  if (!state.cloudSyncEnabled || !state.isAuthenticated) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  // Debounce sync requests by 2 seconds to avoid HTTP spam
  syncTimeout = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.user) return;

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
        console.log("[Cloud Database] State secured to Supabase Cloud:", cloudPayload.cloudUpdatedAt);
      }
    } catch (err) {
      console.error("[Cloud Database] Runtime sync exception:", err);
    }
  }, 2000);
}

// Restore saved cloud state upon sign in or app load
export async function restoreFromCloudDatabase(): Promise<boolean> {
  if (typeof window === "undefined" || !supabase) return false;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return false;

    const metadata = session.user.user_metadata;
    const backup = metadata?.trac_cloud_backup;

    if (backup && backup.habits) {
      useAppStore.setState({
        habits: backup.habits || [],
        todos: backup.todos || [],
        timeBlocks: backup.timeBlocks || [],
        moodEntries: backup.moodEntries || [],
        sleepEntries: backup.sleepEntries || [],
        focusSessions: backup.focusSessions || [],
        pomodoroSettings: backup.pomodoroSettings || useAppStore.getState().pomodoroSettings,
        isAuthenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email || "",
          name: metadata.name || session.user.email?.split("@")[0] || "User",
        },
      });
      console.log("[Cloud Database] Restored user backup from Supabase:", backup.cloudUpdatedAt);
      return true;
    }
  } catch (err) {
    console.error("[Cloud Database] Restore exception:", err);
  }
  return false;
}
