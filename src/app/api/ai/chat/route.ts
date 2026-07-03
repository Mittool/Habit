import { NextRequest, NextResponse } from "next/server";
import { callGrok, MISSING_GROQ_KEY_MESSAGE } from "@/lib/grok";
import { COACH_CHAT_PROMPT } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, context, userName, history } = await req.json();

    const namePart = userName ? `\nThe user's name is ${userName}. You may address them by first name occasionally (not every message). Never invent details about them.` : "";
    const historyPart = Array.isArray(history) && history.length > 0
      ? `\nRecent conversation (oldest first):\n${history.slice(-6).map((m: any) => `${m.role === "ai" ? "Trac AI" : "User"}: ${m.text}`).join("\n")}`
      : "";

    const prompt = `${COACH_CHAT_PROMPT}${namePart}
Data: ${JSON.stringify(context)}${historyPart}
User: ${message}`;

    const reply = await callGrok(prompt, 0.75);
    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("Chat error:", error);
    const isMissingKey = String(error?.message || "") === MISSING_GROQ_KEY_MESSAGE;
    return NextResponse.json({
      reply: isMissingKey
        ? "**AI is offline**\n• The server operator needs to configure the AI provider key\n• Try again in a few minutes"
        : "**Possible Cause**\n• Context switching overload\n\n**Try**\n• 25-minute focus session\n• Phone tucked away\n• Water replenishment\n\n**Best Time**\n• Next 2 hours",
      aiUnavailable: isMissingKey || undefined,
    });
  }
}
