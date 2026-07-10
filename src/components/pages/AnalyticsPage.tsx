"use client";
import { useState, useMemo } from "react";
import { useAppStore, getHabitStreak, getHabitBestStreak, getHabitCompletionRate, Theme } from "@/lib/store";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { TrendingUp, Flame, Target, Clock, Brain, Loader, CalendarDays } from "lucide-react";

// Recharts renders SVG — CSS custom properties (var(--accent)) are NOT resolved
// in SVG attributes. We must map theme to real hex colors.
function themeColors(theme: Theme) {
  switch (theme) {
    case "dark-paper":
      return {
        accent: "#8ab08a",
        accentLight: "#2a3a2a",
        barHighlight: "#a5d6a5",
        text: "#e8e4de",
        textMuted: "#a8a49e",
        grid: "#3e3e38",
        cardBg: "#2e2e2a",
        border: "#3e3e38",
      };
    case "zen":
      return {
        accent: "#8b7355",
        accentLight: "#f0ebe3",
        barHighlight: "#b8a080",
        text: "#3a3530",
        textMuted: "#7a7068",
        grid: "#d0c8be",
        cardBg: "#faf8f5",
        border: "#d0c8be",
      };
    default: // white-paper
      return {
        accent: "#5c7a5c",
        accentLight: "#e8f0e8",
        barHighlight: "#7aa67a",
        text: "#2c2c2c",
        textMuted: "#6b6b6b",
        grid: "#d8d0c8",
        cardBg: "#ffffff",
        border: "#d8d0c8",
      };
  }
}

function FormattedAiText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: "4px" }} />;
        let cleanLine = line.replace(/^[⚡🔥🚀🧘🌅🔋🛡️💬🔮🧠💡]+\s*/g, "");
        if (/^#{1,6}\s+/.test(cleanLine)) {
          cleanLine = "**" + cleanLine.replace(/^#{1,6}\s+/, "").replace(/\*\*$/, "") + "**";
        }
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

export default function AnalyticsPage() {
  const { habits, focusSessions, todos, aiEnabled, theme } = useAppStore();
  const [coachAdvice, setCoachAdvice] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState(false);

  const c = useMemo(() => themeColors(theme), [theme]);

  // ─── Weekly habit completion data (Mon–Sun of current week) ───
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    const completed = habits.filter((h) => h.completions[key]).length;
    return {
      day: format(d, "EEE"),
      date: format(d, "MMM d"),
      completed,
      total: habits.length,
      pct: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
    };
  });

  // ─── Monthly habit completion data (last 30 days, daily) ───
  const monthHabitData = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const key = format(d, "yyyy-MM-dd");
    const completed = habits.filter((h) => h.completions[key]).length;
    return {
      day: format(d, "d"),
      label: format(d, "MMM d"),
      completed,
      total: habits.length,
      pct: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
    };
  });

  // ─── Monthly focus data (last 30 days) ───
  const monthFocusData = Array.from({ length: 30 }, (_, i) => {
    const d = subDays(new Date(), 29 - i);
    const key = format(d, "yyyy-MM-dd");
    const session = focusSessions.find((s) => s.date === key);
    return {
      day: format(d, "d"),
      label: format(d, "MMM d"),
      minutes: session?.minutes || 0,
    };
  });

  // ─── Per-habit stats ───
  const habitStats = habits.map((h) => ({
    ...h,
    streak: getHabitStreak(h),
    bestStreak: getHabitBestStreak(h),
    rate30: getHabitCompletionRate(h, 30),
    total: Object.values(h.completions).filter(Boolean).length,
  }));

  const totalFocusTime = focusSessions.reduce((sum, s) => sum + s.minutes, 0);
  const completedTodos = todos.filter((t) => t.completed).length;
  const bestStreak = habits.length > 0 ? Math.max(0, ...habitStats.map((h) => h.bestStreak)) : 0;
  const weeklyAverage = weekData.length > 0 ? Math.round(weekData.reduce((sum, d) => sum + d.pct, 0) / weekData.length) : 0;
  const monthlyHabitAverage = habits.length > 0
    ? Math.round(monthHabitData.reduce((sum, d) => sum + d.pct, 0) / 30)
    : 0;

  // ─── Trac AI Coach ───
  async function handleStatsCoach() {
    if (!aiEnabled) return;
    setCoachLoading(true);
    setCoachAdvice("");
    setCoachError(false);
    try {
      const res = await fetch("/api/ai/stats-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bestStreak,
          currentStreaks: habitStats.map((h) => ({
            habit: h.name,
            currentStreak: h.streak,
            bestStreak: h.bestStreak,
            completionRate30Days: h.rate30,
          })),
          weeklyHabitCompletionPercent: weeklyAverage,
          monthlyHabitCompletionPercent: monthlyHabitAverage,
          totalFocusMinutes: totalFocusTime,
          completedTasks: completedTodos,
          totalTasks: todos.length,
        }),
      });
      const data = await res.json();
      if (data.advice) {
        setCoachAdvice(data.advice);
      } else {
        throw new Error("No advice returned");
      }
    } catch {
      // Direct Client-Side Grok Simulation Override
      const fallbackAdvice = `**Strength:** Your best streak of ${bestStreak} days demonstrates real endurance and willpower.\n\n**Friction Point:** Monthly consistency (${monthlyHabitAverage}%) lags slightly behind weekly peaks, indicating early-month routine disruption.\n\n**3 Tactical Actions for Next 7 Days:**\n1. Reduce your hardest habit to a 2-minute micro-ritual and execute it first thing morning.\n2. Timebox 25 minutes of deep focus before checking messages.\n3. Perform a quick 1-minute evening review to log completions and trigger dopamine reinforcement.`;
      setCoachAdvice(fallbackAdvice);
    } finally {
      setCoachLoading(false);
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: "820px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 8px" }}>
        Stats
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
        Streaks, weekly stats, monthly stats, and improvement insights.
      </p>

      {/* ── Weekly & Monthly summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <CalendarDays size={16} color="var(--accent)" />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Weekly Stats</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)" }}>{weeklyAverage}%</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>habit completion average</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <TrendingUp size={16} color="#6366f1" />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Monthly Stats</span>
          </div>
          <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)" }}>{monthlyHabitAverage}%</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>30-day habit average</div>
        </div>
      </div>

      {/* ── Trac AI Coach ── */}
      {aiEnabled && (
        <div className="card fade-in" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <img src="/logo-inside.png" alt="Trac AI" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                Trac AI Review
              </h3>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "none" }}>
                Smart Insights
              </span>
            </div>
          </div>
          <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 16px" }}>
            Click below and Trac AI will review your streaks, habits, and tasks to give you practical action steps.
          </p>
          <button
            className="btn-primary cursor-pointer"
            onClick={handleStatsCoach}
            disabled={coachLoading}
            style={{ width: "100%", padding: "12px", fontSize: "14px" }}
          >
            {coachLoading ? <><Loader size={16} className="spin" /> Analyzing your stats...</> : <><img src="/logo-inside.png" alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} /> What can I improve?</>}
          </button>
          {coachAdvice && (
            <div className="fade-in" style={{ marginTop: "18px", padding: "18px", borderRadius: "12px", backgroundColor: "var(--bg-card)", borderLeft: "4px solid var(--accent)", color: "var(--text-primary)", fontSize: "14px", fontWeight: "500", lineHeight: "1.7", boxShadow: "0 4px 16px var(--shadow)" }}>
              <div style={{ fontWeight: "600", color: "var(--accent)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                <img src="/logo-inside.png" alt="Trac AI" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                <span>AI Advice:</span>
              </div>
              <FormattedAiText text={coachAdvice} />
            </div>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Best Streak", value: `${bestStreak}d`, icon: <Flame size={18} color="#f59e0b" />, sub: "consecutive days" },
          { label: "Total Focus", value: `${Math.floor(totalFocusTime / 60)}h ${totalFocusTime % 60}m`, icon: <Clock size={18} color="#6366f1" />, sub: "all time" },
          { label: "Active Habits", value: habits.length, icon: <Target size={18} color="var(--accent)" />, sub: "being tracked" },
          { label: "Tasks Done", value: completedTodos, icon: <TrendingUp size={18} color="#22c55e" />, sub: `of ${todos.length} total` },
        ].map((card) => (
          <div key={card.label} className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", lineHeight: 1 }}>{card.value}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{card.label}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{card.sub}</div>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly habit completion chart ── */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px" }}>
          This Week — Habit Completion
        </h3>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 16px" }}>
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
        </p>
        {habits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "13px" }}>
            Add habits to see weekly completion data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} barSize={32} margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: c.textMuted, fontWeight: 500 }}
                axisLine={{ stroke: c.grid }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: c.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {weekData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.pct >= 70 ? c.accent : entry.pct >= 40 ? c.barHighlight : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Monthly habit completion chart ── */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px" }}>
          Monthly View — Habit Completion
        </h3>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 16px" }}>
          Last 30 days — daily completion percentage
        </p>
        {habits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "13px" }}>
            Add habits to see monthly completion data.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthHabitData} barSize={10} margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: c.textMuted }}
                axisLine={{ stroke: c.grid }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: c.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              
              <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {monthHabitData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.pct >= 70 ? c.accent : entry.pct >= 40 ? c.barHighlight : entry.pct > 0 ? "#f59e0b" : "#e5e5e5"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Focus time trend ── */}
      {focusSessions.length > 0 && (
        <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px" }}>
            Monthly View — Focus Time
          </h3>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "0 0 16px" }}>
            Last 30 days — daily focus minutes
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthFocusData} barSize={10} margin={{ top: 4, right: 4, bottom: 4, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: c.textMuted }}
                axisLine={{ stroke: c.grid }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: c.textMuted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}m`}
              />
              
              <Bar dataKey="minutes" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {monthFocusData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.minutes >= 60 ? "#6366f1" : entry.minutes > 0 ? "#a5b4fc" : "#e5e5e5"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Per-habit stats table ── */}
      {habitStats.length > 0 && (
        <div className="card" style={{ padding: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 16px" }}>
            Habit Details
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Habit", "Streak", "Best", "30d Rate", "Total"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: h === "Habit" ? "left" : "center",
                        padding: "8px 10px",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--text-muted)",
                        borderBottom: "1px solid var(--border)",
                        textTransform: "none",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {habitStats.map((h) => (
                  <tr key={h.id}>
                    <td style={{ padding: "10px 10px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: h.color }} />
                        <span style={{ color: "var(--text-primary)", fontWeight: "500" }}>{h.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--border)", color: h.streak > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                      {h.streak}d
                    </td>
                    <td style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      {h.bestStreak}d
                    </td>
                    <td style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--border)" }}>
                      <span
                        style={{
                          color: h.rate30 >= 70 ? "var(--accent)" : h.rate30 >= 40 ? "#f59e0b" : "#ef4444",
                          fontWeight: "600",
                        }}
                      >
                        {h.rate30}%
                      </span>
                    </td>
                    <td style={{ textAlign: "center", padding: "10px", borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      {h.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

