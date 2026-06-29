"use client";
import { useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak, getHabitCompletionRate } from "@/lib/store";
import { format, subDays } from "date-fns";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Flame,
  Edit3,
  X,
  Check,
  TrendingUp,
  Sparkles,
} from "lucide-react";

const COLORS = [
  "#0D9488", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#10B981", "#6366F1", "#14B8A6", "#EF4444", "#84CC16",
];

interface HabitFormData {
  name: string;
  color: string;
  goal: string;
}

export default function HabitsPage() {
  const { habits, addHabit, deleteHabit, toggleHabitCompletion, updateHabit, addAiNotification, aiEnabled } =
    useAppStore();
  const today = getTodayStr();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormData>({ name: "", color: COLORS[0], goal: "" });
  const [loadingTip, setLoadingTip] = useState<string | null>(null);
  const [completedToastId, setCompletedToastId] = useState<string | null>(null);

  // Last 7 days for mini calendar
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEE"), day: format(d, "d") };
  });

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editId) {
      updateHabit(editId, { name: form.name, color: form.color, goal: form.goal });
      setEditId(null);
    } else {
      addHabit({ name: form.name, color: form.color, goal: form.goal });
    }
    setForm({ name: "", color: COLORS[0], goal: "" });
    setShowForm(false);
  }

  function startEdit(h: (typeof habits)[0]) {
    setEditId(h.id);
    setForm({ name: h.name, color: h.color, goal: h.goal || "" });
    setShowForm(true);
  }

  async function getMissedTip(habitName: string) {
    if (!aiEnabled) return;
    setLoadingTip(habitName);
    try {
      const res = await fetch("/api/ai/habit-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missedHabit: habitName }),
      });
      const data = await res.json();
      addAiNotification(data.tip);
    } catch {
      addAiNotification(`Don't give up on "${habitName}" — one missed day doesn't break a habit.`);
    } finally {
      setLoadingTip(null);
    }
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Habits Architecture
          </h2>
          <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)", margin: "4px 0 0" }}>
            Build consistency through daily tracking
          </p>
        </div>
        <button
          className="btn-primary cursor-pointer"
          onClick={() => {
            setEditId(null);
            setForm({ name: "", color: COLORS[0], goal: "" });
            setShowForm(true);
          }}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Plus size={18} /> New Habit
        </button>
      </div>

      {/* Form Card */}
      {showForm && (
        <div className="card fade-in" style={{ padding: "24px", marginBottom: "28px", border: "1px solid var(--accent)" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
              {editId ? "Edit Habit Blueprint" : "Create Habit Blueprint"}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="cursor-pointer"
              style={{ background: "none", border: "none", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Habit Title
              </label>
              <input
                type="text"
                placeholder="e.g. Morning Meditation, 10k Steps..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: "100%", fontWeight: "500" }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                Target / Motivation (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Read 20 pages before bed"
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                Theme Accent Color
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="cursor-pointer"
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "9999px",
                      backgroundColor: c,
                      border: form.color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                      boxShadow: form.color === c ? `0 0 12px ${c}80` : "none",
                      transition: "transform 0.15s",
                      outline: "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              <button
                className="btn-secondary cursor-pointer"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary cursor-pointer"
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                style={{ flex: 2 }}
              >
                <Check size={18} /> {editId ? "Save Changes" : "Deploy Habit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <div
          className="card fade-in"
          style={{ padding: "56px 24px", textAlign: "center", color: "var(--text-muted)", borderStyle: "dashed" }}
        >
          <div style={{ display: "inline-flex", padding: "16px", borderRadius: "16px", backgroundColor: "var(--bg-secondary)", marginBottom: "16px" }}>
            <CheckCircle2 size={48} color="var(--accent)" />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px" }}>No active habits</h3>
          <p style={{ fontSize: "14px", fontWeight: "500", margin: "0 0 20px" }}>Deploy your first habit tracker to start monitoring daily consistency.</p>
          <button
            className="btn-primary cursor-pointer"
            onClick={() => setShowForm(true)}
          >
            <Plus size={18} /> Add Your First Habit
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {habits.map((h) => {
            const done = h.completions[today];
            const streak = getHabitStreak(h);
            const bestStreak = getHabitBestStreak(h);
            const rate = getHabitCompletionRate(h, 30);
            const missedYesterday = !h.completions[format(subDays(new Date(), 1), "yyyy-MM-dd")];

            return (
              <div key={h.id} className={`card fade-in relative ${completedToastId === h.id ? "card-highlight-bloom" : ""}`} style={{ padding: "20px 24px" }}>
                {completedToastId === h.id && (
                  <div className="badge-float-up" style={{ padding: "4px 10px", borderRadius: "9999px", backgroundColor: "var(--text-primary)", color: "var(--bg-card)", fontSize: "11px", fontWeight: "600" }}>
                    +1 Completed
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                  {/* Completion toggle */}
                  <button
                    onClick={() => {
                      if (!done) {
                        setCompletedToastId(h.id);
                        setTimeout(() => setCompletedToastId(null), 950);
                      }
                      toggleHabitCompletion(h.id, today);
                    }}
                    className={`cursor-pointer ${done ? "animate-check" : ""}`}
                    style={{ background: "none", border: "none", padding: 0, transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
                  >
                    {done ? (
                      <CheckCircle2 size={28} color={h.color} />
                    ) : (
                      <Circle size={28} color="var(--border)" />
                    )}
                  </button>

                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "9999px",
                      backgroundColor: h.color,
                      flexShrink: 0,
                      boxShadow: `0 0 8px ${h.color}80`,
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: "600",
                        color: done ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {h.name}
                    </div>
                    {h.goal && (
                      <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", marginTop: "2px" }}>{h.goal}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {aiEnabled && missedYesterday && !done && (
                      <button
                        onClick={() => getMissedTip(h.name)}
                        disabled={loadingTip === h.name}
                        className="cursor-pointer"
                        style={{
                          background: "#FEF3C7",
                          border: "none",
                          color: "#D97706",
                          padding: "8px",
                          borderRadius: "10px",
                        }}
                        title="Get Trac AI Tip"
                      >
                        <img src="/logo-inside.png" alt="Trac AI" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(h)}
                      className="cursor-pointer"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "none",
                        color: "var(--text-secondary)",
                        padding: "8px",
                        borderRadius: "10px",
                      }}
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => deleteHabit(h.id)}
                      className="cursor-pointer"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "none",
                        color: "#EF4444",
                        padding: "8px",
                        borderRadius: "10px",
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text-muted)",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--bg-secondary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: streak > 0 ? "#D97706" : "inherit" }}>
                    <Flame size={15} />
                    <span>{streak} day streak</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <TrendingUp size={15} color="var(--accent)" />
                    <span>Best: {bestStreak}d</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--accent)", fontWeight: "600" }}>{rate}%</span>
                    <span>30d consistency</span>
                  </div>
                </div>

                {/* 7-day mini calendar */}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "none", marginBottom: "8px" }}>
                    Last 7 Days Record
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {last7.map((d) => {
                      const completed = h.completions[d.key];
                      const isToday = d.key === today;
                      return (
                        <div
                          key={d.key}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span style={{ fontSize: "10px", fontWeight: "600", color: isToday ? "var(--accent)" : "var(--text-muted)" }}>
                            {d.label}
                          </span>
                          <div
                            onClick={() => toggleHabitCompletion(h.id, d.key)}
                            className="cursor-pointer"
                            style={{
                              width: "100%",
                              height: "36px",
                              borderRadius: "10px",
                              backgroundColor: completed ? h.color : "var(--bg-secondary)",
                              border: isToday ? `2px solid ${h.color}` : "none",
                              boxShadow: completed ? `0 4px 10px ${h.color}40` : "none",
                              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              opacity: completed ? 1 : 0.4,
                            }}
                          />
                          <span style={{ fontSize: "10px", fontWeight: "600", color: "var(--text-muted)" }}>{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
