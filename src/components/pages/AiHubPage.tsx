"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Sparkles,
  Zap,
  Send,
  Loader,
  Brain,
  Terminal,
  RefreshCw,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

const INSTANT_FLOWS = [
  { id: "focus", title: "Start Deep Focus", prompt: "Give me a 3-step routine to enter deep focus in the next 5 minutes." },
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
                return <strong key={pI} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function AiHubPage() {
  const { habits, todos, focusSessions, aiEnabled, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<"chat" | "generator" | "oracle">("chat");

  const displayName = (user?.name || "").trim().split(/\s+/)[0] || "";
  const greetingBody = `Ask me anything — habits, focus, sleep, motivation, or whatever's on your mind. A few things I'm good at:\n\n• Building a plan for your goals\n• Fixing a habit you keep missing\n• Getting unstuck when you're procrastinating\n• Quick answers to daily questions\n\nWhat's on your mind today?`;
  const greeting = displayName
    ? `Hey ${displayName}, I'm Trac — your personal coach.\n\n${greetingBody}`
    : `Hey, I'm Trac — your personal coach.\n\n${greetingBody}`;

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: greeting }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Generator State
  const [genLoading, setGenLoading] = useState<string | null>(null);

  // Oracle State
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
      setMessages(prev => [...prev, { role: "ai", text: "**Connection Interrupted (Local Override):** Maintain focus. Execute your single highest leverage task immediately." }]);
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
      setOracleTip("**Trac AI Diagnostic:** Anchor this habit immediately after your morning ritual. Automaticity builds through consistent trigger pairing.");
    } finally {
      setOracleLoading(false);
    }
  }

  if (!aiEnabled) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div className="card fade-in" style={{ padding: "48px 24px", border: "1px solid var(--border)" }}>
          <img src="/logo-inside.png" alt="Trac AI" style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", opacity: 0.5 }} />
          <h2 style={{ fontSize: "22px", fontWeight: "600", color: "var(--text-primary)" }}>Trac AI Core Offline</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "8px 0 24px" }}>Enable Trac AI in Settings to unlock advanced neural intelligence.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: "880px", margin: "0 auto" }}>
      {/* Cyberpunk Hub Header */}
      <div className="fade-in" style={{ marginBottom: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div className="animate-glow" style={{ padding: "8px", borderRadius: "16px", background: "var(--accent-light)", border: "1px solid var(--accent)", boxShadow: "0 0 24px rgba(13, 148, 136, 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo-inside.png" alt="Trac AI" style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "600", color: "var(--text-primary)", margin: "0", letterSpacing: "-0.03em" }}>
                Trac AI Hub
              </h1>
              <span style={{ padding: "3px 8px", borderRadius: "9999px", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "10px", fontWeight: "600", textTransform: "none", letterSpacing: "0.08em" }}>
                AI Ready
              </span>
            </div>
            <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Smart daily productivity and habit coaching space
            </p>
          </div>
        </div>

        {/* Live Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "12px", backgroundColor: "var(--bg-card)", border: "1px solid var(--accent)", boxShadow: "0 0 12px var(--shadow-hover)" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10B981", boxShadow: "0 0 8px #10B981" }} />
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)" }}>Active</span>
        </div>
      </div>

      {/* Hub Navigation Menu Tabs - Clean Text & Icons Only */}
      <div className="fade-in stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "24px" }}>
        {[
          { id: "chat", label: "AI Coach Chat", icon: <Terminal size={16} /> },
          { id: "generator", label: "Quick Tips", icon: <Zap size={16} /> },
          { id: "oracle", label: "Habit Help", icon: <Brain size={16} /> },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="cursor-pointer"
              style={{
                padding: "14px 12px",
                borderRadius: "14px",
                border: `1.5px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: isActive ? "var(--accent-light)" : "var(--bg-card)",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? "800" : "600",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: isActive ? "0 4px 16px var(--shadow-hover)" : "none",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Conversational Neural Chat Interface */}
      {activeTab === "chat" && (
        <div className="card fade-in stagger-2" style={{ display: "flex", flexDirection: "column", height: "540px", overflow: "hidden", border: "1px solid var(--accent)", boxShadow: "0 8px 32px var(--shadow)" }}>
          {/* Messages Stream */}
          <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "var(--bg-secondary)" }}>
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              return (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    alignSelf: isAi ? "flex-start" : "flex-end",
                    maxWidth: "80%",
                    padding: "16px 20px",
                    borderRadius: isAi ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                    backgroundColor: isAi ? "var(--bg-card)" : "var(--accent)",
                    color: isAi ? "var(--text-primary)" : "#FFFFFF",
                    border: isAi ? "1px solid var(--border)" : "none",
                    boxShadow: "0 4px 12px var(--shadow)",
                    fontSize: "14px",
                  }}
                >
                  {isAi && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "600", color: "var(--accent)", textTransform: "none", marginBottom: "8px", letterSpacing: "0.05em" }}>
                      <img src="/logo-inside.png" alt="Trac AI" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                      <span>Trac AI Intelligence</span>
                    </div>
                  )}
                  {isAi ? <FormattedAiText text={m.text} /> : <div>{m.text}</div>}
                </div>
              );
            })}
            {chatLoading && (
              <div className="fade-in" style={{ alignSelf: "flex-start", padding: "14px 20px", borderRadius: "18px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", color: "var(--accent)", fontSize: "13px", fontWeight: "600" }}>
                <Loader size={16} className="spin" />
                <span>Trac AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips Footer - No Emojis */}
          <div style={{ padding: "10px 20px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", overflowX: "auto" }}>
            {["Max Focus Tips", "Reduce Burnout", "Morning Routine", "Time Strategy"].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                disabled={chatLoading}
                className="btn-secondary cursor-pointer"
                style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", flexShrink: 0, fontWeight: "600" }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div style={{ padding: "16px 20px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "12px" }}>
            <input
              type="text"
              placeholder="Ask Trac AI anything..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              style={{ flex: 1, backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", fontWeight: "500" }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || chatLoading}
              className="btn-primary cursor-pointer"
              style={{ padding: "12px 20px", borderRadius: "12px" }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Instant Flow Protocols Generator */}
      {activeTab === "generator" && (
        <div className="fade-in stagger-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
          {INSTANT_FLOWS.map((flow) => (
            <div
              key={flow.id}
              className="card card-interactive cursor-pointer fade-in"
              style={{
                padding: "24px",
                border: "1px solid var(--border)",
                background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
              }}
              onClick={() => triggerInstantFlow(flow)}
            >
              <div>
                <div style={{ padding: "10px", width: "fit-content", borderRadius: "12px", backgroundColor: "var(--accent-light)", color: "var(--accent)", marginBottom: "14px" }}>
                  <Zap size={22} />
                </div>
                <h3 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 8px" }}>
                  {flow.title}
                </h3>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-muted)", margin: 0, lineHeight: "1.5" }}>
                  Get instant AI coaching and smart habit advice.
                </p>
              </div>

              <button
                disabled={genLoading === flow.id}
                className="btn-primary cursor-pointer"
                style={{ width: "100%", padding: "10px", fontSize: "13px" }}
              >
                {genLoading === flow.id ? (
                  <><Loader size={16} className="spin" /> Getting Advice...</>
                ) : (
                  <><Sparkles size={16} /> Get Advice</>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Habit Diagnostics & Dopamine Recovery Oracle */}
      {activeTab === "oracle" && (
        <div className="card fade-in stagger-2" style={{ padding: "28px", border: "1px solid var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <div style={{ padding: "10px", borderRadius: "12px", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)" }}>
              <img src="/logo-inside.png" alt="Trac AI" style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover" }} />
            </div>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                Habit Help & Recovery
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                Select any missed habit to get practical AI advice on getting back on track.
              </p>
            </div>
          </div>

          {habits.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-secondary)", borderRadius: "12px" }}>
              No active habits tracked. Add habits first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                  Select Habit:
                </label>
                <select
                  value={selectedHabit}
                  onChange={e => setSelectedHabit(e.target.value)}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", fontSize: "15px", fontWeight: "600" }}
                  className="cursor-pointer"
                >
                  {habits.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleOracleConsult}
                disabled={oracleLoading || !selectedHabit}
                className="btn-primary cursor-pointer"
                style={{ width: "100%", padding: "14px", fontSize: "15px" }}
              >
                {oracleLoading ? (
                  <><Loader size={18} className="spin" /> Getting Tips...</>
                ) : (
                  <><Sparkles size={18} /> Get AI Tip</>
                )}
              </button>

              {oracleTip && (
                <div className="fade-in animate-glow" style={{ padding: "20px", backgroundColor: "var(--accent-light)", borderRadius: "16px", borderLeft: "4px solid var(--accent)", fontSize: "15px", fontWeight: "500", color: "var(--text-primary)", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "600", color: "var(--accent)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src="/logo-inside.png" alt="Trac AI" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                    <span>AI Tip:</span>
                  </div>
                  <FormattedAiText text={oracleTip} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
