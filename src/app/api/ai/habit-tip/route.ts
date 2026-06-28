import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { missedHabit } = await req.json();
    const prompt = `You are Trac AI, a supportive habit coach. A user missed their habit: "${missedHabit}".
Give them ONE specific, compassionate tip to get back on track.
Acknowledge that missing is normal, then give concrete next-step advice.
Keep it under 70 words. Be encouraging without being preachy.`;

    const tip = await callGrok(prompt, 0.7);
    return NextResponse.json({ tip });
  } catch (error) {
    console.error("Habit tip error:", error);
    return NextResponse.json({
      tip: "Missing a day happens to everyone. Tomorrow, start with just 2 minutes of this habit — consistency beats intensity every time.",
    });
  }
}
