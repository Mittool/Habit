"use client";
import { useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak, getHabitCompletionRate } from "@/lib/store";
import { format, subDays } from "date-fns";
import {
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Flame,
  Edit3,
  X,
  Check,
  TrendingUp,
  Brain,
} from "lucide-react";

const COLORS = [
  "#5c7a5c", "#6b8cba", "#c47b5c", "#8b7ab8", "#b85c7a",
  "#5cb87a", "#b8a45c", "#5c9db8", "#b85c5c", "#7ab85c",
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
    <div style={{ padding: "24px", maxWidth: "720px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          Habits
        </h2>
        <button
          className="btn-primary"
          onClick={() => {
            setEditId(null);
            setForm({ name: "", color: COLORS[0], goal: "" });
            setShowForm(true);
          }}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} /> New Habit
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card fade-in" style={{ padding: "20px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
              {editId ? "Edit Habit" : "New Habit"}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="text"
              placeholder="Habit name (e.g. Meditate, Exercise...)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              style={{ width: "100%" }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Goal / notes (optional)"
              value={form.goal}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              style={{ width: "100%" }}
            />
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Color
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: form.color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Check size={16} /> {editId ? "Update" : "Add Habit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <div
          className="card"
          style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}
        >
          <CheckCircle size={40} strokeWidth={1} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", margin: "0 0 6px" }}>No habits yet</p>
          <p style={{ fontSize: "13px", margin: 0 }}>Create your first habit to start tracking</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {habits.map((h) => {
            const done = h.completions[today];
            const streak = getHabitStreak(h);
            const bestStreak = getHabitBestStreak(h);
            const rate = getHabitCompletionRate(h, 30);
            const missedYesterday = !h.completions[format(subDays(new Date(), 1), "yyyy-MM-dd")];

            return (
              <div key={h.id} className="card fade-in" style={{ padding: "16px 20px" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}
                >
                  {/* Completion toggle */}
                  <button
                    onClick={() => toggleHabitCompletion(h.id, today)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {done ? (
                      <CheckCircle size={24} color={h.color} />
                    ) : (
                      <Circle size={24} color="var(--border)" />
                    )}
                  </button>

                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: h.color,
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: done ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {h.name}
                    </div>
                    {h.goal && (
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{h.goal}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => startEdit(h)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "4px",
                        borderRadius: "4px",
                      }}
                    >
                      <Edit3 size={15} />
                    </button>
                    {aiEnabled && missedYesterday && !done && (
                      <button
                        onClick={() => getMissedTip(h.name)}
                        disabled={loadingTip === h.name}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#f59e0b",
                          padding: "4px",
                          borderRadius: "4px",
                        }}
                        title="Get AI tip"
                      >
                        <Brain size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteHabit(h.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "4px",
                        borderRadius: "4px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "flex",
                    gap: "16px",
                    marginBottom: "12px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Flame size={12} color="#f59e0b" />
                    <span>{streak} day streak</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <TrendingUp size={12} color="var(--accent)" />
                    <span>Best: {bestStreak}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "var(--accent)", fontWeight: "600" }}>{rate}%</span>
                    <span>30d rate</span>
                  </div>
                </div>

                {/* 7-day mini calendar */}
                <div style={{ display: "flex", gap: "4px" }}>
                  {last7.map((d) => {
                    const completed = h.completions[d.key];
                    return (
                      <div
                        key={d.key}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "9px",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          {d.label}
                        </span>
                        <div
                          onClick={() => toggleHabitCompletion(h.id, d.key)}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            backgroundColor: completed ? h.color : "var(--bg-secondary)",
                            border: d.key === today ? `2px solid ${h.color}` : "none",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            opacity: completed ? 1 : 0.4,
                          }}
                        />
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
