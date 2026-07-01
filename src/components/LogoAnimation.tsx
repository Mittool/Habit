"use client";
import React from "react";

/**
 * Clean dual-ring loading spinner. Two concentric SVG circles rotate
 * in opposite directions with staggered arc lengths for visual interest.
 * Colors use the current theme's accent variable.
 */
export default function LogoAnimation({
  size = 64,
  color = "var(--accent)",
  strokeWidth = 3,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** kept for API compat with earlier callers — no-op */
  loop?: boolean;
  /** kept for API compat with earlier callers — no-op */
  durationMs?: number;
}) {
  const half = size / 2;
  const outerR = half - strokeWidth;
  const innerR = outerR - strokeWidth * 2.2;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
      }}
      aria-label="Loading"
      role="status"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
        <circle
          cx={half}
          cy={half}
          r={outerR}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={half}
          cy={half}
          r={outerR}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${outerCirc * 0.28} ${outerCirc}`}
          style={{
            transformOrigin: "center",
            animation: "tracSpinnerOuter 1.1s linear infinite",
          }}
        />
        <circle
          cx={half}
          cy={half}
          r={innerR}
          fill="none"
          stroke={color}
          strokeOpacity={0.5}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${innerCirc * 0.55} ${innerCirc}`}
          style={{
            transformOrigin: "center",
            animation: "tracSpinnerInner 1.4s cubic-bezier(0.6, 0, 0.4, 1) infinite reverse",
          }}
        />
      </svg>
    </div>
  );
}

/**
 * Full-viewport spinner used for hydration / auth-restore / redirect states.
 * Uses the app-shell background so route transitions do not colour-flash.
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
      <LogoAnimation size={64} />
    </div>
  );
}
