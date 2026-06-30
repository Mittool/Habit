import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { PRODUCTIVITY_CONSULTANT_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { need } = await req.json();
    const advice = await callGrok(`${PRODUCTIVITY_CONSULTANT_PROMPT}\n\nQuery: ${need}`, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    return NextResponse.json({
      advice: "**Do Now**\n• Eliminate open tabs\n• Silence notifications\n• 45-minute focus session\n\n**Avoid**\n• Multitasking\n• Social media\n\n**Expected Result**\n• Higher focus"
    });
  }
}
