import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { COACH_SYSTEM_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    
    const fullPrompt = `${COACH_SYSTEM_PROMPT}

ACTIVE USER TELEMETRY & CONTEXT:
${JSON.stringify(context || null, null, 2)}

USER QUERY: "${message}"

Provide an elite coaching response. If generating habits or plans, structure them by daily routines (Morning, Afternoon, Evening) with scientific reasoning, difficulty ratings (Easy/Medium/Hard), and best execution times. Keep formatting pristine using bold headings.`;

    const reply = await callGrok(fullPrompt, 0.7);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({
      reply: "**Executive Coach Override:** Let us focus on systems over outcomes today. Identify your single highest leverage project, anchor it immediately after your next meal trigger, and execute 45 minutes of uninterrupted deep work.",
    });
  }
}
