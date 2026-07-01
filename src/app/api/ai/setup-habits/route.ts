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
    { name: "5-Minute Morning Stretch", description: "Right after you wake up, spend 5 minutes doing simple stretches — reach your arms overhead, twist side to side, touch your toes. This wakes up stiff muscles from sleep and makes the rest of your day feel less sluggish.", timeOfDay: "morning" },
    { name: "Daily Workout Session", description: "Do 30-45 minutes of exercise — this could be lifting weights at the gym, doing push-ups and squats at home, or a fitness class you enjoy. If you're new, start with 3 sets of 10 reps for each exercise.", timeOfDay: "day" },
    { name: "Track Your Meals", description: "Write down what you eat today, either in a notes app or a free tracker like MyFitnessPal. This makes you eat healthier automatically because you actually see what you're putting in your body.", timeOfDay: "evening" },
    { name: "Cool-Down Stretch", description: "Before bed, spend 10 minutes gently stretching the muscles you used today. This helps you feel less sore tomorrow and helps you fall asleep faster because your body is more relaxed.", timeOfDay: "night" },
  ],
  reading: [
    { name: "Read 10 Pages First", description: "Before you open your phone in the morning, read 10 pages of a book. That's usually just 10-15 minutes. Doing it before the phone means you actually do it, instead of losing the morning to scrolling.", timeOfDay: "morning" },
    { name: "30-Minute Reading Session", description: "Set aside 30 quiet minutes to read your current book, with your phone in another room. Keep a notebook or sticky notes handy to jot down ideas you want to remember later.", timeOfDay: "day" },
    { name: "Write What You Learned", description: "In 2-3 sentences, write down the most interesting thing you read today. This tiny recap makes ideas actually stick in your memory instead of forgetting them by next week.", timeOfDay: "evening" },
    { name: "Wind-Down Story Time", description: "Read 20 minutes of fiction (novels, stories) in dim light before bed instead of scrolling. Fiction relaxes your brain and helps you fall asleep faster than screens do.", timeOfDay: "night" },
  ],
  focus: [
    { name: "Write Top 3 Tasks", description: "Before you check email or messages, write down the 3 most important things you want to finish today. This one habit stops your day from getting hijacked by other people's requests.", timeOfDay: "morning" },
    { name: "One Deep Focus Block", description: "Pick your hardest task and work on it for 60-90 minutes straight — phone in another room, notifications off. Even one session like this per day gets more done than a whole day of jumping between things.", timeOfDay: "day" },
    { name: "Clean Up Tabs & Inbox", description: "Take 10 minutes to close all your open browser tabs and reply to or archive emails until your inbox is empty. Starting tomorrow with a clean slate makes it way easier to focus.", timeOfDay: "evening" },
    { name: "Plan Tomorrow's First Task", description: "Before bed, write down the very first task you'll do tomorrow morning. When you wake up, you'll know exactly what to do instead of wasting 30 minutes deciding.", timeOfDay: "night" },
  ],
  discipline: [
    { name: "Wake Up Same Time Daily", description: "Set your alarm for the same time every single day, including weekends. Your body loves routine — after about a week you'll start waking up naturally and feel more energetic all day.", timeOfDay: "morning" },
    { name: "No Snooze Button", description: "The instant your alarm goes off, sit up and put your feet on the floor. Skipping the snooze button is a small daily win that trains your brain to follow through on other things too.", timeOfDay: "morning" },
    { name: "Do Hardest Task First", description: "Whatever task you're dreading most today, do it before lunch. Your willpower is strongest in the morning, and getting the hard thing done first makes the rest of the day feel easy.", timeOfDay: "day" },
    { name: "Phone Off At 10pm", description: "Put your phone on Do Not Disturb (or in another room) by 10pm every night. This one boundary protects your sleep AND makes tomorrow morning way better.", timeOfDay: "night" },
  ],
  mindfulness: [
    { name: "Slow Breathing Reset", description: "Do 4 slow breaths: inhale for 4 seconds, hold for 7, breathe out for 8. Repeat 4 times. This calms your body down instantly and works better than a coffee for shaking off morning grogginess.", timeOfDay: "morning" },
    { name: "One Meal Without Phone", description: "Eat one full meal today with no phone, no TV, no laptop — just your food. You'll actually taste it and feel full sooner. This is one of the easiest ways to feel more present in your day.", timeOfDay: "day" },
    { name: "2-Minute Sit Still", description: "Sit still for 2 minutes with your eyes closed. When a thought comes up, just notice it and let it pass — don't try to stop thinking. It's not about emptying your mind, just resting it for a moment.", timeOfDay: "evening" },
    { name: "Three Gratitudes", description: "Write down 3 specific things from today you're thankful for — the small stuff counts (a good coffee, a laugh with a friend). Doing this daily actually rewires your brain to notice good things more.", timeOfDay: "night" },
  ],
  exam: [
    { name: "Review Yesterday's Mistakes", description: "Spend 15 minutes redoing any questions you got wrong yesterday. This is the fastest way to actually learn from mistakes instead of repeating them on the real exam.", timeOfDay: "morning" },
    { name: "Focused Study Session", description: "Study one subject for 90 minutes with your phone off. Pick a different subject each day so all of them stay fresh in your mind before the exam.", timeOfDay: "day" },
    { name: "Test Yourself with Flashcards", description: "Use flashcards (paper or an app like Anki/Quizlet) for 20 minutes on this week's topics. Testing yourself is proven to work better than just re-reading your notes.", timeOfDay: "evening" },
    { name: "5 Timed Practice Questions", description: "Solve 5 exam-style questions with a timer running, then honestly mark them. This shows you exactly how ready you are and what to study more tomorrow.", timeOfDay: "night" },
  ],
  language: [
    { name: "15-Minute Vocab Practice", description: "Spend 15 minutes practicing new words using a free app like Duolingo, Anki, or Quizlet. Short daily practice works way better than long study sessions once a week.", timeOfDay: "morning" },
    { name: "Listen to the Language", description: "Play 20 minutes of podcasts, music, or a show in the language you're learning — during your commute, while cooking, or on a walk. Your ear gets used to the sounds without any extra effort.", timeOfDay: "day" },
    { name: "Speak Out Loud", description: "Talk to yourself in the language for 5 minutes — describe what you're doing right now, even if you make mistakes. This builds the muscle memory to speak without freezing up in real conversations.", timeOfDay: "evening" },
    { name: "Write 3 Sentences", description: "Before bed, write 3 sentences about your day in the language you're learning. Even simple ones like 'I ate pasta today' count. This locks in the grammar you learned during the day.", timeOfDay: "night" },
  ],
  music: [
    { name: "10-Minute Warm-Up", description: "Before playing any songs, spend 10 minutes on scales, chords, or finger exercises. It might feel boring, but this is what makes the songs you actually want to play feel easier week after week.", timeOfDay: "morning" },
    { name: "Slow Practice One Part", description: "Pick ONE tricky part of a song and play it slowly for 25 minutes with a metronome. Playing slowly and correctly is what actually makes you faster — practicing fast just cements your mistakes.", timeOfDay: "day" },
    { name: "Learn a New Section", description: "Add just 8-16 bars of new music to whatever song you're working on. Small daily bits add up — in a month you'll have learned a whole new piece without it feeling hard.", timeOfDay: "evening" },
    { name: "Record and Listen Back", description: "Record 1 minute of yourself playing on your phone, then listen back. You'll hear mistakes you couldn't notice while playing — this is the fastest way to actually improve.", timeOfDay: "night" },
  ],
  writing: [
    { name: "500 Words First Thing", description: "Write 500 words in the morning before doing anything else — don't edit, don't judge, just write. It clears the mental noise and builds your writing muscle. This should take 15-25 minutes.", timeOfDay: "morning" },
    { name: "One Project, 45 Minutes", description: "Work on ONE writing project for 45 minutes with your browser tabs closed. No research, no editing — just get words on the page. You can polish later.", timeOfDay: "day" },
    { name: "Edit Yesterday's Words", description: "Spend 15 minutes editing what you wrote yesterday. Fresh eyes catch problems that tired eyes miss the day before — this is how good writing actually gets made.", timeOfDay: "evening" },
    { name: "Read a Great Writer", description: "Read 20 minutes of a book in the genre you're writing. Great writing rubs off on you without you having to think about it — you'll start writing better sentences almost automatically.", timeOfDay: "night" },
  ],
  money: [
    { name: "Check Your Accounts", description: "Take 2 minutes to look at your bank and credit card balances. Not to worry — just to know. This tiny daily habit stops the panic of surprise bills and keeps you in control.", timeOfDay: "morning" },
    { name: "Log Every Purchase", description: "Every time you spend money today, write it down (in a notes app or a free app like Wallet/Mint). Just seeing where your money goes each day naturally cuts wasteful spending in half.", timeOfDay: "day" },
    { name: "Plan Tomorrow's Spending", description: "Before bed, decide what you'll spend on tomorrow: groceries, coffee, transport. Planning it means you spend on things you actually want, not random impulse buys.", timeOfDay: "evening" },
    { name: "Weekly Save Transfer", description: "Once a week on the same day, move a set amount of money from your checking into savings — even ₹500 or $10 counts. Doing it automatically means you actually save, instead of waiting for 'leftover' money.", timeOfDay: "night" },
  ],
  creative: [
    { name: "3 Quick Idea Sketches", description: "In a notebook, make 3 rough sketches or write down 3 ideas — they can be terrible! At the idea stage, quantity beats quality. Most great ideas come from cranking out lots of bad ones first.", timeOfDay: "morning" },
    { name: "60 Minutes of Making", description: "Spend 60 uninterrupted minutes actually creating your thing — drawing, editing, building. Phone face-down, no email. Big breakthroughs almost always come from single sessions like this.", timeOfDay: "day" },
    { name: "Share Your Work", description: "Post or share one piece of what you made today — even if it's rough. Showing your work publicly is scary but it's the single fastest way to grow and get honest feedback.", timeOfDay: "evening" },
    { name: "Study Someone You Admire", description: "Spend 15 minutes looking closely at one piece of work by an artist or creator you look up to. Ask yourself: what makes this good? You'll start doing the same things in your own work.", timeOfDay: "night" },
  ],
  sleep: [
    { name: "Wake Up Same Time Daily", description: "Wake up at the exact same time every day, including weekends. Your body clock loves routine — this one habit is the foundation of every other sleep improvement.", timeOfDay: "morning" },
    { name: "Get Morning Sunlight", description: "Within 30 minutes of waking, step outside for 5 minutes of natural daylight — even on a cloudy day. Sunlight in the morning is the strongest signal to reset your body clock, and helps you sleep better tonight.", timeOfDay: "morning" },
    { name: "No Caffeine After 2pm", description: "Skip coffee, tea, energy drinks, and cola after 2pm. Caffeine stays in your body for about 6 hours, so an afternoon coffee is still keeping you awake at bedtime, even if you don't notice.", timeOfDay: "day" },
    { name: "Screens Off Before Bed", description: "Turn off phones, laptops, and TVs 30 minutes before bed. The blue light from screens tricks your brain into staying alert. Reading a book or stretching instead makes falling asleep way easier.", timeOfDay: "night" },
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
      morning: { name: `Morning ${t} Check-In`, desc: `Before the day starts, rate how much you're craving ${lower} on a scale of 1 to 10. Noticing the craving is the first step to controlling it — cravings feel weaker once you name them.` },
      day: { name: `Replace ${t} Urge`, desc: `When the urge to ${lower} hits, do something physical instead — 10 push-ups, a quick walk, or a big glass of water. Interrupting the pattern with movement makes the urge pass in about 5 minutes.` },
      evening: { name: `Log What Triggered You`, desc: `Write down each time today you wanted to ${lower} and what was happening (stress? boredom? a specific place?). After a week you'll clearly see your personal triggers and can plan around them.` },
      night: { name: `Mark Today as a Win`, desc: `If you avoided ${lower} today, put an X on today's date on a calendar you can see every day. Watching the chain of X's grow becomes surprisingly motivating on its own.` },
    };
    return map[slot];
  }

  // Language goals
  if (SUBJECT_HINTS.has(lower) && /spanish|french|german|japanese|chinese|korean|italian|portuguese|hindi|arabic|english|russian/i.test(lower)) {
    const map = {
      morning: { name: `Morning ${t} Vocab`, desc: `Spend 15 minutes practicing ${t} words using a free app like Duolingo, Anki, or Quizlet. Doing it before checking your phone means you actually do it — your memory is also sharpest in the morning.` },
      day: { name: `${t} Listening Block`, desc: `Play 20 minutes of ${t} podcasts, music, or a show during your commute or while doing chores. Your ear naturally learns the sounds and rhythm of ${t} without any extra effort.` },
      evening: { name: `Speak ${t} Out Loud`, desc: `Talk to yourself in ${t} for 5 minutes — describe what you're doing, even simple things like "I am making dinner". This builds the confidence to actually speak with a real person.` },
      night: { name: `${t} Three Sentences`, desc: `Before bed, write 3 sentences in ${t} about your day. They can be very simple — the point is to actively use the grammar you learned, which makes it stick way better than just reading.` },
    };
    return map[slot];
  }

  // Instrument / music
  if (/guitar|piano|violin|drums|bass|cello|saxophone|flute/i.test(lower)) {
    const map = {
      morning: { name: `${t} Warm-Up`, desc: `Spend 10 minutes on ${t} basics — scales, chord shapes, or finger exercises. It might feel boring, but these small drills are what make the songs you actually want to play feel easier.` },
      day: { name: `${t} Slow Practice`, desc: `Pick ONE tricky part of a song and play it slowly on ${t} for 25 minutes, using a free metronome app to keep time. Playing slowly and correctly is what makes you faster later.` },
      evening: { name: `Learn New Section`, desc: `Add just 8-16 new bars of music to whatever song you're learning on ${t}. Tiny daily additions add up — in a month you'll have learned a whole new song without it feeling hard.` },
      night: { name: `Record and Listen`, desc: `Record 1 minute of yourself playing ${t} on your phone, then listen back. You'll hear mistakes you couldn't notice while playing — this is the fastest way to actually improve.` },
    };
    return map[slot];
  }

  // Sport / running / fitness specific subjects
  if (/marathon|triathlon|5k|10k|running|cycling|swimming|climbing|hiking|yoga|pilates|boxing/i.test(lower)) {
    const map = {
      morning: { name: `${t} Training Session`, desc: `Do today's scheduled ${t} workout — even if you don't feel like it. Warm up first, then follow your plan. Consistency matters far more than any single perfect session.` },
      day: { name: `Fuel Your Body`, desc: `Drink enough water and eat enough calories to support your ${t} training. Under-eating actually stops your progress faster than skipping a workout would — your body needs fuel to get stronger.` },
      evening: { name: `Stretch and Recover`, desc: `Spend 15 minutes stretching the muscles you used for ${t} today. This is what prevents the injuries that force people to stop training for weeks at a time.` },
      night: { name: `Log Today's Workout`, desc: `Write down what you did today: distance or time, how hard it felt, how you felt after. Tracking is what turns random workouts into real progress you can actually see.` },
    };
    return map[slot];
  }

  // Default goal-aware verbs
  const map = {
    morning: { name: `Morning ${t} Focus`, desc: `Spend 15 minutes on ${t} first thing in the morning — before checking messages or social media. Your brain is at its sharpest early on, and this locks in your top priority before distractions take over.` },
    day: { name: `${t} Work Session`, desc: `Set aside 45 minutes to work only on ${t} — phone in another room, one task at a time. A single focused session like this gets more done than a whole day of jumping between things.` },
    evening: { name: `${t} Progress Note`, desc: `Write 3 sentences about what you moved forward on ${t} today. Naming your progress out loud is what makes it feel real and keeps you motivated to keep going tomorrow.` },
    night: { name: `Plan Tomorrow's ${t} Step`, desc: `Before bed, decide the one specific ${t} action you'll do tomorrow morning. Knowing exactly what to do first thing removes the mental effort of deciding when you're groggy.` },
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
- Each habit description MUST be written for a total beginner. 2-3 sentences (25-55 words). It must:
    * Say EXACTLY what to do (concrete steps a first-timer can follow)
    * Say HOW LONG it takes (e.g. "just 10 minutes")
    * Say WHY it helps in plain everyday language
    * NEVER use jargon words like "pomodoro", "spaced repetition", "circadian rhythm", "compound lifts", "trigger pairing", "MAD", "anchor", "cue stacking", "dopamine", "REM", "deep work" without immediately explaining them in simple words (e.g. instead of "pomodoro" say "a 25-minute focused work block").
    * NEVER assume the reader already knows fitness / productivity / study terminology.
    * Avoid buzzwords ("compound", "leverage", "high-quality cognitive time", "output not time", "ignition") — use everyday phrases a 12-year-old would understand.
- Spread habits across morning / day / evening / night so the user has structure, but only include a time slot if it makes sense for the goal.
- NEVER include filler habits ("drink water", "meditate", "journal") unless the user's goal explicitly demands them.
- NEVER repeat the same habit theme.
- Habits must be reasonable for a normal busy person — no 5am ice baths, no 2-hour blocks.
- If the user has a CUSTOM goal (anything not in the preset list), the habits must reference that goal's actual topic — e.g. "Learn Spanish" → habits with vocab, listening, speaking, not generic "deep work".

GOOD description example (beginner friendly):
  "Spend 15 minutes reviewing new Spanish words using a flashcards app like Anki or Quizlet. Doing this before you check your phone in the morning helps the words stick in your memory much better than trying to cram before bed."

BAD description example (too jargon-heavy):
  "15-minute spaced-repetition vocab drill before dopamine hits — anchors morning-cognition to language acquisition."

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
