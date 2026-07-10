"use client";

/**
 * Trac — Premium Start Screen
 * ────────────────────────────────────────────────────────────────
 * Apple/Linear-inspired dark landing. Bento-grid feature showcase.
 * Real product mockups rendered as inline SVG (no external images
 * so the Median webview and sandboxed previews render identically).
 *
 * Layout (top → bottom):
 *   1) Top bar        — brand + skip
 *   2) Hero           — copy + layered phone/desktop mockups
 *   3) Bento grid     — 11 features, varied cell sizes
 *   4) Closing CTA    — repeated primary action
 *   5) Footer
 *
 * Motion: pure CSS keyframes. Every reveal disabled under
 * prefers-reduced-motion (both via .trac-s class and OS media query).
 *
 * Fonts: Instrument Serif (display) + Inter (UI), via next/font/google.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Instrument_Serif, Inter } from "next/font/google";
import {
  Sparkles,
  CheckCircle2,
  Timer,
  Moon,
  BellRing,
  Lock,
  Cloud,
  ArrowRight,
  ArrowUp,
  Home,
  CalendarDays,
  Target,
  TrendingUp,
  Flame,
  Play,
} from "lucide-react";

// display: "swap" + adjustFontFallback let the page render with system
// fonts instantly, then swap to the loaded webfonts without a FOUT gap.
// preload: true is default but explicit here for clarity.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-trac-serif",
  preload: true,
  fallback: ["Georgia", "serif"],
});
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-trac-sans",
  preload: true,
  fallback: ["system-ui", "-apple-system", "sans-serif"],
});

// ── Palette ──────────────────────────────────────────────────────
const C = {
  bg: "#07090A",
  bgSoft: "#0C1012",
  panel: "rgba(255, 255, 255, 0.03)",
  panelHi: "rgba(255, 255, 255, 0.05)",
  border: "rgba(255, 255, 255, 0.08)",
  borderHi: "rgba(255, 255, 255, 0.14)",
  accent: "#7FA085",
  accentBright: "#8FB396",
  accentDeep: "#5F7A65",
  accentSoft: "rgba(127, 160, 133, 0.14)",
  accentGlow: "rgba(127, 160, 133, 0.32)",
  text: "#F5F3EC",
  textDim: "#B4BAB2",
  textMute: "#7E857D",
} as const;

const START_SEEN_KEY = "trac-start-seen";

export default function StartScreen() {
  const router = useRouter();
  const [reduced, setReduced] = useState(false);

  // Only check the motion pref — don't gate visibility behind a state
  // flag. The page should render on the first paint, not fade in after
  // React has mounted (which used to add ~200ms of black screen).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setReduced(true);
  }, []);

  function goStart() {
    try {
      localStorage.setItem(START_SEEN_KEY, "1");
    } catch {}
    router.replace("/auth");
  }

  const cls = (c: string) => (reduced ? "trac-s" : c);

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
      }}
    >
      {/* ═══ Ambient background ═══ */}
      <div aria-hidden style={ambientWrap}>
        <div className={cls("trac-aur-a")} style={auroraA} />
        <div className={cls("trac-aur-b")} style={auroraB} />
        <div style={grid} />
        <div style={grain} />
      </div>

      {/* ═══ Top bar ═══ */}
      <header style={topBar}>
        <div style={brandWrap}>
          <div style={brandMark}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-inside.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
          </div>
          <span style={brandName}>Trac</span>
        </div>
        {/* Skip button removed — the primary CTA below is the only way forward. */}
      </header>

      {/* ═══ HERO ═══ */}
      <section className="trac-hero" style={heroWrap}>
        <div className="trac-hero-inner" style={heroInner}>
          {/* Copy column */}
          <div className="trac-hero-copy" style={heroCopy}>
            <div className={cls("trac-fade-1")} style={heroEyebrow}>
              <span style={eyebrowDot} />
              Introducing Trac 1.0
            </div>
            <h1 className={cls("trac-fade-2")} style={heroH1}>
              Every habit,
              <br />
              every task,
              <br />
              <em style={emStyle}>one calm app.</em>
            </h1>
            <p className={cls("trac-fade-3")} style={heroSub}>
              An AI-powered habit and productivity platform that plans your day,
              coaches you through the hard parts, and quietly keeps score — so
              showing up feels lighter, not louder.
            </p>
            <div className={cls("trac-fade-4") + " trac-hero-cta-row"} style={heroCtaRow}>
              <button
                type="button"
                onClick={goStart}
                aria-label="Get started with Trac"
                className="trac-cta cursor-pointer"
                style={ctaPrimary}
              >
                <span>Get started</span>
                <ArrowRight size={17} className="trac-cta-arrow" />
              </button>
              <div style={ctaMeta}>
                <span>Free</span>
                <span style={metaDot} />
                <span>Private by default</span>
                <span style={metaDot} />
                <span>30 seconds</span>
              </div>
            </div>
          </div>

          {/* Mockups column — side-by-side, NO overlap.
              Desktop takes ~72% of the stage, phone ~24%, with a clean
              4% gap between them. On mobile the desktop is hidden and
              the phone becomes the single centered hero mockup. */}
          <div className={cls("trac-mock-in")} style={heroMockCol}>
            <div className="trac-mock-stage" style={mockStage} aria-hidden>
              <div className="trac-mock-desktop-wrap" style={mockDesktopWrap}>
                <DesktopMock />
              </div>
              <div className="trac-mock-phone-wrap" style={mockPhoneWrap}>
                <PhoneMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BENTO GRID ═══ */}
      <section className="trac-bento-wrap" style={bentoOuter}>
        <div className={cls("trac-fade-5")} style={bentoHeader}>
          <div style={sectionEyebrow}>Everything included</div>
          <h2 style={sectionH2}>
            Built for how you <em style={emStyle}>actually</em> work.
          </h2>
          <p style={sectionSub}>
            Eleven surfaces, one thoughtful app. No cross-sells. No dark
            patterns. Just the tools you'll actually open every day.
          </p>
        </div>

        <div className={cls("trac-bento-fade") + " trac-bento-grid"} style={bentoGrid}>
          {/* Row 1 — hero cells */}
          <BentoCell
            style={{ gridColumn: "span 8" }}
            className="bento-lg trac-bento-1"
            eyebrow="AI Habit Coach"
            title="A coach in your pocket."
            body="Ask Trac what's off, what to do next, or how to fix a habit that keeps breaking. Short answers, warm tone, zero jargon."
            visual={<CoachVisual />}
            featured
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-2"
            eyebrow="Habit tracking"
            title="Show up, quietly."
            body="Streaks, colors, and gentle timing that learns when you actually do them."
            visual={<HabitStripVisual />}
          />

          {/* Row 2 */}
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-3"
            eyebrow="Tasks"
            title="A to-do list that respects your day."
            body="Plan tomorrow tonight. Trac keeps it short."
            visual={<TaskVisual />}
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-4"
            eyebrow="Focus timer"
            title="One clean timer. No noise."
            body="Pick a length, hit start. Sessions land in your streak."
            visual={<FocusVisual />}
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-5"
            eyebrow="Focus music"
            title="Sound that stays out of the way."
            body="Curated ambient loops. No accounts, no ads."
            visual={<MusicVisual />}
          />

          {/* Row 3 — insights hero */}
          <BentoCell
            style={{ gridColumn: "span 8" }}
            className="bento-lg trac-bento-6"
            eyebrow="AI Insights"
            title="See yourself clearly."
            body="A GitHub-style heatmap of everything you've shown up for. Weekly consistency, best hours, and a plain-English summary — no dashboards to decipher."
            visual={<InsightsVisual />}
            featured
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-7"
            eyebrow="Sleep tracker"
            title="Rest as a signal."
            body="Log lights-out and wake. Trac ties it to how you performed."
            visual={<SleepVisual />}
          />

          {/* Row 4 */}
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-8"
            eyebrow="Mood tracker"
            title="One tap, honest."
            body="Five moods, zero forms. Patterns emerge on their own."
            visual={<MoodVisual />}
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-9"
            eyebrow="Adaptive notifications"
            title="Reminders that learn."
            body="Nudges shift to the hour you actually show up — never the one you never do."
            visual={<NotifVisual />}
          />
          <BentoCell
            style={{ gridColumn: "span 4" }}
            className="trac-bento-10"
            eyebrow="Local-first"
            title="Yours, on your device."
            body="Everything lives on-device. Nothing leaves without you asking."
            visual={<LocalVisual />}
          />

          {/* Row 5 — cloud strip */}
          <BentoCell
            style={{ gridColumn: "span 12" }}
            className="bento-wide trac-bento-11"
            eyebrow="Optional cloud sync"
            title="Sync only when you want."
            body="Sign in and Trac quietly mirrors to secure cloud storage across all your devices. Sign out and it's gone from the cloud, still on your phone."
            visual={<CloudVisual />}
            layout="row"
          />
        </div>
      </section>

      {/* ═══ CLOSING CTA ═══ */}
      <section className="trac-closing" style={closingWrap}>
        <div className={cls("trac-fade-6")} style={closingCard}>
          <div style={closingGlow} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ ...sectionEyebrow, marginBottom: 12 }}>Start today</div>
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
              style={{ ...ctaPrimary, marginTop: 24 }}
              aria-label="Get started with Trac"
            >
              <span>Get started, free</span>
              <ArrowRight size={17} className="trac-cta-arrow" />
            </button>
          </div>
        </div>
        <footer style={footer}>
          <span>Trac</span>
          <span style={metaDot} />
          <span>Local by default</span>
          <span style={metaDot} />
          <span>Synced only if you choose</span>
        </footer>
      </section>

      {/* ═══ Global styles ═══ */}
      <style jsx global>{`
        /* Reduced-motion / settled fallback */
        .trac-s, .trac-s * {
          opacity: 1 !important;
          transform: none !important;
          animation: none !important;
        }

        /* Ambient auroras */
        @keyframes tracAurA {
          0%, 100% { transform: translate3d(-6%, -8%, 0) scale(1); }
          50%      { transform: translate3d(6%, 4%, 0) scale(1.1); }
        }
        @keyframes tracAurB {
          0%, 100% { transform: translate3d(10%, 12%, 0) scale(1.06); }
          50%      { transform: translate3d(-4%, -6%, 0) scale(0.96); }
        }
        .trac-aur-a { animation: tracAurA 24s ease-in-out infinite; }
        .trac-aur-b { animation: tracAurB 28s ease-in-out infinite; }

        /* Fade-up choreography */
        @keyframes tracFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trac-fade-1, .trac-fade-2, .trac-fade-3, .trac-fade-4,
        .trac-fade-5, .trac-fade-6 {
          opacity: 0;
          animation: tracFadeUp 640ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .trac-fade-1 { animation-delay: 100ms; }
        .trac-fade-2 { animation-delay: 200ms; }
        .trac-fade-3 { animation-delay: 380ms; }
        .trac-fade-4 { animation-delay: 560ms; }
        .trac-fade-5 { animation-delay: 100ms; }
        .trac-fade-6 { animation-delay: 100ms; }

        /* Mockup: fade + gentle lift + subtle float */
        @keyframes tracMockIn {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tracMockFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .trac-mock-in {
          opacity: 0;
          animation: tracMockIn 900ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards;
        }
        .trac-mock-float {
          animation: tracMockFloat 6s ease-in-out infinite;
        }

        /* Bento cells: stagger via IntersectionObserver-free approach:
           just delay them by class index. */
        @keyframes tracBentoIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .trac-bento-fade > .trac-bento {
          opacity: 0;
          animation: tracBentoIn 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .trac-bento-fade > .trac-bento-1  { animation-delay: 80ms; }
        .trac-bento-fade > .trac-bento-2  { animation-delay: 140ms; }
        .trac-bento-fade > .trac-bento-3  { animation-delay: 200ms; }
        .trac-bento-fade > .trac-bento-4  { animation-delay: 260ms; }
        .trac-bento-fade > .trac-bento-5  { animation-delay: 320ms; }
        .trac-bento-fade > .trac-bento-6  { animation-delay: 380ms; }
        .trac-bento-fade > .trac-bento-7  { animation-delay: 440ms; }
        .trac-bento-fade > .trac-bento-8  { animation-delay: 500ms; }
        .trac-bento-fade > .trac-bento-9  { animation-delay: 560ms; }
        .trac-bento-fade > .trac-bento-10 { animation-delay: 620ms; }
        .trac-bento-fade > .trac-bento-11 { animation-delay: 680ms; }

        /* CTA polish */
        .trac-cta {
          transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1),
                      box-shadow 0.24s ease;
          will-change: transform;
        }
        .trac-cta:active { transform: scale(0.97); }
        .trac-cta:active .trac-cta-arrow { transform: translateX(3px); }
        .trac-cta-arrow {
          transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (hover: hover) {
          .trac-cta:hover {
            box-shadow: 0 14px 44px ${C.accentGlow}, 0 0 0 1px rgba(255,255,255,0.06) inset;
          }
          .trac-cta:hover .trac-cta-arrow { transform: translateX(3px); }
          .trac-link:hover { color: ${C.text} !important; }
          .trac-bento:hover {
            border-color: ${C.borderHi};
            transform: translateY(-2px);
          }
        }

        .trac-bento {
          transition: border-color 0.24s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }

        /* Focus ring for keyboard nav */
        button:focus-visible, a:focus-visible {
          outline: 2px solid ${C.accent};
          outline-offset: 3px;
          border-radius: 8px;
        }

        /* Mock inner animations */
        @keyframes tracPulseSoft {
          0%, 100% { opacity: 0.5; }
          50%      { opacity: 1; }
        }
        @keyframes tracRingSweep {
          from { stroke-dashoffset: 220; }
          to   { stroke-dashoffset: 60; }
        }
        @keyframes tracBarGrow {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }

        /* Layout: bento becomes 12-col on tablet+, single stack on mobile */
        @media (max-width: 767px) {
          .trac-bento-grid > .trac-bento { grid-column: span 1 !important; }
          .trac-bento-grid { grid-template-columns: 1fr !important; }
        }

        /* Hero: side-by-side on desktop, stacked on mobile.
           On mobile we hide the desktop mockup entirely and let the
           phone be the single centered hero. The phone IS the primary
           experience — cramming both into a small viewport makes
           everything unreadable. */
        @media (max-width: 899px) {
          .trac-hero-inner { grid-template-columns: 1fr !important; gap: 28px !important; }
          .trac-hero-copy { text-align: center; align-items: center !important; }
          .trac-hero-copy h1 { font-size: clamp(38px, 10vw, 60px) !important; }
          .trac-hero-cta-row { justify-content: center !important; }

          /* Hide the desktop mock; phone takes the full stage. */
          .trac-mock-desktop-wrap { display: none !important; }
          .trac-mock-phone-wrap {
            flex: 0 0 auto !important;
            width: 100% !important;
            max-width: 260px !important;
          }
        }

        /* OS-level reduced motion */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BENTO CELL
   ═══════════════════════════════════════════════════════════════ */

function BentoCell({
  eyebrow,
  title,
  body,
  visual,
  style,
  className,
  featured,
  layout = "col",
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  featured?: boolean;
  layout?: "col" | "row";
}) {
  const isRow = layout === "row";
  return (
    <article
      className={`trac-bento ${className || ""}`}
      style={{
        position: "relative",
        padding: featured ? 22 : 18,
        borderRadius: 22,
        background: `linear-gradient(180deg, ${C.panelHi} 0%, ${C.panel} 100%)`,
        border: `1px solid ${C.border}`,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        gap: isRow ? 24 : 16,
        overflow: "hidden",
        alignItems: isRow ? "center" : "stretch",
        minHeight: featured ? 300 : 220,
        ...style,
      }}
    >
      {/* Subtle accent highlight in the top-left */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -80,
          left: -80,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.accentSoft} 0%, transparent 70%)`,
          pointerEvents: "none",
          opacity: featured ? 1 : 0.55,
        }}
      />
      {/* Visual — flex-grows so it fills */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: isRow ? "1 1 55%" : "1 1 auto",
          minHeight: isRow ? 160 : 130,
          borderRadius: 14,
          background: "rgba(7, 9, 10, 0.5)",
          border: `1px solid ${C.border}`,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {visual}
      </div>
      {/* Copy */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: isRow ? "1 1 45%" : "0 0 auto",
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: C.accent,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
        <h3
          style={{
            fontFamily: "var(--font-trac-serif), Georgia, serif",
            fontWeight: 400,
            fontSize: featured ? 26 : 21,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: C.text,
            margin: 0,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: featured ? 14 : 13,
            lineHeight: 1.55,
            color: C.textDim,
            margin: "4px 0 0",
          }}
        >
          {body}
        </p>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HERO MOCKUPS — inline SVG-based interface renderings
   ═══════════════════════════════════════════════════════════════ */

function DesktopMock() {
  return (
    <div className="trac-mock-float trac-mock-desktop" style={desktopFrame}>
      {/* Browser chrome */}
      <div style={desktopChrome}>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#3a3a3a" }} />
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#3a3a3a" }} />
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: "#3a3a3a" }} />
        </div>
        <div style={desktopUrl}>trac.app</div>
        <div />
      </div>
      {/* Content area */}
      <div style={desktopBody}>
        {/* Sidebar */}
        <aside style={desktopSidebar}>
          <div style={sidebarLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-inside.png" alt="" width={20} height={20} style={{ borderRadius: 5 }} />
          </div>
          {[
            { icon: <Home size={14} />, active: true },
            { icon: <CalendarDays size={14} /> },
            { icon: <Sparkles size={14} /> },
            { icon: <Target size={14} /> },
            { icon: <TrendingUp size={14} /> },
          ].map((it, i) => (
            <div
              key={i}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: it.active ? C.accentSoft : "transparent",
                color: it.active ? C.accent : C.textMute,
              }}
            >
              {it.icon}
            </div>
          ))}
        </aside>
        {/* Main */}
        <main style={desktopMain}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 8, color: C.textMute, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4 }}>
                WEDNESDAY · JUL 10
              </div>
              <div
                style={{
                  fontFamily: "var(--font-trac-serif)",
                  fontSize: 26,
                  color: C.text,
                  lineHeight: 1,
                }}
              >
                Good morning, <em style={{ fontStyle: "italic", color: C.accent }}>Alex</em>
              </div>
            </div>
            <ProgressRing size={40} percent={72} />
          </div>

          {/* Heatmap — the star */}
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.textMute, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 8 }}>
              CONSISTENCY · LAST 12 WEEKS
            </div>
            <Heatmap cols={12} rows={7} />
          </div>

          {/* Stat tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 10 }}>
            {[
              { label: "STREAK", value: "14", unit: "days", accent: true },
              { label: "FOCUS", value: "2.4", unit: "hr today" },
              { label: "RATE", value: "82", unit: "% this week" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ fontSize: 7.5, color: C.textMute, fontWeight: 700, letterSpacing: "0.12em" }}>
                  {s.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 3 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-trac-serif)",
                      fontSize: 22,
                      color: s.accent ? C.accent : C.text,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </span>
                  <span style={{ fontSize: 9, color: C.textMute }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="trac-mock-float trac-mock-phone" style={{ ...phoneFrame, animationDelay: "1.5s" }}>
      {/* Notch */}
      <div style={phoneNotch} />
      {/* Screen */}
      <div style={phoneScreen}>
        <div style={{ fontSize: 8, color: C.textMute, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 4 }}>
          TRAC AI · YOUR COACH
        </div>
        <div
          style={{
            fontFamily: "var(--font-trac-serif)",
            fontSize: 22,
            lineHeight: 1.05,
            color: C.text,
            marginBottom: 14,
          }}
        >
          Hey <em style={{ fontStyle: "italic", color: C.accent }}>Alex</em>,
          <br />
          what&rsquo;s on your mind?
        </div>

        {/* Chat exchange */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                maxWidth: "82%",
                padding: "7px 11px",
                borderRadius: "14px 14px 4px 14px",
                background: C.accent,
                color: "#0B0F0C",
                fontSize: 11,
                fontWeight: 500,
                lineHeight: 1.35,
              }}
            >
              How do I fix my sleep?
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: `linear-gradient(135deg, ${C.accentBright}, ${C.accentDeep})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              <Sparkles size={10} color="#07090A" />
            </div>
            <div style={{ fontSize: 10.5, lineHeight: 1.45, color: C.textDim }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 3 }}>
                Try one small anchor.
              </div>
              Same wake time, 7 days.
              <br />
              Lights out 30 min earlier tonight.
            </div>
          </div>
        </div>

        {/* Composer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 6px 6px 12px",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ flex: 1, fontSize: 10, color: C.textMute }}>Ask Trac anything…</div>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 9999,
              background: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowUp size={12} color="#07090A" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      {/* Nav pill */}
      <div style={phoneNav}>
        {[Home, CalendarDays, Sparkles, Target, TrendingUp].map((Icon, i) => (
          <div
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: i === 2 ? C.accentSoft : "transparent",
              color: i === 2 ? C.accent : C.textMute,
            }}
          >
            <Icon size={11} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MICRO VISUALS for bento cells
   ═══════════════════════════════════════════════════════════════ */

function CoachVisual() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: "70%",
            padding: "9px 13px",
            borderRadius: "16px 16px 4px 16px",
            background: C.accent,
            color: "#07090A",
            fontSize: 12.5,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          I keep skipping my run
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 9999,
            background: `linear-gradient(135deg, ${C.accentBright}, ${C.accentDeep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={13} color="#07090A" />
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: C.textDim, flex: 1 }}>
          <span style={{ color: C.text, fontWeight: 600 }}>Try 10 minutes at 7am</span> instead of 30 at 6.
          <br />
          <span style={{ color: C.textMute }}>Small win first, streak follows.</span>
        </div>
      </div>
    </div>
  );
}

function HabitStripVisual() {
  const filled = [true, true, false, true, true, true, false];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: C.accent }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Morning run</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3, color: C.accent }}>
          <Flame size={10} />
          <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em" }}>5</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {filled.map((f, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 6,
                background: f ? C.accent : "rgba(127, 160, 133, 0.14)",
                border: `1px solid ${f ? C.accent : C.border}`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskVisual() {
  const tasks = [
    { text: "Draft launch email", done: true },
    { text: "Review PR #142", done: false },
    { text: "20 min stretch", done: false },
  ];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 7 }}>
      {tasks.map((t) => (
        <div
          key={t.text}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              border: `1.5px solid ${t.done ? C.accent : C.borderHi}`,
              background: t.done ? C.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {t.done && <CheckCircle2 size={9} color="#07090A" strokeWidth={3} />}
          </div>
          <span
            style={{
              fontSize: 11.5,
              color: t.done ? C.textMute : C.text,
              textDecoration: t.done ? "line-through" : "none",
              lineHeight: 1.2,
            }}
          >
            {t.text}
          </span>
        </div>
      ))}
    </div>
  );
}

function FocusVisual() {
  const R = 32;
  const CIRC = 2 * Math.PI * R;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 76, height: 76 }}>
        <svg width={76} height={76} viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={R} fill="none" stroke={C.border} strokeWidth="4" />
          <circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            stroke={C.accent}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * 0.3}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "38px 38px",
              filter: `drop-shadow(0 0 8px ${C.accentGlow})`,
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
          <span
            style={{
              fontFamily: "var(--font-trac-serif)",
              fontSize: 22,
              color: C.text,
              lineHeight: 1,
            }}
          >
            17:32
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: C.textMute, letterSpacing: "0.08em", fontWeight: 600 }}>
        <Timer size={10} />
        DEEP WORK
      </div>
    </div>
  );
}

function MusicVisual() {
  const bars = [4, 8, 6, 10, 5, 9, 7, 11, 6, 8, 4, 9];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9999,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Play size={14} color="#07090A" fill="#07090A" style={{ marginLeft: 2 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>Rainforest</div>
          <div style={{ fontSize: 10, color: C.textMute, marginTop: 2 }}>Ambient · 4h loop</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 20 }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 8}%`,
              borderRadius: 2,
              background: C.accent,
              opacity: 0.35 + (i % 3) * 0.22,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function InsightsVisual() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 9.5, color: C.textMute, fontWeight: 700, letterSpacing: "0.14em" }}>
            LAST 12 WEEKS
          </div>
          <div
            style={{
              fontFamily: "var(--font-trac-serif)",
              fontSize: 28,
              color: C.text,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            82% <span style={{ fontSize: 12, color: C.textMute }}>consistency</span>
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 9px",
            borderRadius: 9999,
            background: C.accentSoft,
            fontSize: 11,
            fontWeight: 700,
            color: C.accent,
          }}
        >
          <TrendingUp size={11} /> +14%
        </div>
      </div>
      <Heatmap cols={16} rows={7} />
    </div>
  );
}

function SleepVisual() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            background: C.accentSoft,
            color: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Moon size={14} />
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-trac-serif)",
              fontSize: 20,
              color: C.text,
              lineHeight: 1,
            }}
          >
            7h 42m
          </div>
          <div style={{ fontSize: 10, color: C.textMute, marginTop: 3 }}>
            Bed 11:14 · Wake 6:56
          </div>
        </div>
      </div>
      {/* Sleep bar */}
      <div style={{ display: "flex", height: 8, borderRadius: 9999, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
        <div style={{ flex: 3, background: "rgba(127, 160, 133, 0.35)" }} />
        <div style={{ flex: 5, background: C.accent }} />
        <div style={{ flex: 2, background: "rgba(127, 160, 133, 0.55)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: C.textMute, letterSpacing: "0.06em" }}>
        <span>LIGHT</span>
        <span>DEEP</span>
        <span>REM</span>
      </div>
    </div>
  );
}

function MoodVisual() {
  const moods = ["😔", "😐", "🙂", "😊", "🤩"];
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 6 }}>
        {moods.map((m, i) => (
          <div
            key={i}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              background: i === 3 ? C.accentSoft : "rgba(255,255,255,0.03)",
              border: `1px solid ${i === 3 ? C.accent : C.border}`,
              transition: "all 0.2s",
            }}
          >
            {m}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: C.textMute, letterSpacing: "0.06em" }}>
        <span style={{ color: C.accent, fontWeight: 700 }}>GOOD</span> · TODAY
      </div>
    </div>
  );
}

function NotifVisual() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: 10,
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: C.accentSoft,
            color: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BellRing size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: C.textMute, fontWeight: 600, letterSpacing: "0.06em" }}>
            TRAC · NOW
          </div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 3, lineHeight: 1.35 }}>
            Time for your <span style={{ color: C.accent, fontWeight: 600 }}>morning run</span>.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4, fontSize: 10, color: C.textMute }}>
        <span>Learned time:</span>
        <span style={{ color: C.text, fontWeight: 600 }}>7:12 am</span>
        <span style={{ marginLeft: "auto", color: C.accent, fontSize: 9 }}>← adjusts weekly</span>
      </div>
    </div>
  );
}

function LocalVisual() {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${C.accentSoft}, transparent)`,
          border: `1px solid ${C.borderHi}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: C.accent,
        }}
      >
        <Lock size={22} />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {["✓ Habits", "✓ Chats", "✓ Notes"].map((t) => (
          <span
            key={t}
            style={{
              fontSize: 9.5,
              padding: "3px 8px",
              borderRadius: 9999,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${C.border}`,
              color: C.textDim,
              fontWeight: 500,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: C.textMute, letterSpacing: "0.06em" }}>
        ON YOUR DEVICE
      </div>
    </div>
  );
}

function CloudVisual() {
  return (
    <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-around", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={devicePill}>
          <div style={{ width: 28, height: 44, borderRadius: 5, border: `1.5px solid ${C.accent}`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 4, borderRadius: 2, background: C.accentSoft }} />
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: C.textMute, letterSpacing: "0.06em" }}>PHONE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, maxWidth: 200 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#07090A",
            boxShadow: `0 0 24px ${C.accentGlow}`,
          }}
        >
          <Cloud size={20} />
        </div>
        <div style={{ width: "100%", height: 1, background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }} />
        <span style={{ fontSize: 9.5, color: C.accent, letterSpacing: "0.08em", fontWeight: 700 }}>ENCRYPTED SYNC</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={devicePill}>
          <div style={{ width: 48, height: 32, borderRadius: 4, border: `1.5px solid ${C.accent}`, position: "relative" }}>
            <div style={{ position: "absolute", inset: 3, borderRadius: 2, background: C.accentSoft }} />
          </div>
        </div>
        <span style={{ fontSize: 9.5, color: C.textMute, letterSpacing: "0.06em" }}>DESKTOP</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Utility mini-components
   ═══════════════════════════════════════════════════════════════ */

function ProgressRing({ size, percent }: { size: number; percent: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={C.accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - percent / 100)}
        style={{ transform: "rotate(-90deg)", transformOrigin: `${size / 2}px ${size / 2}px` }}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={C.text}
        fontFamily="var(--font-trac-sans)"
      >
        {percent}%
      </text>
    </svg>
  );
}

function Heatmap({ cols, rows }: { cols: number; rows: number }) {
  // Deterministic pattern (no Math.random so SSR matches) — looks organic.
  const cells: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const v = (i * 37 + Math.floor(i / rows) * 13) % 5;
    cells.push(v);
  }
  const bgs = [
    "rgba(127, 160, 133, 0.08)",
    "rgba(127, 160, 133, 0.22)",
    "rgba(127, 160, 133, 0.42)",
    "rgba(127, 160, 133, 0.68)",
    C.accent,
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 3,
      }}
    >
      {cells.map((v, i) => (
        <div
          key={i}
          style={{
            aspectRatio: "1 / 1",
            borderRadius: 2.5,
            background: bgs[v],
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Style tokens (mobile-first, media queries in the global block)
   ═══════════════════════════════════════════════════════════════ */

const ambientWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  overflow: "hidden",
  zIndex: 0,
};
const auroraA: React.CSSProperties = {
  position: "absolute",
  top: "-25%",
  left: "-15%",
  width: "80vw",
  height: "80vw",
  maxWidth: 900,
  maxHeight: 900,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${C.accentGlow} 0%, rgba(127,160,133,0) 60%)`,
  filter: "blur(80px)",
  willChange: "transform",
};
const auroraB: React.CSSProperties = {
  position: "absolute",
  bottom: "-15%",
  right: "-20%",
  width: "80vw",
  height: "80vw",
  maxWidth: 1000,
  maxHeight: 1000,
  borderRadius: "50%",
  background: `radial-gradient(circle, rgba(111, 135, 113, 0.22) 0%, transparent 60%)`,
  filter: "blur(90px)",
  willChange: "transform",
};
const grid: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
  maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
  WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
};
const grain: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  opacity: 0.4,
  mixBlendMode: "overlay",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.95 0 0 0 0 0.94 0 0 0 0 0.9 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
};

const topBar: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "calc(14px + env(safe-area-inset-top)) 22px 8px",
  maxWidth: 1200,
  margin: "0 auto",
  boxSizing: "border-box",
};
const brandWrap: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
};
const brandMark: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 9,
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${C.border}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const brandName: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: C.text,
};
const skipBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: C.textMute,
  fontSize: 13,
  fontWeight: 500,
  padding: "8px 12px",
  borderRadius: 9999,
  transition: "color 0.15s",
};

const heroWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "40px 22px 40px",
  maxWidth: 1200,
  margin: "0 auto",
  boxSizing: "border-box",
};
const heroInner: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.05fr 1fr",
  gap: 48,
  alignItems: "center",
};
const heroCopy: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 22,
};
const heroEyebrow: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  fontWeight: 600,
  color: C.textDim,
  padding: "6px 12px",
  borderRadius: 9999,
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${C.border}`,
};
const eyebrowDot: React.CSSProperties = {
  width: 6,
  height: 6,
  borderRadius: 9999,
  background: C.accent,
  boxShadow: `0 0 10px ${C.accentGlow}`,
};
const heroH1: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(46px, 6.5vw, 84px)",
  lineHeight: 1.02,
  letterSpacing: "-0.02em",
  color: C.text,
  margin: 0,
};
const emStyle: React.CSSProperties = {
  fontStyle: "italic",
  color: C.accent,
};
const heroSub: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.55,
  color: C.textDim,
  margin: 0,
  maxWidth: "32em",
};
const heroCtaRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  marginTop: 4,
};
const ctaPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "15px 26px",
  minHeight: 52,
  background: C.text,
  color: "#07090A",
  border: "none",
  borderRadius: 9999,
  fontFamily: "var(--font-trac-sans)",
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: "-0.005em",
  cursor: "pointer",
  boxShadow: `0 10px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06) inset`,
  willChange: "transform",
};
const ctaMeta: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12.5,
  color: C.textMute,
};
const metaDot: React.CSSProperties = {
  width: 3,
  height: 3,
  borderRadius: 9999,
  background: C.textMute,
  opacity: 0.6,
};

const heroMockCol: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 460,
};

/* Stage = simple flex row. Desktop on the left, phone on the right,
   clean gap between them. NO overlap, NO absolute positioning tricks
   — the composition just falls out of flexbox. */
const mockStage: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 640,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5%",
};

/* Wrappers own the WIDTH inside the flex row. That way the desktop
   and phone components themselves can be simple relative blocks. */
const mockDesktopWrap: React.CSSProperties = {
  flex: "0 0 64%",
  minWidth: 0,
};
const mockPhoneWrap: React.CSSProperties = {
  flex: "0 0 30%",
  minWidth: 0,
};

/* Desktop mock — fills its wrapper, no absolute positioning. */
const desktopFrame: React.CSSProperties = {
  position: "relative",
  width: "100%",
  borderRadius: 16,
  background: `linear-gradient(180deg, #131719 0%, #0C1012 100%)`,
  border: `1px solid ${C.borderHi}`,
  boxShadow: `0 40px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset`,
  overflow: "hidden",
  willChange: "transform",
};
const desktopChrome: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  alignItems: "center",
  padding: "10px 14px",
  borderBottom: `1px solid ${C.border}`,
  background: "rgba(255,255,255,0.02)",
};
const desktopUrl: React.CSSProperties = {
  fontSize: 10,
  color: C.textMute,
  padding: "3px 12px",
  borderRadius: 9999,
  background: "rgba(255,255,255,0.04)",
  textAlign: "center",
  minWidth: 100,
};
const desktopBody: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px 1fr",
  minHeight: 260,
};
const desktopSidebar: React.CSSProperties = {
  padding: "10px 6px",
  borderRight: `1px solid ${C.border}`,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  alignItems: "center",
};
const sidebarLogo: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: C.accentSoft,
  marginBottom: 4,
};
const desktopMain: React.CSSProperties = {
  padding: 16,
};

/* Phone mock — fills its wrapper (position: relative, not absolute).
   Aspect-ratio locked so the frame is proportional to whatever width
   the wrapper gives it. No z-index tricks needed since we're not
   overlapping anything. */
const phoneFrame: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "9 / 19",
  borderRadius: 30,
  background: `linear-gradient(180deg, #131719 0%, #0C1012 100%)`,
  border: `1px solid ${C.borderHi}`,
  boxShadow: `0 40px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset`,
  padding: 7,
  paddingTop: 20,
  willChange: "transform",
  boxSizing: "border-box",
};
const phoneNotch: React.CSSProperties = {
  position: "absolute",
  top: 8,
  left: "50%",
  transform: "translateX(-50%)",
  width: "34%",
  height: 16,
  borderRadius: 10,
  background: "#000",
  zIndex: 1,
};
/* Phone screen fills the frame's remaining space — no fixed height so
   it scales with the frame's aspect ratio. Bottom padding reserves
   room for the absolutely-positioned nav pill so content never gets
   covered by it. */
const phoneScreen: React.CSSProperties = {
  borderRadius: 24,
  background: C.bg,
  padding: "14px 14px 44px",
  border: `1px solid ${C.border}`,
  height: "calc(100% - 34px)",
  boxSizing: "border-box",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};
/* Nav pill floats INSIDE the screen (not in the frame padding),
   anchored to the screen's bottom. The screen has 44px bottom
   padding to reserve room for it, so nothing hides underneath. */
const phoneNav: React.CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "5px 7px",
  borderRadius: 9999,
  background: "rgba(255,255,255,0.08)",
  border: `1px solid ${C.borderHi}`,
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  gap: 3,
  zIndex: 2,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

/* Bento */
const bentoOuter: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "56px 22px 32px",
  maxWidth: 1200,
  margin: "0 auto",
  boxSizing: "border-box",
};
const bentoHeader: React.CSSProperties = {
  textAlign: "center",
  maxWidth: 640,
  margin: "0 auto 40px",
};
const sectionEyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: C.accent,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  marginBottom: 12,
};
const sectionH2: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(32px, 5vw, 52px)",
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
  color: C.text,
  margin: "0 0 16px",
};
const sectionSub: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: C.textDim,
  margin: 0,
};
const bentoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(12, 1fr)",
  gap: 14,
};

/* Closing */
const closingWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  padding: "48px 22px calc(48px + env(safe-area-inset-bottom))",
  maxWidth: 900,
  margin: "0 auto",
  boxSizing: "border-box",
};
const closingCard: React.CSSProperties = {
  position: "relative",
  padding: "48px 32px 52px",
  borderRadius: 28,
  background: `linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
  border: `1px solid ${C.borderHi}`,
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  textAlign: "center",
  overflow: "hidden",
};
const closingGlow: React.CSSProperties = {
  position: "absolute",
  top: -100,
  left: "50%",
  transform: "translateX(-50%)",
  width: 380,
  height: 380,
  borderRadius: "50%",
  background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 65%)`,
  filter: "blur(40px)",
  pointerEvents: "none",
};
const closingH: React.CSSProperties = {
  fontFamily: "var(--font-trac-serif), Georgia, serif",
  fontWeight: 400,
  fontSize: "clamp(34px, 6vw, 52px)",
  lineHeight: 1.05,
  letterSpacing: "-0.01em",
  color: C.text,
  margin: 0,
};
const closingSub: React.CSSProperties = {
  fontSize: 15.5,
  lineHeight: 1.55,
  color: C.textDim,
  margin: "12px 0 0",
  maxWidth: 30 + "em",
  marginLeft: "auto",
  marginRight: "auto",
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  color: C.textMute,
  marginTop: 28,
  letterSpacing: "0.01em",
  flexWrap: "wrap",
};

const devicePill: React.CSSProperties = {
  padding: 8,
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${C.border}`,
};
