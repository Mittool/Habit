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
} from "lucide-react";

export type NavPage =
  | "home"
  | "habits"
  | "todo"
  | "pomodoro"
  | "timebox"
  | "analytics"
  | "mood"
  | "music"
  | "settings";

interface NavProps {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home size={18} /> },
  { id: "habits", label: "Habits", icon: <CheckSquare size={18} /> },
  { id: "todo", label: "Tasks", icon: <Clock size={18} /> },
  { id: "pomodoro", label: "Focus", icon: <Timer size={18} /> },
  { id: "timebox", label: "TimeBox", icon: <Calendar size={18} /> },
  { id: "analytics", label: "Stats", icon: <BarChart2 size={18} /> },
  { id: "mood", label: "Mood", icon: <Smile size={18} /> },
  { id: "music", label: "Music", icon: <Music size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} /> },
];

// Items shown in the mobile bottom nav (5 max for usability)
const MOBILE_NAV_IDS: NavPage[] = ["home", "habits", "todo", "mood", "music"];

export default function Navigation({ current, onChange }: NavProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{
          width: "72px",
          backgroundColor: "var(--bg-card)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 8px",
          gap: "4px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 50,
        }}
        className="hidden-mobile"
      >
        {/* Logo */}
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "10px",
            overflow: "hidden",
            marginBottom: "16px",
            flexShrink: 0,
          }}
        >
          <img
            src="/icons/icon-192x192.png"
            alt="Trac"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item${current === item.id ? " active" : ""}`}
            onClick={() => onChange(item.id)}
            style={{ position: "relative", width: "100%", justifyContent: "center" }}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
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
          padding: "8px 4px",
          zIndex: 50,
        }}
        className="mobile-nav"
      >
        {NAV_ITEMS.filter((item) => MOBILE_NAV_IDS.includes(item.id)).map((item) => (
          <button
            key={item.id}
            className={`nav-item${current === item.id ? " active" : ""}`}
            onClick={() => onChange(item.id)}
            style={{ flex: 1 }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
