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

export default function MainApp() {
  const { isAuthenticated, onboardingDone, habits, todos } = useAppStore();
  const router = useRouter();

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
      setHydrated(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsubFinishHydration;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth");
    } else if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [hydrated, isAuthenticated, onboardingDone, router]);

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
    // Intentionally only re-run on hydration/auth changes, not on habit edits
    // (those already trigger their own reschedule via the store actions).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isAuthenticated]);

  // Hardware back button + browser popstate → pop the in-app stack.
  // Only set up once (goBack is stable via useCallback).
  useEffect(() => {
    if (!hydrated) return;
    return setupWebViewNavigationBridge(goBack);
  }, [hydrated, goBack]);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !onboardingDone) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Redirecting...</div>
      </div>
    );
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
          paddingBottom: "68px",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }} key={currentPage}>
          {renderPage()}
        </div>
      </main>

      <style jsx global>{`
        @media (max-width: 640px) {
          .hidden-mobile {
            display: none !important;
          }
          .mobile-nav {
            display: flex !important;
          }
          main {
            margin-left: 0 !important;
          }
        }
        @media (min-width: 641px) {
          .mobile-nav {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
