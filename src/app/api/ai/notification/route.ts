import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { context } = await req.json();
    const prompt = `You are Trac AI, a smart productivity assistant. Based on this context: "${context}"
Generate ONE short, motivating reminder/notification message (under 45 words).
Make it feel personal and timely, not generic. Be concise and energizing.`;

    const message = await callGrok(prompt, 0.7);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({
      message: "Your habits are waiting — a small step today builds tomorrow's momentum.",
    });
  }
}
