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
        message: "Your habits are waiting — a small step today builds tomorrow's momentum.",
      });
    }

    const { context } = await req.json();
    const prompt = `You are a smart productivity assistant. Based on this context: "${context}"
Generate ONE short, motivating reminder/notification message (under 50 words).
Make it feel personal and timely, not generic. Be concise and actionable.`;

    const message = await callGemini(prompt);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({
      message: "Your habits are waiting — a small step today builds tomorrow's momentum.",
    });
  }
}
