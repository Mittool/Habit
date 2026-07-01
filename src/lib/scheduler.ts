// Central notification scheduler.
//
// Rules from spec:
//   Step 7 — cancel previous notification whenever the user:
//     - edits a habit / task
//     - deletes a habit / task
//     - changes a reminder
//     - completes a habit
//   Step 8 — daily refresh: recompute ALL reminders when app opens each day
//
// This module is called from the Zustand store's actions and from the app's
// mount effect. It never mutates state directly — it computes what should be
// scheduled and hands that to the transport layer (OneSignal via /api/notifications).

"use client";

import { Habit, TodoItem } from "./store";
import { computeNextReminder, computeTaskReminder } from "./reminders";

interface ScheduleResult {
  nextFireAt: string | null; // ISO or null when nothing scheduled
  externalId: string | null; // stable id we send to OneSignal so we can cancel it
  reason?: string;
}

function getExternalUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Written by AuthProvider / cloud sync when user logs in
    const raw = localStorage.getItem("trac-one-signal-external-id");
    if (raw && raw !== "null" && raw !== "undefined") return raw;
    // Fallback: anonymous device id
    let anon = localStorage.getItem("trac-anon-device-id");
    if (!anon) {
      anon = `anon-${Math.random().toString(36).slice(2)}-${Date.now()}`;
      localStorage.setItem("trac-anon-device-id", anon);
    }
    return anon;
  } catch {
    return null;
  }
}

async function apiCall(action: string, payload: Record<string, unknown>): Promise<any> {
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      console.warn(`[scheduler] /api/notifications ${action} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[scheduler] /api/notifications ${action} failed:`, err);
    return null;
  }
}

// ─── Habits ──────────────────────────────────────────────────
export async function scheduleHabitReminder(habit: Habit): Promise<ScheduleResult> {
  // Always cancel any existing scheduled reminder first (step 7)
  if (habit.scheduledReminderId) {
    await apiCall("cancel", { notificationId: habit.scheduledReminderId });
  }

  if (habit.notificationEnabled === false) {
    return { nextFireAt: null, externalId: null, reason: "notifications-disabled" };
  }

  const result = computeNextReminder({
    completionHistory: habit.completionHistory || [],
    manualReminderHHMM: habit.reminderTime,
    reminderDays: habit.reminderDays,
  });

  if (!result) {
    return { nextFireAt: null, externalId: null, reason: "no-schedule-possible" };
  }

  // If today is done, push at least to tomorrow — no point reminding about a
  // completed habit later today.
  const todayKey = new Date().toISOString().slice(0, 10);
  const doneToday = !!habit.completions?.[todayKey];
  let fireAt = result.nextFireAt;
  if (doneToday && fireAt.toDateString() === new Date().toDateString()) {
    fireAt = new Date(fireAt.getTime() + 24 * 60 * 60 * 1000);
  }

  const externalUserId = getExternalUserId();
  if (!externalUserId) {
    return { nextFireAt: fireAt.toISOString(), externalId: null, reason: "no-user-id" };
  }

  const scheduled = await apiCall("schedule", {
    externalUserId,
    targetType: "habit",
    targetId: habit.id,
    title: `Trac: ${habit.name}`,
    body: `⏰ Time for "${habit.name}" — it's about when you usually do it.`,
    sendAt: fireAt.toISOString(),
  });

  return {
    nextFireAt: fireAt.toISOString(),
    externalId: scheduled?.notificationId ?? null,
    reason: result.reason,
  };
}

export async function cancelHabitReminder(habit: Habit): Promise<void> {
  if (habit.scheduledReminderId) {
    await apiCall("cancel", { notificationId: habit.scheduledReminderId });
  }
}

// ─── Tasks (todos) ───────────────────────────────────────────
export async function scheduleTaskReminder(todo: TodoItem): Promise<ScheduleResult> {
  if (todo.scheduledReminderId) {
    await apiCall("cancel", { notificationId: todo.scheduledReminderId });
  }
  if (todo.completed || !todo.dueAt) {
    return { nextFireAt: null, externalId: null, reason: "no-due-or-completed" };
  }
  const fireAt = computeTaskReminder(todo.dueAt, todo.leadTimeMinutes ?? 10);
  if (!fireAt) return { nextFireAt: null, externalId: null, reason: "past-due" };

  const externalUserId = getExternalUserId();
  if (!externalUserId) return { nextFireAt: fireAt.toISOString(), externalId: null, reason: "no-user-id" };

  const scheduled = await apiCall("schedule", {
    externalUserId,
    targetType: "todo",
    targetId: todo.id,
    title: `Task Reminder`,
    body: `${todo.text} — starts in ${todo.leadTimeMinutes ?? 10} minutes.`,
    sendAt: fireAt.toISOString(),
  });

  return {
    nextFireAt: fireAt.toISOString(),
    externalId: scheduled?.notificationId ?? null,
    reason: "task-fixed-lead",
  };
}

export async function cancelTaskReminder(todo: TodoItem): Promise<void> {
  if (todo.scheduledReminderId) {
    await apiCall("cancel", { notificationId: todo.scheduledReminderId });
  }
}

// ─── Daily refresh (step 8) ─────────────────────────────────
// Called from src/app/page.tsx once on mount and again at local midnight.
// Recomputes every habit & task reminder so timezone changes, edits, and
// updated rolling averages all take effect without manual action.

const REFRESH_KEY = "trac-last-daily-refresh";

export async function refreshAllReminders(): Promise<void> {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(REFRESH_KEY);
  if (last === today) return; // already refreshed today

  const { useAppStore } = await import("./store");
  const state = useAppStore.getState();

  for (const habit of state.habits) {
    const result = await scheduleHabitReminder(habit);
    state.updateHabit(habit.id, {
      scheduledReminderAt: result.nextFireAt ?? undefined,
      scheduledReminderId: result.externalId ?? undefined,
    });
  }
  for (const todo of state.todos) {
    if (todo.completed || !todo.dueAt) continue;
    const result = await scheduleTaskReminder(todo);
    state.updateTodo(todo.id, {
      scheduledReminderAt: result.nextFireAt ?? undefined,
      scheduledReminderId: result.externalId ?? undefined,
    });
  }

  localStorage.setItem(REFRESH_KEY, today);
  console.log(`[scheduler] Daily refresh complete for ${today}`);
}

export function scheduleMidnightRefresh() {
  if (typeof window === "undefined") return () => {};
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 5, 0); // 5s after midnight to avoid edge
  const ms = midnight.getTime() - now.getTime();
  const timeout = setTimeout(() => {
    refreshAllReminders();
    // Recurse for the next day
    scheduleMidnightRefresh();
  }, ms);
  return () => clearTimeout(timeout);
}
