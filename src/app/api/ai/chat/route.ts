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
        ? "AI is offline right now — the server needs a key set up.\n• Try again in a few minutes\n• Your habits and tasks still work fine"
        : "Something went wrong talking to the AI. Try again in a moment:\n• Check your internet\n• Or wait a few seconds and retry",
      aiUnavailable: isMissingKey || undefined,
    });
  }
}
