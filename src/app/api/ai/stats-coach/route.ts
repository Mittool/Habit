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
  const bestStreak = Number(stats.bestStreak ?? 0);
  const totalFocus = Number(stats.totalFocusMinutes ?? 0);
  const completedTasks = Number(stats.completedTasks ?? 0);
  const totalTasks = Number(stats.totalTasks ?? 0);

  if (habitList.length === 0) {
    return `**Completion**\n• ${weekly}% weekly / ${monthly}% monthly\n\n**Status**\n• No active habits tracked yet\n\n**Next Step**\n• Add 2 small habits to start measuring patterns`;
  }

  const strongest = [...habitList].sort((a, b) => b.completionRate30Days - a.completionRate30Days)[0];
  const weakest = [...habitList].sort((a, b) => a.completionRate30Days - b.completionRate30Days)[0];
  const trend = weekly - monthly;
  const trendStr = trend > 0 ? `+${trend}% vs month avg` : trend < 0 ? `${trend}% vs month avg` : "flat";

  return [
    `**Completion**`,
    `• ${weekly}% week / ${monthly}% month`,
    ``,
    `**Strongest Habit**`,
    `• ${strongest.habit} (${strongest.completionRate30Days}%, streak ${strongest.currentStreak})`,
    ``,
    `**Weakest Habit**`,
    `• ${weakest.habit} (${weakest.completionRate30Days}%, streak ${weakest.currentStreak})`,
    ``,
    `**Best Streak Ever**`,
    `• ${bestStreak} days`,
    ``,
    `**Focus & Tasks**`,
    `• ${Math.round(totalFocus)}m focus · ${completedTasks}/${totalTasks} tasks done`,
    ``,
    `**Improve**`,
    `• Move "${weakest.habit}" earlier in the day`,
    `• Stack it after "${strongest.habit}" to use existing momentum`,
    ``,
    `**Trend**`,
    `• ${trendStr}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  let stats: Record<string, any> = {};
  try {
    stats = await req.json();
  } catch {}

  const habitList: HabitStat[] = Array.isArray(stats.currentStreaks) ? stats.currentStreaks : [];

  const prompt = `${TRAC_RESPONSE_STYLE}

You are reviewing this user's REAL habit metrics. You MUST cite actual habit names and numbers from the data. Never invent habits like "Morning Routine" or "Evening Review" if they are not in the list.

DATA:
${JSON.stringify(stats, null, 2)}

Output format (strict, fill with REAL numbers and REAL habit names from DATA above):
**Completion**
• <weekly>% week / <monthly>% month
**Strongest Habit**
• <name> (<rate30>%, streak <currentStreak>)
**Weakest Habit**
• <name> (<rate30>%, streak <currentStreak>)
**Best Streak Ever**
• <bestStreak> days
**Pattern**
• one observation based on the streak/rate gap
**Improve**
• one move tied to the weakest habit BY NAME
• one stack tied to the strongest habit BY NAME
**Trend**
• weekly vs monthly delta with sign

Rules: Only use habits that appear in DATA. If habit list is empty, say "Not enough data yet." No filler. No emojis.`;

  try {
    if (habitList.length === 0) {
      // Skip the LLM call when there's nothing meaningful to analyse
      return NextResponse.json({ advice: buildDynamicFallback(stats) });
    }
    const advice = await callGrok(prompt, 0.6);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);
    return NextResponse.json({ advice: buildDynamicFallback(stats) });
  }
}
