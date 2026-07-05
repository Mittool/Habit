"use client";
import React, { useEffect, useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak } from "@/lib/store";
import { format, startOfWeek, addDays, getDaysInMonth, setDate } from "date-fns";
import { renderHabitIcon } from "@/lib/icons";
import {
  Flame,
  CalendarDays,
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
  const currentStreak = habits.length > 0 ? Math.max(0, ...habits.map((h) => getHabitStreak(h))) : 0;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const key = format(d, "yyyy-MM-dd");
    return habits.filter((h) => h.completions && h.completions[key]).length;
  });
  const weeklyAveragePct = habits.length > 0 ? Math.round((weekData.reduce((a, b) => a + b, 0) / (7 * habits.length)) * 100) : 0;

  const [quoteLoading, setQuoteLoading] = useState(false);
  const [completedToastId, setCompletedToastId] = useState<string | null>(null);
  const [heatmapTooltip, setHeatmapTooltip] = useState<string | null>(null);

  // Plain function — React 19 compiler auto-memoises this. Wrapping it
  // in useCallback triggered a preserve-manual-memoization warning.
  const fetchFreshQuote = () => {
    // Kick the loading flag on the next microtask so calling this from
    // inside an effect doesn't trigger React 19's set-state-in-effect rule.
    queueMicrotask(() => setQuoteLoading(true));
    const prevParam = dailyQuote?.text ? encodeURIComponent(dailyQuote.text) : "";
    fetch(`/api/ai/quote?t=${Date.now()}&prev=${prevParam}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache", "Cache-Control": "no-cache" }
    })
      .then((r) => r.json())
      .then((q) => setDailyQuote({ ...q, date: format(new Date(), "yyyy-MM-dd") }))
      .catch(() => {})
      .finally(() => setQuoteLoading(false));
  };

  useEffect(() => {
    fetchFreshQuote();

    if (typeof window !== "undefined" && "Notification" in window) {
      const curr = Notification.permission;
      const stored = useAppStore.getState().notificationPermissionStatus;

      if (curr === "default" && (!stored || stored === "default")) {
        const timer = setTimeout(async () => {
          try {
            const perm = await Notification.requestPermission();
            useAppStore.getState().setNotificationPermissionStatus(perm);
          } catch {
            useAppStore.getState().setNotificationPermissionStatus("denied");
          }
        }, 1500);
        return () => clearTimeout(timer);
      } else if (curr !== stored) {
        useAppStore.getState().setNotificationPermissionStatus(curr);
      }
    }
    // Intentionally only run on mount — fetchFreshQuote is stable within a
    // session and re-running would re-fetch on every quote change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (user?.name || "there").trim().split(/\s+/)[0];

  const daysInCurrentMonth = getDaysInMonth(new Date());
  const currentMonthHeatmap = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const d = setDate(new Date(), i + 1);
    const key = format(d, "yyyy-MM-dd");
    const count = habits.filter((h) => h.completions && h.completions[key]).length;
    const pct = habits.length > 0 ? (count / habits.length) : 0;
    return { date: format(d, "MMM d"), count, pct };
  });

  return (
    <div style={{ padding: "40px 22px 24px", maxWidth: "820px", margin: "0 auto" }}>
      {/* ═══ Hero header — serif greeting + big ring ═══ */}
      <div className="fade-in" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: 28 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 8 }}>
            {format(new Date(), "EEEE · MMMM d")}
          </div>
          <h1 className="serif" style={{ fontSize: "clamp(38px, 8vw, 52px)", lineHeight: 1.02, margin: 0, color: "var(--text-primary)" }}>
            {greeting},<br />
            <em style={{ fontStyle: "italic", color: "var(--accent)" }}>{firstName}</em>
          </h1>
        </div>

        {/* Oversized progress ring */}
        <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="48" cy="48" r="40" fill="none" stroke="var(--border-strong)" strokeWidth="6" opacity="0.5" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - todayCompletionRate / 100)}
              style={{ transition: "stroke-dashoffset 0.8s var(--spring)" }}
            />
          </svg>
          <div style={{ position: "absolute", textAlign: "center", lineHeight: 1 }}>
            <div className="serif" style={{ fontSize: 28, color: "var(--text-primary)" }}>{todayCompletionRate}<span style={{ fontSize: 14, opacity: 0.6 }}>%</span></div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>Today</div>
          </div>
        </div>
      </div>

      {/* ═══ Warm quote card — no left stripe, larger serif pull-quote ═══ */}
      <div className="card-hero fade-in stagger-1" style={{ padding: "28px 26px", marginBottom: 22, position: "relative" }}>
        <button onClick={fetchFreshQuote} disabled={quoteLoading} className="btn-ghost cursor-pointer" style={{ position: "absolute", top: 14, right: 14 }} aria-label="Refresh quote">
          <RefreshCw size={15} className={quoteLoading ? "spin" : ""} />
        </button>
        <div style={{ fontSize: 40, lineHeight: 0.9, color: "var(--accent)", fontFamily: "'Instrument Serif', Georgia, serif", marginBottom: 4 }}>&ldquo;</div>
        <p className="serif" style={{ fontSize: "clamp(19px, 4.2vw, 24px)", lineHeight: 1.35, color: "var(--text-primary)", margin: "0 0 12px", fontStyle: "italic" }}>
          {dailyQuote?.text || "Excellence is not an act, but a daily habit."}
        </p>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          — {dailyQuote?.author || "Aristotle"}
        </div>
      </div>

      {/* ═══ Quick stats grid ═══ */}
      <div className="fade-in stagger-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatTile onClick={() => onNavigate("habits")} label="Habits Done" value={`${completedTodayCount}/${habits.length}`} tint="#d97706" icon={<CheckSquare size={18} />} />
        <StatTile onClick={() => onNavigate("pomodoro")} label="Focus Today" value={`${todayFocus}m`} tint="#3B82F6" icon={<Clock size={18} />} />
        <StatTile onClick={() => onNavigate("todo")} label="Tasks Left" value={String(pendingTodosCount)} tint="#8B5CF6" icon={<CalendarDays size={18} />} />
        <StatTile onClick={() => onNavigate("insights")} label="Current Streak" value={`${currentStreak}d`} tint="#059669" icon={<Flame size={18} />} />
      </div>

      {/* ═══ Consistency card — cleaner split, unified visual language ═══ */}
      <div className="card fade-in stagger-3" style={{ padding: "24px 24px 22px", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>This week</div>
            <div className="serif" style={{ fontSize: 30, color: "var(--text-primary)", lineHeight: 1 }}>{weeklyAveragePct}<span style={{ fontSize: 16, opacity: 0.5 }}>%</span></div>
          </div>
          <button onClick={() => onNavigate("insights")} className="btn-ghost cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", padding: "6px 10px" }}>
            View trends <ChevronRight size={13} />
          </button>
        </div>

        {/* 7-day bar row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 68 }}>
          {weekData.map((count, i) => {
            const pct = habits.length > 0 ? Math.round((count / habits.length) * 100) : 0;
            const isToday = i === (new Date().getDay() + 6) % 7;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ width: "100%", height: 48, display: "flex", alignItems: "flex-end" }}>
                  <div
                    style={{
                      width: "100%",
                      height: `${Math.max(pct, 8)}%`,
                      borderRadius: "8px 8px 4px 4px",
                      backgroundColor: pct >= 70 ? "var(--accent)" : pct >= 40 ? "var(--accent-light)" : pct > 0 ? "var(--accent-soft)" : "var(--bg-secondary)",
                      border: isToday ? "1px solid var(--accent)" : "none",
                      transition: "height 0.5s var(--spring)",
                    }}
                    title={`${pct}%`}
                  />
                </div>
                <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 600, color: isToday ? "var(--accent)" : "var(--text-muted)" }}>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Month heatmap — tucked under the week bar */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{format(new Date(), "MMMM")}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-muted)" }}>
              <span>less</span>
              {[0.15, 0.4, 0.7, 1].map((a, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: `rgba(217, 119, 6, ${a})` }} />
              ))}
              <span>more</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14px, 1fr))", gap: 5 }}>
            {currentMonthHeatmap.map((hd, idx) => {
              const bg = hd.pct === 0 ? "var(--bg-secondary)" : `rgba(217, 119, 6, ${0.15 + hd.pct * 0.85})`;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHeatmapTooltip(`${hd.date}: ${hd.count}/${habits.length}`)}
                  onMouseLeave={() => setHeatmapTooltip(null)}
                  style={{ width: "100%", aspectRatio: "1/1", borderRadius: 4, backgroundColor: bg, border: hd.pct === 0 ? "1px solid var(--border)" : "none", cursor: "pointer" }}
                />
              );
            })}
          </div>
          {heatmapTooltip && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>{heatmapTooltip}</div>
          )}
        </div>
      </div>

      {/* ═══ Today's habits card ═══ */}
      <div className="card fade-in stagger-4" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 className="serif" style={{ fontSize: 22, fontWeight: 400, color: "var(--text-primary)", margin: 0 }}>Today&rsquo;s habits</h3>
          <button onClick={() => onNavigate("habits")} className="btn-ghost cursor-pointer" style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
            Manage <ChevronRight size={13} />
          </button>
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-lg)" }}>
            No habits yet — create your first one to begin.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {habits.slice(0, 5).map((h) => {
              const done = h.completions && h.completions[today];
              const streak = getHabitStreak(h);
              return (
                <div
                  key={h.id}
                  className={`fade-in relative ${completedToastId === h.id ? "card-highlight-bloom" : ""}`}
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: "var(--radius-lg)",
                    backgroundColor: done ? "var(--bg-secondary)" : "var(--bg-card)",
                    border: "1px solid var(--border)",
                    transition: "background-color 0.3s var(--ease)",
                  }}
                >
                  {completedToastId === h.id && (
                    <div className="badge-float-up" style={{ padding: "4px 10px", borderRadius: 9999, backgroundColor: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                      +1 done
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                    <button
                      onClick={() => {
                        if (!done) {
                          setCompletedToastId(h.id);
                          setTimeout(() => setCompletedToastId(null), 950);
                        }
                        toggleHabitCompletion(h.id, today);
                      }}
                      className={`cursor-pointer ${done ? "animate-check" : ""}`}
                      style={{ background: "none", border: "none", padding: 0, flexShrink: 0 }}
                      aria-label={done ? "Mark incomplete" : "Mark done"}
                    >
                      {done ? <CheckCircle2 size={26} color={h.color} /> : <Circle size={26} color="var(--border-strong)" strokeWidth={1.8} />}
                    </button>
                    <div style={{ padding: 7, borderRadius: 10, backgroundColor: h.color + "1C", color: h.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {renderHabitIcon(h.iconKey || "Target", 15, h.color)}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.name}
                    </div>
                  </div>

                  {streak > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, backgroundColor: "var(--accent-soft)", fontSize: 11.5, fontWeight: 700, color: "var(--accent)", flexShrink: 0, marginLeft: 8 }}>
                      <Flame size={11} />
                      <span>{streak}</span>
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

// ─── Stat tile helper ─────────────────────────────────────────────
function StatTile({ label, value, tint, icon, onClick }: { label: string; value: string; tint: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card card-interactive cursor-pointer"
      style={{
        padding: "18px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        textAlign: "left",
        fontFamily: "inherit",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
        <div className="serif" style={{ fontSize: 26, color: "var(--text-primary)", lineHeight: 1 }}>{value}</div>
      </div>
      <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: tint + "1C", color: tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
    </button>
  );
}
