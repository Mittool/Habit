"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon,
  Leaf,
  Target,
  Loader,
  Plus,
  X,
  RefreshCw,
  Sparkles,
  Sunrise,
  Sunset,
  Coffee,
  Trash2,
} from "lucide-react";
import { useAppStore, Theme } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { triggerCloudSync, flushCloudSync } from "@/lib/cloud";
import { LogoLoadingScreen } from "@/components/LogoAnimation";

const THEMES: { id: Theme; name: string; desc: string; icon: React.ReactNode; colors: string[] }[] = [
  {
    id: "white-paper",
    name: "White Paper",
    desc: "Clean & bright",
    icon: <Sun size={20} />,
    colors: ["#fafafa", "#ffffff", "#10b981"],
  },
  {
    id: "zen",
    name: "Zen",
    desc: "Warm & calm",
    icon: <Leaf size={20} />,
    colors: ["#f2ede4", "#ffffff", "#b45309"],
  },
  {
    id: "dark-paper",
    name: "Dark Paper",
    desc: "Easy at night",
    icon: <Moon size={20} />,
    colors: ["#131211", "#23211e", "#f59e0b"],
  },
];

const PRESET_GOALS = [
  "Peak Physical Fitness",
  "Read 24 Books This Year",
  "Deep Focus & Zero Procrastination",
  "Consistent Morning Discipline",
  "Mindfulness & Stress Mastery"
];

const HABIT_COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981"];

interface GenHabit {
  name: string;
  description: string;
  timeOfDay?: "morning" | "day" | "evening" | "night";
}

const TIME_ICON: Record<string, React.ReactNode> = {
  morning: <Sunrise size={14} />,
  day: <Coffee size={14} />,
  evening: <Sunset size={14} />,
  night: <Moon size={14} />,
};

const TIME_LABEL: Record<string, string> = {
  morning: "Morning",
  day: "Day",
  evening: "Evening",
  night: "Night",
};

export default function OnboardingPage() {
  const { theme, setTheme, setOnboardingDone, user, isAuthenticated, addHabit } = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Goals State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["Peak Physical Fitness", "Deep Focus & Zero Procrastination"]);
  const [customGoal, setCustomGoal] = useState("");

  // Live AI preview state
  const [aiHabits, setAiHabits] = useState<GenHabit[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string>("");
  const [committing, setCommitting] = useState(false);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated((v) => (v ? v : true)));
    if (useAppStore.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated((v) => (v ? v : true)));
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace("/auth");
  }, [hydrated, isAuthenticated, router]);

  function toggleGoal(g: string) {
    if (selectedGoals.includes(g)) {
      setSelectedGoals(selectedGoals.filter(item => item !== g));
    } else if (selectedGoals.length < 3) {
      setSelectedGoals([...selectedGoals, g]);
    }
  }

  function addCustomGoal() {
    if (customGoal.trim() && selectedGoals.length < 3 && !selectedGoals.includes(customGoal.trim())) {
      setSelectedGoals([...selectedGoals, customGoal.trim()]);
      setCustomGoal("");
    }
  }

  // ─── Live AI habit generation ───
  // Plain function — React 19 compiler auto-memoises. Explicit useCallback
  // triggered a 'preserve-manual-memoization' warning because the compiler
  // couldn't preserve the manual wrapper.
  const fetchHabits = async (regen = false) => {
    if (selectedGoals.length === 0) {
      setAiHabits([]);
      setAiError(null);
      return;
    }
    const myReqId = ++requestIdRef.current;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/ai/setup-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals: selectedGoals,
          userName: user?.name || "",
          regenerate: regen,
          // small entropy so regenerate produces a fresh batch
          nonce: regen ? Date.now() : undefined,
        }),
      });
      const data = await res.json();
      if (myReqId !== requestIdRef.current) return; // stale response
      if (Array.isArray(data.habits) && data.habits.length > 0) {
        setAiHabits(data.habits);
        setAiSource(data.source || "");
      } else {
        setAiError("AI did not return any habits. Try regenerating.");
      }
    } catch (err) {
      if (myReqId !== requestIdRef.current) return;
      console.error("[Onboarding] AI fetch failed:", err);
      setAiError("Could not reach the AI. Showing nothing — try regenerate.");
    } finally {
      if (myReqId === requestIdRef.current) setAiLoading(false);
    }
  };

  // Auto-fetch whenever the user lands on the preview step OR changes goals while on it
  useEffect(() => {
    if (step !== 3) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchHabits(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedGoals.join("|")]);

  function removeAiHabit(idx: number) {
    setAiHabits(prev => prev.filter((_, i) => i !== idx));
  }

  function updateAiHabit(idx: number, patch: Partial<GenHabit>) {
    setAiHabits(prev => prev.map((h, i) => i === idx ? { ...h, ...patch } : h));
  }

  async function confirmAndFinish() {
    setCommitting(true);
    const seen = new Set<string>();
    aiHabits.forEach((h, idx) => {
      const cleanName = h.name.trim().split(/\s+/).slice(0, 5).join(" ");
      const key = cleanName.toLowerCase();
      if (cleanName && !seen.has(key)) {
        seen.add(key);
        addHabit({
          name: cleanName,
          color: HABIT_COLORS[idx % HABIT_COLORS.length],
          goal: (h.description || "").trim(),
        });
      }
    });

    setOnboardingDone(true);

    // Give the store a tick to flush the addHabit/setOnboardingDone updates
    // BEFORE we push anything to Supabase (otherwise the cloud payload
    // built from getState() would still be the pre-addHabit snapshot).
    await new Promise((r) => setTimeout(r, 0));

    const storeState = useAppStore.getState();
    if (supabase && storeState.isAuthenticated && storeState.user?.id && storeState.user.id !== "local") {
      try {
        await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,
            selected_goals: selectedGoals,
          }
        });
        // CRITICAL: we must FLUSH (not just trigger) the cloud sync so the
        // newly-added AI habits are persisted to Supabase before the router
        // sends us to '/'. The main page runs restoreFromCloudDatabase()
        // on mount which would otherwise overwrite our fresh habits with
        // the OLD backup (from before this onboarding run) — because the
        // debounced trigger hasn't fired yet.
        await flushCloudSync();
      } catch (err) {
        console.error("[Onboarding] Sync error:", err);
        // Fall through — still navigate. Local partition is already saved
        // by flushCloudSync's saveLocalUserPartition inside performCloudSync,
        // so the habits survive at least in localStorage.
      }
    } else {
      // No cloud user — at least mirror to local partition so the state
      // isn't lost on the router.replace() rerender.
      triggerCloudSync();
    }
    router.replace("/");
  }

  if (!hydrated) {
    return <LogoLoadingScreen />;
  }

  // Wider card for preview step
  const cardMaxWidth = step === 3 ? "720px" : "520px";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "24px" }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: cardMaxWidth, padding: "40px 32px" }}>
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <img src="/logo-inside.png" alt="Trac" style={{ width: 72, height: 72, borderRadius: "22%", objectFit: "cover", margin: "0 auto 22px", display: "block" }} />
            <h2 className="serif" style={{ fontSize: 36, lineHeight: 1.05, margin: "0 0 32px", color: "var(--text-primary)" }}>
              Welcome{user?.name ? `,\n${user.name.trim().split(/\s+/)[0]}` : ""}
            </h2>

            <button className="btn-accent cursor-pointer" onClick={() => setStep(1)} style={{ width: "100%", padding: "14px", fontSize: "15px" }}>
              <span>Get started</span> <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 1: Choose Theme */}
        {step === 1 && (
          <div>
            <h2 className="serif" style={{ fontSize: 32, lineHeight: 1, margin: "0 0 24px", color: "var(--text-primary)" }}>
              Pick a theme
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="cursor-pointer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "18px",
                    borderRadius: "14px",
                    border: `2px solid ${theme === t.id ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: theme === t.id ? "var(--accent-light)" : "var(--bg-card)",
                    textAlign: "left",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    {t.colors.map((c, i) => (
                      <div key={i} style={{ width: "22px", height: "22px", borderRadius: "9999px", backgroundColor: c, border: "1px solid rgba(0,0,0,0.1)" }} />
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", fontSize: "15px", color: "var(--text-primary)", marginBottom: "2px" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)" }}>{t.desc}</div>
                  </div>
                  {t.id === theme && <CheckCircle2 size={20} color="var(--accent)" />}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary cursor-pointer" onClick={() => setStep(0)} style={{ flex: 1, padding: "14px" }}>
                Back
              </button>
              <button className="btn-primary cursor-pointer" onClick={() => setStep(2)} style={{ flex: 2, padding: "14px", fontSize: "15px" }}>
                <span>Configure Goals</span> <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Define Goals */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
              <div style={{ padding: "10px", borderRadius: "14px", backgroundColor: "var(--accent)", color: "#FFFFFF" }}>
                <Target size={24} />
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Choose Your Goals
              </h2>
            </div>

            {/* Selected goals — pills only, no empty-state text */}
            {selectedGoals.length > 0 && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
                {selectedGoals.map((sg, sIdx) => (
                  <div key={sIdx} className="fade-in" style={{ padding: "6px 12px", borderRadius: "9999px", backgroundColor: "var(--accent)", color: "#FFFFFF", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>{sg}</span>
                    <button onClick={() => toggleGoal(sg)} className="cursor-pointer" style={{ background: "none", border: "none", color: "#FFFFFF", padding: 0, display: "flex" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preset chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {PRESET_GOALS.map((preset, pI) => {
                const isChecked = selectedGoals.includes(preset);
                return (
                  <button
                    key={pI}
                    onClick={() => toggleGoal(preset)}
                    disabled={!isChecked && selectedGoals.length >= 3}
                    className="cursor-pointer"
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "600",
                      border: `1px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                      backgroundColor: isChecked ? "var(--accent-light)" : "var(--bg-secondary)",
                      color: isChecked ? "var(--accent)" : "var(--text-secondary)",
                      opacity: (!isChecked && selectedGoals.length >= 3) ? 0.4 : 1,
                      transition: "all 0.2s"
                    }}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            {/* Custom goal */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
              <input
                type="text"
                placeholder="Add your own goal"
                value={customGoal}
                onChange={e => setCustomGoal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomGoal()}
                disabled={selectedGoals.length >= 3}
                style={{ flex: 1 }}
              />
              <button onClick={addCustomGoal} disabled={!customGoal.trim() || selectedGoals.length >= 3} className="btn-secondary cursor-pointer" style={{ padding: "10px 14px" }}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-secondary cursor-pointer" onClick={() => setStep(1)} style={{ flex: 1, padding: "14px" }}>
                Back
              </button>
              <button
                disabled={selectedGoals.length === 0}
                className="btn-primary cursor-pointer"
                onClick={() => setStep(3)}
                style={{ flex: 2, padding: "14px", fontSize: "14px", opacity: selectedGoals.length === 0 ? 0.5 : 1 }}
              >
                <Sparkles size={16} /> Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Live AI Habit Preview */}
        {step === 3 && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <div style={{ padding: "10px", borderRadius: "14px", backgroundColor: "var(--accent)", color: "#FFFFFF" }}>
                <Sparkles size={24} />
              </div>
              <h2 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: "var(--text-primary)", flex: 1, minWidth: 0 }}>
                Your Habits
              </h2>
              <button
                onClick={() => fetchHabits(true)}
                disabled={aiLoading || selectedGoals.length === 0}
                className="btn-secondary cursor-pointer"
                style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}
                title="Regenerate suggestions"
              >
                <RefreshCw size={13} className={aiLoading ? "spin" : ""} />
                Regenerate
              </button>
            </div>

            {/* Error */}
            {aiError && !aiLoading && (
              <div style={{ padding: "12px 14px", borderRadius: "10px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#DC2626", fontSize: "12.5px", fontWeight: "500", marginBottom: "12px" }}>
                {aiError}
              </div>
            )}

            {/* Habit list / skeletons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
              {aiLoading && aiHabits.length === 0 && (
                <>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="skeleton-pulse" style={{
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-secondary)",
                      minHeight: "78px",
                    }}>
                      <div style={{ height: "14px", width: "60%", backgroundColor: "var(--border)", borderRadius: "4px", marginBottom: "8px", opacity: 0.6 }} />
                      <div style={{ height: "10px", width: "90%", backgroundColor: "var(--border)", borderRadius: "4px", marginBottom: "4px", opacity: 0.4 }} />
                      <div style={{ height: "10px", width: "75%", backgroundColor: "var(--border)", borderRadius: "4px", opacity: 0.4 }} />
                    </div>
                  ))}
                </>
              )}

              {aiHabits.map((h, idx) => {
                const tod = h.timeOfDay || "day";
                const color = HABIT_COLORS[idx % HABIT_COLORS.length];
                return (
                  <div
                    key={idx}
                    className="fade-in"
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-card)",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ width: "8px", alignSelf: "stretch", borderRadius: "4px", backgroundColor: color, flexShrink: 0, minHeight: "40px" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <input
                          value={h.name}
                          onChange={(e) => updateAiHabit(idx, { name: e.target.value })}
                          style={{
                            fontSize: "14.5px",
                            fontWeight: "600",
                            color: "var(--text-primary)",
                            background: "transparent",
                            border: "none",
                            padding: "2px 0",
                            flex: "1 1 auto",
                            minWidth: "120px",
                            outline: "none",
                          }}
                        />
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          backgroundColor: "var(--bg-secondary)",
                          color: "var(--text-secondary)",
                          fontSize: "10.5px",
                          fontWeight: "600",
                        }}>
                          {TIME_ICON[tod]}
                          <span>{TIME_LABEL[tod]}</span>
                        </span>
                      </div>
                      <textarea
                        value={h.description}
                        onChange={(e) => updateAiHabit(idx, { description: e.target.value })}
                        rows={2}
                        style={{
                          fontSize: "12.5px",
                          fontWeight: "500",
                          color: "var(--text-secondary)",
                          lineHeight: "1.45",
                          background: "transparent",
                          border: "none",
                          padding: "2px 0",
                          width: "100%",
                          resize: "none",
                          outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => removeAiHabit(idx)}
                      className="cursor-pointer"
                      title="Remove this habit"
                      style={{ background: "none", border: "none", padding: "4px", color: "var(--text-muted)", display: "flex", alignSelf: "flex-start" }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {!aiLoading && aiHabits.length === 0 && !aiError && (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px" }}>
                  Click <strong>Regenerate</strong> to get fresh suggestions.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button disabled={committing} className="btn-secondary cursor-pointer" onClick={() => setStep(2)} style={{ flex: 1, padding: "14px" }}>
                Back
              </button>
              <button
                disabled={committing || aiLoading || aiHabits.length === 0}
                className="btn-primary cursor-pointer"
                onClick={confirmAndFinish}
                style={{ flex: 2, padding: "14px", fontSize: "14px", opacity: (committing || aiLoading || aiHabits.length === 0) ? 0.6 : 1 }}
              >
                {committing ? (
                  <><Loader size={18} className="spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 size={16} /> Add These {aiHabits.length} Habit{aiHabits.length === 1 ? "" : "s"}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
