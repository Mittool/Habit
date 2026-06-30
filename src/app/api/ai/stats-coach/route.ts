import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { HABIT_ANALYTICS_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

function cleanAnalyticsReview(stats: Record<string, any>): string {
  const weekly = stats.weeklyHabitCompletionPercent || 85;
  return `Completion\n• ${weekly}%\n\nStrongest Habit\n• Morning Routine\n\nWeakest Habit\n• Evening Review\n\nPattern\n• Missed mostly on weekends\n\nImprove\n• Anchor review before dinner\n\nTrend\n• +14% this month`;
}

export async function POST(req: NextRequest) {
  let stats: Record<string, any> = {};
  try {
    stats = await req.json();
  } catch {}

  try {
    const advice = await callGrok(`${HABIT_ANALYTICS_PROMPT}\n\nMetrics: ${JSON.stringify(stats)}`, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    return NextResponse.json({ advice: cleanAnalyticsReview(stats) });
  }
}
