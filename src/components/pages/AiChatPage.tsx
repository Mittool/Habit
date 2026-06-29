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
                return <strong key={pI} style={{ color: "inherit", fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
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
    { role: "ai", text: "**AI Companion Ready.** I am Trac AI, your central productivity assistant. Ask me anything about your habits or schedule, or pick a quick tip below." }
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
      <div style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div className="card fade-in" style={{ padding: "48px 24px" }}>
          <img src="/logo.png" alt="Trac AI" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", margin: "0 auto 16px", opacity: 0.5 }} />
          <h2 style={{ fontSize: "22px", fontWeight: "800", color: "var(--text-primary)" }}>AI Assistant Disabled</h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "8px 0 24px" }}>Enable AI features in Settings to unlock your productivity companion.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 24px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div className="fade-in" style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ padding: "8px", borderRadius: "16px", backgroundColor: "var(--accent-light)", border: "1px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo.png" alt="AI Chat" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.03em" }}>
                AI Chat
              </h1>
              <span style={{ padding: "3px 8px", borderRadius: "9999px", backgroundColor: "var(--accent-light)", color: "var(--accent)", fontSize: "10px", fontWeight: "800", textTransform: "uppercase" }}>
                Active
              </span>
            </div>
            <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Your central productivity companion
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="fade-in stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "20px" }}>
        {[
          { id: "chat", label: "Assistant Chat", icon: <Terminal size={16} /> },
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
                padding: "12px 8px",
                borderRadius: "12px",
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                backgroundColor: isActive ? "var(--accent-light)" : "var(--bg-card)",
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: isActive ? "800" : "600",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Chat Stream */}
      {activeTab === "chat" && (
        <div className="card fade-in stagger-2" style={{ display: "flex", flexDirection: "column", height: "520px", overflow: "hidden" }}>
          <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", backgroundColor: "var(--bg-secondary)" }}>
            {messages.map((m, i) => {
              const isAi = m.role === "ai";
              return (
                <div
                  key={i}
                  className="fade-in"
                  style={{
                    alignSelf: isAi ? "flex-start" : "flex-end",
                    maxWidth: "82%",
                    padding: "14px 18px",
                    borderRadius: isAi ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                    backgroundColor: isAi ? "var(--bg-card)" : "var(--text-primary)",
                    color: isAi ? "var(--text-primary)" : "var(--bg-card)",
                    border: isAi ? "1px solid var(--border)" : "none",
                    boxShadow: "0 2px 8px var(--shadow)",
                    fontSize: "14px",
                  }}
                >
                  {isAi && (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "800", color: "var(--accent)", textTransform: "uppercase", marginBottom: "6px" }}>
                      <img src="/logo.png" alt="" style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} />
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

          <div style={{ padding: "10px 16px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", overflowX: "auto" }}>
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

          <div style={{ padding: "14px 16px", backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)", display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="Ask AI anything..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              style={{ flex: 1 }}
              autoFocus
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim() || chatLoading}
              className="btn-primary cursor-pointer"
              style={{ padding: "12px 18px" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Quick Tips */}
      {activeTab === "generator" && (
        <div className="fade-in stagger-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "14px" }}>
          {INSTANT_FLOWS.map((flow) => (
            <div
              key={flow.id}
              className="card card-interactive cursor-pointer fade-in"
              style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "14px" }}
              onClick={() => triggerInstantFlow(flow)}
            >
              <div>
                <div style={{ padding: "8px", width: "fit-content", borderRadius: "10px", backgroundColor: "var(--accent-light)", color: "var(--accent)", marginBottom: "12px" }}>
                  <Zap size={20} />
                </div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-primary)", margin: "0 0 6px" }}>
                  {flow.title}
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
                  Get instant AI coaching and smart habit advice.
                </p>
              </div>

              <button disabled={genLoading === flow.id} className="btn-primary cursor-pointer" style={{ width: "100%", padding: "10px", fontSize: "13px" }}>
                {genLoading === flow.id ? <><Loader size={16} className="spin" /> Getting Advice...</> : <><Sparkles size={16} /> Get Advice</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: Habit Help */}
      {activeTab === "oracle" && (
        <div className="card fade-in stagger-2" style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
            <img src="/logo.png" alt="AI Chat" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover" }} />
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
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
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                  Select Habit:
                </label>
                <select
                  value={selectedHabit}
                  onChange={e => setSelectedHabit(e.target.value)}
                  style={{ width: "100%" }}
                  className="cursor-pointer"
                >
                  {habits.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>

              <button onClick={handleOracleConsult} disabled={oracleLoading || !selectedHabit} className="btn-primary cursor-pointer" style={{ width: "100%", padding: "12px", fontSize: "14px" }}>
                {oracleLoading ? <><Loader size={16} className="spin" /> Getting Tips...</> : <><Sparkles size={16} /> Get AI Tip</>}
              </button>

              {oracleTip && (
                <div className="fade-in" style={{ padding: "18px", backgroundColor: "var(--accent-light)", borderRadius: "12px", borderLeft: "4px solid var(--accent)", fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", lineHeight: "1.6" }}>
                  <div style={{ fontWeight: "800", color: "var(--accent)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <img src="/logo.png" alt="" style={{ width: "16px", height: "16px", borderRadius: "50%", objectFit: "cover" }} />
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
