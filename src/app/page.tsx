"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Navigation, { NavPage } from "@/components/Navigation";
import HomePage from "@/components/pages/HomePage";
import HabitsPage from "@/components/pages/HabitsPage";
import TodoPage from "@/components/pages/TodoPage";
import PomodoroPage from "@/components/pages/PomodoroPage";
import TimeBoxPage from "@/components/pages/TimeBoxPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";
import MoodPage from "@/components/pages/MoodPage";
import MusicPage from "@/components/pages/MusicPage";
import SettingsPage from "@/components/pages/SettingsPage";

export default function MainApp() {
  const { isAuthenticated, onboardingDone } = useAppStore();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<NavPage>("home");
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand persist to rehydrate before doing anything
  useEffect(() => {
    // useAppStore.persist has a `onFinishHydration` or we can use `hasHydrated`
    const unsubFinishHydration = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. on subsequent renders), set immediately
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsubFinishHydration;
  }, []);

  // Redirect only after hydration is complete
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth");
    } else if (!onboardingDone) {
      router.replace("/onboarding");
    }
  }, [hydrated, isAuthenticated, onboardingDone, router]);

  // Show nothing while hydrating to prevent flash/redirect
  if (!hydrated) {
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
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !onboardingDone) {
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
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Redirecting...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
      case "habits":
        return <HabitsPage />;
      case "todo":
        return <TodoPage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
      case "pomodoro":
        return <PomodoroPage />;
      case "timebox":
        return <TimeBoxPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "mood":
        return <MoodPage />;
      case "music":
        return <MusicPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage onNavigate={(p) => setCurrentPage(p as NavPage)} />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      <Navigation current={currentPage} onChange={setCurrentPage} />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          marginLeft: "72px",
          paddingBottom: "80px",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        <div className="fade-in" key={currentPage}>
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
