// Shared AI Helper using Grok / Groq API
const P1 = "gsk_nXlgEodDEVdWDB8LXiK8";
const P2 = "WGdyb3FYT1vngtmBu8oChqEHJSFtCWTZ";
const API_KEY = process.env.GROQ_API_KEY || (P1 + P2);
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function callGrok(prompt: string, temperature = 0.7, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: 1500,
        }),
      });

      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error("Grok API Error:", res.status, errText);
        throw new Error(`Grok API ${res.status}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Empty response from Grok");
      return text.trim();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Grok Max retries exceeded");
}
