"use client";
import { useEffect, useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak } from "@/lib/store";
import { getDailyQuote, getAIAdvice } from "@/lib/gemini";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import {
  Sun,
  Zap,
  Target,
  Quote,
  MessageSquare,
  Loader,
  CheckCircle,
  Circle,
  Flame,
  Brain,
  ChevronRight,
  Settings,
  BarChart2,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

const MOODS = [
  { value: "great", label: "Great", color: "#22c55e" },
  { value: "good", label: "Good", color: "#84cc16" },
  { value: "neutral", label: "Neutral", color: "#f59e0b" },
  { value: "bad", label: "Bad", color: "#ef4444" },
  { value: "awful", label: "Awful", color: "#7c3aed" },
];

export default function HomePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const {
    user,
    habits,
    todos,
    focusSessions,
    moodEntries,
    timeBlocks,
    dailyQuote,
    setDailyQuote,
    toggleHabitCompletion,
    addAiNotification,
    aiEnabled,
    notificationsEnabled,
  } = useAppStore();

  const today = getTodayStr();
  const todayFocus = focusSessions.find((s) => s.date === today)?.minutes || 0;
  const completedToday = habits.filter((h) => h.completions[today]).length;
  const pendingTodos = todos.filter((t) => !t.completed).length;

  // Stats summary calculations
  const bestStreak = habits.length > 0 ? Math.max(0, ...habits.map((h) => getHabitBestStreak(h))) : 0;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    const completed = habits.filter((h) => h.completions[key]).length;
    return habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
  });
  const weeklyAverage = weekData.length > 0 ? Math.round(weekData.reduce((a, b) => a + b, 0) / weekData.length) : 0;
  const monthlyHabitAverage = habits.length > 0
    ? Math.round(
        Array.from({ length: 30 }, (_, i) => {
          const d = subDays(new Date(), 29 - i);
          const key = format(d, "yyyy-MM-dd");
          const completed = habits.filter((h) => h.completions[key]).length;
          return (completed / habits.length) * 100;
        }).reduce((a, b) => a + b, 0) / 30
      )
    : 0;
  const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.minutes, 0);
  const completedTodos = todos.filter((t) => t.completed).length;

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [aiMood, setAiMood] = useState("");
  const [aiNeed, setAiNeed] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (!dailyQuote || dailyQuote.date !== today) {
      if (!aiEnabled) {
        setDailyQuote({
          text: "Small daily improvements over time lead to stunning results.",
          author: "Robin Sharma",
          date: today,
        });
        return;
      }
      setQuoteLoading(true);
      getDailyQuote()
        .then((q) => setDailyQuote({ ...q, date: today }))
        .catch(() => {})
        .finally(() => setQuoteLoading(false));
    }
  }, [aiEnabled, dailyQuote, setDailyQuote]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const quoteText = dailyQuote?.text || "Small daily improvements over time lead to stunning results.";

    timeBlocks
      .filter((block) => block.date === todayKey)
      .forEach((block) => {
        const [h, m] = block.startTime.split(":").map(Number);
        const blockMinutes = h * 60 + (m || 0);
        const minutesUntil = blockMinutes - currentMinutes;
        const reminderKey = `habitflow-timebox-reminder-${todayKey}-${block.id}`;
        if (minutesUntil >= 0 && minutesUntil <= 15 && typeof window !== "undefined" && !window.localStorage.getItem(reminderKey)) {
          addAiNotification(`Upcoming time block: ${block.label} starts at ${block.startTime}. ${quoteText}`);
          window.localStorage.setItem(reminderKey, "sent");
        }
      });
  }, [notificationsEnabled, timeBlocks, dailyQuote, addAiNotification]);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = format(yesterday, "yyyy-MM-dd");
    const missed = habits.filter((h) => !h.completions[yKey]);
    if (aiEnabled && notificationsEnabled && missed.length > 0 && habits.length > 0) {
      const missedNames = missed.map((h) => h.name).join(", ");
      fetch("/api/ai/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: `User missed these habits yesterday: ${missedNames}. Today is a fresh start.`,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.message) addAiNotification(d.message);
        })
        .catch(() => {});
    }
  }, []);

  async function handleGetAdvice() {
    if (!aiMood || !aiNeed) return;
    setAiLoading(true);
    try {
      const advice = await getAIAdvice(aiMood, aiNeed);
      setAiAdvice(advice);
    } catch {
      setAiAdvice("Focus on what you can control today. Start small, stay consistent.");
    } finally {
      setAiLoading(false);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "24px", maxWidth: "720px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
            <Sun size={20} color="var(--accent)" />
            <h1 style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              {greeting}, {user?.name || "there"}
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={() => onNavigate("settings")}
          className="btn-secondary"
          style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}
      >
        {[
          {
            label: "Habits Done",
            value: `${completedToday}/${habits.length}`,
            icon: <CheckCircle size={18} color="var(--accent)" />,
            onClick: () => onNavigate("habits"),
          },
          {
            label: "Focus (min)",
            value: todayFocus,
            icon: <Zap size={18} color="#f59e0b" />,
            onClick: () => onNavigate("pomodoro"),
          },
          {
            label: "Tasks Left",
            value: pendingTodos,
            icon: <Target size={18} color="#6366f1" />,
            onClick: () => onNavigate("todo"),
          },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="card"
            style={{
              padding: "16px",
              textAlign: "left",
              cursor: "pointer",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              width: "100%",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "22px", fontWeight: "700", color: "var(--text-primary)", lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {stat.label}
                </div>
              </div>
              {stat.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Stats summary box */}
      <button
        onClick={() => onNavigate("analytics")}
        className="card"
        style={{
          width: "100%",
          padding: "20px",
          marginBottom: "20px",
          cursor: "pointer",
          textAlign: "left",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart2 size={16} color="var(--accent)" />
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              Your Stats
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--accent)" }}>
            View all <ChevronRight size={12} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <Flame size={12} color="#f59e0b" />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Best Streak</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{bestStreak}d</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <CalendarDays size={12} color="var(--accent)" />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Weekly</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: weeklyAverage >= 70 ? "var(--accent)" : weeklyAverage >= 40 ? "#f59e0b" : "#ef4444" }}>{weeklyAverage}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <TrendingUp size={12} color="#6366f1" />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Monthly</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: monthlyHabitAverage >= 70 ? "var(--accent)" : monthlyHabitAverage >= 40 ? "#f59e0b" : "#ef4444" }}>{monthlyHabitAverage}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
              <Zap size={12} color="#f59e0b" />
              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>Focus</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              {totalFocusTime >= 60 ? `${Math.floor(totalFocusTime / 60)}h` : `${totalFocusTime}m`}
            </div>
          </div>
        </div>
        {/* Mini weekly bar preview */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginTop: "14px", height: "32px" }}>
          {weekData.map((pct, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(pct, 4)}%`,
                minHeight: "3px",
                borderRadius: "2px",
                backgroundColor: pct >= 70 ? "var(--accent)" : pct >= 40 ? "#f59e0b" : pct > 0 ? "#ef4444" : "var(--border)",
                transition: "height 0.3s",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} style={{ flex: 1, textAlign: "center", fontSize: "9px", color: "var(--text-muted)" }}>
              {d}
            </span>
          ))}
        </div>
      </button>

      {/* Daily Quote */}
      <div
        className="card"
        style={{ padding: "20px", marginBottom: "20px", borderLeft: "3px solid var(--accent)" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
            color: "var(--text-muted)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <Quote size={14} />
          Daily Inspiration
        </div>
        {quoteLoading ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading quote...</div>
        ) : dailyQuote ? (
          <>
            <p
              style={{
                fontSize: "15px",
                color: "var(--text-primary)",
                lineHeight: "1.6",
                fontStyle: "italic",
                margin: "0 0 8px",
              }}
            >
              &ldquo;{dailyQuote.text}&rdquo;
            </p>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
              &mdash; {dailyQuote.author}
            </p>
          </>
        ) : (
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            &ldquo;Small daily improvements over time lead to stunning results.&rdquo;
          </p>
        )}
      </div>

      {/* Today's habits quick-check */}
      {habits.length > 0 && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              {"Today\u2019s Habits"}
            </h3>
            <button
              onClick={() => onNavigate("habits")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {habits.slice(0, 4).map((h) => {
              const done = h.completions[today];
              const streak = getHabitStreak(h);
              return (
                <div
                  key={h.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: done ? "var(--accent-light)" : "var(--bg-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => toggleHabitCompletion(h.id, today)}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: h.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "14px",
                      color: done ? "var(--accent)" : "var(--text-primary)",
                      textDecoration: done ? "line-through" : "none",
                      fontWeight: done ? "400" : "500",
                    }}
                  >
                    {h.name}
                  </span>
                  {streak > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        fontSize: "11px",
                        color: "#f59e0b",
                      }}
                    >
                      <Flame size={11} />
                      {streak}
                    </div>
                  )}
                  {done ? (
                    <CheckCircle size={18} color="var(--accent)" />
                  ) : (
                    <Circle size={18} color="var(--border)" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Advice panel */}
      {aiEnabled && (
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <MessageSquare size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
            AI Productivity Coach
          </h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <label
              style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}
            >
              Current mood
            </label>
            <select
              value={aiMood}
              onChange={(e) => setAiMood(e.target.value)}
              style={{ width: "100%" }}
            >
              <option value="">Select mood...</option>
              {MOODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}
            >
              What do you need help with?
            </label>
            <input
              type="text"
              placeholder="e.g. staying focused, managing stress, building habits..."
              value={aiNeed}
              onChange={(e) => setAiNeed(e.target.value)}
              style={{ width: "100%" }}
              onKeyDown={(e) => e.key === "Enter" && handleGetAdvice()}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleGetAdvice}
            disabled={aiLoading || !aiMood || !aiNeed}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px",
              opacity: !aiMood || !aiNeed ? 0.5 : 1,
            }}
          >
            {aiLoading ? (
              <>
                <Loader size={14} className="spin" /> Getting advice...
              </>
            ) : (
              "Get AI Advice"
            )}
          </button>
        </div>

        {aiAdvice && (
          <div
            style={{
              marginTop: "14px",
              padding: "14px",
              backgroundColor: "var(--accent-light)",
              borderRadius: "8px",
              borderLeft: "3px solid var(--accent)",
              fontSize: "14px",
              color: "var(--text-primary)",
              lineHeight: "1.6",
            }}
          >
            {aiAdvice}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
