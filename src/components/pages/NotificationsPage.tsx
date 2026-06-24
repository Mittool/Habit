"use client";
import { useAppStore } from "@/lib/store";
import { format } from "date-fns";
import { Bell, Trash2, CheckCheck, BellOff, Loader } from "lucide-react";
import { useState } from "react";

export default function NotificationsPage() {
  const { aiNotifications, markNotificationRead, clearNotifications, habits, todos, aiEnabled } = useAppStore();
  const [generating, setGenerating] = useState(false);
  const { addAiNotification } = useAppStore();

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
      addAiNotification("Time to check in — how are your habits and tasks going today?");
    } finally {
      setGenerating(false);
    }
  }

  const unread = aiNotifications.filter((n) => !n.read).length;

  return (
    <div style={{ padding: "24px", maxWidth: "600px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Bell size={20} color="var(--accent)" />
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
            Notifications
          </h2>
          {unread > 0 && (
            <span
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                fontSize: "11px",
                fontWeight: "600",
                padding: "2px 7px",
                borderRadius: "10px",
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
              className="btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                padding: "7px 12px",
              }}
            >
              {generating ? <Loader size={14} /> : <Bell size={14} />}
              Smart Reminder
            </button>
          )}
          {aiNotifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "7px 12px" }}
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {aiNotifications.length === 0 ? (
        <div
          className="card"
          style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}
        >
          <BellOff size={40} strokeWidth={1} style={{ marginBottom: "12px", opacity: 0.4 }} />
          <p style={{ fontSize: "14px", margin: "0 0 6px" }}>No notifications yet</p>
          <p style={{ fontSize: "12px", margin: 0 }}>
            {aiEnabled
              ? "Click Smart Reminder for an AI-generated check-in, or wait for timeboxed task reminders."
              : "Timeboxed task reminders will appear here when notifications are enabled."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {aiNotifications.map((n) => (
            <div
              key={n.id}
              className="card fade-in"
              style={{
                padding: "14px 16px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                borderLeft: n.read ? "none" : "3px solid var(--accent)",
                opacity: n.read ? 0.7 : 1,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: n.read ? "var(--border)" : "var(--accent)",
                  flexShrink: 0,
                  marginTop: "5px",
                }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    lineHeight: "1.5",
                    margin: "0 0 6px",
                  }}
                >
                  {n.message}
                </p>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {format(new Date(n.timestamp), "MMM d, h:mm a")}
                </span>
              </div>
              {!n.read && (
                <button
                  onClick={() => markNotificationRead(n.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "2px",
                    flexShrink: 0,
                  }}
                  title="Mark as read"
                >
                  <CheckCheck size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
