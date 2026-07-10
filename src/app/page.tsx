"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Navigation, { NavPage } from "@/components/Navigation";
import HomePage from "@/components/pages/HomePage";
import PlannerPage from "@/components/pages/PlannerPage";
import AiChatPage from "@/components/pages/AiChatPage";
import FocusPage from "@/components/pages/FocusPage";
import InsightsPage from "@/components/pages/InsightsPage";
import SettingsPage from "@/components/pages/SettingsPage";
import { initMobilePushScheduler } from "@/lib/pwa";
import { setupWebViewNavigationBridge, pushHistoryEntry } from "@/lib/median-webview";
import { refreshAllReminders, scheduleMidnightRefresh } from "@/lib/scheduler";
import { LogoLoadingScreen } from "@/components/LogoAnimation";
import { supabase } from "@/lib/supabase";
import { restoreFromCloudDatabase } from "@/lib/cloud";

export default function MainApp() {
  const { isAuthenticated, onboardingDone, habits, todos } = useAppStore();
  const router = useRouter();
  // Waits for BOTH Zustand persist to hydrate AND for the async Supabase
  // session restore to finish. Without this gate we redirect off "/" before
  // restoreFromCloudDatabase has had a chance to flip isAuthenticated true,
  // which caused users to see a permanent "Redirecting..." loop between
  // /auth and / on cold start.
  const [authRestored, setAuthRestored] = useState(false);

  // Navigation stack. Home is always the root. Every user navigation pushes
  // onto the stack; the hardware back button pops one entry. When the stack
  // is at just ["home"], pressing back exits the app.
  const [pageStack, setPageStack] = useState<NavPage[]>(["home"]);
  const currentPage = pageStack[pageStack.length - 1];

  const navigateTo = useCallback((page: NavPage) => {
    setPageStack((stack) => {
      // Don't push a duplicate of what's already on top
      if (stack[stack.length - 1] === page) return stack;
      // If the target page is already deeper in the stack, truncate to it
      // (natural behavior: tapping a tab you've already been on shouldn't
      // build up a taller and taller stack).
      const existing = stack.indexOf(page);
      if (existing >= 0) return stack.slice(0, existing + 1);
      const next = [...stack, page];
      // Mirror the SPA push into browser history so the hardware back
      // button (which the webview interprets as "history.back()") fires
      // popstate → our onBack handler.
      pushHistoryEntry(page);
      return next;
    });
  }, []);

  const goBack = useCallback((): boolean => {
    let handled = false;
    setPageStack((stack) => {
      if (stack.length > 1) {
        handled = true;
        return stack.slice(0, -1);
      }
      return stack;
    });
    return handled;
  }, []);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      setHydrated((v) => (v ? v : true));
    });
    if (useAppStore.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated((v) => (v ? v : true)));
    }
    return unsubFinishHydration;
  }, []);

  // Wait for Supabase to tell us whether a session exists before redirecting.
  // We call restoreFromCloudDatabase here (it will noop if no session) and
  // only after it returns do we consider the auth state authoritative.
  //
  // FAST PATH: first-time visitors (no 'trac-start-seen' flag AND no
  // persisted auth) don't need any Supabase round-trip — they're going
  // straight to /start regardless. Skip the network wait and mark auth
  // "restored" immediately so the redirect fires on the next tick.
  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;

    let startSeen = false;
    try {
      startSeen = localStorage.getItem("trac-start-seen") === "1";
    } catch {}

    if (!startSeen && !isAuthenticated) {
      // First-time visitor — no need to wait on Supabase.
      setAuthRestored(true);
      return;
    }

    (async () => {
      try {
        if (supabase) {
          await restoreFromCloudDatabase();
        }
      } catch (err) {
        console.error("[MainApp] auth restore failed:", err);
      } finally {
        if (!cancelled) setAuthRestored(true);
      }
    })();
    return () => { cancelled = true; };
  }, [hydrated, isAuthenticated]);

  // Redirect only AFTER the auth restore has finished. This is what fixes
  // the "stuck on Redirecting" loop.
  useEffect(() => {
    if (!hydrated || !authRestored) return;
    if (!isAuthenticated) {
      // First-time visitors see the /start splash before /auth.
      // The splash sets 'trac-start-seen' on tapping Get started so
      // returning users skip straight to /auth.
      let startSeen = false;
      try {
        startSeen = localStorage.getItem("trac-start-seen") === "1";
      } catch {
        // Storage disabled — fall through to /start (same as first-time).
      }
      router.replace(startSeen ? "/auth" : "/start");
    } else if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [hydrated, authRestored, isAuthenticated, onboardingDone, router]);

  useEffect(() => {
    if (!hydrated) return;
    const cleanup = initMobilePushScheduler(habits, todos);
    return cleanup;
  }, [hydrated, habits, todos]);

  // Step 8 — Daily refresh: recalculate every reminder on app open
  // (guarded by localStorage so it only fires once per calendar day)
  // plus a self-scheduling midnight timer for long-lived sessions.
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return;
    refreshAllReminders();
    const cancelMidnight = scheduleMidnightRefresh();
    return cancelMidnight;
  }, [hydrated, isAuthenticated]);

  // Hardware back button + browser popstate → pop the in-app stack.
  // Only set up once (goBack is stable via useCallback).
  useEffect(() => {
    if (!hydrated) return;
    return setupWebViewNavigationBridge(goBack);
  }, [hydrated, goBack]);

  if (!hydrated || !authRestored) {
    return <LogoLoadingScreen />;
  }

  if (!isAuthenticated || !onboardingDone) {
    // Redirect effect above has already fired router.replace — show the
    // spinner until the navigation completes.
    return <LogoLoadingScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={(p) => navigateTo(p as NavPage)} />;
      case "planner":
      case "habits":
      case "todo":
      case "timebox":
        return <PlannerPage initialTab={["habits", "todo", "timebox"].includes(currentPage) ? currentPage as any : "habits"} />;
      case "ai-chat":
      case "ai-hub":
        return <AiChatPage />;
      case "focus":
      case "pomodoro":
      case "music":
        return <FocusPage initialTab={currentPage === "music" ? "music" : "timer"} />;
      case "insights":
      case "analytics":
      case "mood":
      case "sleep":
        return <InsightsPage initialTab={["mood", "sleep"].includes(currentPage) ? currentPage as any : "stats"} onNavigate={(p) => navigateTo(p as NavPage)} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage onNavigate={(p) => navigateTo(p as NavPage)} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <Navigation current={currentPage} onChange={navigateTo} />

      {/* Main content - Full Screen Flex Container */}
      <main
        style={{
          flex: 1,
          marginLeft: "76px",
          paddingBottom: "120px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* NOTE: this wrapper deliberately has NO `fade-in` class.
            `fade-in` animates a transform which creates a new containing
            block, which traps `position: fixed` descendants (like the
            AI chat composer) inside this box instead of the viewport.
            Individual pages apply their own `fade-in` on inner sections. */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }} key={currentPage}>
          {renderPage()}
        </div>
      </main>

      <style jsx global>{`
        @media (max-width: 640px) {
          .hidden-mobile { display: none !important; }
          .mobile-nav { display: flex !important; }
          main { margin-left: 0 !important; padding-bottom: 110px !important; }
        }
        @media (min-width: 641px) {
          .mobile-nav { display: none !important; }
          main { padding-bottom: 40px !important; }
        }
      `}</style>
    </div>
  );
}
