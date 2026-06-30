import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { TRAC_RESPONSE_STYLE } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

interface HabitStat {
  habit: string;
  currentStreak: number;
  bestStreak: number;
  completionRate30Days: number;
}

function buildDynamicFallback(stats: Record<string, any>): string {
  const habitList: HabitStat[] = Array.isArray(stats.currentStreaks) ? stats.currentStreaks : [];
  const weekly = Number(stats.weeklyHabitCompletionPercent ?? 0);
  const monthly = Number(stats.monthlyHabitCompletionPercent ?? 0);
  const totalFocus = Number(stats.totalFocusMinutes ?? 0);

  if (habitList.length === 0) {
    return `**Focus Here First**\n• Add 2-3 small habits to start measuring patterns\n\n**Productive Tip**\n• Pick habits under 2 minutes each — consistency beats intensity in week one`;
  }

  const sorted = [...habitList].sort((a, b) => a.completionRate30Days - b.completionRate30Days);
  const weakest = sorted[0];
  const secondWeakest = sorted[1];
  const strongest = sorted[sorted.length - 1];
  const trend = weekly - monthly;

  const lines: string[] = [];

  lines.push(`**Work On This First**`);
  if (weakest.completionRate30Days < 40) {
    lines.push(`• "${weakest.habit}" is your biggest leak — shrink it to a 2-minute version until the streak rebuilds`);
  } else if (weakest.completionRate30Days < 70) {
    lines.push(`• "${weakest.habit}" is inconsistent — fix the trigger before adding anything new`);
  } else {
    lines.push(`• Everything is performing well — protect "${weakest.habit}" by giving it a fixed daily slot`);
  }

  if (secondWeakest && strongest.habit !== weakest.habit) {
    lines.push(``, `**Habit Stack**`);
    lines.push(`• Do "${weakest.habit}" immediately after "${strongest.habit}" — borrow the existing momentum`);
  }

  lines.push(``, `**What The Trend Means**`);
  if (trend > 5) {
    lines.push(`• Your week is stronger than your month average — you are recovering, keep the current schedule frozen`);
  } else if (trend < -5) {
    lines.push(`• This week dipped below your monthly baseline — something in your environment changed, audit your last 7 days`);
  } else {
    lines.push(`• You are stable — now is the time to raise the bar on your strongest habit, not add new ones`);
  }

  lines.push(``, `**Productive Tip**`);
  if (totalFocus < 60) {
    lines.push(`• Pair one habit completion with a 25-minute focus block — habit acts as the ignition`);
  } else if (strongest.currentStreak >= 7) {
    lines.push(`• "${strongest.habit}" has real momentum — use its time slot as the anchor for one new micro-habit next week`);
  } else {
    lines.push(`• Schedule "${weakest.habit}" at the same time as "${strongest.habit}" was originally placed — that slot already works for you`);
  }

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let stats: Record<string, any> = {};
  try {
    stats = await req.json();
  } catch {}

  const habitList: HabitStat[] = Array.isArray(stats.currentStreaks) ? stats.currentStreaks : [];

  const prompt = `${TRAC_RESPONSE_STYLE}

You are giving a habit COACHING review, not a stats report. The user already sees their numbers on the dashboard — never restate raw percentages, streaks, or counts back to them. Your job is interpretation + action.

DATA (for your analysis only, do NOT echo these numbers back):
${JSON.stringify(stats, null, 2)}

OUTPUT — exactly these four sections, in this order:

**Work On This First**
• Name the ONE habit (by exact name from data) that deserves the most attention this week and say WHY in plain language (e.g. "the streak keeps breaking on weekends", "you start strong then drop after day 3"). No numbers.

**Habit Stack**
• Suggest pairing the weakest habit with the strongest habit (use their real names). Explain the cue: when/where to do the new one right after the existing one.

**What The Trend Means**
• One sentence interpreting the direction (recovering / stalling / dropping). No percentages — talk about momentum, not math.

**Productive Tip**
• One concrete, non-generic action the user can do today that compounds over the week. Tie it to a specific habit name from the data when possible. Never say "drink water", "wake up earlier", "meditate" unless those are in the user's habit list.

HARD RULES:
- Do NOT say "Completion 87%" or "streak 5 days" or any raw stat — the dashboard already shows it
- Do NOT use sections like "Strongest Habit" / "Weakest Habit" that just label the data
- Reference at least two real habit names from the data
- Maximum 70 words across the whole response
- If habit list is empty, output only: "Not enough data yet. Add 2-3 habits and check back in 7 days."`;

  try {
    if (habitList.length === 0) {
      return NextResponse.json({ advice: buildDynamicFallback(stats) });
    }
    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);
    return NextResponse.json({ advice: buildDynamicFallback(stats) });
  }
}
