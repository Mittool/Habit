"use client";
import { useEffect, useState, useCallback } from "react";
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
  CheckCircle2,
  Circle,
  Flame,
  ChevronRight,
  Settings,
  BarChart2,
  TrendingUp,
  CalendarDays,
  Sparkles,
  RefreshCw,
  Timer,
  Music,
  Calendar,
  CheckSquare,
  Clock,
  Smile,
  LayoutGrid,
  Moon,
  Menu,
} from "lucide-react";

const MOODS = [
  { value: "great", label: "Great", color: "#10B981" },
  { value: "good", label: "Good", color: "#84CC16" },
  { value: "neutral", label: "Neutral", color: "#F59E0B" },
  { value: "bad", label: "Bad", color: "#EF4444" },
  { value: "awful", label: "Awful", color: "#8B5CF6" },
];

function FormattedAiText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: "4px" }} />;
        const cleanLine = line.replace(/^[⚡🔥🚀🧘🌅🔋🛡️💬🔮🧠💡]+\s*/g, "");
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} style={{ lineHeight: "1.6" }}>
            {parts.map((part, pI) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pI} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const {
    user,
    habits,
    todos,
    focusSessions,
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

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [aiMood, setAiMood] = useState("");
  const [aiNeed, setAiNeed] = useState("");
  const [aiAdvice, setAiAdvice] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const fetchFreshQuote = useCallback(() => {
    setQuoteLoading(true);
    const prevParam = dailyQuote?.text ? encodeURIComponent(dailyQuote.text) : "";
    fetch(`/api/ai/quote?t=${Date.now()}&prev=${prevParam}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
    })
      .then((r) => r.json())
      .then((q) => setDailyQuote({ ...q, date: format(new Date(), "yyyy-MM-dd") }))
      .catch(() => {})
      .finally(() => setQuoteLoading(false));
  }, [dailyQuote?.text, setDailyQuote]);

  useEffect(() => {
    fetchFreshQuote();
  }, []);

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
  }, [aiEnabled, notificationsEnabled, habits, addAiNotification]);

  async function handleGetAdvice(customNeed?: string) {
    const mood = aiMood || "great";
    const need = customNeed || aiNeed || "maintaining high cognitive velocity";
    if (customNeed) setAiNeed(customNeed);
    setAiLoading(true);
    try {
      const advice = await getAIAdvice(mood, need);
      setAiAdvice(advice);
    } catch {
      setAiAdvice(`**Trac AI Directive:** Channel your feeling of being "${mood}" into immediate execution on "${need}". Close irrelevant background tabs, initiate a 25-minute focus block, and maintain absolute discipline.`);
    } finally {
      setAiLoading(false);
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Clean Studio Header */}
      <div className="fade-in" style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          {greeting}, {user?.name || "there"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="fade-in stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          {
            label: "Habits Done",
            value: `${completedToday}/${habits.length}`,
            icon: <CheckCircle2 size={20} color="var(--accent)" />,
            bg: "var(--accent-light)",
            onClick: () => onNavigate("habits"),
          },
          {
            label: "Focus Time",
            value: `${todayFocus}m`,
            icon: <Zap size={20} color="#D97706" />,
            bg: "#FEF3C7",
            onClick: () => onNavigate("pomodoro"),
          },
          {
            label: "Tasks Left",
            value: pendingTodos,
            icon: <Target size={20} color="#6366F1" />,
            bg: "#E0E7FF",
            onClick: () => onNavigate("todo"),
          },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={stat.onClick}
            className="card card-interactive cursor-pointer"
            style={{
              padding: "18px",
              textAlign: "left",
              border: "1px solid var(--border)",
              background: "var(--bg-card)",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", lineHeight: 1.1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginTop: "6px" }}>
                {stat.label}
              </div>
            </div>
            <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: stat.bg }}>
              {stat.icon}
            </div>
          </button>
        ))}
      </div>

      {/* Stats Summary Box */}
      <button
        onClick={() => onNavigate("analytics")}
        className="card card-interactive cursor-pointer fade-in stagger-2"
        style={{
          width: "100%",
          padding: "24px",
          marginBottom: "24px",
          textAlign: "left",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          display: "block",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: "var(--accent-light)" }}>
              <BarChart2 size={18} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              Performance Overview
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", color: "var(--accent)" }}>
            Deep Analytics <ChevronRight size={16} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", padding: "12px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Flame size={14} color="#D97706" />
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>Best Streak</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)" }}>{bestStreak}d</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <CalendarDays size={14} color="var(--accent)" />
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>Weekly Avg</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "600", color: weeklyAverage >= 70 ? "var(--accent)" : weeklyAverage >= 40 ? "#D97706" : "#EF4444" }}>{weeklyAverage}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <TrendingUp size={14} color="#6366F1" />
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>30-Day Avg</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "600", color: monthlyHabitAverage >= 70 ? "var(--accent)" : monthlyHabitAverage >= 40 ? "#D97706" : "#EF4444" }}>{monthlyHabitAverage}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <Zap size={14} color="#D97706" />
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>Total Focus</span>
            </div>
            <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)" }}>
              {totalFocusTime >= 60 ? `${Math.floor(totalFocusTime / 60)}h ${totalFocusTime % 60}m` : `${totalFocusTime}m`}
            </div>
          </div>
        </div>

        {/* Mini weekly chart preview */}
        <div style={{ marginTop: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px" }}>
            <span>Last 7 Days Consistency</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "44px" }}>
            {weekData.map((pct, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${Math.max(pct, 12)}%`,
                  borderRadius: "6px",
                  backgroundColor: pct >= 70 ? "var(--accent)" : pct >= 40 ? "#F59E0B" : pct > 0 ? "#EF4444" : "var(--border)",
                  transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <span key={i} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)" }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      </button>

      {/* Daily Inspiration Quote Card */}
      <div
        className="card fade-in stagger-3"
        style={{
          padding: "24px",
          marginBottom: "24px",
          backgroundColor: "var(--bg-card)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "12px", fontWeight: "600", textTransform: "none", letterSpacing: "0.03em" }}>
            <span>Daily Inspiration</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchFreshQuote();
            }}
            disabled={quoteLoading}
            className="btn-secondary cursor-pointer"
            style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "12px", gap: "6px", backgroundColor: "var(--bg-card)" }}
            title="Get new quote"
          >
            <RefreshCw size={13} className={quoteLoading ? "spin" : ""} />
            <span>New Quote</span>
          </button>
        </div>

        {quoteLoading ? (
          <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Loader size={16} className="spin text-accent" /> Synthesizing fresh wisdom...
          </div>
        ) : dailyQuote ? (
          <>
            <p
              style={{
                fontSize: "17px",
                fontWeight: "600",
                color: "var(--text-primary)",
                lineHeight: "1.6",
                margin: "0 0 10px",
                position: "relative",
                zIndex: 1,
              }}
            >
              &ldquo;{dailyQuote.text}&rdquo;
            </p>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--accent)", margin: 0, position: "relative", zIndex: 1 }}>
              &mdash; {dailyQuote.author}
            </p>
          </>
        ) : null}
      </div>

      {/* Today's habits quick check */}
      {habits.length > 0 && (
        <div className="card fade-in stagger-4" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={18} color="var(--accent)" />
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                Today&rsquo;s Priority Habits
              </h3>
            </div>
            <button
              onClick={() => onNavigate("habits")}
              className="cursor-pointer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--accent)",
                background: "none",
                border: "none",
                padding: "4px",
              }}
            >
              Manage Habits <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {habits.slice(0, 4).map((h) => {
              const done = h.completions[today];
              const streak = getHabitStreak(h);
              return (
                <div
                  key={h.id}
                  className="cursor-pointer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "12px",
                    backgroundColor: done ? "var(--accent-light)" : "var(--bg-secondary)",
                    border: `1px solid ${done ? "var(--accent)" : "transparent"}`,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  onClick={() => toggleHabitCompletion(h.id, today)}
                >
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "9999px",
                      backgroundColor: h.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${h.color}80`,
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "15px",
                      color: done ? "var(--accent)" : "var(--text-primary)",
                      textDecoration: done ? "line-through" : "none",
                      fontWeight: done ? "500" : "600",
                    }}
                  >
                    {h.name}
                  </span>
                  {streak > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "4px 8px",
                        borderRadius: "8px",
                        backgroundColor: "#FEF3C7",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#D97706",
                      }}
                    >
                      <Flame size={14} />
                      {streak}
                    </div>
                  )}
                  <div className={done ? "animate-check" : ""} style={{ transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    {done ? (
                      <CheckCircle2 size={22} color="var(--accent)" />
                    ) : (
                      <Circle size={22} color="var(--border)" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
