"use client";

/**
 * Trac — Start Screen
 *
 * A one-time splash shown on first launch before the auth screen. Uses the
 * palette sampled directly from logo.png (spec):
 *   bg           #0B0F0C
 *   accent       #6F8771
 *   accent track rgba(111, 135, 113, 0.16)
 *   text primary #F2F0E9
 *   text muted   #8B9389
 *
 * Motion choreography (matches the RN spec):
 *   1. Ring around the mark draws itself closed (like a completed habit) — 900ms
 *   2. Mark fades in + scales from 0.85 → 1 at 550ms
 *   3. Wordmark slides up + fades in at 950ms
 *   4. Tagline slides up + fades in at 1250ms
 *   5. CTA + footer slide up + fade in at 1550ms
 *
 * If prefers-reduced-motion is set, everything is shown in its settled state
 * with zero animation.
 *
 * Fonts loaded via next/font/google (Space Grotesk 700 for wordmark, Inter
 * 400/500 for body + CTA). Scoped to this route only — doesn't leak into
 * the rest of the app which uses Instrument Serif + Plus Jakarta Sans.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Space_Grotesk, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-inter",
});

// ── Design tokens ───────────────────────────────────────────────
const COLORS = {
  bg: "#0B0F0C",
  accent: "#6F8771",
  accentTrack: "rgba(111, 135, 113, 0.16)",
  textPrimary: "#F2F0E9",
  textMuted: "#8B9389",
} as const;

const RING_SIZE = 128;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** localStorage key so we only show the start screen once per device. */
const START_SEEN_KEY = "trac-start-seen";

export default function StartScreen() {
  const router = useRouter();
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Respect the user's motion preference.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setReady(true);
  }, []);

  function handleGetStarted() {
    try {
      localStorage.setItem(START_SEEN_KEY, "1");
    } catch {
      // Storage disabled — that's OK, worst case we show start again next launch.
    }
    router.replace("/auth");
  }

  return (
    <div
      className={`${spaceGrotesk.variable} ${inter.variable}`}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: COLORS.bg,
        color: COLORS.textPrimary,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        zIndex: 9999,
        // Fallback until reduced-motion check resolves — start hidden so we
        // don't briefly flash the animation before deciding.
        opacity: ready ? 1 : 0,
        transition: "opacity 120ms ease",
      }}
    >
      {/* Center block — ring + mark + wordmark + tagline */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          textAlign: "center",
        }}
      >
        {/* Ring + logo */}
        <div
          style={{
            width: RING_SIZE,
            height: RING_SIZE,
            position: "relative",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            aria-hidden
          >
            {/* Track (always visible, faint) */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={COLORS.accentTrack}
              strokeWidth={RING_STROKE}
            />
            {/* Animated ring — starts fully offset, ends at 0 */}
            <circle
              className={reduced ? "trac-ring-static" : "trac-ring-anim"}
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              // Rotate -90deg so the arc grows from 12 o'clock (like the app's
              // completion ring), origin at the circle's center.
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: `${RING_SIZE / 2}px ${RING_SIZE / 2}px`,
              }}
            />
          </svg>
          {/* Logo mark (absolutely centered inside the ring) */}
          <div
            className={reduced ? "trac-mark-static" : "trac-mark-anim"}
            style={{
              position: "absolute",
              width: 60,
              height: 60,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-inside.png"
              alt="Trac"
              width={60}
              height={60}
              style={{ objectFit: "contain", display: "block" }}
            />
          </div>
        </div>

        {/* Wordmark */}
        <h1
          className={reduced ? "trac-fade-static" : "trac-word-anim"}
          style={{
            fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: "-0.5px",
            color: COLORS.textPrimary,
            margin: "0 0 10px",
            lineHeight: 1,
          }}
        >
          Trac
        </h1>

        {/* Tagline */}
        <p
          className={reduced ? "trac-fade-static" : "trac-tagline-anim"}
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 400,
            fontSize: 14,
            letterSpacing: "0.2px",
            color: COLORS.textMuted,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Local-first. AI-guided. Yours alone.
        </p>
      </div>

      {/* Bottom block — CTA + footer */}
      <div
        className={reduced ? "trac-fade-static" : "trac-cta-anim"}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 32px calc(24px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={handleGetStarted}
          aria-label="Get started"
          className="trac-cta-button cursor-pointer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "14px 28px",
            background: "transparent",
            border: "none",
            color: COLORS.textPrimary,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 500,
            fontSize: 16,
            letterSpacing: "0.2px",
            transition: "opacity 150ms ease",
          }}
        >
          <span>Get started</span>
          <span
            className="trac-cta-arrow"
            aria-hidden
            style={{
              color: COLORS.accent,
              display: "inline-block",
              transition: "transform 150ms ease",
              lineHeight: 1,
              fontSize: 16,
            }}
          >
            →
          </span>
        </button>

        <p
          style={{
            fontFamily: "var(--font-inter), system-ui, sans-serif",
            fontWeight: 400,
            fontSize: 11,
            color: COLORS.textMuted,
            marginTop: 14,
            marginBottom: 0,
            textAlign: "center",
          }}
        >
          Local by default. Synced only if you choose.
        </p>
      </div>

      <style jsx>{`
        /* ── Ring: draw closed like a completed habit ──────────
           strokeDashoffset animates from CIRCUMFERENCE → 0. */
        @keyframes tracRingDraw {
          from { stroke-dashoffset: ${RING_CIRCUMFERENCE}; }
          to   { stroke-dashoffset: 0; }
        }
        .trac-ring-anim {
          stroke-dashoffset: ${RING_CIRCUMFERENCE};
          animation: tracRingDraw 900ms cubic-bezier(0.33, 1, 0.68, 1) forwards;
        }
        .trac-ring-static {
          stroke-dashoffset: 0;
        }

        /* ── Mark: fade + scale up ──────────────────────────── */
        @keyframes tracMarkIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
        .trac-mark-anim {
          opacity: 0;
          animation: tracMarkIn 500ms cubic-bezier(0.33, 1, 0.68, 1) 550ms forwards;
        }
        .trac-mark-static {
          opacity: 1;
        }

        /* ── Wordmark: slide up + fade ──────────────────────── */
        @keyframes tracSlideFadeUp10 {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trac-word-anim {
          opacity: 0;
          animation: tracSlideFadeUp10 450ms cubic-bezier(0.33, 1, 0.68, 1) 950ms forwards;
        }

        /* ── Tagline + CTA: gentler slide (8px) ─────────────── */
        @keyframes tracSlideFadeUp8 {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trac-tagline-anim {
          opacity: 0;
          animation: tracSlideFadeUp8 450ms cubic-bezier(0.33, 1, 0.68, 1) 1250ms forwards;
        }
        .trac-cta-anim {
          opacity: 0;
          animation: tracSlideFadeUp8 450ms cubic-bezier(0.33, 1, 0.68, 1) 1550ms forwards;
        }

        /* Reduced-motion fallback: no transforms, no animations. */
        .trac-fade-static {
          opacity: 1;
        }

        /* CTA press feedback — arrow nudges right, whole button dims. */
        .trac-cta-button:active {
          opacity: 0.75;
        }
        .trac-cta-button:active .trac-cta-arrow {
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
}
