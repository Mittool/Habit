import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_KEY = process.env.GEMINI_API_KEY || "";
const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(prompt: string, retries = 2): Promise<string> {
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

      if (res.status === 429 && attempt < retries) {
        // Rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        console.error("Gemini API error:", res.status, err);
        throw new Error(`Gemini API ${res.status}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error("Max retries exceeded");
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY || API_KEY === "placeholder") {
      return NextResponse.json({
        advice: "Set up your Gemini API key to unlock AI-powered advice. For now: pick your single most important task and give it 25 minutes of focused attention.",
      });
    }

    const { mood, need } = await req.json();
    const prompt = `You are a productivity and wellness coach. A user is feeling "${mood}" and needs help with "${need}". 
Give them ONE specific, actionable productivity tip that directly addresses their current mood and need.
Keep it under 80 words. Be warm, practical, and encouraging. No generic advice.`;

    const advice = await callGemini(prompt);
    return NextResponse.json({ advice });
  } catch (error) {
    console.error("AI advice error:", error);
    return NextResponse.json({
      advice: "Take a deep breath, pick your most important task, and work on it for just 10 minutes. Momentum builds from small starts.",
    });
  }
}
