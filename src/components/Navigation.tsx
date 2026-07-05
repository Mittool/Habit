"use client";
import React, { useEffect, useState } from "react";
import {
  Home,
  CalendarDays,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react";

/**
 * Detects when the on-screen keyboard is open on mobile.
 * We hide the floating nav in that case so the pill doesn't
 * ride up on top of whatever the user is typing.
 * Uses the VisualViewport API (iOS Safari 13+, Android Chrome 61+).
 */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Keyboard is up when the visual viewport is meaningfully shorter
        // than the layout viewport (allow 150px slack for OS bars).
        setOpen(window.innerHeight - vv.height > 150);
      });
    };
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    check();
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
    };
  }, []);
  return open;
}

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
  { id: "ai-chat", label: "AI Chat", icon: <Sparkles size={20} /> },
  { id: "focus", label: "Focus", icon: <Target size={20} /> },
  { id: "insights", label: "Insights", icon: <TrendingUp size={20} /> },
];

export default function Navigation({ current, onChange }: NavProps) {
  const keyboardOpen = useKeyboardOpen();
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

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeParent === item.id;
            return (
              <button
                key={item.id}
                className="cursor-pointer"
                onClick={() => onChange(item.id)}
                style={{
                  position: "relative",
                  width: "100%",
                  padding: "14px 0 10px",
                  borderRadius: "16px",
                  border: "none",
                  background: isActive ? "var(--accent-soft)" : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.28s var(--spring)",
                  fontFamily: "inherit",
                }}
                title={item.label}
              >
                <div style={{ color: isActive ? "var(--accent)" : "var(--text-muted)", opacity: isActive ? 1 : 0.85, transition: "color 0.2s" }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 600, color: isActive ? "var(--accent)" : "var(--text-muted)", letterSpacing: "0.01em" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Mobile floating pill nav — hovers above content, feels app-native.
          Hidden while the OS keyboard is open so the pill doesn't ride up
          on top of whatever the user is typing. */}
      <nav
        style={{
          position: "fixed",
          bottom: "calc(14px + env(safe-area-inset-bottom))",
          left: "50%",
          transform: `translateX(-50%) translateY(${keyboardOpen ? "140%" : "0"})`,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-strong)",
          borderRadius: "9999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "6px 8px",
          gap: "2px",
          zIndex: 50,
          boxShadow: "var(--shadow-lg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          maxWidth: "calc(100vw - 24px)",
          opacity: keyboardOpen ? 0 : 1,
          pointerEvents: keyboardOpen ? "none" : "auto",
          transition: "transform 0.22s ease, opacity 0.22s ease",
        }}
        className="mobile-nav"
        aria-hidden={keyboardOpen}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeParent === item.id;
          return (
            <button
              key={item.id}
              className="cursor-pointer"
              onClick={() => onChange(item.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                padding: isActive ? "10px 16px" : "10px 12px",
                borderRadius: "9999px",
                border: "none",
                background: isActive ? "var(--accent-soft)" : "transparent",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                fontFamily: "inherit",
                fontSize: 10,
                fontWeight: isActive ? 700 : 600,
                letterSpacing: "0.01em",
                transition: "all 0.28s var(--spring)",
                minWidth: 0,
              }}
              aria-label={item.label}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</div>
              {isActive && <span style={{ marginTop: 2 }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </>
  );
}
