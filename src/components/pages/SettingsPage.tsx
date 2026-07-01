"use client";
import React, { useEffect, useState } from "react";
import { useAppStore, Theme } from "@/lib/store";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { performIsolatedSignOut, syncUserProfileName } from "@/lib/cloud";
import { enableAndLinkPush, clearOneSignalExternalUserId } from "@/lib/onesignal";
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
  Cloud,
  Bot,
} from "lucide-react";

const THEMES: { id: Theme; name: string; desc: string; icon: React.ReactNode }[] = [
  { id: "white-paper", name: "White Paper", desc: "Clean and minimal light mode", icon: <Sun size={18} /> },
  { id: "dark-paper", name: "Dark Paper", desc: "Easy on eyes midnight dark mode", icon: <Moon size={18} /> },
  { id: "zen", name: "Zen", desc: "Calming warm sand earth tones", icon: <Leaf size={18} /> },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: "48px",
        height: "26px",
        borderRadius: "9999px",
        border: "none",
        backgroundColor: checked ? "var(--accent)" : "var(--border)",
        cursor: "pointer",
        position: "relative",
        transition: "background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        flexShrink: 0,
      }}
      aria-pressed={checked}
    >
      <div
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          position: "absolute",
          top: "3px",
          left: checked ? "25px" : "3px",
          transition: "left 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
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
    setUser,
    aiEnabled,
    setAiEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    cloudSyncEnabled,
    setCloudSyncEnabled,
  } = useAppStore();
  const router = useRouter();
  const [editName, setEditName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");

  async function handleSignOut() {
    await performIsolatedSignOut();
    router.push("/auth");
  }

  async function handleSaveName() {
    if (user && newName.trim()) {
      const cleanName = newName.trim();
      const res = await syncUserProfileName(cleanName);
      if (!res.success && !res.offline) {
        alert("Warning: Name updated locally, but cloud profile sync failed. Will retry automatically.");
      }
    }
    setEditName(false);
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: "720px", margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Settings
        </h2>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: "400", color: "var(--text-muted)" }}>
          Manage account identity, cloud sync preferences, AI features, and aesthetics.
        </p>
      </div>

      {/* Account */}
      <div className="card fade-in stagger-1" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <User size={18} color="var(--accent)" />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Identity & Account</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "20px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 8px var(--shadow)" }}>
            {(user?.name || "U")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            {editName ? (
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1, fontSize: "14px", fontWeight: "500" }} autoFocus onKeyDown={(e) => e.key === "Enter" && handleSaveName()} />
                <button onClick={handleSaveName} className="btn-primary cursor-pointer" style={{ padding: "8px 14px" }}><Check size={16} /></button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>{user?.name || "User"}</div>
                <div style={{ fontSize: "13px", fontWeight: "400", color: "var(--text-muted)" }}>{user?.email || "Local On-Device Account"}</div>
              </>
            )}
          </div>
          {!editName && (
            <button onClick={() => setEditName(true)} className="cursor-pointer" style={{ fontSize: "13px", fontWeight: "500", color: "var(--accent)", background: "var(--bg-card)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: "8px" }}>
              Edit Name
            </button>
          )}
        </div>
      </div>

      {/* Cloud Sync Settings */}
      <div className="card fade-in stagger-2" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Cloud size={18} color="var(--accent)" />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Cloud Sync</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "500", color: "var(--text-primary)" }}>Save all data in cloud</div>
            <div style={{ fontSize: "12px", fontWeight: "400", color: "var(--text-muted)", lineHeight: "1.5", marginTop: "4px" }}>
              When enabled, your habits, focus minutes, and task logs sync securely to cloud storage. Default is OFF (local-first privacy).
            </div>
          </div>
          <Toggle checked={cloudSyncEnabled} onChange={() => setCloudSyncEnabled(!cloudSyncEnabled)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "500", color: cloudSyncEnabled ? "var(--accent)" : "var(--text-muted)", padding: "10px 14px", borderRadius: "8px", backgroundColor: cloudSyncEnabled ? "var(--accent-light)" : "var(--bg-secondary)" }}>
          <Shield size={14} color={cloudSyncEnabled ? "var(--accent)" : "var(--text-muted)"} />
          {cloudSyncEnabled ? "Cloud sync is active. Your data is backed up securely." : "Cloud sync is currently OFF. All records remain purely on your device."}
        </div>
      </div>

      {/* Trac AI Features */}
      <div className="card fade-in stagger-3" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <img src="/logo-inside.png" alt="Trac AI" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Trac AI Engine</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px", backgroundColor: "var(--bg-secondary)", borderRadius: "12px" }}>
          <div>
            <div style={{ fontSize: "15px", fontWeight: "500", color: "var(--text-primary)" }}>Productivity intelligence</div>
            <div style={{ fontSize: "12px", fontWeight: "400", color: "var(--text-muted)", lineHeight: "1.5", marginTop: "4px" }}>
              Enable Trac AI productivity coaching, personalized habit recovery tips, and dynamic daily wisdom.
            </div>
          </div>
          <Toggle checked={aiEnabled} onChange={() => setAiEnabled(!aiEnabled)} />
        </div>
      </div>

      {/* Smart Notifications Switch */}
      <div className="card fade-in stagger-3" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Bell size={18} color="var(--accent)" />
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Smart Notifications</h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "2px 0 0" }}>Adaptive habit reminders and task alerts</p>
            </div>
          </div>
          <Toggle
            checked={notificationsEnabled}
            onChange={async () => {
              const willEnable = !notificationsEnabled;
              if (willEnable) {
                // Turning ON — run the full push setup silently in one shot.
                setNotificationsEnabled(true);
                const currentUserId = useAppStore.getState().user?.id;
                await enableAndLinkPush(currentUserId);
              } else {
                // Turning OFF — flip the flag and unlink so nothing more fires.
                setNotificationsEnabled(false);
                clearOneSignalExternalUserId();
              }
            }}
          />
        </div>
      </div>

      {/* Themes */}
      <div className="card fade-in stagger-4" style={{ padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Palette size={18} color="var(--accent)" />
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>Aesthetics & Theme</h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {THEMES.map((t) => {
            const isSelected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="cursor-pointer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "16px",
                  borderRadius: "12px",
                  border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: isSelected ? "var(--accent-light)" : "var(--bg-secondary)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  textAlign: "left",
                }}
              >
                <div style={{ color: isSelected ? "var(--accent)" : "var(--text-muted)" }}>{t.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)" }}>{t.name}</div>
                  <div style={{ fontSize: "12px", fontWeight: "400", color: "var(--text-muted)" }}>{t.desc}</div>
                </div>
                {isSelected && <Check size={18} color="var(--accent)" />}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={handleSignOut} className="btn-secondary cursor-pointer fade-in stagger-4" style={{ width: "100%", padding: "14px", color: "#EF4444", fontSize: "14px", fontWeight: "500" }}>
        <LogOut size={18} /> Sign out
      </button>
    </div>
  );
}
