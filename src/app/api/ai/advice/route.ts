import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { PRODUCTIVITY_CONSULTANT_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { mood, need, context } = await req.json();
    const prompt = `${PRODUCTIVITY_CONSULTANT_PROMPT}

USER TELEMETRY: ${JSON.stringify(context || {})}
State: feeling "${mood}". Bottleneck challenge: "${need}".

Provide ONE hyper-specific, evidence-informed coaching prescription based on Deep Work and Time Blocking. Keep under 75 words.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("AI advice error:", error);
    return NextResponse.json({
      advice: "**Circadian Directive:** Channel your current state into immediate action. Reduce the task to a 2-minute starter ritual, eliminate open browser tabs, and initiate 20 minutes of focus.",
    });
  }
}
