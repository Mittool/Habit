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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ padding: "32px 24px 12px", maxWidth: "800px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          Focus
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", padding: "4px", borderRadius: "14px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          {[
            { id: "timer", label: "Timer", icon: <Timer size={16} /> },
            { id: "music", label: "Music", icon: <Music size={16} /> },
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
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px 8px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: isSel ? "var(--bg-card)" : "transparent",
                  color: isSel ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: isSel ? "600" : "500",
                  fontSize: "13px",
                  boxShadow: isSel ? "0 2px 8px var(--shadow)" : "none",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
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
