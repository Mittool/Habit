import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

const FALLBACK_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Focus is a matter of deciding what things you are not going to do.", author: "John Carmack" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" }
];

let seqCounter = 0;

export async function GET(req: NextRequest) {
  try {
    const prevText = req.nextUrl.searchParams.get("prev") || "";

    try {
      const topics = ["deep focus", "habit formation", "overcoming procrastination", "resilience", "momentum", "daily discipline", "mindfulness", "mastery", "time management"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const randomSeed = Math.floor(Math.random() * 10000);

      const prompt = `[Seed ${randomSeed}] Give a powerful, famous inspirational quote about ${randomTopic} or personal growth along with its exact author. Reply with ONLY the quote on line 1 and the author on line 2. No quotation marks, no commentary. Do NOT repeat this quote: "${prevText}"`;

      const raw = await callGrok(prompt, 0.95);
      const lines = raw.trim().split("\n").filter(l => l.trim().length > 0);

      if (lines.length >= 1) {
        let quoteText = lines[0].replace(/^["'\u201C]+|["'\u201D]+$/g, "").trim();
        let authorText = lines.length > 1 ? lines[1].replace(/^[—\-–\s]+/, "").trim() : "Unknown";

        if (lines.length === 1 && quoteText.includes("—")) {
          const parts = quoteText.split("—");
          quoteText = parts[0].replace(/^["'\u201C]+|["'\u201D]+$/g, "").trim();
          authorText = parts[1].trim();
        }

        if (quoteText.length > 5 && quoteText !== prevText) {
          return NextResponse.json({ text: quoteText, author: authorText });
        }
      }
    } catch {}

    // Fallback guaranteed rotation
    seqCounter = (seqCounter + 1) % FALLBACK_QUOTES.length;
    let nextQ = FALLBACK_QUOTES[seqCounter];
    if (nextQ.text === prevText) {
      seqCounter = (seqCounter + 1) % FALLBACK_QUOTES.length;
      nextQ = FALLBACK_QUOTES[seqCounter];
    }
    return NextResponse.json(nextQ);
  } catch (error) {
    const q = FALLBACK_QUOTES[0];
    return NextResponse.json(q);
  }
}
