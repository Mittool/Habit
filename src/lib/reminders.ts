// Adaptive habit-reminder algorithm.
// Implements steps 3-5 of the spec:
//   - Week 1 (< 7 completions): use yesterday's completion minus 20 min
//   - Week 2+: rolling average of last 7-14 completions minus 20 min
//   - Outlier trimming so a 3 AM anomaly does not skew a habit that lives at 8 PM
//
// This module is PURE — no side effects, no DOM, no store access.
// Callers pass in the history and current time; we return the next fire time.

export const LEAD_MINUTES = 20;
export const ROLLING_WINDOW_MAX = 14;
export const ROLLING_WINDOW_MIN = 7;

export interface NextReminderInput {
  completionHistory: string[]; // ISO strings, oldest first
  manualReminderHHMM?: string; // fallback "HH:mm" if no history
  reminderDays?: number[]; // optional [0..6]; default all days
  now?: Date; // injectable for tests
}

export interface NextReminderResult {
  nextFireAt: Date;
  reason: "week1-yesterday" | "rolling-avg" | "manual-fallback" | "manual-only";
  averageHHMM?: string;
}

function toHHMM(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  return { h, m };
}

function minutesInDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function subtractMinutes(mins: number, delta: number): number {
  let out = mins - delta;
  while (out < 0) out += 1440;
  return out % 1440;
}

// ─── Circular-mean average so times spanning midnight don't average to noon ───
function circularAverageMinutes(minutesList: number[]): number {
  if (minutesList.length === 0) return 9 * 60;
  let sumSin = 0;
  let sumCos = 0;
  for (const mins of minutesList) {
    const rad = (mins / 1440) * 2 * Math.PI;
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
  }
  let avgRad = Math.atan2(sumSin / minutesList.length, sumCos / minutesList.length);
  if (avgRad < 0) avgRad += 2 * Math.PI;
  return Math.round((avgRad / (2 * Math.PI)) * 1440) % 1440;
}

// Circular distance between two time-of-day minute values (0..720)
function circularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

// ─── Outlier trimming (step 5) ───
// Any completion more than TRIM_THRESHOLD_MIN away from the group median is discarded.
// We use MAD (median absolute deviation), the standard robust outlier metric.
const TRIM_THRESHOLD_MIN = 120; // 2 hours from centre

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function trimOutliers(minutesList: number[]): number[] {
  if (minutesList.length < 3) return minutesList;
  // Robust centre using circular median: project to nearest cluster.
  // We compute the circular mean first, then use it as the anchor for distance.
  const centre = circularAverageMinutes(minutesList);
  const distances = minutesList.map(m => circularDistance(m, centre));
  const sortedDist = [...distances].sort((a, b) => a - b);
  const medDist = median(sortedDist);
  // Anything more than max(TRIM_THRESHOLD_MIN, 3*MAD) from centre is an outlier
  const mad = medDist;
  const cutoff = Math.max(TRIM_THRESHOLD_MIN, 3 * mad);
  const kept: number[] = [];
  for (let i = 0; i < minutesList.length; i++) {
    if (distances[i] <= cutoff) kept.push(minutesList[i]);
  }
  // Guarantee we never trim below 3 samples
  if (kept.length < 3) return minutesList;
  return kept;
}

function toDateInFuture(base: Date, hh: number, mm: number, reminderDays?: number[]): Date {
  const candidate = new Date(base);
  candidate.setHours(hh, mm, 0, 0);
  if (candidate.getTime() <= base.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  if (reminderDays && reminderDays.length > 0) {
    // Advance day-by-day until we hit an allowed day (max 7 iterations)
    for (let i = 0; i < 7; i++) {
      if (reminderDays.includes(candidate.getDay())) break;
      candidate.setDate(candidate.getDate() + 1);
    }
  }
  return candidate;
}

// Was there a completion "yesterday" relative to `now`?
function yesterdaysCompletion(history: string[], now: Date): Date | null {
  const yStart = new Date(now);
  yStart.setDate(yStart.getDate() - 1);
  yStart.setHours(0, 0, 0, 0);
  const yEnd = new Date(yStart);
  yEnd.setDate(yEnd.getDate() + 1);
  // Search from newest → oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const d = new Date(history[i]);
    if (isNaN(d.getTime())) continue;
    if (d >= yStart && d < yEnd) return d;
    if (d < yStart) break;
  }
  return null;
}

export function computeNextReminder(input: NextReminderInput): NextReminderResult | null {
  const now = input.now ?? new Date();
  const history = (input.completionHistory ?? []).filter(s => !isNaN(new Date(s).getTime()));

  // Case A: fewer than 7 completions → Week 1 algorithm (yesterday minus 20 min)
  if (history.length < ROLLING_WINDOW_MIN) {
    const yesterday = yesterdaysCompletion(history, now);
    if (yesterday) {
      const yMins = minutesInDay(yesterday);
      const targetMins = subtractMinutes(yMins, LEAD_MINUTES);
      const hh = Math.floor(targetMins / 60);
      const mm = targetMins % 60;
      const nextFireAt = toDateInFuture(now, hh, mm, input.reminderDays);
      return {
        nextFireAt,
        reason: "week1-yesterday",
        averageHHMM: `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`,
      };
    }
    // No yesterday completion → manual fallback
    if (input.manualReminderHHMM) {
      const parsed = parseHHMM(input.manualReminderHHMM);
      if (parsed) {
        const nextFireAt = toDateInFuture(now, parsed.h, parsed.m, input.reminderDays);
        return { nextFireAt, reason: "manual-fallback" };
      }
    }
    return null;
  }

  // Case B: ≥ 7 completions → rolling average of last 7-14, outlier-trimmed
  const recent = history.slice(-ROLLING_WINDOW_MAX);
  const minutesList = recent
    .map(s => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : minutesInDay(d);
    })
    .filter((v): v is number => v !== null);

  const kept = trimOutliers(minutesList);
  const avgMins = circularAverageMinutes(kept);
  const targetMins = subtractMinutes(avgMins, LEAD_MINUTES);
  const avgH = Math.floor(avgMins / 60);
  const avgM = avgMins % 60;
  const tH = Math.floor(targetMins / 60);
  const tM = targetMins % 60;
  const nextFireAt = toDateInFuture(now, tH, tM, input.reminderDays);
  return {
    nextFireAt,
    reason: "rolling-avg",
    averageHHMM: `${avgH.toString().padStart(2, "0")}:${avgM.toString().padStart(2, "0")}`,
  };
}

// Convenience: pure manual scheduling (used for tasks, which do NOT learn)
export function computeTaskReminder(dueAtIso: string, leadTimeMinutes: number = 10): Date | null {
  const due = new Date(dueAtIso);
  if (isNaN(due.getTime())) return null;
  const fire = new Date(due.getTime() - leadTimeMinutes * 60 * 1000);
  if (fire.getTime() <= Date.now()) return null; // already past
  return fire;
}

// Helper exposed for tests / debugging
export const _internal = {
  circularAverageMinutes,
  trimOutliers,
  yesterdaysCompletion,
  toHHMM,
};
