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
        const cleanLine = line.replace(/^[⚡🔥🚀🧘🌅🔋🛡️💬🔮🧠💡]+\s*/g, "");
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
  const { habits, todos, focusSessions, aiEnabled } = useAppStore();
  const [activeTab, setActiveTab] = useState<"chat" | "generator" | "oracle">("chat");

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "**Executive Coach Online.** I am Trac AI, your evidence-based productivity and behavioral change coach (Atomic Habits, GTD, Deep Work). Tell me your target goals or active schedule bottlenecks." }
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
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "**Offline Override:** Maintain focus on your top priority task today. Small daily efforts accumulate." }]);
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
      const res = await fetch("/api/ai/habit-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missedHabit: selectedHabit }),
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%", height: "calc(100vh - 68px)", boxSizing: "border-box" }}>
      {/* Sleek Minimalist App Bar Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "var(--bg-card)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/logo-inside.png" alt="Trac AI" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "18px", fontWeight: "600", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                AI Chat
              </h1>
              <span style={{ padding: "2px 8px", borderRadius: "9999px", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "10px", fontWeight: "600", textTransform: "none" }}>
                Active
              </span>
            </div>
            <p style={{ fontSize: "12px", fontWeight: "500", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Primary Productivity Companion
            </p>
          </div>
        </div>

        {/* Minimal Segment Tabs */}
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
          {[
            { id: "chat", label: "Chat", icon: <Terminal size={14} /> },
            { id: "generator", label: "Tips", icon: <Zap size={14} /> },
            { id: "oracle", label: "Habits", icon: <Brain size={14} /> },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="cursor-pointer"
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: isActive ? "var(--bg-card)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: isActive ? "800" : "600",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isActive ? "0 1px 3px var(--shadow)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: Immersive Full Screen Chat Stream */}
      {activeTab === "chat" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--bg-secondary)", position: "relative" }}>
          {/* Conversation Stream expanding to fill space */}
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              return (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    alignSelf: isAi ? "flex-start" : "flex-end",
                    maxWidth: "85%",
                    padding: "14px 18px",
                    borderRadius: isAi ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
                    backgroundColor: isAi ? "var(--bg-card)" : "var(--text-primary)",
                    color: isAi ? "var(--text-primary)" : "var(--bg-card)",
                    border: isAi ? "1px solid var(--border)" : "none",
                    boxShadow: "0 2px 8px var(--shadow)",
                    fontSize: "14px",
                  }}
                >
                  {isAi && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "600", color: "var(--accent)", textTransform: "none", marginBottom: "6px" }}>
                      <img src="/logo-inside.png" alt="" style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} />
                      <span>Trac AI</span>
                    </div>
                  )}
                  {isAi ? <FormattedAiText text={m.text} /> : <div>{m.text}</div>}
                </div>
              );
            })}
            {chatLoading && (
              <div className="fade-in" style={{ alignSelf: "flex-start", padding: "12px 18px", borderRadius: "16px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", color: "var(--accent)", fontSize: "13px", fontWeight: "600" }}>
                <Loader size={16} className="spin" />
                <span>Trac AI is thinking...</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips Bar right above input */}
          <div style={{ padding: "10px 16px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", overflowX: "auto", flexShrink: 0 }}>
            {["Max Focus Tips", "Reduce Burnout", "Morning Plan", "Time Strategy"].map((chip, idx) => (
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

          {/* Message Input pinned to bottom */}
          <div style={{ padding: "14px 16px calc(14px + env(safe-area-inset-bottom))", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Ask AI anything..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || chatLoading}
              className="btn-primary cursor-pointer"
              style={{ padding: "12px 20px" }}
            >
              <Send size={16} />
            </button>
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
