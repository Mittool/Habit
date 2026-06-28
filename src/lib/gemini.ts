// Client-side helper - calls our API route
export async function getAIAdvice(mood: string, need: string): Promise<string> {
  const response = await fetch("/api/ai/advice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mood, need }),
  });
  if (!response.ok) throw new Error("Failed to get AI advice");
  const data = await response.json();
  return data.advice;
}

export async function getHabitTip(missedHabit: string): Promise<string> {
  const response = await fetch("/api/ai/habit-tip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ missedHabit }),
  });
  if (!response.ok) throw new Error("Failed to get habit tip");
  const data = await response.json();
  return data.tip;
}

export async function getDailyQuote(): Promise<{ text: string; author: string }> {
  const response = await fetch(`/api/ai/quote?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
  });
  if (!response.ok) throw new Error("Failed to get quote");
  const data = await response.json();
  return data;
}
