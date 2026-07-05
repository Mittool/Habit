"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import PageHeader from "@/components/PageHeader";
import {
  Sparkles,
  Zap,
  Send,
  Loader,
  Brain,
  Terminal,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const INSTANT_FLOWS = [
  { id: "focus", title: "Initiate Deep Focus", prompt: "Give me a 3-step ritual to enter deep focus in the next 5 minutes." },
  { id: "proc", title: "Beat Procrastination", prompt: "I am procrastinating on a hard task. Give me a practical reframe to start immediately." },
  { id: "energy", title: "Energy Reset", prompt: "I feel mentally drained and distracted. How do I reset my focus right now?" },
  { id: "morning", title: "Peak Morning Plan", prompt: "Design an ultra-minimalist 15-minute morning routine for high productivity." },
];

function FormattedAiText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: "4px" }} />;
        let cleanLine = line.replace(/^[⚡🔥🚀🧘🌅🔋🛡️💬🔮🧠💡]+\s*/g, "");
        if (/^#{1,6}\s+/.test(cleanLine)) {
          cleanLine = "**" + cleanLine.replace(/^#{1,6}\s+/, "").replace(/\*\*$/, "") + "**";
        }
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={idx} style={{ lineHeight: "1.6" }}>
            {parts.map((part, pI) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={pI} style={{ color: "inherit", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function AiChatPage() {
  const { habits, todos, focusSessions, aiEnabled, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<"chat" | "generator" | "oracle">("chat");

  const displayName = (user?.name || "").trim().split(/\s+/)[0] || "";
  const greetingBody = `Ask me anything — habits, focus, sleep, motivation, or whatever's on your mind. A few things I'm good at:\n\n• Building a plan for your goals\n• Fixing a habit you keep missing\n• Getting unstuck when you're procrastinating\n• Quick answers to daily questions\n\nWhat's on your mind today?`;
  const greeting = displayName
    ? `Hey ${displayName}, I'm Trac — your personal coach.\n\n${greetingBody}`
    : `Hey, I'm Trac — your personal coach.\n\n${greetingBody}`;

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: greeting }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [genLoading, setGenLoading] = useState<string | null>(null);

  const [selectedHabit, setSelectedHabit] = useState(habits[0]?.name || "");
  const [oracleTip, setOracleTip] = useState("");
  const [oracleLoading, setOracleLoading] = useState(false);

  const statsSummary = {
    totalHabits: habits.length,
    activeTodos: todos.filter(t => !t.completed).length,
    totalFocusMinutes: focusSessions.reduce((a, b) => a + b.minutes, 0),
  };

  async function handleSendMessage(customMsg?: string) {
    const query = customMsg || inputVal;
    if (!query.trim() || chatLoading) return;

    const userMsg = query.trim();
    if (!customMsg) setInputVal("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          context: statsSummary,
          userName: displayName,
          history: messages,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Couldn't reach the AI just now. Try again in a moment:\n• Check your internet\n• Or wait 30 seconds and retry" }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function triggerInstantFlow(flow: typeof INSTANT_FLOWS[0]) {
    setGenLoading(flow.id);
    setActiveTab("chat");
    await handleSendMessage(flow.prompt);
    setGenLoading(null);
  }

  async function handleOracleConsult() {
    if (!selectedHabit) return;
    setOracleLoading(true);
    setOracleTip("");
    try {
      const h = habits.find(hb => hb.name === selectedHabit);
      const completionsArr = h ? Object.entries(h.completions || {}) : [];
      const last30 = completionsArr.slice(-30);
      const done30 = last30.filter(([, v]) => v).length;
      const habitStats = h ? {
        createdAt: h.createdAt,
        totalDaysTracked: completionsArr.length,
        completionsLast30Days: done30,
        rateLast30Days: last30.length > 0 ? Math.round((done30 / last30.length) * 100) : 0,
        recentMisses: last30.filter(([, v]) => !v).map(([d]) => d).slice(-5),
        goal: h.goal || null,
        reminderTime: h.reminderTime || null,
      } : {};
      const res = await fetch("/api/ai/habit-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missedHabit: selectedHabit, stats: habitStats, userName: displayName }),
      });
      const data = await res.json();
      setOracleTip(data.tip);
    } catch {
      setOracleTip("**AI Tip:** Anchor this habit immediately after your morning coffee. Consistency builds through daily trigger pairing.");
    } finally {
      setOracleLoading(false);
    }
  }

  if (!aiEnabled) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ maxWidth: "400px" }}>
          <img src="/logo-inside.png" alt="Trac AI" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", opacity: 0.5 }} />
          <h2 style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>AI Assistant Disabled</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "8px 0 24px" }}>Enable AI features in Settings to unlock your productivity companion.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 22px 10px", maxWidth: "820px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {/* Standard PageHeader — same shape as every other top-level page */}
      <PageHeader
        eyebrow="Your personal coach"
        title="AI"
        right={
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9999, backgroundColor: "var(--success-soft)", color: "var(--success)", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <div style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: "var(--success)" }} />
            Online
          </div>
        }
      />

      {/* Segment tabs — same pill style as Planner / Focus / Insights */}
      <div style={{ display: "flex", gap: 4, backgroundColor: "var(--bg-secondary)", padding: 4, borderRadius: 9999, border: "1px solid var(--border)", width: "fit-content", marginBottom: 18 }}>
        {[
          { id: "chat", label: "Chat", icon: <Terminal size={13} /> },
          { id: "generator", label: "Tips", icon: <Zap size={13} /> },
          { id: "oracle", label: "Habits", icon: <Brain size={13} /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="cursor-pointer"
              style={{
                padding: "8px 16px",
                borderRadius: 9999,
                border: "none",
                backgroundColor: isActive ? "var(--bg-card)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: isActive ? 700 : 600,
                fontSize: 12.5,
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                transition: "all 0.15s var(--ease)",
                fontFamily: "inherit",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Chat — flows inline with the page like every other tab,
          input row is position:sticky so it always sits at the bottom of
          the scrolling page (which is naturally at the visible bottom
          when the keyboard closes it, and rises with it when open). */}
      {activeTab === "chat" && (
        <div style={{ position: "relative" }}>
          {/* Conversation Stream */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 20, minHeight: 320 }}>
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              return (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    alignSelf: isAi ? "flex-start" : "flex-end",
                    maxWidth: "88%",
                    padding: "14px 18px",
                    borderRadius: isAi ? "6px 20px 20px 20px" : "20px 6px 20px 20px",
                    backgroundColor: isAi ? "var(--bg-card)" : "var(--accent)",
                    color: isAi ? "var(--text-primary)" : "#ffffff",
                    border: isAi ? "1px solid var(--border)" : "none",
                    boxShadow: isAi ? "var(--shadow-sm)" : "var(--shadow-accent)",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  {isAi && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10.5, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                      <img src="/logo-inside.png" alt="" style={{ width: 14, height: 14, borderRadius: 9999, objectFit: "cover" }} />
                      <span>Trac</span>
                    </div>
                  )}
                  {isAi ? <FormattedAiText text={m.text} /> : <div>{m.text}</div>}
                </div>
              );
            })}
            {chatLoading && (
              <div className="fade-in" style={{ alignSelf: "flex-start", padding: "14px 18px", borderRadius: "6px 20px 20px 20px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, color: "var(--accent)", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-sm)" }}>
                <Loader size={16} className="spin" />
                <span>Trac AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Sticky footer: chips + input pill.
              position:sticky pins this to the bottom of the visible viewport
              while chat messages scroll behind it. When the keyboard opens,
              the visible viewport shrinks and the sticky footer naturally
              rises with it — so the input is always visible above the keyboard. */}
          <div
            style={{
              position: "sticky",
              bottom: "calc(env(safe-area-inset-bottom) + 8px)",
              zIndex: 10,
              paddingTop: 8,
              // Backdrop fade so scrolling messages don't visually clash with the input
              background: "linear-gradient(to bottom, transparent 0%, var(--bg-primary) 24px, var(--bg-primary) 100%)",
              marginLeft: -22,
              marginRight: -22,
              paddingLeft: 22,
              paddingRight: 22,
              paddingBottom: 4,
            }}
          >
            {/* Quick prompt chips */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }}>
              {["Beat procrastination", "Morning plan", "Focus tips", "Reduce stress"].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={chatLoading}
                  className="cursor-pointer"
                  style={{ padding: "7px 14px", borderRadius: 9999, fontSize: 12, whiteSpace: "nowrap", flexShrink: 0, fontWeight: 600, backgroundColor: "var(--bg-card)", color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "inherit" }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "var(--bg-card)", borderRadius: 9999, padding: "4px 4px 4px 18px", border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-md)" }}>
              <input
                type="text"
                placeholder="Message Trac…"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                style={{ flex: 1, background: "transparent", border: "none", padding: "10px 0", fontSize: 14.5, boxShadow: "none", borderRadius: 0 }}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputVal.trim() || chatLoading}
                className="cursor-pointer"
                style={{
                  width: 40, height: 40, borderRadius: 9999, border: "none",
                  backgroundColor: inputVal.trim() ? "var(--accent)" : "var(--bg-secondary)",
                  color: inputVal.trim() ? "#fff" : "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background-color 0.15s ease, color 0.15s ease",
                  flexShrink: 0,
                }}
                aria-label="Send"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Quick Tips Full View */}
      {activeTab === "generator" && (
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          <div className="fade-in stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {INSTANT_FLOWS.map((flow) => (
              <div
                key={flow.id}
                className="card card-interactive cursor-pointer fade-in"
                style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px" }}
                onClick={() => triggerInstantFlow(flow)}
              >
                <div>
                  <div style={{ padding: "10px", width: "fit-content", borderRadius: "12px", backgroundColor: "var(--accent-light)", color: "var(--accent)", marginBottom: "14px" }}>
                    <Zap size={22} />
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 8px" }}>
                    {flow.title}
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                    Get instant AI coaching and smart habit advice.
                  </p>
                </div>

                <button disabled={genLoading === flow.id} className="btn-primary cursor-pointer" style={{ width: "100%", padding: "12px", fontSize: "13.5px" }}>
                  {genLoading === flow.id ? <><Loader size={16} className="spin" /> Getting Advice...</> : <><Sparkles size={16} /> Get Advice</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Habit Help Full View */}
      {activeTab === "oracle" && (
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          <div className="card fade-in stagger-1" style={{ padding: "28px", maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <img src="/logo-inside.png" alt="AI Chat" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                  Habit Help & Recovery
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Select any missed habit to get practical AI advice on getting back on track.
                </p>
              </div>
            </div>

            {habits.length === 0 ? (
              <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", borderRadius: "14px" }}>
                No active habits tracked. Add habits first.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div>
                  <label style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                    Select Habit:
                  </label>
                  <select
                    value={selectedHabit}
                    onChange={e => setSelectedHabit(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px" }}
                    className="cursor-pointer"
                  >
                    {habits.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <button onClick={handleOracleConsult} disabled={oracleLoading || !selectedHabit} className="btn-primary cursor-pointer" style={{ width: "100%", padding: "14px", fontSize: "14.5px" }}>
                  {oracleLoading ? <><Loader size={18} className="spin" /> Getting Tips...</> : <><Sparkles size={18} /> Get AI Tip</>}
                </button>

                {oracleTip && (
                  <div className="fade-in" style={{ padding: "20px", backgroundColor: "var(--accent-light)", borderRadius: "14px", borderLeft: "4px solid var(--accent)", fontSize: "14.5px", fontWeight: "500", color: "var(--text-primary)", lineHeight: "1.6" }}>
                    <div style={{ fontWeight: "600", color: "var(--accent)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <img src="/logo-inside.png" alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                      <span>AI Tip:</span>
                    </div>
                    <FormattedAiText text={oracleTip} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
