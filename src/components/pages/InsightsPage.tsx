"use client";
import { useState } from "react";
import AnalyticsPage from "./AnalyticsPage";
import MoodPage from "./MoodPage";
import SleepPage from "./SleepPage";
import { TrendingUp, Smile, Moon, Settings } from "lucide-react";

interface InsightsProps {
  initialTab?: "stats" | "mood" | "sleep";
  onNavigate?: (page: string) => void;
}

export default function InsightsPage({ initialTab = "stats", onNavigate }: InsightsProps) {
  const [tab, setTab] = useState<"stats" | "mood" | "sleep">(initialTab);

  return (
    <div>
      {/* Fixed Top Right Settings Button */}
      {onNavigate && (
        <div style={{ position: "fixed", top: "18px", right: "20px", zIndex: 999999 }}>
          <button
            onClick={() => onNavigate("settings")}
            className="btn-secondary cursor-pointer"
            style={{ padding: "10px", borderRadius: "12px" }}
            title="Settings"
          >
            <Settings size={20} color="var(--text-primary)" />
          </button>
        </div>
      )}

      <div style={{ padding: "32px 24px 12px", maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          Insights
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", padding: "4px", borderRadius: "14px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          {[
            { id: "stats", label: "Reports", icon: <TrendingUp size={16} /> },
            { id: "mood", label: "Mood", icon: <Smile size={16} /> },
            { id: "sleep", label: "Sleep", icon: <Moon size={16} /> },
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
                  fontWeight: isSel ? "800" : "600",
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

      <div className="fade-in" key={tab}>
        {tab === "stats" && <AnalyticsPage />}
        {tab === "mood" && <MoodPage />}
        {tab === "sleep" && <SleepPage />}
      </div>
    </div>
  );
}
