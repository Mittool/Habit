"use client";
import { useEffect, useState } from "react";
import { useAppStore, Theme } from "@/lib/store";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Sun,
  Moon,
  Leaf,
  User,
  LogOut,
  Bell,
  Shield,
  Check,
  Palette,
  Brain,
  Database,
  Trash2,
  Clock,
} from "lucide-react";

const THEMES: { id: Theme; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: "white-paper", name: "White Paper", desc: "Clean and minimal", icon: <Sun size={16} /> },
  { id: "dark-paper", name: "Dark Paper", desc: "Easy on eyes at night", icon: <Moon size={16} /> },
  { id: "zen", name: "Zen", desc: "Warm earth tones", icon: <Leaf size={16} /> },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: "42px",
        height: "24px",
        borderRadius: "12px",
        border: "none",
        backgroundColor: checked ? "var(--accent)" : "var(--border)",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
      }}
      aria-pressed={checked}
    >
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          backgroundColor: "white",
          position: "absolute",
          top: "3px",
          left: checked ? "21px" : "3px",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}

export default function SettingsPage() {
  const {
    user,
    theme,
    setTheme,
    setAuthenticated,
    setUser,
    habits,
    todos,
    moodEntries,
    focusSessions,
    timeBlocks,
    aiNotifications,
    aiEnabled,
    setAiEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useAppStore();
  const router = useRouter();
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [storageText, setStorageText] = useState("Local browser storage");

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        const used = estimate.usage ? (estimate.usage / 1024).toFixed(1) : "0";
        const quota = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(0) : "available";
        setStorageText(`${used} KB used of ${quota} MB browser quota`);
      }).catch(() => {});
    }
  }, []);

  async function handleSignOut() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore if supabase not configured
      }
    }
    setAuthenticated(false);
    setUser(null);
    router.push("/auth");
  }

  function handleSaveName() {
    if (user && newName.trim()) {
      useAppStore.getState().setUser({ ...user, name: newName.trim() });
    }
    setEditName(false);
  }

  function clearLocalAppData() {
    if (typeof window === "undefined") return;
    const ok = window.confirm("Clear all local Trac data on this device? This cannot be undone.");
    if (!ok) return;
    window.localStorage.removeItem("habitflow-storage");
    window.location.href = "/auth";
  }

  const stats = {
    habits: habits.length,
    todos: todos.length,
    timeBlocks: timeBlocks.length,
    moodEntries: moodEntries.length,
    focusDays: focusSessions.length,
    notifications: aiNotifications.length,
  };

  return (
    <div style={{ padding: "24px", maxWidth: "640px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 8px" }}>
        Settings
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: "13px", color: "var(--text-muted)" }}>
        Manage account, storage, AI features, notifications, and themes.
      </p>

      {/* Account */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <User size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Account</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px", fontWeight: "600", flexShrink: 0 }}>
            {(user?.name || "U")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            {editName ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, fontSize: "14px" }} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
                <button onClick={handleSaveName} className="btn-primary" style={{ padding: "6px 10px" }}><Check size={14} /></button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{user?.name || "User"}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{user?.email}</div>
              </>
            )}
          </div>
          {!editName && (
            <button onClick={() => setEditName(true)} style={{ fontSize: "12px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Storage */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Database size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Storage</h3>
        </div>
        <div style={{ padding: "12px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>Local-first data</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.5" }}>{storageText}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
          {[
            { label: "Habits", value: stats.habits },
            { label: "Tasks", value: stats.todos },
            { label: "Blocks", value: stats.timeBlocks },
            { label: "Mood logs", value: stats.moodEntries },
            { label: "Focus days", value: stats.focusDays },
            { label: "Alerts", value: stats.notifications },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>{s.value}</div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <button onClick={clearLocalAppData} className="btn-secondary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#ef4444", borderColor: "#fecaca" }}>
          <Trash2 size={14} /> Clear local data
        </button>
      </div>

      {/* AI Features */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Brain size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>AI Features</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>AI Coach and AI Tips</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
              Turn off to remove AI coach, AI advice, AI habit tips, and smart AI reminders.
            </div>
          </div>
          <Toggle checked={aiEnabled} onChange={() => setAiEnabled(!aiEnabled)} />
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Bell size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Notifications</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 14px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-primary)" }}>Timeboxed task reminders</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.5" }}>
              Shows normal reminders for scheduled time blocks with a motivation quote.
            </div>
          </div>
          <Toggle checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)", padding: "10px 12px", borderRadius: "8px", backgroundColor: "var(--accent-light)" }}>
          <Clock size={14} color="var(--accent)" />
          Reminders are generated locally from your time boxes and do not require AI.
        </div>
      </div>

      {/* Theme */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Palette size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Themes</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "8px", border: `2px solid ${theme === t.id ? "var(--accent)" : "var(--border)"}`, backgroundColor: theme === t.id ? "var(--accent-light)" : "var(--bg-secondary)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
              <div style={{ color: theme === t.id ? "var(--accent)" : "var(--text-muted)" }}>{t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>{t.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.desc}</div>
              </div>
              {theme === t.id && <Check size={16} color="var(--accent)" />}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Shield size={16} color="var(--accent)" />
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Privacy</h3>
        </div>
        <div style={{ padding: "12px 14px", backgroundColor: "var(--accent-light)", borderRadius: "8px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Habit, task, mood, focus, and timebox data stays in your browser local storage. AI requests only send the context needed for the selected AI feature.
        </div>
      </div>

      <button onClick={handleSignOut} className="btn-secondary" style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#ef4444", borderColor: "#fecaca", fontSize: "14px" }}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
