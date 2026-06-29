"use client";
import {
  Home,
  CalendarDays,
  Sparkles,
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
  // Legacy aliases for internal deep linking
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

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode; isFab?: boolean }[] = [
  { id: "home", label: "Home", icon: <Home size={20} /> },
  { id: "planner", label: "Planner", icon: <CalendarDays size={20} /> },
  { id: "ai-chat", label: "AI Chat", icon: <img src="/logo.png" alt="AI Chat" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} />, isFab: true },
  { id: "focus", label: "Focus", icon: <Target size={20} /> },
  { id: "insights", label: "Insights", icon: <TrendingUp size={20} /> },
];

export default function Navigation({ current, onChange }: NavProps) {
  // Map internal deep links to active parent tab
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
          gap: "12px",
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
            boxShadow: "0 4px 12px var(--shadow)",
            border: "1px solid var(--border)",
          }}
        >
          <img
            src="/logo.png"
            alt="Trac"
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeParent === item.id;

            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  onClick={() => onChange("ai-chat")}
                  className="cursor-pointer"
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "6px auto",
                    border: "none",
                    boxShadow: "0 8px 20px rgba(13,148,136,0.35)",
                    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  title="Primary AI Assistant"
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Sparkles size={24} color="#FFFFFF" />
                </button>
              );
            }

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

      {/* Mobile fixed bottom nav (Exactly 5 items with Elevated FAB Center) */}
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

          if (item.isFab) {
            return (
              <div key={item.id} style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
                <button
                  onClick={() => onChange("ai-chat")}
                  className="cursor-pointer"
                  style={{
                    position: "absolute",
                    bottom: "-10px",
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "var(--accent)",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "4px solid var(--bg-card)",
                    boxShadow: "0 8px 24px rgba(13,148,136,0.45)",
                    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  title="AI Chat Assistant"
                >
                  <Sparkles size={26} color="#FFFFFF" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              className={`nav-item cursor-pointer${isActive ? " active" : ""}`}
              onClick={() => onChange(item.id)}
              style={{ flex: 1, padding: "8px 2px" }}
            >
              <div style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}>
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
