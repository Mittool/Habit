"use client";
import { useState } from "react";
import HabitsPage from "./HabitsPage";
import TodoPage from "./TodoPage";
import TimeBoxPage from "./TimeBoxPage";
import PageHeader from "@/components/PageHeader";
import { CheckSquare, Clock, CalendarDays } from "lucide-react";

interface PlannerProps {
  initialTab?: "habits" | "todo" | "timebox";
}

export default function PlannerPage({ initialTab = "habits" }: PlannerProps) {
  const [tab, setTab] = useState<"habits" | "todo" | "timebox">(initialTab);

  return (
    <div>
      <div style={{ padding: "40px 22px 10px", maxWidth: "820px", margin: "0 auto" }}>
        <PageHeader eyebrow="Plan your day" title="Planner" />

        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 9999, backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", width: "fit-content" }}>
          {[
            { id: "habits", label: "Habits", icon: <CheckSquare size={14} /> },
            { id: "todo", label: "Tasks", icon: <Clock size={14} /> },
            { id: "timebox", label: "Calendar", icon: <CalendarDays size={14} /> },
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
        {tab === "habits" && <HabitsPage />}
        {tab === "todo" && <TodoPage onNavigate={(p) => setTab(p === "pomodoro" ? "habits" : p as any)} />}
        {tab === "timebox" && <TimeBoxPage />}
      </div>
    </div>
  );
}
