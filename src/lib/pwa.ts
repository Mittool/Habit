// Intelligent Habit Notification System & Background Engine
"use client";
import { useAppStore } from "./store";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.log("[PWA] Service Worker registered:", registration.scope);
    } catch (err) {
      console.error("[PWA] Registration failed:", err);
    }
  });
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// Rich Varied Natural Motivational Content Rotation
const CATEGORY_MESSAGES: Record<string, string[]> = {
  Reading: [
    "Your reading habit is waiting. A few pages today keeps your streak alive.",
    "Immerse yourself in a chapter today. Knowledge compounds daily.",
    "Open your book for just 5 minutes. Consistency builds lifelong wisdom."
  ],
  Workout: [
    "You are usually active around this time. Let's keep the momentum going.",
    "Move your body today. Even a quick 10-minute session energizes your mind.",
    "Physical vitality fuels mental clarity. Time for your daily workout!"
  ],
  Water: [
    "Hydration fuels everything. Take a moment for a refreshing glass of water.",
    "Keep your energy high. Time to drink water and stay replenished.",
    "Pure hydration is foundational. Enjoy a glass of water right now."
  ],
  Meditation: [
    "Take a few peaceful minutes for yourself right now. Breathe and center.",
    "Step away from the noise. Initiate your daily mindfulness practice.",
    "Calm focus begins within. Time for your daily meditation ritual."
  ],
  Sleep: [
    "A consistent bedtime helps tomorrow start strong. Wind down smoothly.",
    "Protect your restorative sleep window. Time to disconnect and rest.",
    "Peak daily performance requires quality sleep. Prepare for bed."
  ],
  Default: [
    "Small daily victories accumulate into lifelong staggering transformations.",
    "Show up today. Consistency beats intensity every single time.",
    "You do not rise to your goals, you fall to the level of your daily systems.",
    "Discipline is the foundational bridge between intention and mastery."
  ]
};

function getVariedMessage(habitName: string): string {
  for (const cat of ["Reading", "Workout", "Water", "Meditation", "Sleep"]) {
    if (habitName.toLowerCase().includes(cat.toLowerCase())) {
      const list = CATEGORY_MESSAGES[cat];
      return list[Math.floor(Math.random() * list.length)];
    }
  }
  const def = CATEGORY_MESSAGES.Default;
  return def[Math.floor(Math.random() * def.length)];
}

// Helper: Check if current time is inside Quiet Hours
function isInsideQuietHours(currentHHMM: string, qStart: string, qEnd: string): boolean {
  if (!qStart || !qEnd) return false;
  const toMins = (str: string) => {
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  };
  const curr = toMins(currentHHMM);
  const start = toMins(qStart);
  const end = toMins(qEnd);

  if (start > end) {
    // Overnight quiet hours (e.g. 22:00 to 07:00)
    return curr >= start || curr < end;
  } else {
    // Daytime quiet hours
    return curr >= start && curr < end;
  }
}

// Mobile Background Notification Scheduler for iOS & Android
export function initMobilePushScheduler(habits: Array<any>, todos: Array<any>) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const interval = setInterval(() => {
    const state = useAppStore.getState();
    const config = state.notificationConfig;

    // Abort if general notifications are disabled globally
    if (!config || !config.general.enabled) return;

    const now = new Date();
    const currentHHMM = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); // "14:25"
    const todayStr = now.toISOString().split("T")[0];
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;

    // Abort if weekend notifications are disabled and today is weekend
    if (isWeekend && !config.timing.weekendEnabled) return;

    // Abort routine check if inside Quiet Hours
    if (isInsideQuietHours(currentHHMM, config.timing.quietHoursStart, config.timing.quietHoursEnd)) {
      return;
    }

    // 1. Check Habit Reminders & Adaptive Timing
    if (config.general.habitReminders) {
      habits.forEach((h) => {
        if (h.notificationEnabled === false) return;
        const isDoneToday = h.completions && h.completions[todayStr];
        if (isDoneToday) return;

        // Determine target reminder time: Manual reminderTime OR Adaptive learnedAverage minus 15m
        let targetHHMM = h.reminderTime || h.notificationTime;
        if (config.smart.adaptiveTime && h.learnedAverageHHMM) {
          const [avgH, avgM] = h.learnedAverageHHMM.split(":").map(Number);
          let targetMins = avgH * 60 + avgM - 15;
          if (targetMins < 0) targetMins += 1440;
          const th = Math.floor(targetMins / 60).toString().padStart(2, "0");
          const tm = (targetMins % 60).toString().padStart(2, "0");
          targetHHMM = `${th}:${tm}`;
        }

        const sentKey = `trac-intel-remind-${todayStr}-${h.id}`;
        if (targetHHMM && currentHHMM === targetHHMM && !localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, "true");
          const motivText = config.smart.motivationalMessages ? `\n\n"${getVariedMessage(h.name)}"` : "";

          sendSystemNotification(`Trac Reminder: ${h.name}`, `⏰ Time for "${h.name}"!${motivText}`, config.feedback);
        }

        // 2. Missed Habit Follow-up (1 hour later)
        if (config.smart.missedFollowUp && targetHHMM) {
          const [tH, tM] = targetHHMM.split(":").map(Number);
          let followMins = tH * 60 + tM + 60; // +1 hour
          if (followMins < 1440) {
            const fh = Math.floor(followMins / 60).toString().padStart(2, "0");
            const fm = (followMins % 60).toString().padStart(2, "0");
            const followHHMM = `${fh}:${fm}`;
            const followKey = `trac-intel-follow-${todayStr}-${h.id}`;

            if (currentHHMM === followHHMM && !localStorage.getItem(followKey)) {
              localStorage.setItem(followKey, "true");
              sendSystemNotification(`Trac Check-In`, `Still planning to do "${h.name}" today? Even 5 minutes counts!`, config.feedback);
            }
          }
        }
      });
    }

    // 3. Daily Summary (8:00 PM)
    if (config.general.dailySummary && currentHHMM === "20:00") {
      const sumKey = `trac-intel-sum-${todayStr}`;
      if (!localStorage.getItem(sumKey)) {
        localStorage.setItem(sumKey, "true");
        const doneCount = habits.filter(h => h.completions && h.completions[todayStr]).length;
        sendSystemNotification(`Daily Summary`, `You completed ${doneCount} of ${habits.length} priority habits today! Keep momentum alive.`, config.feedback);
      }
    }

    // 4. Weekly Review (Sunday 7:00 PM)
    if (config.general.weeklyReview && now.getDay() === 0 && currentHHMM === "19:00") {
      const revKey = `trac-intel-rev-${todayStr}`;
      if (!localStorage.getItem(revKey)) {
        localStorage.setItem(revKey, "true");
        sendSystemNotification(`Weekly Review`, `Fantastic work this week! Open Trac Insights to review your 7-day consistency report.`, config.feedback);
      }
    }
  }, 30000);

  return () => clearInterval(interval);
}

// Helper: Dispatch notification with sound & haptic preferences
function sendSystemNotification(title: string, body: string, feedback: { sound: boolean; vibration: boolean }) {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, {
        body,
        icon: "/logo.png",
        badge: "/logo.png",
        vibrate: feedback.vibration ? [100, 50, 100] : undefined,
        silent: !feedback.sound
      } as any);
    });
  } else {
    new Notification(title, { body, icon: "/logo.png" });
  }
}
