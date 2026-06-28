"use client";
import { useAppStore } from "@/lib/store";
import {
  Home,
  CheckSquare,
  Clock,
  BarChart2,
  Settings,
  Timer,
  Calendar,
  Music,
  Smile,
  Bot,
  Moon,
} from "lucide-react";

export type NavPage =
  | "home"
  | "ai-hub"
  | "habits"
  | "todo"
  | "pomodoro"
  | "timebox"
  | "analytics"
  | "mood"
  | "sleep"
  | "music"
  | "settings";

interface NavProps {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home size={20} /> },
  { id: "ai-hub", label: "Trac AI", icon: <img src="/logo.png" alt="Trac AI" style={{ width: "20px", height: "20px", objectFit: "cover", borderRadius: "50%", boxShadow: "0 0 8px rgba(13,148,136,0.3)" }} className="animate-pulse" /> },
  { id: "habits", label: "Habits", icon: <CheckSquare size={20} /> },
  { id: "todo", label: "Tasks", icon: <Clock size={20} /> },
  { id: "pomodoro", label: "Focus", icon: <Timer size={20} /> },
  { id: "timebox", label: "TimeBox", icon: <Calendar size={20} /> },
  { id: "analytics", label: "Stats", icon: <BarChart2 size={20} /> },
  { id: "mood", label: "Mood", icon: <Smile size={20} /> },
  { id: "sleep", label: "Sleep", icon: <Moon size={20} /> },
  { id: "music", label: "Music", icon: <Music size={20} /> },
  { id: "settings", label: "Settings", icon: <Settings size={20} /> },
];

// Items shown in the mobile bottom nav (5 max for usability)
const MOBILE_NAV_IDS: NavPage[] = ["home", "ai-hub", "habits", "todo", "music"];

export default function Navigation({ current, onChange }: NavProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          width: "76px",
          backgroundColor: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 10px",
          gap: "8px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
          boxShadow: "4px 0 24px var(--shadow)",
        }}
        className="hidden-mobile"
      >
        {/* Logo */}
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            overflow: "hidden",
            marginBottom: "20px",
            flexShrink: 0,
            boxShadow: "0 4px 12px var(--shadow-hover)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src="/logo.png"
            alt="Trac"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = current === item.id;
            return (
              <button
                key={item.id}
                className={`nav-item cursor-pointer${isActive ? " active" : ""}`}
                onClick={() => onChange(item.id)}
                style={{
                  position: "relative",
                  width: "100%",
                  padding: "12px 0",
                }}
                title={item.label}
              >
                {item.icon}
                <span style={{ fontSize: "9px", marginTop: "2px", opacity: isActive ? 1 : 0.8 }}>
                  {item.label}
                </span>
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "20%",
                      bottom: "20%",
                      width: "3px",
                      backgroundColor: "var(--accent)",
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "var(--bg-card)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "10px 8px",
          zIndex: 50,
          boxShadow: "0 -4px 20px var(--shadow)",
          backdropFilter: "blur(12px)",
        }}
        className="mobile-nav"
      >
        {NAV_ITEMS.filter((item) => MOBILE_NAV_IDS.includes(item.id)).map((item) => {
          const isActive = current === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item cursor-pointer${isActive ? " active" : ""}`}
              onClick={() => onChange(item.id)}
              style={{ flex: 1, padding: "8px 4px" }}
            >
              {item.icon}
              <span style={{ fontSize: "10px", marginTop: "2px" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
