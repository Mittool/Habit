import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { TRAC_RESPONSE_STYLE } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

interface Habit {
  name: string;
  description: string;
  timeOfDay: "morning" | "day" | "evening" | "night";
}

// Curated, non-generic fallback library mapped to common goal categories.
// These are used ONLY if the LLM call fails. They are still goal-aware.
const FALLBACK_LIBRARY: Record<string, Habit[]> = {
  fitness: [
    { name: "5-Minute Mobility Flow", description: "Wake up the body with hip openers, shoulder rolls, and spinal twists before reaching for the phone.", timeOfDay: "morning" },
    { name: "Strength Training Block", description: "30-45 minutes of progressive overload — compound lifts or bodyweight push/pull/squat circuits.", timeOfDay: "day" },
    { name: "Protein Target Check-in", description: "Log meals and hit your daily protein target to support muscle recovery and satiety.", timeOfDay: "evening" },
    { name: "Cool-Down Stretch", description: "10 minutes of static stretching focused on the muscles you trained today to improve recovery and sleep quality.", timeOfDay: "night" },
  ],
  reading: [
    { name: "10 Pages Before Phone", description: "Read 10 pages of your current book before opening any app — anchors reading to your morning routine.", timeOfDay: "morning" },
    { name: "Annotated Reading Block", description: "30-minute focused reading session with a notebook nearby to capture ideas and questions.", timeOfDay: "day" },
    { name: "Reading Reflection Note", description: "Write a 3-sentence summary of what you read today to lock the ideas into long-term memory.", timeOfDay: "evening" },
    { name: "Wind-Down Fiction", description: "20 minutes of fiction in dim light to signal sleep onset and lower screen exposure.", timeOfDay: "night" },
  ],
  focus: [
    { name: "Top 3 Priorities List", description: "Write the three most important outcomes for today before checking email or messages.", timeOfDay: "morning" },
    { name: "90-Minute Deep Work Block", description: "Single-task on the hardest item for 90 minutes with phone in another room and notifications off.", timeOfDay: "day" },
    { name: "Inbox & Tabs Zero", description: "Close all open tabs and clear your inbox to a single screen — reduces tomorrow's cognitive load.", timeOfDay: "evening" },
    { name: "Tomorrow's Plan Sketch", description: "Write tomorrow's first task on paper so you start the day without decision fatigue.", timeOfDay: "night" },
  ],
  discipline: [
    { name: "Same-Time Wake Up", description: "Wake at the same time every day including weekends to stabilise circadian rhythm and willpower.", timeOfDay: "morning" },
    { name: "No-Snooze Cold Splash", description: "Splash cold water on the face immediately on waking — short, repeatable, builds first-decision discipline.", timeOfDay: "morning" },
    { name: "Single Hard Task First", description: "Complete the day's hardest task before lunch when willpower is highest.", timeOfDay: "day" },
    { name: "Phone Off At 10pm", description: "Hard cutoff for all screens — protects sleep and signals end-of-day to the brain.", timeOfDay: "night" },
  ],
  mindfulness: [
    { name: "4-7-8 Breath Reset", description: "Four cycles of 4-second inhale, 7-second hold, 8-second exhale to drop cortisol on waking.", timeOfDay: "morning" },
    { name: "Single-Task Mindful Meal", description: "Eat one meal a day with no phone, no screen — pure attention on taste and chewing.", timeOfDay: "day" },
    { name: "Two-Minute Mind Sweep", description: "Sit quietly for 2 minutes and label any rising thought as 'thinking' — trains attention reset.", timeOfDay: "evening" },
    { name: "Gratitude Three Lines", description: "Write three specific things from today you are grateful for to wire positive recall.", timeOfDay: "night" },
  ],
  exam: [
    { name: "Review Yesterday's Mistakes", description: "Spend 15 minutes re-solving any problems you got wrong yesterday — the highest leverage study minutes you own.", timeOfDay: "morning" },
    { name: "Subject Rotation Block", description: "90 minutes of deep focus on one subject; rotate the subject daily to keep all topics warm.", timeOfDay: "day" },
    { name: "Active Recall Flashcards", description: "20 minutes of self-tested flashcards on this week's concepts — beats re-reading every time.", timeOfDay: "evening" },
    { name: "Mock Question Set", description: "Solve 5 timed exam-style questions and mark them honestly to track real readiness.", timeOfDay: "night" },
  ],
  generic: [
    { name: "Three Priorities List", description: "Write today's three most important outcomes before opening any app.", timeOfDay: "morning" },
    { name: "Single Deep Work Block", description: "Pick the most important task and work on it uninterrupted for 60-90 minutes.", timeOfDay: "day" },
    { name: "End-of-Day Review", description: "Spend 5 minutes reviewing what worked, what did not, and what to repeat tomorrow.", timeOfDay: "evening" },
    { name: "Screen-Free Wind-Down", description: "30 minutes without screens before bed to protect deep sleep and improve next-day focus.", timeOfDay: "night" },
  ],
};

function pickFallback(goals: string[]): Habit[] {
  const joined = goals.join(" ").toLowerCase();
  const pools: Habit[] = [];
  if (/jee|neet|exam|crack|study|college|gate|upsc/.test(joined)) pools.push(...FALLBACK_LIBRARY.exam);
  if (/fit|gym|weight|muscle|run|health|body/.test(joined)) pools.push(...FALLBACK_LIBRARY.fitness);
  if (/read|book/.test(joined)) pools.push(...FALLBACK_LIBRARY.reading);
  if (/focus|procrast|deep work|distract/.test(joined)) pools.push(...FALLBACK_LIBRARY.focus);
  if (/discipl|morning|routine|consist|wake/.test(joined)) pools.push(...FALLBACK_LIBRARY.discipline);
  if (/mind|stress|calm|anxiety|medit|peace/.test(joined)) pools.push(...FALLBACK_LIBRARY.mindfulness);
  if (pools.length === 0) pools.push(...FALLBACK_LIBRARY.generic);

  // Dedupe by name, then pick 4-6 spread across times of day
  const seen = new Set<string>();
  const unique: Habit[] = [];
  for (const h of pools) {
    if (!seen.has(h.name)) {
      seen.add(h.name);
      unique.push(h);
    }
  }
  return unique.slice(0, 6);
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  // Strip code fences
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // Find first { and last }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalize(parsed: any): Habit[] | null {
  if (!parsed) return null;
  // Accept either { habits: [...] } or { morningRoutine: [...], dayRoutine: [...], ... }
  const out: Habit[] = [];

  if (Array.isArray(parsed.habits)) {
    for (const h of parsed.habits) {
      if (h && typeof h.name === "string" && typeof h.description === "string") {
        out.push({
          name: String(h.name).trim(),
          description: String(h.description).trim(),
          timeOfDay: (["morning", "day", "evening", "night"].includes(h.timeOfDay) ? h.timeOfDay : "day") as Habit["timeOfDay"],
        });
      }
    }
  } else {
    const buckets: Array<[string, Habit["timeOfDay"]]> = [
      ["morningRoutine", "morning"],
      ["dayRoutine", "day"],
      ["eveningRoutine", "evening"],
      ["nightRoutine", "night"],
    ];
    for (const [key, tod] of buckets) {
      const arr = parsed[key];
      if (!Array.isArray(arr)) continue;
      for (const h of arr) {
        if (typeof h === "string") {
          out.push({ name: h.trim(), description: "", timeOfDay: tod });
        } else if (h && typeof h.name === "string") {
          out.push({
            name: String(h.name).trim(),
            description: String(h.description || h.desc || "").trim(),
            timeOfDay: tod,
          });
        }
      }
    }
  }

  // Clean: max 5 words in name, dedupe, drop empty
  const seen = new Set<string>();
  const cleaned = out
    .map(h => ({
      ...h,
      name: h.name.replace(/^[•\-\*\d\.\)\s]+/, "").split(/\s+/).slice(0, 5).join(" "),
    }))
    .filter(h => h.name.length > 2)
    .filter(h => {
      const k = h.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  return cleaned.length >= 3 ? cleaned : null;
}

export async function POST(req: NextRequest) {
  let goals: string[] = [];
  let userName = "";
  let regenerate = false;
  let nonce: number | undefined;
  try {
    const body = await req.json();
    goals = Array.isArray(body.goals) ? body.goals.filter((g: any) => typeof g === "string" && g.trim()) : [];
    userName = body.userName || "";
    regenerate = Boolean(body.regenerate);
    nonce = typeof body.nonce === "number" ? body.nonce : undefined;
  } catch {}

  if (goals.length === 0) {
    return NextResponse.json({ habits: pickFallback([]), source: "fallback-no-goals" });
  }

  const variationSeed = nonce ?? Math.floor(Math.random() * 1_000_000);
  const variationNote = regenerate
    ? `\nVARIATION SEED: ${variationSeed}. The user asked for a DIFFERENT set than before — pick alternative angles, different times of day, fresh wording. Do not repeat the most obvious choices.`
    : `\nSEED: ${variationSeed}.`;

  const prompt = `${TRAC_RESPONSE_STYLE}

You are designing a personalised daily habit system for a real user.

User: ${userName || "user"}
Goals (1-3): ${goals.map(g => `"${g}"`).join(", ")}${variationNote}

REQUIREMENTS:
- Generate 4 to 6 habits TOTAL across the day, directly tied to the user's specific goals.
- Each habit name: maximum 5 words, action-oriented, specific to the goal (NOT generic like "Morning Sunlight Walk", "Read 10 Pages" unless reading is the goal).
- Each habit description: 1-2 sentences (15-35 words), explaining the mechanism and why it advances THIS user's goal.
- Spread habits across morning / day / evening / night so the user has structure, but only include a time slot if it makes sense for the goal.
- NEVER include filler habits ("drink water", "meditate", "journal") unless the user's goal explicitly demands them.
- NEVER repeat the same habit theme.
- Habits must be reasonable for a normal busy person — no 5am ice baths, no 2-hour blocks.

Return STRICT JSON, no commentary, no markdown fences:
{
  "habits": [
    { "name": "...", "description": "...", "timeOfDay": "morning" | "day" | "evening" | "night" }
  ]
}`;

  try {
    const raw = await callGrok(prompt, regenerate ? 0.95 : 0.85);
    const parsed = tryParseJson(raw);
    const habits = normalize(parsed);
    if (habits && habits.length >= 3) {
      return NextResponse.json({ habits: habits.slice(0, 6), source: "ai" });
    }
    return NextResponse.json({ habits: pickFallback(goals), source: "fallback-parse" });
  } catch (err) {
    console.error("Setup habits AI error:", err);
    return NextResponse.json({ habits: pickFallback(goals), source: "fallback-error" });
  }
}
