"use client";
import React, { useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak, getHabitCompletionRate } from "@/lib/store";
import { format, subDays } from "date-fns";
import { HABIT_ICON_LIBRARY, renderHabitIcon } from "@/lib/icons";
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
  Search,
} from "lucide-react";

const COLORS = [
  "#0D9488", "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B",
  "#10B981", "#6366F1", "#14B8A6", "#EF4444", "#84CC16",
];

interface HabitFormData {
  name: string;
  color: string;
  goal: string;
  iconKey: string;
}

export default function HabitsPage() {
  const { habits, addHabit, deleteHabit, toggleHabitCompletion, updateHabit, addAiNotification, aiEnabled } =
    useAppStore();
  const today = getTodayStr();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormData>({ name: "", color: COLORS[0], goal: "", iconKey: "Heart" });
  const [loadingTip, setLoadingTip] = useState<string | null>(null);
  const [completedToastId, setCompletedToastId] = useState<string | null>(null);

  // Icon Picker State
  const [iconSearch, setIconSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("All");

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return { key: format(d, "yyyy-MM-dd"), label: format(d, "EEE"), day: format(d, "d") };
  });

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editId) {
      updateHabit(editId, { name: form.name, color: form.color, goal: form.goal, iconKey: form.iconKey });
      setEditId(null);
    } else {
      addHabit({ name: form.name, color: form.color, goal: form.goal, iconKey: form.iconKey });
    }
    setForm({ name: "", color: COLORS[0], goal: "", iconKey: "Heart" });
    setShowForm(false);
  }

  function startEdit(h: (typeof habits)[0]) {
    setEditId(h.id);
    setForm({ name: h.name, color: h.color, goal: h.goal || "", iconKey: h.iconKey || "Target" });
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
      addAiNotification(`Maintain discipline on "${habitName}". Consistency builds momentum.`);
    } finally {
      setLoadingTip(null);
    }
  }

  const categories = ["All", "Health", "Reading", "Mindfulness", "Finance", "Coding & Study", "Lifestyle"];
  const filteredIcons = HABIT_ICON_LIBRARY.filter(i => {
    const matchCat = selectedCat === "All" || i.category === selectedCat;
    const matchSearch = i.label.toLowerCase().includes(iconSearch.toLowerCase()) || i.key.toLowerCase().includes(iconSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Habits
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "4px 0 0" }}>
            Manage routines and icon badges
          </p>
        </div>
        <button
          className="btn-primary cursor-pointer"
          onClick={() => {
            setEditId(null);
            setForm({ name: "", color: COLORS[0], goal: "", iconKey: "Heart" });
            setShowForm(true);
          }}
        >
          <Plus size={16} /> New Habit
        </button>
      </div>

      {/* Form Card with Vector Icon Picker */}
      {showForm && (
        <div className="card fade-in" style={{ padding: "24px", marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: form.color + "20", color: form.color }}>
                {renderHabitIcon(form.iconKey, 20, form.color)}
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                {editId ? "Edit Habit" : "New Habit"}
              </h3>
            </div>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Habit Name</label>
              <input
                type="text"
                placeholder="e.g. Morning Meditation, 10k Steps..."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Category or Goal (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Health baseline"
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>

            {/* Accent Color Picker */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Color Accent</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="cursor-pointer"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: form.color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                      outline: "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Professional Vector Icon Picker */}
            <div style={{ padding: "16px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", display: "block", marginBottom: "10px" }}>Choose Vector Icon</label>
              
              {/* Search & Category filter */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "160px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Search icons..."
                    value={iconSearch}
                    onChange={e => setIconSearch(e.target.value)}
                    style={{ width: "100%", paddingLeft: "30px", padding: "8px 10px 8px 30px", fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "2px" }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCat(cat)}
                      className="cursor-pointer"
                      style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "11px",
                        fontWeight: selectedCat === cat ? "600" : "500",
                        backgroundColor: selectedCat === cat ? "var(--bg-card)" : "transparent",
                        color: selectedCat === cat ? "var(--text-primary)" : "var(--text-secondary)",
                        boxShadow: selectedCat === cat ? "0 1px 2px var(--shadow)" : "none",
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Matrix */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: "8px", maxHeight: "160px", overflowY: "auto", padding: "4px" }}>
                {filteredIcons.map(ic => {
                  const isChosen = form.iconKey === ic.key;
                  return (
                    <button
                      key={ic.key}
                      onClick={() => setForm(f => ({ ...f, iconKey: ic.key }))}
                      className="cursor-pointer"
                      style={{
                        padding: "10px",
                        borderRadius: "10px",
                        border: isChosen ? `2px solid ${form.color}` : "1px solid transparent",
                        backgroundColor: isChosen ? form.color + "20" : "var(--bg-card)",
                        color: isChosen ? form.color : "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s",
                      }}
                      title={ic.label}
                    >
                      {React.cloneElement(ic.component as any, { size: 18 })}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button className="btn-secondary cursor-pointer" onClick={() => { setShowForm(false); setEditId(null); }} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary cursor-pointer" onClick={handleSubmit} disabled={!form.name.trim()} style={{ flex: 2 }}>
                <Check size={16} /> {editId ? "Save Changes" : "Create Habit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Habits list */}
      {habits.length === 0 ? (
        <div className="card fade-in" style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
          <CheckCircle2 size={40} strokeWidth={1} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", margin: "0 0 6px", color: "var(--text-primary)" }}>No habits yet</p>
          <p style={{ fontSize: "13px", margin: "0 0 16px" }}>Create your first habit to begin tracking your progress.</p>
          <button className="btn-primary cursor-pointer" onClick={() => setShowForm(true)}><Plus size={16} /> New Habit</button>
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
              <div key={h.id} className={`card fade-in relative ${completedToastId === h.id ? "card-highlight-bloom" : ""}`} style={{ padding: "18px 20px" }}>
                {completedToastId === h.id && (
                  <div className="badge-float-up" style={{ padding: "3px 8px", borderRadius: "9999px", backgroundColor: "var(--text-primary)", color: "var(--bg-card)", fontSize: "11px", fontWeight: "600" }}>
                    +1 Completed
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
                  <button
                    onClick={() => {
                      if (!done) {
                        setCompletedToastId(h.id);
                        setTimeout(() => setCompletedToastId(null), 950);
                      }
                      toggleHabitCompletion(h.id, today);
                    }}
                    className={`cursor-pointer ${done ? "animate-check" : ""}`}
                    style={{ background: "none", border: "none", padding: 0, transition: "all 0.25s" }}
                  >
                    {done ? <CheckCircle2 size={26} color={h.color} /> : <Circle size={26} color="var(--border)" />}
                  </button>

                  <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: h.color + "18", color: h.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {renderHabitIcon(h.iconKey || "Target", 18, h.color)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: "600", color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none" }}>
                      {h.name}
                    </div>
                    {h.goal && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{h.goal}</div>}
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    {aiEnabled && missedYesterday && !done && (
                      <button onClick={() => getMissedTip(h.name)} disabled={loadingTip === h.name} className="cursor-pointer" style={{ background: "var(--bg-secondary)", border: "none", color: "var(--accent)", padding: "6px", borderRadius: "8px" }} title="Get AI Tip">
                        <img src="/logo-inside.png" alt="" style={{ width: "14px", height: "14px", objectFit: "contain" }} />
                      </button>
                    )}
                    <button onClick={() => startEdit(h)} className="cursor-pointer" style={{ background: "var(--bg-secondary)", border: "none", color: "var(--text-secondary)", padding: "6px", borderRadius: "8px" }} title="Edit"><Edit3 size={15} /></button>
                    <button onClick={() => deleteHabit(h.id)} className="cursor-pointer" style={{ background: "var(--bg-secondary)", border: "none", color: "#EF4444", padding: "6px", borderRadius: "8px" }} title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--text-muted)", padding: "8px 12px", borderRadius: "8px", backgroundColor: "var(--bg-secondary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: streak > 0 ? "var(--accent)" : "inherit" }}>
                    <Flame size={13} />
                    <span>{streak}d streak</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <TrendingUp size={13} />
                    <span>Peak: {bestStreak}d</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{rate}%</span>
                    <span>30d rate</span>
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
