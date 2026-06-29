"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak } from "@/lib/store";
import { getDailyQuote } from "@/lib/gemini";
import { format, subDays, startOfWeek, addDays, getDaysInMonth, setDate } from "date-fns";
import { renderHabitIcon } from "@/lib/icons";
import {
  Flame,
  Zap,
  CalendarDays,
  TrendingUp,
  Clock,
  CheckSquare,
  RefreshCw,
  CheckCircle2,
  Circle,
  ChevronRight,
} from "lucide-react";

export default function HomePage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const {
    user,
    habits,
    todos,
    focusSessions,
    dailyQuote,
    setDailyQuote,
    toggleHabitCompletion,
  } = useAppStore();

  const today = getTodayStr();
  const todayFocus = focusSessions.find((s) => s.date === today)?.minutes || 0;
  const completedTodayCount = habits.filter((h) => h.completions && h.completions[today]).length;
  const pendingTodosCount = todos.filter((t) => !t.completed).length;

  const todayCompletionRate = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0;
  const bestStreak = habits.length > 0 ? Math.max(0, ...habits.map((h) => getHabitBestStreak(h))) : 0;
  const currentStreak = habits.length > 0 ? Math.max(0, ...habits.map((h) => getHabitStreak(h))) : 0;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    return habits.filter((h) => h.completions && h.completions[key]).length;
  });
  const weeklyAveragePct = habits.length > 0 ? Math.round((weekData.reduce((a, b) => a + b, 0) / (7 * habits.length)) * 100) : 0;
  
  const monthlyHabitAveragePct = habits.length > 0
    ? Math.round(
        Array.from({ length: 30 }, (_, i) => {
          const d = subDays(new Date(), 29 - i);
          const key = format(d, "yyyy-MM-dd");
          return habits.filter((h) => h.completions && h.completions[key]).length;
        }).reduce((a, b) => a + b, 0) / (30 * habits.length) * 100
      )
    : 0;

  const totalFocusTimeMins = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [completedToastId, setCompletedToastId] = useState<string | null>(null);
  const [heatmapTooltip, setHeatmapTooltip] = useState<string | null>(null);

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const daysInCurrentMonth = getDaysInMonth(new Date());
  const currentMonthHeatmap = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const d = setDate(new Date(), i + 1);
    const key = format(d, "yyyy-MM-dd");
    const count = habits.filter((h) => h.completions && h.completions[key]).length;
    const pct = habits.length > 0 ? (count / habits.length) : 0;
    return { date: format(d, "MMM d"), count, pct };
  });

  return (
    <div style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* 1. Studio Header (No Top Right Buttons!) */}
      <div className="fade-in" style={{ marginBottom: "24px" }}>
        <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-secondary)", display: "block" }}>{greeting},</span>
        <h1 className="shimmer-name" style={{ fontSize: "30px", fontWeight: "700", margin: "2px 0 4px", letterSpacing: "-0.02em" }}>
          {user?.name || "Mittool"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* 2. Daily Motivation Quote AT TOP AS REQUESTED */}
      <div className="card fade-in stagger-1" style={{ padding: "20px 24px", marginBottom: "20px", borderLeft: "3px solid var(--accent)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "11.5px", fontWeight: "600", color: "var(--text-muted)" }}>Daily Motivation</span>
          <button onClick={fetchFreshQuote} disabled={quoteLoading} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)", padding: 0 }}>
            <RefreshCw size={14} className={quoteLoading ? "spin" : ""} />
          </button>
        </div>
        <p style={{ fontSize: "14.5px", color: "var(--text-primary)", fontStyle: "italic", lineHeight: "1.5", margin: "0 0 6px" }}>
          &ldquo;{dailyQuote?.text || "Excellence is not an act, but a daily habit."}&rdquo;
        </p>
        <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: "500" }}>
          &mdash; {dailyQuote?.author || "Aristotle"}
        </span>
      </div>

      {/* 3. Daily Progress Ring Banner */}
      <div className="card fade-in stagger-1" style={{ padding: "20px 24px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px" }}>Today&rsquo;s Progress</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>{completedTodayCount} of {habits.length} priority routines completed</p>
        </div>
        <div style={{ position: "relative", width: "56px", height: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="28" cy="28" r="23" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="28"
              cy="28"
              r="23"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 23}
              strokeDashoffset={2 * Math.PI * 23 * (1 - todayCompletionRate / 100)}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>
          <span style={{ position: "absolute", fontSize: "13px", fontWeight: "700", color: "var(--text-primary)" }}>{todayCompletionRate}%</span>
        </div>
      </div>

      {/* 4. Quick Stats Grid (Four Cards) */}
      <div className="fade-in stagger-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
        <div onClick={() => onNavigate("habits")} className="card card-interactive cursor-pointer" style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Habits Completed</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>{completedTodayCount} / {habits.length}</div>
          </div>
          <CheckSquare size={20} color="var(--accent)" />
        </div>

        <div onClick={() => onNavigate("pomodoro")} className="card card-interactive cursor-pointer" style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Focus Time</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>{todayFocus}m</div>
          </div>
          <Clock size={20} color="#3B82F6" />
        </div>

        <div onClick={() => onNavigate("todo")} className="card card-interactive cursor-pointer" style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Tasks Remaining</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>{pendingTodosCount}</div>
          </div>
          <CalendarDays size={20} color="#8B5CF6" />
        </div>

        <div onClick={() => onNavigate("insights")} className="card card-interactive cursor-pointer" style={{ padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>Current Streak</div>
            <div style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>{currentStreak}d</div>
          </div>
          <Zap size={20} color="#F59E0B" />
        </div>
      </div>

      {/* 5. Performance Overview */}
      <div className="card fade-in stagger-2" style={{ padding: "22px 24px", marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 16px" }}>Performance Overview</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}><Flame size={14} color="#F59E0B" /><span>Best Streak</span></div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>{bestStreak}d</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}><Zap size={14} color="var(--accent)" /><span>Weekly Avg</span></div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>{weeklyAveragePct}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}><TrendingUp size={14} color="#6366F1" /><span>30-Day Avg</span></div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>{monthlyHabitAveragePct}%</div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}><Clock size={14} color="#3B82F6" /><span>Total Focus</span></div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)" }}>{Math.floor(totalFocusTimeMins / 60)}h {totalFocusTimeMins % 60}m</div>
          </div>
        </div>
      </div>

      {/* 6. Split Consistency Card (Half 7-Day Old View & Half 30-Day Heatmap) */}
      <div className="card fade-in stagger-3" style={{ padding: "24px", marginBottom: "24px" }}>
        {heatmapTooltip && (
          <div style={{ padding: "6px 10px", borderRadius: "6px", backgroundColor: "var(--text-primary)", color: "var(--bg-card)", fontSize: "11.5px", fontWeight: "600", marginBottom: "14px", width: "fit-content" }}>
            {heatmapTooltip}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Left Column: 7-Day Graph View (Old View) */}
          <div style={{ borderRight: "1px solid var(--border)", paddingRight: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>7-Day Graph</h3>
              <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: "600" }}>{weeklyAveragePct}% Avg</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "56px" }}>
              {weekData.map((count, i) => {
                const pct = habits.length > 0 ? Math.round((count / habits.length) * 100) : 0;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${Math.max(pct, 12)}%`,
                      borderRadius: "4px",
                      backgroundColor: pct >= 70 ? "var(--accent)" : pct >= 40 ? "#F59E0B" : pct > 0 ? "#EF4444" : "var(--bg-secondary)",
                      transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                    title={`${pct}% completed`}
                  />
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <span key={i} style={{ flex: 1, textAlign: "center", fontSize: "10px", fontWeight: "600", color: "var(--text-muted)" }}>
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column: Current Month Heatmap */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>{format(new Date(), "MMMM")} Heatmap</h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Current Month</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
              {currentMonthHeatmap.map((hd, idx) => {
                const bgAlpha = hd.pct === 0 ? "var(--bg-secondary)" : hd.pct < 0.4 ? "rgba(13, 148, 136, 0.3)" : hd.pct < 0.8 ? "rgba(13, 148, 136, 0.65)" : "var(--accent)";
                return (
                  <div
                    key={idx}
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      borderRadius: "3px",
                      backgroundColor: bgAlpha,
                      border: hd.pct === 0 ? "1px solid var(--border)" : "none",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Today's Priority Habits List */}
      <div className="card fade-in stagger-4" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Today&rsquo;s Priority Habits</h3>
          <button onClick={() => onNavigate("habits")} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
            Manage <ChevronRight size={14} />
          </button>
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", borderRadius: "10px" }}>
            No habits yet. Create your first habit to begin tracking.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {habits.slice(0, 5).map((h) => {
              const done = h.completions && h.completions[today];
              const streak = getHabitStreak(h);
              return (
                <div key={h.id} className={`card fade-in relative ${completedToastId === h.id ? "card-highlight-bloom" : ""}`} style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {completedToastId === h.id && (
                    <div className="badge-float-up" style={{ padding: "3px 8px", borderRadius: "9999px", backgroundColor: "var(--text-primary)", color: "var(--bg-card)", fontSize: "11px", fontWeight: "600" }}>
                      +1 Completed
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <button
                      onClick={() => {
                        if (!done) {
                          setCompletedToastId(h.id);
                          setTimeout(() => setCompletedToastId(null), 950);
                        }
                        toggleHabitCompletion(h.id, today);
                      }}
                      className={`cursor-pointer ${done ? "animate-check" : ""}`}
                      style={{ background: "none", border: "none", padding: 0 }}
                    >
                      {done ? <CheckCircle2 size={24} color={h.color} /> : <Circle size={24} color="var(--border)" />}
                    </button>
                    <div style={{ padding: "6px", borderRadius: "8px", backgroundColor: h.color + "18", color: h.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {renderHabitIcon(h.iconKey || "Target", 16, h.color)}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>{h.name}</div>
                      {h.goal && <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{h.goal}</div>}
                    </div>
                  </div>

                  {streak > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", fontSize: "11.5px", fontWeight: "600", color: "var(--accent)" }}>
                      <Flame size={12} />
                      <span>{streak}d</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
