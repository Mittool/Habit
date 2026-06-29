import { create } from "zustand";
import { persist } from "zustand/middleware";
import { format } from "date-fns";
import { triggerCloudSync } from "./cloud";
import { playHabitDoneSound, playMilestoneSound, triggerHapticLight, triggerHapticSuccess } from "./audio";

export type Theme = "white-paper" | "dark-paper" | "zen";
export type MoodType = "great" | "good" | "neutral" | "bad" | "awful";

export interface Habit {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  completions: Record<string, boolean>; // date string -> completed
  goal?: string;
  notificationTime?: string; // e.g. "14:30" (locked in on first completion)
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  pomodoroCount: number;
  habitId?: string;
}

export interface TimeBlock {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string;
  label: string;
  habitId?: string;
  todoId?: string;
  color?: string;
  date: string;
}

export interface MoodEntry {
  date: string;
  mood: MoodType;
  note?: string;
}

export interface SleepEntry {
  id: string;
  date: string; // "yyyy-MM-dd"
  bedtime: string; // e.g. "23:30"
  waketime: string; // e.g. "07:00"
  durationHours: number; // e.g. 7.5
  quality: "excellent" | "good" | "fair" | "poor";
  note?: string;
}

export interface FocusSession {
  date: string;
  minutes: number;
}

export interface PomodoroSettings {
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  updatedAt?: number;
}

interface AppState {
  // Auth
  user: UserProfile | null;
  isAuthenticated: boolean;
  theme: Theme;
  onboardingDone: boolean;
  aiEnabled: boolean;
  notificationsEnabled: boolean;
  cloudSyncEnabled: boolean;

  // Habits
  habits: Habit[];
  
  // Todos
  todos: TodoItem[];

  // Time blocks
  timeBlocks: TimeBlock[];

  // Mood
  moodEntries: MoodEntry[];

  // Sleep
  sleepEntries: SleepEntry[];

  // Focus
  focusSessions: FocusSession[];
  pomodoroSettings: PomodoroSettings;

  // Quotes
  dailyQuote: { text: string; author: string; date: string } | null;

  // AI notifications
  aiNotifications: { id: string; message: string; timestamp: string; read: boolean }[];

  // Actions
  setUser: (user: UserProfile | null) => void;
  setAuthenticated: (val: boolean) => void;
  setTheme: (theme: Theme) => void;
  setOnboardingDone: (val: boolean) => void;
  setAiEnabled: (val: boolean) => void;
  setNotificationsEnabled: (val: boolean) => void;
  setCloudSyncEnabled: (val: boolean) => void;

  addHabit: (habit: Omit<Habit, "id" | "createdAt" | "completions">) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, date: string) => void;

  addTodo: (todo: Omit<TodoItem, "id" | "createdAt" | "pomodoroCount">) => void;
  updateTodo: (id: string, updates: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  incrementPomodoro: (id: string) => void;

  addTimeBlock: (block: Omit<TimeBlock, "id">) => void;
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void;
  deleteTimeBlock: (id: string) => void;

  addMoodEntry: (entry: MoodEntry) => void;
  addSleepEntry: (entry: SleepEntry) => void;
  deleteSleepEntry: (id: string) => void;

  addFocusSession: (minutes: number) => void;
  setPomodoroSettings: (settings: PomodoroSettings) => void;

  setDailyQuote: (quote: { text: string; author: string; date: string }) => void;

  addAiNotification: (message: string) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      theme: "white-paper",
      onboardingDone: false,
      aiEnabled: true,
      notificationsEnabled: true,
      cloudSyncEnabled: false,

      habits: [],
      todos: [],
      timeBlocks: [],
      moodEntries: [],
      sleepEntries: [],
      focusSessions: [],
      pomodoroSettings: {
        focusMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        sessionsBeforeLongBreak: 4,
      },
      dailyQuote: null,
      aiNotifications: [],

      setUser: (user) => set({ user }),
      setAuthenticated: (val) => set({ isAuthenticated: val }),
      setTheme: (theme) => set({ theme }),
      setOnboardingDone: (val) => set({ onboardingDone: val }),
      setAiEnabled: (val) => set({ aiEnabled: val }),
      setNotificationsEnabled: (val) => set({ notificationsEnabled: val }),
      setCloudSyncEnabled: (val) => {
        set({ cloudSyncEnabled: val });
        if (val) triggerCloudSync();
      },

      addHabit: (habit) =>
        set((state) => ({
          habits: [
            ...state.habits,
            {
              ...habit,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              completions: {},
            },
          ],
        })),

      updateHabit: (id, updates) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        })),

      deleteHabit: (id) =>
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        })),

      toggleHabitCompletion: (habitId, date) => {
        set((state) => {
          const nowHHMM = format(new Date(), "HH:mm");
          let soundTriggered = false;
          let milestoneReached = false;

          const nextHabits = state.habits.map((h) => {
            if (h.id !== habitId) return h;
            const completions = { ...h.completions };
            const wasDone = completions[date];
            completions[date] = !wasDone;

            let notificationTime = h.notificationTime;
            if (!wasDone) {
              notificationTime = nowHHMM;
              soundTriggered = true;

              const completionsCount = Object.keys(completions).filter((k) => completions[k]).length;
              if (completionsCount === 1 || completionsCount === 7 || completionsCount === 30 || completionsCount === 100) {
                milestoneReached = true;
              }
            }

            return { ...h, completions, notificationTime };
          });

          if (soundTriggered) {
            const perfectDay = nextHabits.every((h) => h.completions && h.completions[date]);
            if (perfectDay && nextHabits.length >= 2) milestoneReached = true;

            if (milestoneReached) {
              playMilestoneSound();
              triggerHapticSuccess();
              if (typeof window !== "undefined") window.dispatchEvent(new Event("trac_confetti_rain"));
            } else {
              playHabitDoneSound();
              triggerHapticLight();
            }
          }

          return { habits: nextHabits };
        });
      },

      addTodo: (todo) =>
        set((state) => ({
          todos: [
            ...state.todos,
            {
              ...todo,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              pomodoroCount: 0,
            },
          ],
        })),

      updateTodo: (id, updates) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTodo: (id) =>
        set((state) => ({
          todos: state.todos.filter((t) => t.id !== id),
        })),

      incrementPomodoro: (id) =>
        set((state) => ({
          todos: state.todos.map((t) =>
            t.id === id ? { ...t, pomodoroCount: t.pomodoroCount + 1 } : t
          ),
        })),

      addTimeBlock: (block) =>
        set((state) => ({
          timeBlocks: [
            ...state.timeBlocks,
            { ...block, id: crypto.randomUUID() },
          ],
        })),

      updateTimeBlock: (id, updates) =>
        set((state) => ({
          timeBlocks: state.timeBlocks.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        })),

      deleteTimeBlock: (id) =>
        set((state) => ({
          timeBlocks: state.timeBlocks.filter((b) => b.id !== id),
        })),

      addMoodEntry: (entry) =>
        set((state) => {
          const existing = state.moodEntries.findIndex((m) => m.date === entry.date);
          if (existing >= 0) {
            const updated = [...state.moodEntries];
            updated[existing] = entry;
            return { moodEntries: updated };
          }
          return { moodEntries: [...state.moodEntries, entry] };
        }),

      addSleepEntry: (entry) =>
        set((state) => {
          const existing = state.sleepEntries.findIndex((s) => s.date === entry.date);
          if (existing >= 0) {
            const updated = [...state.sleepEntries];
            updated[existing] = entry;
            return { sleepEntries: updated };
          }
          return { sleepEntries: [entry, ...state.sleepEntries] };
        }),

      deleteSleepEntry: (id) =>
        set((state) => ({
          sleepEntries: state.sleepEntries.filter((s) => s.id !== id),
        })),

      addFocusSession: (minutes) =>
        set((state) => {
          const today = format(new Date(), "yyyy-MM-dd");
          const existing = state.focusSessions.findIndex((s) => s.date === today);
          if (existing >= 0) {
            const updated = [...state.focusSessions];
            updated[existing] = { ...updated[existing], minutes: updated[existing].minutes + minutes };
            return { focusSessions: updated };
          }
          return { focusSessions: [...state.focusSessions, { date: today, minutes }] };
        }),

      setPomodoroSettings: (settings) => set({ pomodoroSettings: settings }),

      setDailyQuote: (quote) => set({ dailyQuote: quote }),

      addAiNotification: (message) =>
        set((state) => ({
          aiNotifications: [
            {
              id: crypto.randomUUID(),
              message,
              timestamp: new Date().toISOString(),
              read: false,
            },
            ...state.aiNotifications.slice(0, 19),
          ],
        })),

      markNotificationRead: (id) =>
        set((state) => ({
          aiNotifications: state.aiNotifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      clearNotifications: () => set({ aiNotifications: [] }),
    }),
    {
      name: "habitflow-storage",
    }
  )
);

// Helpers
export function getTodayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

export function getHabitStreak(habit: Habit): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    if (habit.completions[key]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getHabitBestStreak(habit: Habit): number {
  const dates = Object.keys(habit.completions)
    .filter((k) => habit.completions[k])
    .sort();
  if (dates.length === 0) return 0;

  let best = 1;
  let current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

export function getHabitCompletionRate(habit: Habit, days = 30): number {
  const today = new Date();
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    if (habit.completions[key]) completed++;
  }
  return Math.round((completed / days) * 100);
}

// Auto-sync workspace state to Supabase Cloud Database upon any data update
if (typeof window !== "undefined") {
  useAppStore.subscribe(() => {
    triggerCloudSync();
  });
}
