import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { COACH_SYSTEM_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { mood, need, context } = await req.json();
    const prompt = `${COACH_SYSTEM_PROMPT}

USER CONTEXT: ${JSON.stringify(context || {})}
User state: feeling "${mood}". Need: "${need}".

Provide ONE hyper-specific, evidence-informed coaching prescription based on Deep Work and Tiny Habits. Keep under 75 words.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("AI advice error:", error);
    return NextResponse.json({
      advice: "**Circadian Directive:** Channel your current state into immediate action. Reduce the task to a 2-minute starter ritual, eliminate all open tabs, and execute 20 minutes of focus.",
    });
  }
}
