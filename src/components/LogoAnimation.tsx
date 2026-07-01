"use client";
import React from "react";

/**
 * Trac logo animation — line-drawing effect.
 *
 * The logo is a stylised "T" made of two rounded strokes:
 *   1. A long "P-like" path: enter top-left → across the top bar →
 *      curve around the rounded right end → back left along the
 *      pill's underside → descend as the vertical stem.
 *   2. A short inner horizontal stroke that forms the T's left arm.
 *
 * Both paths animate via SVG stroke-dashoffset so they appear to be
 * traced out by an invisible pen. Keyframes live in globals.css so this
 * works in the Next.js App Router without any styling library.
 *
 * Used in place of every "Loading..." / "Redirecting..." spinner.
 */
export default function LogoAnimation({
  size = 96,
  color = "var(--accent)",
  strokeWidth = 6.5,
  loop = true,
  durationMs = 1400,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
  loop?: boolean;
  durationMs?: number;
}) {
  const iterationCount = loop ? "infinite" : "1";
  const durationSec = `${(durationMs / 1000).toFixed(2)}s`;
  const commonAnimStyle: React.CSSProperties = {
    strokeDasharray: 100,
    strokeDashoffset: 100,
    animationDuration: durationSec,
    animationIterationCount: iterationCount as any,
    animationTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
    animationFillMode: "both",
  };

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
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ overflow: "visible" }}
      >
        {/*
          Main stroke — one continuous path traced in a single motion:
            start at top-left of the pill → across the top → arc around
            the rounded right end → back along the underside to the
            centre → drop straight down as the vertical stem.
        */}
        <path
          pathLength={100}
          style={{ ...commonAnimStyle, animationName: "tracLogoDrawMain" }}
          d="M 22 32 L 74 32 Q 84 32 84 42 Q 84 52 74 52 L 50 52 L 50 84"
        />
        {/*
          Inner T crossbar — sits inside the pill; its right end just
          meets the stem so together they read as a T.
        */}
        <path
          pathLength={100}
          style={{ ...commonAnimStyle, animationName: "tracLogoDrawArm" }}
          d="M 28 42 L 50 42"
        />
      </svg>
    </div>
  );
}

/**
 * Full-viewport version — replaces every "Loading..." / "Redirecting..."
 * splash across the app. Uses the app-shell background so route
 * transitions do not flash a different colour.
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
      <LogoAnimation size={96} />
    </div>
  );
}
