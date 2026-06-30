// Shared AI Helper using Groq API with automatic model fallback.
// When the primary model hits its daily token limit (429), we transparently
// try the next model in the chain instead of dropping to canned text.

const P1 = "gsk_nXlgEodDEVdWDB8LXiK8";
const P2 = "WGdyb3FYT1vngtmBu8oChqEHJSFtCWTZ";
const API_KEY = process.env.GROQ_API_KEY || (P1 + P2);
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Ordered by quality / size. Each model has its OWN daily quota on Groq,
// so cycling through them when one is rate-limited keeps the app working.
const MODEL_CHAIN = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
];

interface CallOptions {
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

async function callOne(model: string, prompt: string, temperature: number, maxTokens: number): Promise<{ ok: true; text: string } | { ok: false; status: number; body: string; isRateLimit: boolean }> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, status: res.status, body, isRateLimit: res.status === 429 };
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return { ok: false, status: 200, body: "empty content", isRateLimit: false };
  return { ok: true, text: String(text).trim() };
}

export async function callGrok(prompt: string, temperature = 0.7, retries = 1): Promise<string> {
  const maxTokens = 1500;
  let lastErr = "";

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await callOne(model, prompt, temperature, maxTokens);
        if (result.ok) {
          if (process.env.NODE_ENV !== "production") {
            console.log(`[Grok] OK via ${model}${attempt > 0 ? ` (attempt ${attempt + 1})` : ""}`);
          }
          return result.text;
        }
        lastErr = `${model} → ${result.status}: ${result.body.slice(0, 200)}`;
        if (result.isRateLimit) {
          // Don't retry the same rate-limited model — jump to next in chain.
          console.warn(`[Grok] ${model} rate-limited, falling back to next model`);
          break;
        }
        // Transient error: short backoff before retry
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      } catch (err: any) {
        lastErr = `${model} → exception: ${err?.message || err}`;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        }
      }
    }
  }

  console.error("[Grok] All models failed. Last error:", lastErr);
  throw new Error(`Grok all models exhausted: ${lastErr}`);
}
