"use client";
import { useState } from "react";
import PomodoroPage from "./PomodoroPage";
import MusicPage from "./MusicPage";
import PageHeader from "@/components/PageHeader";
import { Timer, Music } from "lucide-react";

interface FocusProps {
  initialTab?: "timer" | "music";
}

export default function FocusPage({ initialTab = "timer" }: FocusProps) {
  const [tab, setTab] = useState<"timer" | "music">(initialTab);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
      <div style={{ padding: "40px 22px 10px", maxWidth: "820px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <PageHeader eyebrow="Deep work" title="Focus" />

        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 9999, backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", width: "fit-content" }}>
          {[
            { id: "timer", label: "Timer", icon: <Timer size={14} /> },
            { id: "music", label: "Music", icon: <Music size={14} /> },
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
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 9999,
                  border: "none",
                  backgroundColor: isSel ? "var(--bg-card)" : "transparent",
                  color: isSel ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: isSel ? 700 : 600,
                  fontSize: 12.5,
                  boxShadow: isSel ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s var(--ease)",
                  fontFamily: "inherit",
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
