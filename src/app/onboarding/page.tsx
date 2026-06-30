"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Palette, CheckCircle2, ChevronRight, Sun, Moon, Leaf, Target, Loader, Plus, X } from "lucide-react";
import { useAppStore, Theme } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { triggerCloudSync } from "@/lib/cloud";

const THEMES: { id: Theme; name: string; desc: string; icon: React.ReactNode; colors: string[] }[] = [
  {
    id: "white-paper",
    name: "White Paper",
    desc: "Clean, minimal light mode",
    icon: <Sun size={20} />,
    colors: ["#F8FAFC", "#FFFFFF", "#0D9488"],
  },
  {
    id: "dark-paper",
    name: "Dark Paper",
    desc: "Easy on the eyes midnight dark mode",
    icon: <Moon size={20} />,
    colors: ["#0B0F19", "#161E2E", "#14B8A6"],
  },
  {
    id: "zen",
    name: "Zen",
    desc: "Warm calming sand earth tones",
    icon: <Leaf size={20} />,
    colors: ["#F6F4F0", "#FFFFFF", "#D97706"],
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

export default function OnboardingPage() {
  const { theme, setTheme, setOnboardingDone, user, isAuthenticated, addHabit } = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Goals State
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["Peak Physical Fitness", "Deep Focus & Zero Procrastination"]);
  const [customGoal, setCustomGoal] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
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

  async function handleDeployBlueprint() {
    setAiGenerating(true);

    // Simulate short neural synthesis delay
    await new Promise(r => setTimeout(r, 1200));

    // Tailored connected system routines (James Clear & GTD methodology)
    const blueprintHabits: Array<{ name: string; goal: string }> = [];

    const isJeeOrExam = selectedGoals.some(g => g.toLowerCase().includes("jee") || g.toLowerCase().includes("exam") || g.toLowerCase().includes("crack"));
    const isFitness = selectedGoals.some(g => g.toLowerCase().includes("fitness") || g.toLowerCase().includes("weight") || g.toLowerCase().includes("health"));

    if (isJeeOrExam) {
      blueprintHabits.push({ name: "Morning: Review Yesterday Mistakes", goal: "System routine sequence 1" });
      blueprintHabits.push({ name: "Morning: Solve 20 Math Problems", goal: "Active recall foundation" });
      blueprintHabits.push({ name: "Afternoon: Chemistry Deep Focus", goal: "Spaced repetition practice" });
      blueprintHabits.push({ name: "Evening: Timed Mock Questions", goal: "Exam simulation rigor" });
      blueprintHabits.push({ name: "Night: Plan Tomorrow Priorities", goal: "Eliminates morning decision fatigue" });
    } else if (isFitness) {
      blueprintHabits.push({ name: "Morning: Sunlight & Mobility", goal: "Circadian cortisol alignment" });
      blueprintHabits.push({ name: "Afternoon: Progressive Workout", goal: "Muscular adaptation trigger" });
      blueprintHabits.push({ name: "Evening: Protein Intake Log", goal: "Nutritional recovery baseline" });
      blueprintHabits.push({ name: "Night: Digital Sunset (10:30 PM)", goal: "Melatonin protection window" });
    } else {
      selectedGoals.forEach((goal) => {
        blueprintHabits.push({ name: `Morning Ritual: ${goal.slice(0, 16)}`, goal: `System sequence for ${goal}` });
        blueprintHabits.push({ name: `Deep Work Block: ${goal.slice(0, 16)}`, goal: `System sequence for ${goal}` });
        blueprintHabits.push({ name: `Evening Review: ${goal.slice(0, 16)}`, goal: `Dopamine reinforcement loop` });
      });
    }

    if (blueprintHabits.length === 0) {
      blueprintHabits.push({ name: "Morning: Circadian Sunlight Walk", goal: "Huberman foundational baseline" });
      blueprintHabits.push({ name: "Afternoon: 45m Deep Work Block", goal: "Cal Newport focus ritual" });
      blueprintHabits.push({ name: "Evening: GTD Inbox Clearing", goal: "David Allen mental clarity" });
      blueprintHabits.push({ name: "Night: Sleep Hygiene Tucking In", goal: "Restorative rest anchor" });
    }

    // Deduplicate and automatically inject into store
    const seen = new Set<string>();
    blueprintHabits.forEach((h, idx) => {
      if (!seen.has(h.name)) {
        seen.add(h.name);
        addHabit({
          name: h.name,
          color: HABIT_COLORS[idx % HABIT_COLORS.length],
          goal: h.goal
        });
      }
    });

    setOnboardingDone(true);
    const storeState = useAppStore.getState();
    if (supabase && storeState.isAuthenticated && storeState.user?.id && storeState.user.id !== "local") {
      try {
        await supabase.auth.updateUser({
          data: {
            onboarding_completed: true,
            selected_goals: selectedGoals,
          }
        });
        triggerCloudSync();
      } catch (err) {
        console.error("[Onboarding] Sync error:", err);
      }
    }
    router.replace("/");
  }

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Initializing Trac...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)", padding: "24px" }}>
      <div className="card fade-in" style={{ width: "100%", maxWidth: "520px", padding: "40px 32px" }}>
        {/* STEP 0: Welcome */}
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <img src="/logo-inside.png" alt="Trac" style={{ width: "72px", height: "72px", borderRadius: "22%", objectFit: "cover", boxShadow: "0 8px 24px rgba(13,148,136,0.2)", margin: "0 auto 20px", display: "block" }} />
            <h2 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
              Welcome to Trac, {user?.name || "there"}
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", lineHeight: "1.6", fontSize: "15px", fontWeight: "500" }}>
              Habit tracking, smart daily reminders, and focus timer.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "32px", textAlign: "left" }}>
              {[
                "Adaptive daily reminders",
                "Focus timer",
                "Trac AI tips",
                "Daily stats",
                "Focus music",
                "Time scheduling",
              ].map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "10px", fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                  <CheckCircle2 size={16} color="var(--accent)" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <button className="btn-primary cursor-pointer" onClick={() => setStep(1)} style={{ width: "100%", padding: "14px", fontSize: "15px" }}>
              <span>Initiate Setup</span> <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 1: Choose Theme */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "14px", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Palette size={24} color="var(--accent)" />
              </div>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  Select Aesthetics
                </h2>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Customize interface visual theme
                </p>
              </div>
            </div>

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

        {/* STEP 2: Define Goals & Auto-Create Habits */}
        {step === 2 && (
          <div className="fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
              <div style={{ padding: "10px", borderRadius: "14px", backgroundColor: "var(--accent)", color: "#FFFFFF" }}>
                <Target size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  Choose Your Goals
                </h2>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Select 1 to 3 goals (Optional)
                </p>
              </div>
            </div>

            <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 16px" }}>
              Trac AI will review your goals and automatically add the best daily habits for you.
            </p>

            {/* Selected Goals Display Matrix */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px", minHeight: "36px" }}>
              {selectedGoals.map((sg, sIdx) => (
                <div key={sIdx} className="fade-in" style={{ padding: "6px 12px", borderRadius: "9999px", backgroundColor: "var(--accent)", color: "#FFFFFF", fontSize: "12px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <span>{sg}</span>
                  <button onClick={() => toggleGoal(sg)} className="cursor-pointer" style={{ background: "none", border: "none", color: "#FFFFFF", padding: 0, display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Preset Selection Chips */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "none", display: "block", marginBottom: "8px" }}>
                Recommended Targets:
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            </div>

            {/* Custom Goal Input */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
              <input
                type="text"
                placeholder="Or input custom goal..."
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
              <button disabled={aiGenerating} className="btn-secondary cursor-pointer" onClick={() => setStep(1)} style={{ flex: 1, padding: "14px" }}>
                Back
              </button>
              <button disabled={aiGenerating} className="btn-primary cursor-pointer" onClick={handleDeployBlueprint} style={{ flex: 2, padding: "14px", fontSize: "14px" }}>
                {aiGenerating ? (
                  <><Loader size={18} className="spin" /> Creating Habits...</>
                ) : (
                  <><img src="/logo-inside.png" alt="" style={{ width: "16px", height: "16px", objectFit: "cover", borderRadius: "50%" }} /> Create My Habits</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
