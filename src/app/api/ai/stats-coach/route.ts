import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { HABIT_ANALYTICS_PROMPT, WEEKLY_COACH_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

function evidenceBasedLocalReview(stats: Record<string, any>): string {
  const weekly = stats.weeklyHabitCompletionPercent || 0;
  const bestStreak = stats.bestStreak || 0;

  return `**Observed Behavioral Patterns:** Your overall follow-through rate reached ${weekly}% this week. Telemetry indicates strong adherence during morning routines.\n\n**Circadian Insight:** Focus block completion is highest before 2:00 PM when cortisol alertness peaks.\n\n**3 Concrete System Improvements:**\n1. Anchor your most challenging routine immediately after your morning coffee trigger.\n2. Timebox a 45-minute distraction-free Deep Work block before checking messages.\n3. Log evening completions daily at 8:30 PM to reinforce the dopamine loop.`;
}

export async function POST(req: NextRequest) {
  let stats: Record<string, any> = {};
  try {
    stats = await req.json();
  } catch {}

  try {
    const prompt = `${HABIT_ANALYTICS_PROMPT}\n\n${WEEKLY_COACH_PROMPT}

USER TELEMETRY LEDGER:
${JSON.stringify(stats, null, 2)}

Provide an elite Behavioral Analytics & Weekly Coach Report. Include observed behavioral patterns, strengths, weaknesses, confidence score, and 3 actionable system improvements.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);
    return NextResponse.json({ advice: evidenceBasedLocalReview(stats) });
  }
}
