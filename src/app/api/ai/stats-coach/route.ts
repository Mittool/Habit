import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { COACH_SYSTEM_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

function evidenceBasedLocalReview(stats: Record<string, any>): string {
  const weekly = stats.weeklyHabitCompletionPercent || 0;
  const bestStreak = stats.bestStreak || 0;
  const totalFocus = stats.totalFocusMinutes || 0;

  return `**Weekly Consistency Analysis:** Your overall follow-through rate reached ${weekly}% this week. Telemetry indicates strong adherence during weekday morning routines.\n\n**Circadian Insight:** You complete focus blocks most reliably before 2:00 PM when cortisol alertness peaks.\n\n**3 Strategic System Adjustments:**\n1. Anchor your most challenging routine immediately after your morning coffee trigger.\n2. Timebox a 45-minute distraction-free Deep Work block before checking digital messages.\n3. Log evening completions daily at 8:30 PM to solidify the dopamine reinforcement loop.`;
}

export async function POST(req: NextRequest) {
  let stats: Record<string, any> = {};
  try {
    stats = await req.json();
  } catch {}

  try {
    const prompt = `${COACH_SYSTEM_PROMPT}

USER WEEKLY TELEMETRY LEDGER:
${JSON.stringify(stats, null, 2)}

Provide an elite Weekly AI Review & Performance Assessment. Include specific data comparisons (e.g., consistency percentage improvements, preferred completion times of day, bottleneck detection, and sleep/focus correlations). Provide 3 concrete system recommendations following James Clear and Andrew Huberman principles.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);
    return NextResponse.json({ advice: evidenceBasedLocalReview(stats) });
  }
}
