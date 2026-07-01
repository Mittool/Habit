"use client";
import React from "react";

/**
 * Static "Loading" text placeholder. Deliberately no animation.
 * Kept as a named component so every existing call site keeps working.
 */
export default function LogoAnimation({
  size,
  color = "var(--text-muted)",
}: {
  size?: number;
  color?: string;
  /** kept for API compat with earlier callers — no-op */
  strokeWidth?: number;
  /** kept for API compat with earlier callers — no-op */
  loop?: boolean;
  /** kept for API compat with earlier callers — no-op */
  durationMs?: number;
}) {
  return (
    <div
      style={{
        color,
        fontSize: size ? Math.max(12, Math.round(size / 5)) : 14,
        fontWeight: 500,
      }}
      aria-label="Loading"
      role="status"
    >
      Loading...
    </div>
  );
}

/**
 * Full-viewport loading screen. Plain centered "Loading..." text — no
 * animation, no spinner, no logo effect.
 */
export function LogoLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
      }}
    >
      <div style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500 }}>
        Loading...
      </div>
    </div>
  );
}
