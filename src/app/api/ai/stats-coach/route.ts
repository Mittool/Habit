import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

// Generate advice locally from stats when API is unavailable
function localCoachAdvice(stats: Record<string, unknown>): string {
  const lines: string[] = [];
  const bestStreak = (stats.bestStreak as number) || 0;
  const weekly = (stats.weeklyHabitCompletionPercent as number) || 0;
  const monthly = (stats.monthlyHabitCompletionPercent as number) || 0;
  const streaks = (stats.currentStreaks as Array<{ habit: string; currentStreak: number; completionRate30Days: number }>) || [];
  const totalFocus = (stats.totalFocusMinutes as number) || 0;
  const completedTasks = (stats.completedTasks as number) || 0;
  const totalTasks = (stats.totalTasks as number) || 0;

  if (bestStreak >= 7) {
    lines.push(`**Strength:** Your best streak of ${bestStreak} days proves you can sustain momentum long-term.`);
  } else if (weekly >= 60) {
    lines.push(`**Strength:** Your weekly completion rate of ${weekly}% demonstrates solid consistency.`);
  } else if (totalFocus >= 60) {
    lines.push(`**Strength:** You have ${Math.floor(totalFocus / 60)}h+ of deep focus logged — a fantastic foundation.`);
  } else {
    lines.push(`**Strength:** You are actively tracking your habits, which is the foundational step to mastery.`);
  }

  const lowHabits = streaks.filter((s) => s.completionRate30Days < 50);
  if (lowHabits.length > 0) {
    lines.push(`\n**Weak point:** ${lowHabits.map((h) => h.habit).join(", ")} below 50% consistency threshold.`);
  } else if (monthly < weekly) {
    lines.push(`\n**Weak point:** Monthly average (${monthly}%) lags behind weekly (${weekly}%), indicating early month friction.`);
  } else if (totalTasks > 0 && completedTasks / totalTasks < 0.5) {
    lines.push(`\n**Weak point:** Unfinished tasks (${totalTasks - completedTasks} pending) create cognitive drag.`);
  } else {
    lines.push(`\n**Weak point:** Without anchored triggers, routines remain vulnerable to disruption.`);
  }

  lines.push("\n**3 Strategic Actions for the next 7 days:**");
  lines.push("1. Reduce your hardest habit to a 2-minute micro-version and execute it first thing morning.");
  lines.push("2. Anchor key focus blocks before noon when willpower reserves are highest.");
  lines.push("3. Perform a daily evening review to check off habits and reinforce the dopamine loop.");

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  let stats: Record<string, unknown> = {};
  try {
    stats = await req.json();
  } catch {}

  try {
    const prompt = `You are Trac AI, an elite productivity and performance coach. A user shared these metrics:

${JSON.stringify(stats, null, 2)}

Reply with EXACTLY this markdown format (keep concise):

**Strength:** One clear positive observation (1 sentence).

**Weak point:** One friction point or risk area (1 sentence).

**3 Actions for the next 7 days:**
1. (punchy action)
2. (punchy action)
3. (punchy action)

Keep total response under 140 words. Be sharp, tactical, and energizing.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);
    return NextResponse.json({ advice: localCoachAdvice(stats) });
  }
}
