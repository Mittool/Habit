import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { TRAC_RESPONSE_STYLE } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const missedHabit: string = body.missedHabit || body.habit || "";
    const stats = body.stats || {};
    const userName: string = body.userName || "";

    const prompt = `${TRAC_RESPONSE_STYLE}

You are giving a personalised recovery tip for ONE specific habit. Read the provided stats carefully and tailor the response to THIS habit only.

User: ${userName || "user"}
Habit: "${missedHabit}"
Stats for this habit: ${JSON.stringify(stats)}

Output format (strict):
**Why It Failed**
• one short cause based on stats
**Fix**
• one concrete trigger pairing
• one environment change
**Today**
• one action under 2 minutes
**Best Time**
• specific time window

Rules: Reference the habit name. Do NOT mention sleep unless habit is sleep related. Do NOT give a generic "anchor after morning coffee" line — pick a trigger that fits the habit. Maximum 60 words total.`;

    const tip = await callGrok(prompt, 0.8);
    return NextResponse.json({ tip });
  } catch (error) {
    console.error("Habit tip error:", error);
    const body = await req.json().catch(() => ({} as any));
    const habit = body?.missedHabit || "this habit";
    return NextResponse.json({
      tip: `**Why It Failed**\n• Trigger not anchored\n**Fix**\n• Pair "${habit}" with a fixed daily cue\n• Place required items in visible spot\n**Today**\n• Do a 2-minute version now\n**Best Time**\n• Next 60 minutes`,
    });
  }
}
