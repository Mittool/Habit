import { NextRequest, NextResponse } from "next/server";
import { callGrok } from "@/lib/grok";
import { TRAC_RESPONSE_STYLE } from "@/lib/coach-prompts";

export const dynamic = "force-dynamic";

interface Habit {
  name: string;
  description: string;
  timeOfDay: "morning" | "day" | "evening" | "night";
}

// ─────────────────────────────────────────────────────────────
// Curated category templates. Used as a LAST resort when the
// LLM call fails AND the goal text matches a known keyword.
// For unknown goals we synthesise habits directly from the
// goal text (see synthesiseFromGoal below).
// ─────────────────────────────────────────────────────────────
const CATEGORY_LIBRARY: Record<string, Habit[]> = {
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
  language: [
    { name: "15-Minute Vocab Drill", description: "Spaced-repetition flashcards for new words — short, daily, and ruthlessly consistent beats long weekend sessions.", timeOfDay: "morning" },
    { name: "Listen Native Audio", description: "20 minutes of podcasts, music, or shows in the target language during commute or chores — passive immersion.", timeOfDay: "day" },
    { name: "Speak Out Loud", description: "Talk to yourself in the target language for 5 minutes — narrate what you're doing to build fluency reflex.", timeOfDay: "evening" },
    { name: "Journal Three Sentences", description: "Write three sentences about your day in the target language to lock in active grammar use.", timeOfDay: "night" },
  ],
  music: [
    { name: "Technique Warm-Up", description: "10 minutes of scales, chords, or finger exercises before any song work — the boring reps make everything else easier.", timeOfDay: "morning" },
    { name: "Focused Practice Block", description: "25 minutes on ONE difficult passage at slow tempo with a metronome — repetition with correction beats playing through.", timeOfDay: "day" },
    { name: "Learn New Section", description: "Add 8-16 bars of new material to your current piece — small daily additions compound into a full repertoire.", timeOfDay: "evening" },
    { name: "Record And Listen", description: "Record one minute of yourself playing and listen back — your ears catch things your hands cannot.", timeOfDay: "night" },
  ],
  writing: [
    { name: "Morning Pages Draft", description: "Write 500 words first thing, no editing — clears mental noise and builds the writing muscle through volume.", timeOfDay: "morning" },
    { name: "Single Project Block", description: "45 minutes on one writing project with no tabs or research — production now, polish later.", timeOfDay: "day" },
    { name: "Edit Yesterday's Work", description: "Spend 15 minutes editing what you wrote yesterday — fresh eyes catch what tired ones miss.", timeOfDay: "evening" },
    { name: "Read One Great Author", description: "20 minutes of high-quality reading in your genre to absorb sentence rhythm and structure.", timeOfDay: "night" },
  ],
  money: [
    { name: "Net Worth Glance", description: "Quick 2-minute check of accounts and balances to keep money awareness high without obsession.", timeOfDay: "morning" },
    { name: "Log Today's Spending", description: "Record every purchase as it happens — the act of writing it down curbs impulse spending naturally.", timeOfDay: "day" },
    { name: "Plan Tomorrow's Expenses", description: "Decide what you'll spend on tomorrow before bed so the day starts with intent, not reaction.", timeOfDay: "evening" },
    { name: "Weekly Save Transfer", description: "Move a fixed amount to savings the same day each week — automate the decision out of willpower.", timeOfDay: "night" },
  ],
  creative: [
    { name: "Idea Capture Sketch", description: "Three rough sketches or concepts in a notebook — quantity beats quality at the idea stage.", timeOfDay: "morning" },
    { name: "Studio Time Block", description: "60 minutes of hands-on creation with phone face-down — uninterrupted making is where breakthroughs happen.", timeOfDay: "day" },
    { name: "Show Your Work", description: "Post or share one piece of work-in-progress — public commitment forces consistent output.", timeOfDay: "evening" },
    { name: "Study A Master", description: "Spend 15 minutes analysing one piece by an artist you admire — break down what makes it work.", timeOfDay: "night" },
  ],
  sleep: [
    { name: "Same-Time Wake Up", description: "Wake at the same time every day to anchor your circadian rhythm — the foundation of every other sleep fix.", timeOfDay: "morning" },
    { name: "Sunlight Within 30 Minutes", description: "Get 5 minutes of outdoor light early — the strongest natural signal to set your internal clock.", timeOfDay: "morning" },
    { name: "Caffeine Cutoff At 2pm", description: "No caffeine after 2pm — half-life of 6 hours means your evening coffee is still active at bedtime.", timeOfDay: "day" },
    { name: "Screen-Free Wind Down", description: "30 minutes off all screens before bed to let melatonin rise and signal sleep onset.", timeOfDay: "night" },
  ],
};

// Keyword → category. Order matters: more specific first.
const CATEGORY_MATCHERS: Array<[RegExp, keyof typeof CATEGORY_LIBRARY]> = [
  [/jee|neet|exam|crack|gate|upsc|ielts|toefl|sat|gre|cat\b/i, "exam"],
  [/spanish|french|german|japanese|chinese|korean|italian|portuguese|hindi|arabic|language|fluent|polyglot|duolingo/i, "language"],
  [/guitar|piano|violin|drums|sing|music|song|chord|scale|instrument|band/i, "music"],
  [/write|writing|novel|blog|essay|journal|book.*write|author/i, "writing"],
  [/money|saving|invest|budget|finance|debt|wealth|expense|frugal/i, "money"],
  [/draw|paint|sketch|art|design|photo|video|edit|create|maker|craft|portfolio/i, "creative"],
  [/sleep|insomnia|rest|wake|bedtime|circadian/i, "sleep"],
  [/fit|gym|weight|muscle|run|health|body|cardio|yoga|workout|exercise/i, "fitness"],
  [/read|book/i, "reading"],
  [/focus|procrast|deep work|distract|attention/i, "focus"],
  [/discipl|morning|routine|consist|wake/i, "discipline"],
  [/mind|stress|calm|anxiety|medit|peace|breath/i, "mindfulness"],
];

// Lowercased common words to skip when extracting the "topic" from a custom goal
const STOPWORDS = new Set([
  "a","an","the","and","or","but","of","for","to","in","on","with","by","from","at","as",
  "is","are","be","being","been","have","has","had","do","does","did","will","would","should","can","could",
  "my","your","our","their","his","her","its","this","that","these","those",
  "more","most","less","very","really","just","also","than","then","so","not","no",
  "i","me","we","us","you","they","them",
  "best","good","great","better","perfect","peak","total","complete","full","whole","real",
  "year","month","week","day","daily","weekly","monthly","hour","hours","minute","minutes",
  "want","need","try","get","make","become","build","start","stop","keep","stay","quit","master","learn","study","practice",
  "every","some","any","all","each","into","over","through","across","under","above","below",
  "next","new","old","first","last","forever","ever","always","never",
  "professional","amateur","beginner","advanced","intermediate",
  "good","bad","better","worse","fluent","perfect",
  "trail","theory","practice","class","course","level","stage",
]);

// Words that are themselves clearly the "subject" of the goal — boost them
const SUBJECT_HINTS = new Set([
  "spanish","french","german","japanese","chinese","korean","italian","portuguese","hindi","arabic","english","russian",
  "guitar","piano","violin","drums","bass","cello","saxophone","flute",
  "chess","poker","go","scrabble",
  "spanish","python","javascript","rust","golang","react","sql","ai","ml",
  "yoga","pilates","boxing","mma","jiu-jitsu","karate","running","cycling","swimming","climbing","hiking",
  "marathon","triathlon","ironman","5k","10k",
  "photography","painting","drawing","sculpture","poetry","writing","singing","dancing",
  "meditation","mindfulness","journaling",
  "saas","startup","business","investing","trading","crypto",
  "smoking","drinking","sugar","alcohol","caffeine",
  "dad","mom","parent","husband","wife",
]);

function extractTopic(goal: string): string {
  const tokens = goal
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  if (tokens.length === 0) return "Goal";

  // 1) If any token is in SUBJECT_HINTS, prefer that
  for (const t of tokens) {
    if (SUBJECT_HINTS.has(t)) return t;
  }

  // 2) Prefer the LAST meaningful token — natural-language goals usually
  //    put the subject at the end ("Become a professional photographer" → photographer)
  return tokens[tokens.length - 1];
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

// Verb prefix per time slot, tuned per topic so output reads naturally.
// We avoid awkward "Morning Smoking Block" by using verbs that fit the goal type.
function actionForTopic(topic: string, slot: "morning" | "day" | "evening" | "night"): { name: string; desc: string } {
  const t = titleCase(topic);
  const lower = topic.toLowerCase();

  // Quit/avoid goals
  if (/smok|drink|sugar|alcohol|caffeine|junk|porn|gambl/i.test(lower)) {
    const map = {
      morning: { name: `Morning ${t} Check-In`, desc: `Note your craving level for ${lower} on a 1-10 scale before the day starts — awareness is what makes the urge surfable, not unstoppable.` },
      day: { name: `Replace ${t} Urge`, desc: `When the urge to ${lower} hits, do 10 push-ups, take a walk, or drink water instead — break the loop with a physical pattern interrupt.` },
      evening: { name: `Log Trigger Moments`, desc: `Write down each time you wanted to ${lower} today and what triggered it — patterns become obvious within a week.` },
      night: { name: `Win Streak Tally`, desc: `Mark today's date on a visible calendar if you avoided ${lower} — the chain of marks becomes its own motivation.` },
    };
    return map[slot];
  }

  // Language goals
  if (SUBJECT_HINTS.has(lower) && /spanish|french|german|japanese|chinese|korean|italian|portuguese|hindi|arabic|english|russian/i.test(lower)) {
    const map = {
      morning: { name: `Morning ${t} Vocab`, desc: `15 minutes of ${t} flashcards or spaced-repetition before checking your phone — early-day memory is your sharpest.` },
      day: { name: `${t} Listening Block`, desc: `20 minutes of ${t} podcasts, music, or video during commute or chores — passive immersion compounds quickly.` },
      evening: { name: `Speak ${t} Out Loud`, desc: `Talk to yourself in ${t} for 5 minutes — narrate what you're doing to build fluency reflexes.` },
      night: { name: `${t} Three Sentences`, desc: `Write three sentences in ${t} about your day to lock in active grammar use before bed.` },
    };
    return map[slot];
  }

  // Instrument / music
  if (/guitar|piano|violin|drums|bass|cello|saxophone|flute/i.test(lower)) {
    const map = {
      morning: { name: `${t} Warm-Up`, desc: `10 minutes of scales, chords, or finger exercises on ${t} — the boring reps make everything else easier.` },
      day: { name: `${t} Focused Practice`, desc: `25 minutes on ONE difficult passage at slow tempo with a metronome — repetition with correction beats playing through.` },
      evening: { name: `${t} Learn New Section`, desc: `Add 8-16 bars of new material to your current piece on ${t} — small daily additions become full repertoire.` },
      night: { name: `${t} Record & Listen`, desc: `Record one minute of yourself playing ${t} and listen back — your ears catch things your hands cannot.` },
    };
    return map[slot];
  }

  // Sport / running / fitness specific subjects
  if (/marathon|triathlon|5k|10k|running|cycling|swimming|climbing|hiking|yoga|pilates|boxing/i.test(lower)) {
    const map = {
      morning: { name: `${t} Training Session`, desc: `Today's prescribed ${t} workout — protect the time, dial in the warm-up, and execute the plan.` },
      day: { name: `${t} Fuel Check`, desc: `Hit your hydration and calorie target to support ${t} performance — under-fuelling kills progress faster than under-training.` },
      evening: { name: `${t} Mobility Work`, desc: `15 minutes of mobility or stretching tied to ${t} demands — prevents the injuries that derail training cycles.` },
      night: { name: `${t} Log Today`, desc: `Record distance, time, effort, and how you felt — the log is what turns workouts into a trajectory.` },
    };
    return map[slot];
  }

  // Default goal-aware verbs
  const map = {
    morning: { name: `Morning ${t} Focus`, desc: `Spend 15 minutes on ${t} first thing — early-day focus is your highest-quality cognitive time and locks the priority in before distractions arrive.` },
    day: { name: `Deep ${t} Block`, desc: `One uninterrupted 45-minute session on ${t} — phone in another room, single task, real progress measured by output not time.` },
    evening: { name: `${t} Progress Note`, desc: `Write three sentences about what you moved forward on ${t} today — naming progress is what makes it stick.` },
    night: { name: `Plan Tomorrow's ${t}`, desc: `Before bed, decide the one specific ${t} action you'll take tomorrow morning — eliminates start-up friction at the moment of weakest willpower.` },
  };
  return map[slot];
}

// Synthesise 4 habits directly from a free-form goal when no category matches.
function synthesiseFromGoal(goal: string): Habit[] {
  const topic = extractTopic(goal);
  const slots: Habit["timeOfDay"][] = ["morning", "day", "evening", "night"];
  return slots.map(slot => {
    const a = actionForTopic(topic, slot);
    return { name: a.name, description: a.desc, timeOfDay: slot };
  });
}

function pickFallback(goals: string[]): Habit[] {
  if (goals.length === 0) {
    return synthesiseFromGoal("Daily Productivity");
  }

  const joined = goals.join(" ");
  const matched = new Set<keyof typeof CATEGORY_LIBRARY>();
  for (const [re, cat] of CATEGORY_MATCHERS) {
    if (re.test(joined)) matched.add(cat);
  }

  const pools: Habit[] = [];

  if (matched.size > 0) {
    // Pull from matched categories
    for (const cat of matched) {
      pools.push(...CATEGORY_LIBRARY[cat]);
    }
  }

  // For any goal that didn't match a category, synthesise habits directly from its text.
  // This is the key fix: custom goals like "Learn Spanish in 6 months" now get
  // Spanish-specific habit names even when the LLM is unavailable.
  for (const g of goals) {
    let goalMatched = false;
    for (const [re] of CATEGORY_MATCHERS) {
      if (re.test(g)) { goalMatched = true; break; }
    }
    if (!goalMatched) {
      pools.push(...synthesiseFromGoal(g));
    }
  }

  if (pools.length === 0) {
    pools.push(...synthesiseFromGoal(goals[0]));
  }

  // Dedupe by lowercase name. Shuffle a bit so repeat fallback calls don't
  // return the exact same order (visual variety even without the LLM).
  const seen = new Set<string>();
  const unique: Habit[] = [];
  for (const h of pools) {
    const k = h.name.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(h);
    }
  }

  // Lightly shuffle then take up to 6, biased toward spread across times of day
  const byTime: Record<Habit["timeOfDay"], Habit[]> = { morning: [], day: [], evening: [], night: [] };
  for (const h of unique) byTime[h.timeOfDay].push(h);
  const out: Habit[] = [];
  const order: Habit["timeOfDay"][] = ["morning", "day", "evening", "night"];
  // Round-robin across times of day so result feels like a full daily system
  let added = true;
  while (added && out.length < 6) {
    added = false;
    for (const tod of order) {
      if (byTime[tod].length > 0 && out.length < 6) {
        const idx = Math.floor(Math.random() * byTime[tod].length);
        out.push(byTime[tod].splice(idx, 1)[0]);
        added = true;
      }
    }
  }
  return out;
}

function tryParseJson(raw: string): any | null {
  if (!raw) return null;
  let s = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
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
- If the user has a CUSTOM goal (anything not in the preset list), the habits must reference that goal's actual topic — e.g. "Learn Spanish" → habits with vocab, listening, speaking, not generic "deep work".

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
  } catch (err: any) {
    console.error("Setup habits AI error:", err?.message || err);
    const msg = String(err?.message || err);
    const source = msg.includes("rate_limit") || msg.includes("429") ? "fallback-rate-limit" : "fallback-error";
    return NextResponse.json({ habits: pickFallback(goals), source });
  }
}
