"use client";

/**
 * Trac — Start Screen (v2, showcase)
 *
 * Design goal: in one scroll, a new visitor should understand
 *   1) what Trac is (a habit + focus tracker with an AI coach),
 *   2) how it feels (calm, warm, private, premium), and
 *   3) exactly what to do next (Get started).
 *
 * Structure
 *   ┌ Ambient aurora background (very slow, GPU-only) ┐
 *   │ Hero:  ring-drawing mark + serif value prop     │
 *   │        + Get started CTA + trust chips          │
 *   ├ 4 feature cards, one per real app pillar        │
 *   │   • Habits (with dot-strip mock)                │
 *   │   • AI coach (with chat bubble mock)            │
 *   │   • Focus (with ring + timer mock)              │
 *   │   • Insights (with mini bar chart mock)         │
 *   ├ Closing CTA (so scrollers act without scrolling │
 *   │   back up)                                      │
 *   └ Micro-footer                                    ┘
 *
 * Palette: sampled from logo.png (spec) — dark green mood, warm text.
 * Motion: pure CSS keyframes, all GPU-friendly (opacity, transform,
 * stroke-dashoffset). Every reveal is disabled under
 * prefers-reduced-motion.
 *
 * Fonts: Instrument Serif for display headlines (matches the rest of
 * Trac's editorial voice), Inter for UI + copy. Both via next/font so
 * they load offline in the Median webview.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Instrument_Serif, Inter } from "next/font/google";
import {
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  BellRing,
} from "lucide-react";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-trac-serif",
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-trac-sans",
});

// ── Palette (spec) ───────────────────────────────────────────────
const C = {
  bg: "#0B0F0C",
  bgSoft: "#111713",
  panel: "#141B16",
  panelHi: "#1A231D",
  border: "rgba(242, 240, 233, 0.08)",
  borderHi: "rgba(242, 240, 233, 0.14)",
  accent: "#7FA085",           // slightly brighter than #6F8771 for on-dark contrast
  accentDeep: "#6F8771",
  accentSoft: "rgba(127, 160, 133, 0.14)",
  accentGlow: "rgba(127, 160, 133, 0.28)",
  text: "#F2F0E9",
  textDim: "#B8BEB6",
  textMute: "#8B9389",
} as const;

// Ring dimensions used by the hero mark.
const RING = 132;
const RING_STROKE = 2.5;
const RING_R = (RING - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

const START_SEEN_KEY = "trac-start-seen";

export default function StartScreen() {
  const router = useRouter();
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setReady(true);
  }, []);

  function goStart() {
    try {
      localStorage.setItem(START_SEEN_KEY, "1");
    } catch {}
    router.replace("/auth");
  }

  const anim = (cls: string) => (reduced ? "trac-s" : cls);

  return (
    <div
      className={`${serif.variable} ${sans.variable}`}
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        backgroundColor: C.bg,
        color: C.text,
        fontFamily: "var(--font-trac-sans), system-ui, sans-serif",
        zIndex: 9999,
        opacity: ready ? 1 : 0,
        transition: "opacity 120ms ease",
      }}
    >
      {/* ═══ Ambient aurora — sits behind everything ═══ */}
      <div aria-hidden style={ambientWrap}>
        <div className={anim("trac-aurora-a")} style={auroraA} />
        <div className={anim("trac-aurora-b")} style={auroraB} />
        {/* Subtle grain to break up the flat black */}
        <div style={grain} />
      </div>

      {/* ═══ Content column ═══ */}
      <div className="trac-start-col" style={colWrap}>
        {/* ── Tiny top bar: wordmark + subtle "Skip" ── */}
        <header style={topBar}>
          <div style={topBarBrand}>
            <span style={topBarDot} />
            <span style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Trac</span>
          </div>
          <button
            type="button"
            onClick={goStart}
            className="trac-skip cursor-pointer"
            style={topBarSkip}
            aria-label="Skip intro"
          >
            Skip
          </button>
        </header>

        {/* ═══ HERO ═══ */}
        <section className="trac-start-hero" style={heroWrap}>
          {/* Ring + mark */}
          <div className={anim("trac-hero-mark")} style={heroMarkWrap}>
            <div style={heroMarkGlow} />
            <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden>
              <circle
                cx={RING / 2}
                cy={RING / 2}
                r={RING_R}
                fill="none"
                stroke="rgba(127, 160, 133, 0.14)"
                strokeWidth={RING_STROKE}
              />
              <circle
                className={anim("trac-ring")}
                cx={RING / 2}
                cy={RING / 2}
                r={RING_R}
                fill="none"
                stroke={C.accent}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={RING_C}
                style={{
                  transform: "rotate(-90deg)",
                  transformOrigin: `${RING / 2}px ${RING / 2}px`,
                  filter: `drop-shadow(0 0 8px ${C.accentGlow})`,
                }}
              />
            </svg>
            <div style={heroMarkImg}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-inside.png"
                alt="Trac"
                width={64}
                height={64}
                style={{ objectFit: "contain", display: "block", borderRadius: 12 }}
              />
            </div>
          </div>

          {/* Eyebrow */}
          <div className={anim("trac-fade-1")} style={eyebrow}>
            Habit tracker · AI coach · Focus timer
          </div>

          {/* Headline */}
          <h1 className={anim("trac-fade-2")} style={h1Style}>
            The calm way to <em style={emStyle}>build the habits</em> you actually want.
          </h1>

          {/* Subhead */}
          <p className={anim("trac-fade-3")} style={subStyle}>
            Trac plans your day, coaches you through the hard parts, and quietly
            keeps score — so showing up feels lighter, not louder.
          </p>

          {/* CTA */}
          <div className={anim("trac-fade-4")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 28 }}>
            <button
              type="button"
              onClick={goStart}
              aria-label="Get started with Trac"
              className="trac-cta cursor-pointer"
              style={ctaStyle}
            >
              <span>Get started</span>
              <ArrowRight size={18} className="trac-cta-arrow" style={{ marginLeft: 2 }} />
            </button>
            <div style={ctaMeta}>Free · Takes 30 seconds</div>
          </div>

          {/* Trust chips */}
          <ul className={anim("trac-fade-5")} style={trustList} aria-label="What Trac promises">
            <TrustChip icon={<ShieldCheck size={13} />}>Private by default</TrustChip>
            <TrustChip icon={<BellRing size={13} />}>Smart reminders</TrustChip>
            <TrustChip icon={<Sparkles size={13} />}>AI that helps, not nags</TrustChip>
          </ul>
        </section>

        {/* ═══ FEATURE CARDS ═══ */}
        <section className="trac-start-features" style={featuresWrap} aria-label="What you can do with Trac">
          <div className={anim("trac-fade-6")} style={sectionEyebrow}>Everything in one place</div>
          <h2 className={anim("trac-fade-6")} style={sectionH2}>
            Five surfaces, one <em style={emStyle}>quiet</em> app.
          </h2>

          <div className="trac-start-cardgrid" style={cardGrid}>
            <FeatureCard
              eyebrow="Habits"
              title="Show up on the days that matter."
              body="Build routines with a color, a goal, and gentle timing. Trac learns when you actually do them and quietly moves the reminder to match."
              mock={<HabitMock />}
              anim={anim("trac-fade-7")}
            />
            <FeatureCard
              eyebrow="AI coach"
              title="A coach in your pocket."
              body="Ask Trac what's off, what to do next, or how to fix a habit that keeps breaking. Short answers, warm tone, zero jargon."
              mock={<ChatMock />}
              anim={anim("trac-fade-8")}
            />
            <FeatureCard
              eyebrow="Focus"
              title="One clean timer. No noise."
              body="Pick a length, hit start. Optional calm sounds. When you finish, the session lands in your streak — no forms, no friction."
              mock={<FocusMock />}
              anim={anim("trac-fade-9")}
            />
            <FeatureCard
              eyebrow="Insights"
              title="See yourself clearly."
              body="Weekly consistency, best hours, mood and sleep patterns — served as a single readable page. No dashboards to decipher."
              mock={<ChartMock />}
              anim={anim("trac-fade-10")}
            />
          </div>
        </section>

        {/* ═══ CLOSING CTA ═══ */}
        <section className="trac-start-closing" style={closingWrap}>
          <div className={anim("trac-fade-11")} style={closingCard}>
            <div style={closingGlow} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                Start today
              </div>
              <h3 style={closingH}>
                Small steps, <em style={emStyle}>every day.</em>
              </h3>
              <p style={closingSub}>
                The best day to start was yesterday. The next best day is today.
              </p>
              <button
                type="button"
                onClick={goStart}
                className="trac-cta cursor-pointer"
                style={{ ...ctaStyle, marginTop: 20 }}
                aria-label="Get started with Trac"
              >
                <span>Get started</span>
                <ArrowRight size={18} className="trac-cta-arrow" style={{ marginLeft: 2 }} />
              </button>
            </div>
          </div>

          <footer style={footer}>
            Local by default. Synced only if you choose.
          </footer>
        </section>
      </div>

      {/* ═══ Animations + interaction styles ═══ */}
      <style jsx global>{`
        /* Reduced-motion / settled fallback — always visible. */
        .trac-s,
        .trac-s * {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
          stroke-dashoffset: 0 !important;
        }

        /* Hero mark: pop in + gentle continuous breath. */
        @keyframes tracHeroPop {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tracBreath {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.015); }
        }
        .trac-hero-mark {
          animation: tracHeroPop 700ms cubic-bezier(0.22, 1, 0.36, 1) both,
                     tracBreath 7s ease-in-out 900ms infinite;
        }

        /* The ring drawing itself closed — a nod to the app's completion ring. */
        @keyframes tracRingDraw {
          from { stroke-dashoffset: ${RING_C}; }
          to   { stroke-dashoffset: 0; }
        }
        .trac-ring {
          stroke-dashoffset: ${RING_C};
          animation: tracRingDraw 1100ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
        }

        /* Staggered fade-and-lift for hero + section content. */
        @keyframes tracFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trac-fade-1, .trac-fade-2, .trac-fade-3, .trac-fade-4,
        .trac-fade-5, .trac-fade-6, .trac-fade-7, .trac-fade-8,
        .trac-fade-9, .trac-fade-10, .trac-fade-11 {
          opacity: 0;
          animation: tracFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .trac-fade-1  { animation-delay: 500ms; }
        .trac-fade-2  { animation-delay: 700ms; }
        .trac-fade-3  { animation-delay: 900ms; }
        .trac-fade-4  { animation-delay: 1100ms; }
        .trac-fade-5  { animation-delay: 1300ms; }
        .trac-fade-6  { animation-delay: 1500ms; }
        .trac-fade-7  { animation-delay: 1650ms; }
        .trac-fade-8  { animation-delay: 1800ms; }
        .trac-fade-9  { animation-delay: 1950ms; }
        .trac-fade-10 { animation-delay: 2100ms; }
        .trac-fade-11 { animation-delay: 2300ms; }

        /* Aurora: two big blurred blobs drifting slowly. Pure GPU. */
        @keyframes tracAuroraA {
          0%, 100% { transform: translate3d(-8%, -6%, 0) scale(1); }
          50%      { transform: translate3d(6%, 4%, 0) scale(1.08); }
        }
        @keyframes tracAuroraB {
          0%, 100% { transform: translate3d(10%, 12%, 0) scale(1.05); }
          50%      { transform: translate3d(-4%, -8%, 0) scale(0.98); }
        }
        .trac-aurora-a { animation: tracAuroraA 22s ease-in-out infinite; }
        .trac-aurora-b { animation: tracAuroraB 26s ease-in-out infinite; }

        /* CTA: bright, tactile, arrow nudges on press. */
        .trac-cta {
          transition: transform 0.15s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.2s ease, background 0.2s ease;
        }
        .trac-cta:active {
          transform: scale(0.97);
        }
        .trac-cta:active .trac-cta-arrow {
          transform: translateX(3px);
        }
        .trac-cta-arrow {
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (hover: hover) {
          .trac-cta:hover {
            box-shadow: 0 12px 40px ${C.accentGlow};
          }
          .trac-cta:hover .trac-cta-arrow {
            transform: translateX(2px);
          }
          .trac-skip:hover { color: ${C.text} !important; }
        }

        /* Feature card gentle lift on tap for tactile feel. */
        .trac-card {
          transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1),
                      border-color 0.2s ease;
        }
        .trac-card:active { transform: scale(0.99); }

        /* Grain overlay — a barely-there noise texture for warmth. */
        .trac-grain {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.94 0 0 0 0 0.90 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        /* Habit dot-strip pulse (mock). */
        @keyframes tracDotPulse {
          0%, 100% { opacity: 0.28; }
          50%      { opacity: 1; }
        }

        /* Focus ring subtle sweep (mock). */
        @keyframes tracFocusSweep {
          from { stroke-dashoffset: ${2 * Math.PI * 34}; }
          to   { stroke-dashoffset: ${2 * Math.PI * 34 * 0.25}; }
        }

        /* Respect reduced-motion at the OS level too. */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }

        /* ── Desktop refinements (min-width: 720px) ─────────────
           2-up feature grid, wider column, more generous hero. */
        @media (min-width: 720px) {
          .trac-start-col { max-width: 900px !important; padding: 20px 32px calc(48px + env(safe-area-inset-bottom)) !important; }
          .trac-start-cardgrid { grid-template-columns: 1fr 1fr !important; gap: 18px !important; }
          .trac-start-hero { padding: 56px 0 40px !important; }
          .trac-start-features { padding: 72px 0 32px !important; }
          .trac-start-closing { padding: 48px 0 24px !important; }
          .trac-start-cardmock { height: 110px !important; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────── */

function TrustChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li style={trustChip}>
      <span style={{ color: C.accent, display: "inline-flex" }}>{icon}</span>
      <span>{children}</span>
    </li>
  );
}

function FeatureCard({
  eyebrow,
  title,
  body,
  mock,
  anim,
}: {
  eyebrow: string;
  title: string;
  body: string;
  mock: React.ReactNode;
  anim: string;
}) {
  return (
    <article className={`trac-card ${anim}`} style={cardStyle}>
      <div className="trac-start-cardmock" style={cardMock}>{mock}</div>
      <div style={cardBody}>
        <div style={cardEyebrow}>{eyebrow}</div>
        <h3 style={cardTitle}>{title}</h3>
        <p style={cardText}>{body}</p>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────────────────────
   Mock visuals — small, real-feeling, no external assets
   ───────────────────────────────────────────────────────────── */

function HabitMock() {
  // 7-day dot strip with a few filled + one pulsing "today" dot.
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const filled = [true, true, false, true, true, false, false];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: C.accent }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>Morning run</span>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: C.accent, letterSpacing: "0.06em" }}>4-DAY</span>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {days.map((d, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 8,
                background: filled[i]
                  ? C.accent
                  : "rgba(127, 160, 133, 0.14)",
                border: `1px solid ${filled[i] ? C.accent : C.border}`,
                animation: i === 4 && !filled[i] ? "tracDotPulse 1.8s ease-in-out infinite" : undefined,
              }}
            />
            <span style={{ fontSize: 9.5, color: C.textMute, fontWeight: 600 }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {/* User bubble */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "85%",
            padding: "8px 12px",
            borderRadius: "16px 16px 4px 16px",
            background: C.accent,
            color: "#0B0F0C",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          I keep skipping my run
        </div>
      </div>
      {/* AI reply */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div
          aria-hidden
          style={{
            width: 20,
            height: 20,
            borderRadius: 9999,
            background: "linear-gradient(135deg, #7FA085 0%, #6F8771 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <Sparkles size={11} color="#0B0F0C" />
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: C.textDim }}>
          Try 10 minutes at 7am instead of 30 at 6.
          <br />
          <span style={{ color: C.text }}>Small win first, streak follows.</span>
        </div>
      </div>
    </div>
  );
}

function FocusMock() {
  const R = 34;
  const CIRC = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" stroke={C.border} strokeWidth="4" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={C.accent}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "40px 40px",
              animation: "tracFocusSweep 6s ease-in-out infinite alternate",
            }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, lineHeight: 1 }}>25</span>
          <span style={{ fontSize: 9, color: C.textMute, fontWeight: 600, letterSpacing: "0.08em" }}>MIN</span>
        </div>
      </div>
    </div>
  );
}

function ChartMock() {
  const bars = [42, 58, 34, 71, 50, 82, 66];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1 }}>
            82<span style={{ fontSize: 11, color: C.textMute, marginLeft: 2 }}>%</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMute, marginTop: 3, letterSpacing: "0.06em" }}>WEEK STREAK</div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "3px 8px",
            borderRadius: 9999,
            background: C.accentSoft,
            fontSize: 10,
            fontWeight: 700,
            color: C.accent,
          }}
        >
          <TrendingUp size={10} />
          +14%
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 42 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              borderRadius: 3,
              background: i === bars.length - 1 ? C.accent : "rgba(127, 160, 133, 0.28)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Style tokens (inline, mobile-first; media queries below)
   ───────────────────────────────────────────────────────────── */

const ambientWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  zIndex: 0,
};
const auroraA: React.CSSProperties = {
  position: "absolute",
  top: "-20%",
  left: "-10%",
  width: "70vw",
  height: "70vw",
  maxWidth: 800,
  maxHeight: 800,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${C.accentGlow} 0%, rgba(127,160,133,0) 60%)`,
  filter: "blur(50px)",
  willChange: "transform",
};
const auroraB: React.CSSProperties = {
  position: "absolute",
  bottom: "-15%",
  right: "-20%",
  width: "80vw",
  height: "80vw",
  maxWidth: 900,
  maxHeight: 900,
  borderRadius: "50%",
  background: `radial-gradient(circle, rgba(111, 135, 113, 0.22) 0%, rgba(111,135,113,0) 60%)`,
  filter: "blur(60px)",
  willChange: "transform",
};
const grain: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0.35,
  mixBlendMode: "overlay",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.94 0 0 0 0 0.9 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
};

const colWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  maxWidth: 640,
  margin: "0 auto",
  padding: "16px 20px calc(28px + env(safe-area-inset-bottom))",
  boxSizing: "border-box",
};

const topBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: "calc(4px + env(safe-area-inset-top))",
  paddingBottom: 4,
};
const topBarBrand: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-trac-sans)",
  fontSize: 14,
  color: C.text,
};
const topBarDot: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 9999,
  background: C.accent,
  boxShadow: `0 0 10px ${C.accentGlow}`,
};
const topBarSkip: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.textMute,
  fontFamily: "var(--font-trac-sans)",
  fontSize: 13,
  fontWeight: 500,
  padding: "6px 10px",
  borderRadius: 9999,
  transition: "color 0.15s ease",
};

const heroWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "36px 0 28px",
};

const heroMarkWrap: React.CSSProperties = {
  position: "relative",
  width: RING,
  height: RING,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 26,
  willChange: "transform, opacity",
};
const heroMarkGlow: React.CSSProperties = {
  position: "absolute",
  inset: -30,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 60%)`,
  filter: "blur(24px)",
  pointerEvents: "none",
};
const heroMarkImg: React.CSSProperties = {
  position: "absolute",
  width: 64,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--font-trac-sans)",
  fontSize: 11.5,
  fontWeight: 700,
  color: C.accent,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: 14,
};

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(34px, 8.2vw, 52px)",
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
  color: C.text,
  margin: "0 0 18px",
  maxWidth: 18 + "em",
};

const emStyle: React.CSSProperties = {
  fontStyle: "italic",
  color: C.accent,
};

const subStyle: React.CSSProperties = {
  fontSize: 15.5,
  lineHeight: 1.55,
  color: C.textDim,
  margin: 0,
  maxWidth: 32 + "em",
};

const ctaStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "16px 30px",
  minHeight: 52,
  background: C.accent,
  color: "#0B0F0C",
  border: "none",
  borderRadius: 9999,
  fontFamily: "var(--font-trac-sans)",
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: "0.01em",
  cursor: "pointer",
  boxShadow: `0 8px 30px ${C.accentGlow}`,
  willChange: "transform",
};
const ctaMeta: React.CSSProperties = {
  fontSize: 11.5,
  color: C.textMute,
  letterSpacing: "0.04em",
};

const trustList: React.CSSProperties = {
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  justifyContent: "center",
  padding: 0,
  margin: "28px 0 0",
};
const trustChip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 9999,
  background: "rgba(242, 240, 233, 0.04)",
  border: `1px solid ${C.border}`,
  fontSize: 12,
  fontWeight: 500,
  color: C.textDim,
};

const featuresWrap: React.CSSProperties = {
  padding: "48px 0 24px",
};
const sectionEyebrow: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: C.accent,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: 10,
  textAlign: "center",
};
const sectionH2: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(26px, 6vw, 36px)",
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
  color: C.text,
  margin: "0 0 28px",
  textAlign: "center",
};
const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
};
const cardStyle: React.CSSProperties = {
  position: "relative",
  padding: 18,
  background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
  border: `1px solid ${C.border}`,
  borderRadius: 22,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflow: "hidden",
  willChange: "transform",
};
const cardMock: React.CSSProperties = {
  height: 96,
  padding: 12,
  borderRadius: 14,
  background: "rgba(11, 15, 12, 0.55)",
  border: `1px solid ${C.border}`,
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
};
const cardBody: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const cardEyebrow: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: C.accent,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const cardTitle: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: 22,
  lineHeight: 1.15,
  color: C.text,
  margin: 0,
  letterSpacing: "-0.005em",
};
const cardText: React.CSSProperties = {
  fontSize: 13.5,
  lineHeight: 1.55,
  color: C.textDim,
  margin: "4px 0 0",
};

const closingWrap: React.CSSProperties = {
  padding: "32px 0 20px",
};
const closingCard: React.CSSProperties = {
  position: "relative",
  padding: "28px 22px 30px",
  borderRadius: 24,
  background: `linear-gradient(160deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
  border: `1px solid ${C.borderHi}`,
  textAlign: "center",
  overflow: "hidden",
};
const closingGlow: React.CSSProperties = {
  position: "absolute",
  top: -60,
  left: "50%",
  transform: "translateX(-50%)",
  width: 260,
  height: 260,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 65%)`,
  filter: "blur(30px)",
  pointerEvents: "none",
};
const closingH: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(28px, 7vw, 40px)",
  lineHeight: 1.1,
  color: C.text,
  margin: 0,
  letterSpacing: "-0.01em",
};
const closingSub: React.CSSProperties = {
  fontSize: 14.5,
  lineHeight: 1.55,
  color: C.textDim,
  margin: "10px 0 0",
};

const footer: React.CSSProperties = {
  fontSize: 11.5,
  color: C.textMute,
  textAlign: "center",
  margin: "22px 0 0",
  letterSpacing: "0.02em",
};
