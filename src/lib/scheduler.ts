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

import { Habit, TimeBlock, TodoItem } from "./store";
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

  const externalId = scheduled?.notificationId ?? null;
  if (externalId) recordScheduled("habit", habit.id, externalId);
  return {
    nextFireAt: fireAt.toISOString(),
    externalId,
    reason: result.reason,
  };
}

export async function cancelHabitReminder(habit: Habit): Promise<void> {
  if (habit.scheduledReminderId) {
    await apiCall("cancel", { notificationId: habit.scheduledReminderId });
  }
  // Also cancel any ledger entries for this habit (belt-and-braces:
  // scheduledReminderId may be stale if the last successful schedule was
  // on a different device or an earlier session).
  const ledger = readLedger();
  const orphaned = ledger.filter((e) => e.targetType === "habit" && e.targetId === habit.id && e.notificationId !== habit.scheduledReminderId);
  for (const e of orphaned) {
    await apiCall("cancel", { notificationId: e.notificationId });
  }
  forgetScheduled("habit", habit.id);
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

  const externalId = scheduled?.notificationId ?? null;
  if (externalId) recordScheduled("todo", todo.id, externalId);
  return {
    nextFireAt: fireAt.toISOString(),
    externalId,
    reason: "task-fixed-lead",
  };
}

export async function cancelTaskReminder(todo: TodoItem): Promise<void> {
  if (todo.scheduledReminderId) {
    await apiCall("cancel", { notificationId: todo.scheduledReminderId });
  }
  const ledger = readLedger();
  const orphaned = ledger.filter((e) => e.targetType === "todo" && e.targetId === todo.id && e.notificationId !== todo.scheduledReminderId);
  for (const e of orphaned) {
    await apiCall("cancel", { notificationId: e.notificationId });
  }
  forgetScheduled("todo", todo.id);
}

// ─── Time blocks (planner) ───────────────────────────────
// Time blocks are date + startTime pairs. Reminder fires leadTimeMinutes
// before startTime on the block's date. Never learns — the schedule is
// exactly what the user wrote.
export async function scheduleTimeBlockReminder(block: TimeBlock): Promise<ScheduleResult> {
  if (block.scheduledReminderId) {
    await apiCall("cancel", { notificationId: block.scheduledReminderId });
  }
  if (block.notificationEnabled === false) {
    return { nextFireAt: null, externalId: null, reason: "notifications-disabled" };
  }
  if (!block.date || !block.startTime) {
    return { nextFireAt: null, externalId: null, reason: "missing-date-or-time" };
  }
  // Build a Date from block.date ("yyyy-MM-dd") + block.startTime ("HH:MM")
  const [hh, mm] = block.startTime.split(":").map(Number);
  if (isNaN(hh) || isNaN(mm)) {
    return { nextFireAt: null, externalId: null, reason: "bad-time-format" };
  }
  const startDate = new Date(`${block.date}T00:00:00`);
  startDate.setHours(hh, mm, 0, 0);
  const leadMs = (block.leadTimeMinutes ?? 5) * 60 * 1000;
  const fireAt = new Date(startDate.getTime() - leadMs);
  if (fireAt.getTime() <= Date.now()) {
    return { nextFireAt: null, externalId: null, reason: "past-start-time" };
  }

  const externalUserId = getExternalUserId();
  if (!externalUserId) {
    return { nextFireAt: fireAt.toISOString(), externalId: null, reason: "no-user-id" };
  }

  const label = block.label || "Time block";
  const scheduled = await apiCall("schedule", {
    externalUserId,
    targetType: "timeblock",
    targetId: block.id,
    title: `Coming up: ${label}`,
    body: `${label} starts at ${block.startTime}${block.endTime ? ` (until ${block.endTime})` : ""}.`,
    sendAt: fireAt.toISOString(),
  });

  const externalId = scheduled?.notificationId ?? null;
  if (externalId) recordScheduled("timeblock", block.id, externalId);
  return {
    nextFireAt: fireAt.toISOString(),
    externalId,
    reason: "timeblock-fixed-lead",
  };
}

export async function cancelTimeBlockReminder(block: TimeBlock): Promise<void> {
  if (block.scheduledReminderId) {
    await apiCall("cancel", { notificationId: block.scheduledReminderId });
  }
  const ledger = readLedger();
  const orphaned = ledger.filter((e) => e.targetType === "timeblock" && e.targetId === block.id && e.notificationId !== block.scheduledReminderId);
  for (const e of orphaned) {
    await apiCall("cancel", { notificationId: e.notificationId });
  }
  forgetScheduled("timeblock", block.id);
}

// ─── Reminder ledger ────────────────────────────────────────
// Every time we schedule a reminder we also record its OneSignal
// notificationId in a persistent per-user ledger. On daily refresh we
// reconcile the ledger against the live state and cancel any leftover
// reminder whose habit/todo/timeblock was deleted (possibly from a
// different device) so ghost pushes never fire.

interface LedgerEntry {
  notificationId: string;
  targetType: "habit" | "todo" | "timeblock";
  targetId: string;
  scheduledAt: number; // Date.now() when we recorded it
}

function ledgerKey(): string | null {
  const uid = getExternalUserId();
  return uid ? `trac-reminder-ledger-${uid}` : null;
}

function readLedger(): LedgerEntry[] {
  if (typeof window === "undefined") return [];
  const key = ledgerKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLedger(entries: LedgerEntry[]) {
  if (typeof window === "undefined") return;
  const key = ledgerKey();
  if (!key) return;
  try {
    // Prune anything older than 30 days that we've never re-touched, so the
    // ledger doesn't grow unbounded.
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const cleaned = entries.filter((e) => e.scheduledAt > cutoff);
    localStorage.setItem(key, JSON.stringify(cleaned));
  } catch {}
}

function recordScheduled(targetType: LedgerEntry["targetType"], targetId: string, notificationId: string | null) {
  if (!notificationId) return;
  const entries = readLedger().filter(
    (e) => !(e.targetType === targetType && e.targetId === targetId)
  );
  entries.push({ notificationId, targetType, targetId, scheduledAt: Date.now() });
  writeLedger(entries);
}

function forgetScheduled(targetType: LedgerEntry["targetType"], targetId: string) {
  const entries = readLedger().filter(
    (e) => !(e.targetType === targetType && e.targetId === targetId)
  );
  writeLedger(entries);
}

// ─── Daily refresh (step 8) ─────────────────────────────────
// Called from src/app/page.tsx once on mount and again at local midnight.
// Recomputes every habit & task reminder so timezone changes, edits, and
// updated rolling averages all take effect without manual action. Also
// prunes ghost reminders (whose target no longer exists locally, e.g.
// because it was deleted from a different device).

const REFRESH_KEY = "trac-last-daily-refresh";

export async function refreshAllReminders(): Promise<void> {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(REFRESH_KEY);
  if (last === today) return; // already refreshed today

  const { useAppStore } = await import("./store");
  const state = useAppStore.getState();

  // 1. Prune orphans — cancel any tracked reminder whose target is no
  //    longer in the store (means it was deleted here or on another device).
  const liveHabitIds = new Set(state.habits.map((h) => h.id));
  const liveTodoIds = new Set(state.todos.map((t) => t.id));
  const liveBlockIds = new Set(state.timeBlocks.map((b) => b.id));
  const ledger = readLedger();
  const surviving: LedgerEntry[] = [];
  for (const entry of ledger) {
    const live =
      (entry.targetType === "habit" && liveHabitIds.has(entry.targetId)) ||
      (entry.targetType === "todo" && liveTodoIds.has(entry.targetId)) ||
      (entry.targetType === "timeblock" && liveBlockIds.has(entry.targetId));
    if (live) {
      surviving.push(entry);
    } else {
      // Ghost — cancel on OneSignal
      await apiCall("cancel", { notificationId: entry.notificationId });
    }
  }
  writeLedger(surviving);

  // 2. Recompute reminders for everything still alive
  for (const habit of state.habits) {
    const result = await scheduleHabitReminder(habit);
    if (result.externalId) recordScheduled("habit", habit.id, result.externalId);
    state.updateHabit(habit.id, {
      scheduledReminderAt: result.nextFireAt ?? undefined,
      scheduledReminderId: result.externalId ?? undefined,
    });
  }
  for (const todo of state.todos) {
    if (todo.completed || !todo.dueAt) continue;
    const result = await scheduleTaskReminder(todo);
    if (result.externalId) recordScheduled("todo", todo.id, result.externalId);
    state.updateTodo(todo.id, {
      scheduledReminderAt: result.nextFireAt ?? undefined,
      scheduledReminderId: result.externalId ?? undefined,
    });
  }
  const now = Date.now();
  for (const block of state.timeBlocks) {
    const startIso = `${block.date}T${block.startTime || "00:00"}`;
    const startTs = new Date(startIso).getTime();
    if (isNaN(startTs) || startTs <= now) continue;
    const result = await scheduleTimeBlockReminder(block);
    if (result.externalId) recordScheduled("timeblock", block.id, result.externalId);
    state.updateTimeBlock(block.id, {
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
