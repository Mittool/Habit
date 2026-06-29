"use client";
import { useState } from "react";
import PomodoroPage from "./PomodoroPage";
import MusicPage from "./MusicPage";
import { Timer, Music } from "lucide-react";

interface FocusProps {
  initialTab?: "timer" | "music";
}

export default function FocusPage({ initialTab = "timer" }: FocusProps) {
  const [tab, setTab] = useState<"timer" | "music">(initialTab);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", minHeight: "calc(100vh - 68px)", boxSizing: "border-box" }}>
      {/* Sleek Minimalist Edge-to-Edge App Bar Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--bg-card)", flexShrink: 0 }}>
        <h1 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Focus
        </h1>

        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          {[
            { id: "timer", label: "Focus Timer", icon: <Timer size={14} /> },
            { id: "music", label: "Focus Music", icon: <Music size={14} /> },
          ].map((seg) => {
            const isSel = tab === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setTab(seg.id as any)}
                className="cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isSel ? "var(--bg-card)" : "transparent",
                  color: isSel ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: isSel ? "800" : "600",
                  fontSize: "12px",
                  boxShadow: isSel ? "0 1px 3px var(--shadow)" : "none",
                  transition: "all 0.15s"
                }}
              >
                {seg.icon}
                <span>{seg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }} key={tab}>
        {tab === "timer" && <PomodoroPage />}
        {tab === "music" && <MusicPage />}
      </div>
    </div>
  );
}
