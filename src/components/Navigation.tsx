"use client";
import {
  Home,
  CalendarDays,
  Target,
  TrendingUp,
} from "lucide-react";

export type NavPage =
  | "home"
  | "planner"
  | "ai-chat"
  | "focus"
  | "insights"
  | "settings"
  // Legacy aliases for deep linking
  | "ai-hub"
  | "habits"
  | "todo"
  | "pomodoro"
  | "timebox"
  | "analytics"
  | "mood"
  | "sleep"
  | "music";

interface NavProps {
  current: NavPage;
  onChange: (page: NavPage) => void;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home size={20} /> },
  { id: "planner", label: "Planner", icon: <CalendarDays size={20} /> },
  { id: "ai-chat", label: "AI Chat", icon: <img src="/logo-inside.png" alt="AI Chat" style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }} /> },
  { id: "focus", label: "Focus", icon: <Target size={20} /> },
  { id: "insights", label: "Insights", icon: <TrendingUp size={20} /> },
];

export default function Navigation({ current, onChange }: NavProps) {
  const activeParent = (() => {
    if (["habits", "todo", "timebox"].includes(current)) return "planner";
    if (["pomodoro", "music"].includes(current)) return "focus";
    if (["analytics", "mood", "sleep"].includes(current)) return "insights";
    if (current === "ai-hub") return "ai-chat";
    return current;
  })();

  return (
    <>
      {/* Desktop sidebar rail */}
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
            marginBottom: "24px",
            flexShrink: 0,
            boxShadow: "0 2px 8px var(--shadow)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src="/logo.png"
            alt="Trac"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeParent === item.id;
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
                <div style={{ opacity: isActive ? 1 : 0.7, transition: "opacity 0.2s" }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: "10px", marginTop: "4px", fontWeight: isActive ? "800" : "600", color: isActive ? "var(--accent)" : "var(--text-secondary)" }}>
                  {item.label}
                </span>
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "15%",
                      bottom: "15%",
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

      {/* Mobile fixed bottom nav (In-line 5 items flat inside nav bar) */}
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
          padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
          zIndex: 50,
          boxShadow: "0 -4px 20px var(--shadow)",
          backdropFilter: "blur(12px)",
        }}
        className="mobile-nav"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeParent === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item cursor-pointer${isActive ? " active" : ""}`}
              onClick={() => onChange(item.id)}
              style={{ flex: 1, padding: "8px 2px", position: "static" }}
            >
              <div style={{ color: isActive ? "var(--accent)" : "var(--text-muted)", opacity: isActive ? 1 : 0.75, transition: "opacity 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.icon}
              </div>
              <span style={{ fontSize: "10.5px", marginTop: "2px", fontWeight: isActive ? "800" : "600", color: isActive ? "var(--accent)" : "var(--text-secondary)" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
