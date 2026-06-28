import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { mood, need } = await req.json();
    const prompt = `You are Trac AI, an elite productivity and wellness coach. A user is feeling "${mood}" and needs help with "${need}". 
Give them ONE specific, actionable productivity tip that directly addresses their current state.
Keep it under 80 words. Be warm, practical, and punchy. No generic advice.`;

    const advice = await callGrok(prompt, 0.7);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("AI advice error:", error);
    return NextResponse.json({
      advice: "Take a deep breath, pick your single most important task, and give it 15 minutes of uninterrupted focus. Momentum builds from starting small.",
    });
  }
}
