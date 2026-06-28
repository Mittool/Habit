"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import Navigation, { NavPage } from "@/components/Navigation";
import HomePage from "@/components/pages/HomePage";
import AiHubPage from "@/components/pages/AiHubPage";
import HabitsPage from "@/components/pages/HabitsPage";
import TodoPage from "@/components/pages/TodoPage";
import PomodoroPage from "@/components/pages/PomodoroPage";
import TimeBoxPage from "@/components/pages/TimeBoxPage";
import AnalyticsPage from "@/components/pages/AnalyticsPage";
import MoodPage from "@/components/pages/MoodPage";
import SleepPage from "@/components/pages/SleepPage";
import MusicPage from "@/components/pages/MusicPage";
import SettingsPage from "@/components/pages/SettingsPage";
import { initMobilePushScheduler } from "@/lib/pwa";
import {
  Menu,
  Home,
  CheckSquare,
  Clock,
  Timer,
  Calendar,
  BarChart2,
  Smile,
  Moon,
  Music,
  Settings,
} from "lucide-react";

export default function MainApp() {
  const { isAuthenticated, onboardingDone, habits, todos } = useAppStore();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState<NavPage>("home");
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Mobile push scheduler listener
  useEffect(() => {
    if (!hydrated) return;
    const cleanup = initMobilePushScheduler(habits, todos);
    return cleanup;
  }, [hydrated, habits, todos]);

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
      case "ai-hub":
        return <AiHubPage />;
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
      case "sleep":
        return <SleepPage />;
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

      {/* Global Top-Right Floating Menu Button (Immune to Stacking Context & Clipping) */}
      <div style={{ position: "fixed", top: "18px", right: "20px", zIndex: 999999 }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="btn-secondary cursor-pointer"
          style={{
            padding: "10px 12px",
            borderRadius: "12px",
            backgroundColor: "var(--bg-card)",
            border: menuOpen ? "1.5px solid var(--accent)" : "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          }}
          title="All Shortcuts"
        >
          <Menu size={22} color="var(--text-primary)" />
        </button>

        {menuOpen && (
          <>
            {/* Invisible fixed backdrop */}
            <div
              style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999998 }}
              onClick={() => setMenuOpen(false)}
            />

            {/* Floating popover sheet */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                width: "220px",
                maxHeight: "80vh",
                overflowY: "auto",
                padding: "8px",
                zIndex: 999999,
                borderRadius: "16px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(0,0,0,0.06)",
                animation: "menuDropSpring 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <div style={{ padding: "6px 12px 8px", borderBottom: "1px solid var(--border)", marginBottom: "4px", fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                All Shortcuts
              </div>

              {[
                { id: "home", label: "Home", icon: <Home size={16} color="var(--text-secondary)" /> },
                { id: "ai-hub", label: "Trac AI", icon: <img src="/logo.png" alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} /> },
                { id: "habits", label: "Habits", icon: <CheckSquare size={16} color="#10B981" /> },
                { id: "todo", label: "Tasks", icon: <Clock size={16} color="#3B82F6" /> },
                { id: "pomodoro", label: "Focus Timer", icon: <Timer size={16} color="#F59E0B" /> },
                { id: "timebox", label: "TimeBox", icon: <Calendar size={16} color="#8B5CF6" /> },
                { id: "analytics", label: "Stats", icon: <BarChart2 size={16} color="#6366F1" /> },
                { id: "mood", label: "Mood", icon: <Smile size={16} color="#F97316" /> },
                { id: "sleep", label: "Sleep", icon: <Moon size={16} color="#4F46E5" /> },
                { id: "music", label: "Music", icon: <Music size={16} color="#EC4899" /> },
                { id: "settings", label: "Settings", icon: <Settings size={16} color="var(--text-muted)" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setMenuOpen(false);
                    setCurrentPage(item.id as NavPage);
                  }}
                  className="cursor-pointer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    fontSize: "13.5px",
                    fontWeight: "600",
                    textAlign: "left",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "20px" }}>
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
