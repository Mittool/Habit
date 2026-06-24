import { NextResponse } from "next/server";

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
          generationConfig: { maxOutputTokens: 2048, temperature: 0.9 },
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

const FALLBACK_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
];

export async function GET() {
  try {
    if (!API_KEY || API_KEY === "placeholder") {
      const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      return NextResponse.json(q);
    }

    const prompt = `Give a famous inspirational quote about productivity or habits along with its author. Reply with just the quote and author, nothing else.`;

    const raw = await callGemini(prompt);

    // Try to extract quote and author from various formats
    // Format 1: "Quote" — Author
    const dashMatch = raw.match(/["\u201C]([^"\u201D]+)["\u201D]\s*[—\-–]\s*([A-Z][^\n]+)/);
    if (dashMatch) {
      return NextResponse.json({ text: dashMatch[1].trim(), author: dashMatch[2].trim() });
    }

    // Format 2: Bold **"Quote"** then — Author
    const boldMatch = raw.match(/\*\*["\u201C]?(.+?)["\u201D]?\*\*[^\w]*\n?\s*[—\-–]?\s*([A-Z][^\n]+)/);
    if (boldMatch) {
      return NextResponse.json({ text: boldMatch[1].trim(), author: boldMatch[2].trim() });
    }

    // Format 3: Lines — quote on first line, author on last
    const lines = raw.trim().split("\n").filter((l: string) => l.trim().replace(/[*\-\s]/g, ""));
    if (lines.length >= 1) {
      const quoteText = lines[0].replace(/^\*\*["\u201C]?/, "").replace(/["\u201D]?\*\*$/, "").replace(/^["\u201C]|["\u201D]$/g, "").trim();
      const authorText = lines.length > 1
        ? lines[lines.length - 1].replace(/^[—\-\s*]+/, "").trim()
        : "Unknown";
      if (quoteText.length > 10 && authorText.length > 0) {
        return NextResponse.json({ text: quoteText, author: authorText });
      }
    }

    // Fallback
    const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    return NextResponse.json(q);
  } catch (error) {
    console.error("Quote error:", error);
    const q = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    return NextResponse.json(q);
  }
}
