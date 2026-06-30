import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { COACH_CHAT_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    
    const fullPrompt = `${COACH_CHAT_PROMPT}

USER TELEMETRY LEDGER:
${JSON.stringify(context || {}, null, 2)}

USER QUERY: "${message}"

Synthesize an elite coaching response following James Clear and Cal Newport principles. Structure outcome advice cleanly with bold headings.`;

    const reply = await callGrok(fullPrompt, 0.7);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({
      reply: "**Executive Coach Override:** Let us focus on systems over outcomes today. Identify your single highest leverage project, anchor it immediately after your next meal trigger, and execute 45 minutes of uninterrupted deep work.",
    });
  }
}
