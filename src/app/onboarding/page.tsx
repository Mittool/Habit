"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Palette, CheckCircle, ChevronRight, Sun, Moon, Leaf } from "lucide-react";
import { useAppStore, Theme } from "@/lib/store";

const THEMES: { id: Theme; name: string; desc: string; icon: React.ReactNode; colors: string[] }[] = [
  {
    id: "white-paper",
    name: "White Paper",
    desc: "Clean, minimal, distraction-free",
    icon: <Sun size={20} />,
    colors: ["#f5f0eb", "#ffffff", "#5c7a5c"],
  },
  {
    id: "dark-paper",
    name: "Dark Paper",
    desc: "Easy on the eyes, great for night",
    icon: <Moon size={20} />,
    colors: ["#1a1a18", "#2e2e2a", "#8ab08a"],
  },
  {
    id: "zen",
    name: "Zen",
    desc: "Warm earth tones for calm focus",
    icon: <Leaf size={20} />,
    colors: ["#f0ede8", "#faf8f5", "#8b7355"],
  },
];

export default function OnboardingPage() {
  const { theme, setTheme, setOnboardingDone, user, isAuthenticated } = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) router.replace("/auth");
  }, [hydrated, isAuthenticated, router]);

  function handleFinish() {
    setOnboardingDone(true);
    router.replace("/");
  }

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        padding: "24px",
      }}
    >
      <div
        className="card fade-in"
        style={{ width: "100%", maxWidth: "480px", padding: "40px 32px" }}
      >
        {step === 0 && (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                backgroundColor: "var(--accent-light)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <CheckCircle size={32} color="var(--accent)" />
            </div>
            <h2
              style={{
                fontSize: "26px",
                fontWeight: "600",
                color: "var(--text-primary)",
                margin: "0 0 8px",
              }}
            >
              Welcome, {user?.name || "there"}
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "32px", lineHeight: "1.6" }}>
              Trac helps you build lasting habits, manage time, and stay focused — all in one place.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "32px",
                textAlign: "left",
              }}
            >
              {[
                "Daily habit tracking",
                "Pomodoro timer",
                "AI-powered tips",
                "Mood journaling",
                "Focus music",
                "Time boxing",
              ].map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    backgroundColor: "var(--bg-secondary)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CheckCircle size={14} color="var(--accent)" />
                  {f}
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              onClick={() => setStep(1)}
              style={{
                width: "100%",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              Get Started <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "var(--accent-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Palette size={20} color="var(--accent)" />
              </div>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                  Choose Your Theme
                </h2>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                  You can change this anytime in settings
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    borderRadius: "10px",
                    border: `2px solid ${theme === t.id ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: theme === t.id ? "var(--accent-light)" : "var(--bg-card)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Color preview */}
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    {t.colors.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: c,
                          border: "1px solid rgba(0,0,0,0.1)",
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        marginBottom: "2px",
                      }}
                    >
                      {t.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{t.desc}</div>
                  </div>
                  <div style={{ color: t.id === theme ? "var(--accent)" : "transparent" }}>
                    <CheckCircle size={18} />
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn-secondary"
                onClick={() => setStep(0)}
                style={{ flex: 1, padding: "12px" }}
              >
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleFinish}
                style={{
                  flex: 2,
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                Start Tracking <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
