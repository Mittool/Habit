"use client";
import { useState } from "react";
import AnalyticsPage from "./AnalyticsPage";
import MoodPage from "./MoodPage";
import SleepPage from "./SleepPage";
import PageHeader from "@/components/PageHeader";
import { TrendingUp, Smile, Moon, Settings } from "lucide-react";

interface InsightsProps {
  initialTab?: "stats" | "mood" | "sleep";
  onNavigate?: (page: string) => void;
}

export default function InsightsPage({ initialTab = "stats", onNavigate }: InsightsProps) {
  const [tab, setTab] = useState<"stats" | "mood" | "sleep">(initialTab);

  return (
    <div>
      <div style={{ padding: "40px 22px 10px", maxWidth: "820px", margin: "0 auto" }}>
        <PageHeader
          eyebrow="Your patterns"
          title="Insights"
          right={onNavigate ? (
            <button
              onClick={() => onNavigate("settings")}
              className="btn-ghost cursor-pointer"
              title="Settings"
              aria-label="Settings"
              style={{ width: 40, height: 40, borderRadius: 9999, border: "1px solid var(--border-strong)" }}
            >
              <Settings size={18} />
            </button>
          ) : undefined}
        />

        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 9999, backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", width: "fit-content" }}>
          {[
            { id: "stats", label: "Reports", icon: <TrendingUp size={14} /> },
            { id: "mood", label: "Mood", icon: <Smile size={14} /> },
            { id: "sleep", label: "Sleep", icon: <Moon size={14} /> },
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

      <div className="fade-in" key={tab}>
        {tab === "stats" && <AnalyticsPage />}
        {tab === "mood" && <MoodPage />}
        {tab === "sleep" && <SleepPage />}
      </div>
    </div>
  );
}
