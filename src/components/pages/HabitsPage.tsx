"use client";
import React, { useState } from "react";
import { useAppStore, getTodayStr, getHabitStreak, getHabitBestStreak, getHabitCompletionRate } from "@/lib/store";
import { format, subDays } from "date-fns";
import { HABIT_ICON_LIBRARY, renderHabitIcon } from "@/lib/icons";
import PageHeader from "@/components/PageHeader";
import CompletionBurst from "@/components/CompletionBurst";
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
  Sparkles,
  RefreshCw,
  Loader,
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

interface AiSuggestion {
  name: string;
  description: string;
  timeOfDay?: "morning" | "day" | "evening" | "night";
  selected: boolean; // whether the user has ticked it in the modal
}

export default function HabitsPage() {
  const { habits, addHabit, deleteHabit, toggleHabitCompletion, updateHabit, addAiNotification, aiEnabled, user } =
    useAppStore();
  const today = getTodayStr();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<HabitFormData>({ name: "", color: COLORS[0], goal: "", iconKey: "Heart" });
  const [loadingTip, setLoadingTip] = useState<string | null>(null);
  const [completedToastId, setCompletedToastId] = useState<string | null>(null);

  // ─── AI-suggest modal state ───
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [aiGoalInput, setAiGoalInput] = useState("");
  const [aiFetching, setAiFetching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiFetchError, setAiFetchError] = useState<string | null>(null);

  async function fetchAiSuggestions(regenerate = false) {
    if (!aiGoalInput.trim()) {
      setAiFetchError("Type a goal first (e.g. 'Learn Spanish' or 'Get fit').");
      return;
    }
    setAiFetching(true);
    setAiFetchError(null);
    try {
      const res = await fetch("/api/ai/setup-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: [aiGoalInput.trim()],
          userName: user?.name || "",
          regenerate,
          nonce: regenerate ? Date.now() : undefined,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.habits) && data.habits.length > 0) {
        // Filter out habits whose name already exists (case-insensitive)
        const existingNames = new Set(habits.map((h) => h.name.toLowerCase()));
        const fresh: AiSuggestion[] = data.habits
          .filter((h: any) => h?.name && !existingNames.has(String(h.name).toLowerCase()))
          .map((h: any) => ({
            name: String(h.name).trim(),
            description: String(h.description || "").trim(),
            timeOfDay: h.timeOfDay,
            selected: true,
          }));
        if (fresh.length === 0) {
          setAiFetchError("All suggested habits are already in your list. Try a different goal.");
          setAiSuggestions([]);
        } else {
          setAiSuggestions(fresh);
        }
      } else {
        setAiFetchError("AI didn't return any habits. Try 'Regenerate'.");
      }
    } catch (err) {
      console.error("[HabitsPage] AI suggest fetch failed:", err);
      setAiFetchError("Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setAiFetching(false);
    }
  }

  function toggleSuggestion(idx: number) {
    setAiSuggestions((s) => s.map((h, i) => i === idx ? { ...h, selected: !h.selected } : h));
  }

  function commitAiSuggestions() {
    let addedCount = 0;
    aiSuggestions.forEach((h, idx) => {
      if (!h.selected) return;
      const cleanName = h.name.trim().split(/\s+/).slice(0, 5).join(" ");
      if (!cleanName) return;
      addHabit({
        name: cleanName,
        color: COLORS[(habits.length + addedCount) % COLORS.length],
        goal: (h.description || "").trim(),
        iconKey: "Target",
      });
      addedCount++;
    });
    // Close and reset
    setShowAiSuggest(false);
    setAiSuggestions([]);
    setAiGoalInput("");
    setAiFetchError(null);
    if (addedCount > 0) {
      addAiNotification(`Added ${addedCount} AI-suggested habit${addedCount === 1 ? "" : "s"} to your list.`);
    }
  }

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
      const h = habits.find(hb => hb.name === habitName);
      const completionsArr = h ? Object.entries(h.completions || {}) : [];
      const last30 = completionsArr.slice(-30);
      const done30 = last30.filter(([, v]) => v).length;
      const habitStats = h ? {
        createdAt: h.createdAt,
        totalDaysTracked: completionsArr.length,
        currentStreak: getHabitStreak(h),
        bestStreak: getHabitBestStreak(h),
        rateLast30Days: last30.length > 0 ? Math.round((done30 / last30.length) * 100) : 0,
        recentMisses: last30.filter(([, v]) => !v).map(([d]) => d).slice(-5),
        goal: h.goal || null,
        reminderTime: h.reminderTime || null,
      } : {};
      const res = await fetch("/api/ai/habit-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missedHabit: habitName, stats: habitStats }),
      });
      const data = await res.json();
      addAiNotification(data.tip);
    } catch {
      addAiNotification(`Maintain discipline on "${habitName}". Consistency builds momentum.`);
    } finally {
      setLoadingTip(null);
    }
  }

  return (
    <div style={{ padding: "40px 22px 24px", maxWidth: "820px", margin: "0 auto" }}>
      <PageHeader
        eyebrow="Your routines"
        title="Habits"
        right={
          <>
            {aiEnabled && (
              <button
                className="btn-secondary cursor-pointer"
                onClick={() => {
                  setAiGoalInput("");
                  setAiSuggestions([]);
                  setAiFetchError(null);
                  setShowAiSuggest(true);
                }}
                title="Ask Trac AI to suggest new habits"
              >
                <Sparkles size={15} /> Suggest
              </button>
            )}
            <button
              className="btn-accent cursor-pointer"
              onClick={() => {
                setEditId(null);
                setForm({ name: "", color: COLORS[0], goal: "", iconKey: "Heart" });
                setShowForm(true);
              }}
            >
              <Plus size={16} /> New
            </button>
          </>
        }
      />

      {/* ─── AI Suggest Modal ─── */}
      {showAiSuggest && (
        <div
          onClick={() => setShowAiSuggest(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "40px 16px", overflowY: "auto",
          }}
        >
          <div
            className="card fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "560px", padding: "24px", backgroundColor: "var(--bg-card)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ padding: "8px", borderRadius: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)" }}>
                  <Sparkles size={18} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  Suggest Habits with AI
                </h3>
              </div>
              <button onClick={() => setShowAiSuggest(false)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 16px" }}>
              Type any goal and Trac AI will suggest daily habits you can add to your list. Your existing habits stay untouched.
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <input
                type="text"
                value={aiGoalInput}
                onChange={(e) => setAiGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchAiSuggestions(false)}
                placeholder="e.g. Learn Spanish, Get fit, Sleep better..."
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                onClick={() => fetchAiSuggestions(false)}
                disabled={aiFetching || !aiGoalInput.trim()}
                className="btn-primary cursor-pointer"
                style={{ padding: "10px 14px" }}
              >
                {aiFetching ? <Loader size={16} className="spin" /> : <Sparkles size={16} />}
                Generate
              </button>
            </div>

            {aiFetchError && (
              <div style={{ padding: "10px 12px", borderRadius: "8px", backgroundColor: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", color: "#DC2626", fontSize: "12.5px", fontWeight: "500", marginBottom: "12px" }}>
                {aiFetchError}
              </div>
            )}

            {aiSuggestions.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)" }}>
                    {aiSuggestions.filter((s) => s.selected).length} of {aiSuggestions.length} selected
                  </span>
                  <button
                    onClick={() => fetchAiSuggestions(true)}
                    disabled={aiFetching}
                    className="btn-secondary cursor-pointer"
                    style={{ padding: "6px 10px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    <RefreshCw size={12} className={aiFetching ? "spin" : ""} />
                    Regenerate
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px", maxHeight: "340px", overflowY: "auto" }}>
                  {aiSuggestions.map((h, idx) => (
                    <label
                      key={idx}
                      className="cursor-pointer"
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "10px",
                        padding: "12px 14px", borderRadius: "10px",
                        border: `1px solid ${h.selected ? "var(--accent)" : "var(--border)"}`,
                        backgroundColor: h.selected ? "var(--accent-light)" : "var(--bg-secondary)",
                        transition: "all 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={h.selected}
                        onChange={() => toggleSuggestion(idx)}
                        style={{ marginTop: "2px", flexShrink: 0, cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "2px" }}>
                          {h.name}
                        </div>
                        {h.description && (
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                            {h.description}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setShowAiSuggest(false)} className="btn-secondary cursor-pointer" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={commitAiSuggestions}
                    disabled={aiSuggestions.filter((s) => s.selected).length === 0}
                    className="btn-primary cursor-pointer"
                    style={{ flex: 2 }}
                  >
                    <Plus size={16} /> Add {aiSuggestions.filter((s) => s.selected).length || ""} Habit{aiSuggestions.filter((s) => s.selected).length === 1 ? "" : "s"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

            {/* Choose Icon Matrix */}
            <div style={{ padding: "14px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", display: "block", marginBottom: "10px" }}>Choose Icon</label>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(44px, 1fr))", gap: "8px", maxHeight: "180px", overflowY: "auto", padding: "2px" }}>
                {HABIT_ICON_LIBRARY.map((ic) => {
                  const isChosen = form.iconKey === ic.key;
                  return (
                    <button
                      key={ic.key}
                      onClick={() => setForm((f) => ({ ...f, iconKey: ic.key }))}
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
        <div className="card fade-in" style={{ padding: "56px 28px", textAlign: "center" }}>
          <div style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <CheckCircle2 size={30} strokeWidth={1.6} />
          </div>
          <p className="serif" style={{ fontSize: 22, margin: "0 0 6px", color: "var(--text-primary)" }}>No habits yet</p>
          <p style={{ fontSize: 13.5, color: "var(--text-muted)", margin: "0 0 22px", lineHeight: 1.5 }}>
            Add your first one and start building the routine you want.
          </p>
          <button className="btn-accent cursor-pointer" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create habit
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {habits.map((h, hIdx) => {
            const done = h.completions[today];
            const streak = getHabitStreak(h);
            const bestStreak = getHabitBestStreak(h);
            const rate = getHabitCompletionRate(h, 30);
            const missedYesterday = !h.completions[format(subDays(new Date(), 1), "yyyy-MM-dd")];

            return (
              <div
                key={h.id}
                className={`card fade-in relative ${completedToastId === h.id ? "card-highlight-bloom" : ""}`}
                style={{
                  padding: "18px 20px",
                  animationDelay: `${Math.min(hIdx * 40, 200)}ms`,
                  borderLeft: `3px solid ${h.color}`,
                }}
              >
                {completedToastId === h.id && (
                  <div className="badge-float-up" style={{ padding: "4px 10px", borderRadius: 9999, backgroundColor: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    +1 done
                  </div>
                )}

                {/* Top row: check + icon + name + actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                  <button
                    onClick={() => {
                      if (!done) {
                        setCompletedToastId(h.id);
                        setTimeout(() => setCompletedToastId(null), 950);
                      }
                      toggleHabitCompletion(h.id, today);
                    }}
                    className={`cursor-pointer ${done ? "animate-check" : ""}`}
                    style={{ background: "none", border: "none", padding: 0, flexShrink: 0, position: "relative", width: 28, height: 28 }}
                    aria-label={done ? "Mark incomplete" : "Mark done"}
                  >
                    {done ? <CheckCircle2 size={28} color={h.color} /> : <Circle size={28} color="var(--border-strong)" strokeWidth={1.8} />}
                    {completedToastId === h.id && <CompletionBurst color={h.color} />}
                  </button>

                  <div style={{ padding: 8, borderRadius: 12, backgroundColor: h.color + "1C", color: h.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {renderHabitIcon(h.iconKey || "Target", 18, h.color)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600, color: done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.name}
                    </div>
                    {h.goal && (
                      <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {h.goal}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {aiEnabled && missedYesterday && !done && (
                      <button onClick={() => getMissedTip(h.name)} disabled={loadingTip === h.name} className="btn-ghost cursor-pointer" title="Get AI Tip" style={{ color: "var(--accent)" }}>
                        <img src="/logo-inside.png" alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
                      </button>
                    )}
                    <button onClick={() => startEdit(h)} className="btn-ghost cursor-pointer" title="Edit"><Edit3 size={14} /></button>
                    <button onClick={() => deleteHabit(h.id)} className="btn-ghost cursor-pointer" title="Delete" style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Bottom row: 7-day dots + stat pills */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {/* 7-day dot strip */}
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {last7.map((d) => {
                      const dayDone = h.completions[d.key];
                      const isToday = d.key === today;
                      return (
                        <div
                          key={d.key}
                          title={`${d.label} ${d.day} — ${dayDone ? "done" : "not done"}`}
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 4,
                            backgroundColor: dayDone ? h.color : "var(--bg-secondary)",
                            border: isToday ? `1.5px solid ${h.color}` : "1px solid var(--border)",
                            opacity: dayDone ? 1 : 0.7,
                          }}
                        />
                      );
                    })}
                  </div>

                  <div style={{ flex: 1 }} />

                  {/* Stat pills */}
                  {streak > 0 && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, backgroundColor: "var(--accent-soft)", fontSize: 11.5, fontWeight: 700, color: "var(--accent)" }}>
                      <Flame size={11} />
                      <span>{streak}d</span>
                    </div>
                  )}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 9999, backgroundColor: "var(--bg-secondary)", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)" }}>
                    <TrendingUp size={11} />
                    <span>{rate}%</span>
                  </div>
                  {bestStreak > streak && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                      Peak {bestStreak}d
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
