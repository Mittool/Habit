import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    
    const systemPrompt = `You are Trac AI, a futuristic, ultra-intelligent productivity and performance AI oracle.
User context & stats: ${JSON.stringify(context || {})}

User Query: "${message}"

Provide a brilliant, futuristic, highly actionable and motivating response. Keep formatting clean with bullet points or bold text if helpful. Keep it under 150 words. Be sharp, visionary, and empowering.`;

    const reply = await callGrok(systemPrompt, 0.75);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({
      reply: "⚡ **Neural Link Interrupted (Local Override):** Focus your cognitive energy on your single highest leverage task right now. Eliminate all background tabs, set a 25-minute timer, and initiate flow state.",
    });
  }
}
