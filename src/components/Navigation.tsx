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
 *
 * Two signals combined for zero-latency hide:
 *   1) VisualViewport shrink > 150px  (the reliable but async signal)
 *   2) Any input / textarea / contenteditable is currently focused
 *      (fires the instant a user taps to type, before the OS animates
 *      the keyboard up — so the nav pill vanishes BEFORE the keyboard
 *      arrives, and the input row is never covered)
 *
 * Also detects the keyboard height so callers (like AI Chat) can push
 * their sticky footer up by that amount.
 */
function useKeyboard(): { open: boolean } {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;

    let raf = 0;
    const check = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = document.activeElement as HTMLElement | null;
        const focused = !!(el && (
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable
        ));
        const viewportShrunk = vv ? window.innerHeight - vv.height > 150 : false;
        setOpen(focused || viewportShrunk);
      });
    };

    if (vv) {
      vv.addEventListener("resize", check);
      vv.addEventListener("scroll", check);
    }
    document.addEventListener("focusin", check, true);
    document.addEventListener("focusout", check, true);
    check();

    return () => {
      cancelAnimationFrame(raf);
      if (vv) {
        vv.removeEventListener("resize", check);
        vv.removeEventListener("scroll", check);
      }
      document.removeEventListener("focusin", check, true);
      document.removeEventListener("focusout", check, true);
    };
  }, []);
  return { open };
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
  { id: "ai-chat", label: "AI", icon: <Sparkles size={20} /> },
  { id: "focus", label: "Focus", icon: <Target size={20} /> },
  { id: "insights", label: "Insights", icon: <TrendingUp size={20} /> },
];

export default function Navigation({ current, onChange }: NavProps) {
  const { open: keyboardOpen } = useKeyboard();
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
          Hidden the instant an input is focused (before the keyboard even
          finishes opening) so it can never cover the field the user just
          tapped. Show animation is smooth (220ms), hide is INSTANT so the
          pill never briefly appears on top of the keyboard row. */}
      <nav
        style={{
          position: "fixed",
          bottom: "calc(14px + env(safe-area-inset-bottom))",
          left: "50%",
          transform: `translateX(-50%) translateY(${keyboardOpen ? "160%" : "0"})`,
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
          visibility: keyboardOpen ? "hidden" : "visible",
          // Instant hide, animated show — prevents any flash of the pill
          // over the keyboard row.
          transition: keyboardOpen
            ? "transform 0s, opacity 0s, visibility 0s"
            : "transform 0.24s var(--spring), opacity 0.2s ease, visibility 0s 0s",
        }}
        className="mobile-nav"
        aria-hidden={keyboardOpen}
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeParent === item.id;
          return (
            <button
              key={item.id}
              className="cursor-pointer nav-pill"
              onClick={() => onChange(item.id)}
              data-active={isActive || undefined}
              aria-label={item.label}
            >
              {/* Background pill — animates via opacity + scale only (GPU) */}
              <span
                aria-hidden
                className="nav-pill-bg"
                style={{ opacity: isActive ? 1 : 0, transform: isActive ? "scale(1)" : "scale(0.85)" }}
              />
              <span className="nav-pill-icon">{item.icon}</span>
              <span
                className="nav-pill-label"
                style={{
                  maxWidth: isActive ? 60 : 0,
                  opacity: isActive ? 1 : 0,
                  marginLeft: isActive ? 6 : 0,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
