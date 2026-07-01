"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Navigation, { NavPage } from "@/components/Navigation";
import HomePage from "@/components/pages/HomePage";
import PlannerPage from "@/components/pages/PlannerPage";
import AiChatPage from "@/components/pages/AiChatPage";
import FocusPage from "@/components/pages/FocusPage";
import InsightsPage from "@/components/pages/InsightsPage";
import SettingsPage from "@/components/pages/SettingsPage";
import NotificationsPage from "@/components/pages/NotificationsPage";
import { initMobilePushScheduler } from "@/lib/pwa";
import { setupWebViewNavigationBridge } from "@/lib/median-webview";
import { refreshAllReminders, scheduleMidnightRefresh } from "@/lib/scheduler";

export default function MainApp() {
  const { isAuthenticated, onboardingDone, habits, todos } = useAppStore();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<NavPage>("home");
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

  // Median WebView Hardware Back Button & Context Menu Bridge
  useEffect(() => {
    if (!hydrated) return;
    const cleanup = setupWebViewNavigationBridge(
      () => currentPage,
      (targetTab) => setCurrentPage(targetTab as NavPage)
    );
    return cleanup;
  }, [hydrated, currentPage]);

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
        return <HomePage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
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
        return <InsightsPage initialTab={["mood", "sleep"].includes(currentPage) ? currentPage as any : "stats"} onNavigate={(p) => setCurrentPage(p as NavPage)} />;
      case "settings":
        return <SettingsPage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
      case "notifications":
        return <NotificationsPage />;
      default:
        return <HomePage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <Navigation current={currentPage} onChange={setCurrentPage} />

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
