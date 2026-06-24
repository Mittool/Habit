import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(prompt: string, retries = 3): Promise<string> {
  const url = `${BASE_URL}/${MODEL}:generateContent?key=${API_KEY}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      });

      if (res.status === 429) {
        if (attempt < retries) {
          const wait = 8000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error("RATE_LIMITED");
      }

      if (!res.ok) {
        const err = await res.text();
        console.error("Gemini stats coach API error:", res.status, err);
        throw new Error(`Gemini API ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      if (err instanceof Error && err.message === "RATE_LIMITED") throw err;
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }

  throw new Error("Max retries exceeded");
}

// Generate advice locally from stats when API is unavailable
function localCoachAdvice(stats: Record<string, unknown>): string {
  const lines: string[] = [];

  const bestStreak = (stats.bestStreak as number) || 0;
  const weekly = (stats.weeklyHabitCompletionPercent as number) || 0;
  const monthly = (stats.monthlyHabitCompletionPercent as number) || 0;
  const streaks = (stats.currentStreaks as Array<{ habit: string; currentStreak: number; completionRate30Days: number }>) || [];
  const totalFocus = (stats.totalFocusMinutes as number) || 0;
  const completedTasks = (stats.completedTasks as number) || 0;
  const totalTasks = (stats.totalTasks as number) || 0;

  if (bestStreak >= 7) {
    lines.push(`**Strength:** Your best streak of ${bestStreak} days shows you can sustain habits long-term.`);
  } else if (weekly >= 60) {
    lines.push(`**Strength:** Your weekly completion of ${weekly}% shows solid consistency this week.`);
  } else if (totalFocus >= 60) {
    lines.push(`**Strength:** You have ${Math.floor(totalFocus / 60)}h+ of focused work time logged — that is a real foundation.`);
  } else {
    lines.push(`**Strength:** You are tracking your habits, which is the first step to improvement.`);
  }

  const lowHabits = streaks.filter((s) => s.completionRate30Days < 50);
  if (lowHabits.length > 0) {
    lines.push(`\n**Weak point:** ${lowHabits.map((h) => h.habit).join(", ")} ${lowHabits.length === 1 ? "has" : "have"} a 30-day completion rate below 50%. This is where consistency breaks down.`);
  } else if (monthly < weekly) {
    lines.push(`\n**Weak point:** Your monthly average (${monthly}%) lags behind your weekly average (${weekly}%), suggesting inconsistency earlier in the month.`);
  } else if (totalTasks > 0 && completedTasks / totalTasks < 0.5) {
    lines.push(`\n**Weak point:** Only ${completedTasks} of ${totalTasks} tasks completed. Unfinished tasks create mental clutter.`);
  } else {
    lines.push(`\n**Weak point:** Without a strong streak going, habits are vulnerable to disruption on busy days.`);
  }

  lines.push("\n**3 Actions for the next 7 days:**");
  lines.push("1. Pick your weakest habit and reduce it to a 2-minute minimum version — do it before anything else each day.");
  if (monthly < 50) {
    lines.push("2. Schedule each habit in a timebox before noon; morning routines have the highest follow-through.");
  } else {
    lines.push("2. Timebox your most important habit at the same time daily to build automaticity.");
  }
  lines.push("3. End each day by checking off completed habits — the visual progress reinforces the loop.");

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  // Parse body once, save for fallback
  let stats: Record<string, unknown> = {};
  try {
    stats = await req.json();
  } catch {
    // empty body
  }

  try {
    if (!API_KEY || API_KEY === "placeholder") {
      return NextResponse.json({ advice: localCoachAdvice(stats) });
    }

    const prompt = `You are an expert habit and productivity coach. A user shared these stats:

${JSON.stringify(stats, null, 2)}

Reply with EXACTLY this structure — use the headings, keep each section short:

**Strength:** One thing they are doing well (1 sentence).

**Weak point:** One specific risk or area that needs attention (1-2 sentences).

**3 Actions for the next 7 days:**
1. (concrete action)
2. (concrete action)
3. (concrete action)

Keep total response under 150 words. Be direct, practical, and encouraging.`;

    const advice = await callGemini(prompt);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("Stats coach error:", error);

    if (error instanceof Error && error.message === "RATE_LIMITED") {
      return NextResponse.json(
        { advice: localCoachAdvice(stats), rateLimited: true },
        { status: 200 }
      );
    }

    // For any other error, use the local coach
    return NextResponse.json({ advice: localCoachAdvice(stats) });
  }
}
