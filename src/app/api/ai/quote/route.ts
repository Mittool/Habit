import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";

export const dynamic = "force-dynamic";

const FALLBACK_QUOTES = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements over time lead to stunning lifelong results.", author: "Robin Sharma" },
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
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "Waste no more time arguing about what a good person should be. Be one.", author: "Marcus Aurelius" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Knowing is not enough, we must apply. Willing is not enough, we must do.", author: "Bruce Lee" },
  { text: "Whether you think you can, or you think you cannot – you are right.", author: "Henry Ford" },
  { text: "Genius is one percent inspiration and ninety-nine percent perspiration.", author: "Thomas Edison" },
  { text: "It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.", author: "Charles Darwin" },
  { text: "Continuous effort – not strength or intelligence – is the key to unlocking our potential.", author: "Winston Churchill" },
  { text: "Believe you can and you are halfway there.", author: "Theodore Roosevelt" },
  { text: "The best way to predict your future is to create it.", author: "Abraham Lincoln" },
  { text: "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more, so that we may fear less.", author: "Marie Curie" },
  { text: "If I have seen further it is by standing on the shoulders of Giants.", author: "Isaac Newton" },
  { text: "The first and greatest victory is to conquer yourself.", author: "Plato" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "In the midst of chaos, there is also opportunity.", author: "Sun Tzu" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Character cannot be developed in ease and quiet. Only through experience of trial and suffering can the soul be strengthened.", author: "Helen Keller" },
  { text: "The most difficult thing is the decision to act, the rest is merely tenacity.", author: "Amelia Earhart" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "The time is always right to do what is right.", author: "Martin Luther King Jr." },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "Success is to be measured not so much by the position that one has reached in life as by the obstacles which one has overcome.", author: "Booker T. Washington" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
  { text: "The only way round is through.", author: "Robert Frost" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "We become what we think about most of the time.", author: "Earl Nightingale" },
  { text: "Successful people are simply those with successful habits.", author: "Brian Tracy" },
  { text: "You do not have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The best way to predict the future is to invent it.", author: "Peter Drucker" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "The cost of being wrong is less than the cost of doing nothing.", author: "Seth Godin" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Fall seven times and stand up eight.", author: "Japanese Proverb" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Life is like riding a bicycle. To keep your balance, you must keep moving.", author: "Albert Einstein" }
];

let lastPickedIndex = -1;

export async function GET(req: NextRequest) {
  try {
    const prevText = req.nextUrl.searchParams.get("prev") || "";

    try {
      const topics = ["deep focus", "habit formation", "overcoming procrastination", "resilience", "momentum", "daily discipline", "mindfulness", "mastery", "time management", "stoic philosophy", "mental toughness", "clarity of mind"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const randomSeed = Math.floor(Math.random() * 100000);

      const prompt = `[Seed ${randomSeed}] Give a powerful, famous inspirational quote about ${randomTopic} or personal mastery along with its exact author. Reply with ONLY the quote on line 1 and the author on line 2. No quotation marks, no commentary. Do NOT repeat this quote: "${prevText}"`;

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

    // Fallback randomized guarantee rotation
    let availableIndices = FALLBACK_QUOTES.map((_, i) => i).filter(i => i !== lastPickedIndex && FALLBACK_QUOTES[i].text !== prevText);
    if (availableIndices.length === 0) availableIndices = FALLBACK_QUOTES.map((_, i) => i);

    const pick = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    lastPickedIndex = pick;
    return NextResponse.json(FALLBACK_QUOTES[pick]);
  } catch (error) {
    return NextResponse.json(FALLBACK_QUOTES[0]);
  }
}
