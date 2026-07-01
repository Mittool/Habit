"use client";
import React from "react";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { Bell, Trash2, CheckCheck, BellOff, Loader, Smartphone, ShieldCheck, Clock, CheckCircle2, Send, AlertTriangle, Link2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { promptOneSignalPush, syncOneSignalUserTags, getOneSignalStatus, enableAndLinkPush, OneSignalStatus } from "@/lib/onesignal";

interface TestResult {
  ok: boolean;
  message: string;
  detail?: any;
}

export default function NotificationsPage() {
  const { aiNotifications, markNotificationRead, clearNotifications, habits, todos, aiEnabled, addAiNotification, user } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>("default");
  const [testing, setTesting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [osStatus, setOsStatus] = useState<OneSignalStatus | null>(null);

  const refreshStatus = useCallback(async () => {
    const s = await getOneSignalStatus();
    setOsStatus(s);
    setPermissionStatus(s.permission);
  }, []);

  useEffect(() => {
    refreshStatus();
    // Poll every 2s so status updates as the user grants permission / SDK finishes booting
    const iv = setInterval(refreshStatus, 2000);
    return () => clearInterval(iv);
  }, [refreshStatus]);

  async function handleEnableAndLink() {
    setLinking(true);
    setTestResult(null);
    const res = await enableAndLinkPush(user?.id);
    setLinking(false);
    await refreshStatus();
    if (!res.ok) {
      setTestResult({
        ok: false,
        message:
          res.reason === "permission-denied"
            ? "Permission denied. Enable notifications in your device system settings, then try again."
            : `Failed: ${res.reason}`,
      });
    } else {
      // Give OneSignal ~1.5s to propagate the subscription server-side, then send a test push
      setTimeout(async () => {
        await sendTestPush();
      }, 1500);
    }
  }

  async function sendTestPush() {
    setTesting(true);
    setTestResult(null);
    const externalUserId = (typeof window !== "undefined" ? localStorage.getItem("trac-one-signal-external-id") : null) || user?.id || "";
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalUserId }),
      });
      const data = await res.json();
      setTestResult({
        ok: !!data.ok,
        message: data.ok ? data.message : (data.error || "Unknown error"),
        detail: data,
      });
    } catch (err: any) {
      setTestResult({ ok: false, message: `Fetch failed: ${err?.message || err}` });
    } finally {
      setTesting(false);
    }
  }

  async function requestMobilePermissions() {
    promptOneSignalPush();
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are supported when installed as an app.");
      return;
    }
    const perm = await Notification.requestPermission();
    setPermissionStatus(perm);
    if (perm === "granted") {
      syncOneSignalUserTags({ active_habits: habits.length, push_enabled: true });
      addAiNotification("Mobile Push Activated! Alerts will trigger daily.");
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification("Trac Mobile Nexus", {
            body: "Adaptive daily notification rhythm active.",
            icon: "/logo.png",
            badge: "/logo.png"
          } as any);
        });
      }
    } else {
      alert("Notification access denied. To receive iOS & Android alerts, please allow notifications in device system settings.");
    }
  }

  async function generateSmartReminder() {
    if (!aiEnabled) return;
    setGenerating(true);
    const pendingTodos = todos.filter((t) => !t.completed).length;
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const missedToday = habits.filter((h) => !h.completions[todayKey]).length;

    const context = `User has ${pendingTodos} pending tasks and ${missedToday} habits not yet done today. It's ${format(new Date(), "h:mm a")}.`;
    try {
      const res = await fetch("/api/ai/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });
      const data = await res.json();
      addAiNotification(data.message);
    } catch {
      addAiNotification("Time to check in — execute your priority habit right now to maintain daily consistency.");
    } finally {
      setGenerating(false);
    }
  }

  const unread = aiNotifications.filter((n) => !n.read).length;

  return (
    <div style={{ padding: "32px 24px", maxWidth: "760px", margin: "0 auto" }}>
      <div className="fade-in" style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "26px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Notifications Architecture
        </h2>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: "500", color: "var(--text-muted)" }}>
          Manage mobile app push notifications, exact locked completion schedules, and alert telemetry.
        </p>
      </div>

      {/* Mobile Push Card */}
      <div className="card fade-in stagger-1" style={{ padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
              <Smartphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "17px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                Mobile Push Alerts
              </h3>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)", textTransform: "none" }}>
                Daily Reminders
              </span>
            </div>
          </div>

          {(() => {
            const optedIn = !!osStatus?.optedIn;
            const label = optedIn ? "ACTIVE" : (osStatus?.permission === "denied" ? "BLOCKED" : "NOT SUBSCRIBED");
            const bg = optedIn ? "#D1FAE5" : "#FEF3C7";
            const fg = optedIn ? "#0D9488" : "#D97706";
            return (
              <div style={{ padding: "6px 12px", borderRadius: "9999px", backgroundColor: bg, color: fg, fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={16} />
                <span>Status: {label}</span>
              </div>
            );
          })()}
        </div>

        <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)", lineHeight: "1.5", margin: "0 0 18px" }}>
          When installed on iOS or Android, Trac captures the exact time you check off each habit. Tomorrow, push notifications will deliver motivational reminders at that exact time. If you complete it at a different time tomorrow, your reminder time automatically shifts to match!
        </p>

        <button
          onClick={requestMobilePermissions}
          className="btn-primary cursor-pointer"
          style={{ width: "100%", padding: "14px", fontSize: "14px", fontWeight: "600" }}
        >
          <Smartphone size={18} />
          <span>{permissionStatus === "granted" ? "Mobile Push Alerts Active" : "Enable Mobile Push Notifications"}</span>
        </button>

        {/* ─── Diagnostics & Test Push ─── */}
        <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "10px" }}>
            Push Diagnostics
          </div>

          {(() => {
            const permOk = osStatus?.permission === "granted";
            const linkOk = !!osStatus?.externalId && !!user?.id && osStatus?.externalId === user.id;
            const subOk = !!osStatus?.pushSubscriptionId && !!osStatus?.optedIn;
            const runtime = osStatus?.runtime ?? "unknown";
            const runtimeLabel = runtime === "median" ? "Native app (Median)" : runtime === "web" ? "Web browser / PWA" : "detecting...";
            const rows: Array<[string, string, boolean]> = [
              ["Runtime", runtimeLabel, runtime !== "unknown"],
              ["SDK loaded", osStatus?.sdkReady ? "yes" : "loading...", !!osStatus?.sdkReady],
              ["Permission", osStatus?.permission || "checking", permOk],
              ["Signed-in user", user?.id ? user.id.slice(0, 8) + "..." : "not signed in", !!user?.id],
              ["Push subscription", subOk ? (osStatus?.pushSubscriptionId?.slice(0, 8) + "...") : (osStatus?.optedIn ? "opted in" : "not subscribed"), subOk],
              ["OneSignal link", linkOk ? "linked ✓" : (osStatus?.externalId ? "id mismatch" : "not linked"), linkOk],
            ];
            return (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", columnGap: "12px", rowGap: "8px", fontSize: "12px", fontWeight: "500", marginBottom: "12px", alignItems: "center" }}>
                {rows.map(([label, val, ok]) => (
                  <React.Fragment key={label}>
                    <span style={{ color: "var(--text-muted)" }}>{label}:</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: "600", wordBreak: "break-all" }}>{val}</span>
                    <span style={{ color: ok ? "#0D9488" : "#D97706", fontSize: "14px" }}>{ok ? "●" : "○"}</span>
                  </React.Fragment>
                ))}
              </div>
            );
          })()}

          {/* One-tap fix: permission + opt-in + link + test push */}
          {(() => {
            const allGood = osStatus?.permission === "granted" && !!osStatus?.pushSubscriptionId && !!osStatus?.optedIn && !!osStatus?.externalId && osStatus.externalId === user?.id;
            return (
              <button
                onClick={handleEnableAndLink}
                disabled={linking || testing || !user?.id}
                className="btn-primary cursor-pointer"
                style={{ width: "100%", padding: "12px", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}
              >
                {linking ? <Loader size={14} className="spin" /> : <Link2 size={14} />}
                {linking ? "Enabling & linking..." : allGood ? "Re-link and Send Test Push" : "Enable Push & Link My Device"}
              </button>
            );
          })()}

          <button
            onClick={sendTestPush}
            disabled={testing || linking}
            className="btn-secondary cursor-pointer"
            style={{ width: "100%", padding: "10px", fontSize: "12.5px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            {testing ? <Loader size={14} className="spin" /> : <Send size={14} />}
            {testing ? "Sending test push..." : "Send Test Push Only"}
          </button>

          {testResult && (
            <div
              className="fade-in"
              style={{
                marginTop: "10px",
                padding: "10px 12px",
                borderRadius: "8px",
                backgroundColor: testResult.ok ? "rgba(13,148,136,0.08)" : "rgba(220,38,38,0.08)",
                border: `1px solid ${testResult.ok ? "rgba(13,148,136,0.3)" : "rgba(220,38,38,0.3)"}`,
                fontSize: "12px",
                fontWeight: "500",
                color: testResult.ok ? "#0D9488" : "#DC2626",
                lineHeight: "1.5",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                {testResult.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span style={{ flex: 1 }}>{testResult.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Habit Notification Times Matrix */}
      {habits.length > 0 && (
        <div className="card fade-in stagger-2" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <Clock size={18} color="var(--accent)" />
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
              Dynamic Habit Daily Schedules
            </h3>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px" }}>
            Notification times dynamically adapt every day to match when you most recently checked off each habit.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {habits.map((h) => {
              const isScheduled = !!h.notificationTime;
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "12px", backgroundColor: "var(--bg-secondary)", border: isScheduled ? "1px solid var(--border)" : "1px dashed var(--text-muted)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "9999px", backgroundColor: h.color }} />
                    <div>
                      <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{h.name}</div>
                      <div style={{ fontSize: "11px", fontWeight: "600", color: isScheduled ? "var(--accent)" : "var(--text-muted)", marginTop: "2px" }}>
                        {isScheduled ? "Targeting yesterday's completion time" : "Awaiting tick click to anchor tomorrow's time"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ padding: "6px 12px", borderRadius: "8px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", fontSize: "13px", fontWeight: "600", color: isScheduled ? "var(--accent)" : "var(--text-muted)" }}>
                      {h.notificationTime || "Pending Tick"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alerts Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
            Alert History
          </h3>
          {unread > 0 && (
            <span
              style={{
                backgroundColor: "#EF4444",
                color: "white",
                fontSize: "11px",
                fontWeight: "600",
                padding: "2px 8px",
                borderRadius: "9999px",
              }}
            >
              {unread}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {aiEnabled && (
            <button
              onClick={generateSmartReminder}
              disabled={generating}
              className="btn-secondary cursor-pointer"
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              {generating ? <Loader size={14} className="spin" /> : <img src="/logo-inside.png" alt="" style={{ width: "14px", height: "14px", objectFit: "contain" }} />}
              <span>Smart Check-In</span>
            </button>
          )}
          {aiNotifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="btn-secondary cursor-pointer"
              style={{ padding: "8px 14px", fontSize: "12px", color: "#EF4444" }}
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {aiNotifications.length === 0 ? (
        <div
          className="card fade-in stagger-3"
          style={{ padding: "56px 24px", textAlign: "center", color: "var(--text-muted)", borderStyle: "dashed" }}
        >
          <BellOff size={44} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: "15px", fontWeight: "600", margin: "0 0 6px", color: "var(--text-primary)" }}>No alerts yet</p>
          <p style={{ fontSize: "13px", fontWeight: "500", margin: 0 }}>
            Scheduled check-ins and locked time reminders will appear here when active.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {aiNotifications.map((n) => (
            <div
              key={n.id}
              className="card fade-in"
              style={{
                padding: "16px 18px",
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                borderLeft: n.read ? "1px solid var(--border)" : "4px solid var(--accent)",
                opacity: n.read ? 0.75 : 1,
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "9999px",
                  backgroundColor: n.read ? "var(--border)" : "var(--accent)",
                  flexShrink: 0,
                  marginTop: "5px",
                }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: n.read ? "500" : "600",
                    color: "var(--text-primary)",
                    lineHeight: "1.5",
                    margin: "0 0 6px",
                  }}
                >
                  {n.message}
                </p>
                <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--text-muted)" }}>
                  {format(new Date(n.timestamp), "MMM d, h:mm a")}
                </span>
              </div>
              {!n.read && (
                <button
                  onClick={() => markNotificationRead(n.id)}
                  className="cursor-pointer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    padding: "4px",
                  }}
                  title="Mark as read"
                >
                  <CheckCheck size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
