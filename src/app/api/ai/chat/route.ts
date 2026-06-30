import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { COACH_CHAT_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    const reply = await callGrok(`${COACH_CHAT_PROMPT}\nData: ${JSON.stringify(context)}\nUser: ${message}`, 0.7);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({
      reply: "Possible Cause\n• Context switching overload\n\nTry\n• 25-minute focus session\n• Phone tucked away\n• Water replenishment\n\nBest Time\n• Next 2 hours"
    });
  }
}
