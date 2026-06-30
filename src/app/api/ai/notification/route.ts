import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { DAILY_REVIEW_PROMPT, MOTIVATION_GENERATOR_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { context } = await req.json();
    const prompt = `${DAILY_REVIEW_PROMPT}\n\n${MOTIVATION_GENERATOR_PROMPT}

TELEMETRY CONTEXT: "${context}"

Synthesize ONE concise, authentic, highly motivating check-in message (under 45 words). Reference genuine consistency momentum without generic fluff.`;

    const message = await callGrok(prompt, 0.7);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({
      message: "Your routines are active. Execute one priority habit right now to sustain weekly consistency.",
    });
  }
}
