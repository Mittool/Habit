import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { SLEEP_REVIEW_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { missedHabit } = await req.json();
    const prompt = `${SLEEP_REVIEW_PROMPT}

Target Habit Challenge: "${missedHabit}".

Provide ONE specific, practical behavioral nudge explaining how bedtime consistency or trigger pairing builds follow-through on "${missedHabit}". Keep under 65 words.`;

    const tip = await callGrok(prompt, 0.7);
    return NextResponse.json({ tip });
  } catch (error) {
    console.error("Habit tip error:", error);
    return NextResponse.json({
      tip: "Protect your restorative rest window tonight. Anchor this routine immediately after your morning coffee trigger tomorrow.",
    });
  }
}
