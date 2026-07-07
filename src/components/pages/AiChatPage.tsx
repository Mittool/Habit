"use client";
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { Send, Loader, ArrowUp, RotateCcw, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

/**
 * Special sentinel — starter cards with `action: "pick-habit"` don't send
 * a prompt directly. They open the habit-picker sheet instead so the
 * user tells us which habit they want help with first.
 */
type StarterAction = "pick-habit";

/**
 * Suggested prompts shown on the empty state.
 * Curated so each one covers a different real user need.
 */
const STARTER_PROMPTS: {
  emoji: string;
  title: string;
  prompt?: string;
  action?: StarterAction;
}[] = [
  { emoji: "🧭", title: "Help me with a habit", action: "pick-habit" },
  { emoji: "🎯", title: "Plan my day",
    prompt: "Look at my habits and tasks — what should I focus on today?" },
  { emoji: "🔥", title: "Beat procrastination",
    prompt: "I'm stuck on a task I've been avoiding. Give me a way to start in the next 5 minutes." },
  { emoji: "😴", title: "Sleep better tonight",
    prompt: "What can I do in the next hour to fall asleep faster and wake up sharper?" },
];

/**
 * Small follow-up chips shown under the most recent AI reply.
 * Rotated so the user always has a way forward.
 */
const FOLLOW_UPS = [
  "Tell me more",
  "Give me a plan",
  "Something else",
  "Why?",
];

/**
 * Render AI text with basic markdown-style **bold** and bullet support,
 * without ever showing raw asterisks or hash chars.
 */
function FormattedAiText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {text.split("\n").map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: 4 }} />;
        let cleanLine = line.replace(/^[⚡🔥🚀🧘🌅🔋🛡️💬🔮🧠💡]+\s*/g, "");
        if (/^#{1,6}\s+/.test(cleanLine)) {
          cleanLine = "**" + cleanLine.replace(/^#{1,6}\s+/, "").replace(/\*\*$/, "") + "**";
        }
        const isBullet = /^[•\-\*]\s/.test(cleanLine.trim());
        const body = isBullet ? cleanLine.trim().replace(/^[•\-\*]\s/, "") : cleanLine;
        const parts = body.split(/(\*\*.*?\*\*)/g);
        const content = parts.map((part, pI) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={pI} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
          }
          return <span key={pI}>{part}</span>;
        });
        if (isBullet) {
          return (
            <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.6 }}>
              <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2, fontWeight: 700 }}>•</span>
              <span>{content}</span>
            </div>
          );
        }
        return <div key={idx} style={{ lineHeight: 1.6 }}>{content}</div>;
      })}
    </div>
  );
}

/**
 * Animated "thinking" dots — three dots that pulse in sequence.
 * GPU-only (opacity), no layout thrash.
 */
function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 2px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 9999,
            backgroundColor: "var(--text-muted)",
            animation: `thinkingDot 1.2s ease-in-out ${i * 0.16}s infinite`,
            display: "inline-block",
          }}
        />
      ))}
      <style jsx>{`
        @keyframes thinkingDot {
          0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

export default function AiChatPage() {
  const { habits, todos, focusSessions, aiEnabled, user } = useAppStore();
  const displayName = (user?.name || "").trim().split(/\s+/)[0] || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [habitPickerOpen, setHabitPickerOpen] = useState(false);

  const scrollAnchor = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isEmpty = messages.length === 0;

  const statsSummary = {
    totalHabits: habits.length,
    activeTodos: todos.filter((t) => !t.completed).length,
    totalFocusMinutes: focusSessions.reduce((a, b) => a + b.minutes, 0),
  };

  // Autoscroll to newest message whenever the list grows or thinking flips.
  useEffect(() => {
    if (scrollAnchor.current) {
      scrollAnchor.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, chatLoading]);

  // Auto-grow the textarea up to 5 rows.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [inputVal]);

  async function handleSendMessage(customMsg?: string) {
    const query = (customMsg ?? inputVal).trim();
    if (!query || chatLoading) return;

    if (!customMsg) setInputVal("");
    const nextHistory = [...messages, { role: "user" as const, text: query }];
    setMessages(nextHistory);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          context: statsSummary,
          userName: displayName,
          history: nextHistory,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "I couldn't reach the AI right now.\n• Check your internet\n• Try again in a moment",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  function resetConversation() {
    setMessages([]);
    setInputVal("");
  }

  /**
   * Called when the user picks a habit from the picker sheet.
   * Composes a rich coaching prompt (name + goal + recent 14-day rate) so
   * the AI has real context to work with, then sends it.
   */
  function handlePickHabit(habitId: string) {
    const h = habits.find((x) => x.id === habitId);
    setHabitPickerOpen(false);
    if (!h) return;
    const rate14 = computeRecentCompletionRate(h.completions, 14);
    const streak = computeCurrentStreak(h.completions);
    const goalLine = h.goal ? ` My goal with it is: "${h.goal}".` : "";
    const statsLine =
      ` Over the last 14 days I've hit it ${rate14}% of the time and my current streak is ${streak} day${streak === 1 ? "" : "s"}.`;
    const prompt =
      `I need help with my habit "${h.name}".${goalLine}${statsLine} What's the one thing I should change this week to actually stick with it?`;
    handleSendMessage(prompt);
  }

  // ── Disabled state ──────────────────────────────────────────────
  if (!aiEnabled) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
        <div className="serif" style={{ fontSize: 42, lineHeight: 1, color: "var(--text-primary)", marginBottom: 12 }}>
          AI is off
        </div>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          Turn it on in Settings to chat with Trac.
        </p>
      </div>
    );
  }

  // ── Empty state (first visit / after reset) ────────────────────
  if (isEmpty) {
    return (
      <div
        style={{
          minHeight: "calc(100dvh - 140px)",
          display: "flex",
          flexDirection: "column",
          padding: "56px 22px 160px",
          maxWidth: 720,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <HabitPickerSheet
          open={habitPickerOpen}
          habits={habits}
          onPick={handlePickHabit}
          onClose={() => setHabitPickerOpen(false)}
        />
        {/* Hero greeting */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 24 }}>
          <div
            className="fade-in"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Trac AI · your coach
          </div>
          <h1
            className="serif fade-in stagger-1"
            style={{
              fontSize: "clamp(38px, 9vw, 56px)",
              lineHeight: 1.03,
              margin: "0 0 40px",
              color: "var(--text-primary)",
            }}
          >
            {displayName ? (
              <>
                Hey <em style={{ fontStyle: "italic", color: "var(--accent)" }}>{displayName}</em>,
                <br />
                what&rsquo;s on your mind?
              </>
            ) : (
              <>
                Hey, what&rsquo;s
                <br />
                on your mind?
              </>
            )}
          </h1>

          {/* Starter prompt cards */}
          <div
            className="fade-in stagger-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 10,
            }}
          >
            {STARTER_PROMPTS.map((s) => (
              <button
                key={s.title}
                onClick={() => {
                  if (s.action === "pick-habit") {
                    setHabitPickerOpen(true);
                  } else if (s.prompt) {
                    handleSendMessage(s.prompt);
                  }
                }}
                className="cursor-pointer"
                style={{
                  padding: "16px 16px",
                  borderRadius: 18,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  fontFamily: "inherit",
                  transition: "border-color 0.18s var(--ease)",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{s.emoji}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.35 }}>
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Composer pill — fixed to viewport, always above the nav */}
        <div
          className="fade-in stagger-3"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: "calc(env(safe-area-inset-bottom) + var(--nav-clearance))",
            zIndex: 40,
            padding: "12px 22px 0",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: 720,
              margin: "0 auto",
              pointerEvents: "auto",
            }}
          >
            <Composer
              value={inputVal}
              setValue={setInputVal}
              onSend={() => handleSendMessage()}
              disabled={chatLoading}
              textareaRef={textareaRef}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Conversation state ─────────────────────────────────────────
  const lastAi = [...messages].reverse().find((m) => m.role === "ai");
  const showFollowUps = !chatLoading && lastAi && messages.length >= 2;

  return (
    <div
      style={{
        padding: "20px 22px 10px",
        maxWidth: 720,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <HabitPickerSheet
        open={habitPickerOpen}
        habits={habits}
        onPick={handlePickHabit}
        onClose={() => setHabitPickerOpen(false)}
      />
      {/* Slim conversation header */}
      <div
        className="fade-in"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          padding: "6px 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/logo-inside.png"
            alt=""
            style={{
              width: 32,
              height: 32,
              borderRadius: 9999,
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>Trac</div>
            <div style={{ fontSize: 11, color: "var(--success)", fontWeight: 600, marginTop: 2 }}>Online</div>
          </div>
        </div>
        <button
          onClick={resetConversation}
          className="btn-ghost cursor-pointer"
          title="New conversation"
          aria-label="New conversation"
          style={{ padding: 8, borderRadius: 9999 }}
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Message stream — bottom padding leaves room for the fixed composer */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 180 }}>
        {messages.map((m, i) => (
          <MessageRow key={i} message={m} />
        ))}
        {chatLoading && (
          <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px" }}>
            <img
              src="/logo-inside.png"
              alt=""
              style={{ width: 26, height: 26, borderRadius: 9999, objectFit: "cover", flexShrink: 0 }}
            />
            <ThinkingDots />
          </div>
        )}
        <div ref={scrollAnchor} />
      </div>

      {/* Fixed composer with contextual follow-ups — always above the nav */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: "calc(env(safe-area-inset-bottom) + var(--nav-clearance))",
          zIndex: 40,
          padding: "8px 22px 0",
          pointerEvents: "none",
        }}
      >
       <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          pointerEvents: "auto",
          background:
            "linear-gradient(to bottom, transparent 0%, var(--bg-primary) 24px, var(--bg-primary) 100%)",
        }}
       >
        {showFollowUps && (
          <div
            className="fade-in"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 10,
              marginLeft: -4,
              paddingLeft: 4,
              paddingRight: 4,
            }}
          >
            {habits.length > 0 && (
              <button
                onClick={() => setHabitPickerOpen(true)}
                disabled={chatLoading}
                className="cursor-pointer"
                style={{
                  padding: "6px 12px",
                  borderRadius: 9999,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontWeight: 600,
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span aria-hidden>🧭</span>
                Pick a habit
              </button>
            )}
            {FOLLOW_UPS.map((f) => (
              <button
                key={f}
                onClick={() => handleSendMessage(f)}
                disabled={chatLoading}
                className="cursor-pointer"
                style={{
                  padding: "6px 12px",
                  borderRadius: 9999,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  fontWeight: 600,
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  fontFamily: "inherit",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}
        <Composer
          value={inputVal}
          setValue={setInputVal}
          onSend={() => handleSendMessage()}
          disabled={chatLoading}
          textareaRef={textareaRef}
        />
       </div>
      </div>
    </div>
  );
}

// ── MessageRow ───────────────────────────────────────────────────
// Design choice: AI messages are UNBUBBLED. Left-aligned raw text with a
// small monogram avatar above. This makes the app feel like it's TALKING
// to you, not showing you a chat log. It's what Claude / Perplexity do.
// User messages stay as an amber pill on the right so they stand out.
function MessageRow({ message }: { message: ChatMessage }) {
  const isAi = message.role === "ai";
  if (isAi) {
    return (
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="/logo-inside.png"
            alt=""
            style={{ width: 22, height: 22, borderRadius: 9999, objectFit: "cover", flexShrink: 0 }}
          />
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Trac
          </span>
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-primary)" }}>
          <FormattedAiText text={message.text} />
        </div>
      </div>
    );
  }
  return (
    <div className="fade-in" style={{ display: "flex", justifyContent: "flex-end" }}>
      <div
        style={{
          maxWidth: "84%",
          padding: "12px 16px",
          borderRadius: "22px 22px 6px 22px",
          backgroundColor: "var(--accent)",
          color: "#ffffff",
          fontSize: 14.5,
          lineHeight: 1.5,
          fontWeight: 500,
          boxShadow: "var(--shadow-accent)",
        }}
      >
        {message.text}
      </div>
    </div>
  );
}

// ── Composer ─────────────────────────────────────────────────────
// Auto-growing textarea inside a soft card. Send button lives INSIDE
// on the right; turns amber when there's content. Enter sends,
// Shift+Enter inserts a newline.
function Composer({
  value,
  setValue,
  onSend,
  disabled,
  textareaRef,
}: {
  value: string;
  setValue: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const hasContent = value.trim().length > 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 8,
        backgroundColor: "var(--bg-card)",
        borderRadius: 24,
        padding: "8px 8px 8px 18px",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-md)",
        transition: "border-color 0.2s var(--ease)",
      }}
      onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Ask Trac anything…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          padding: "10px 0",
          fontSize: 15,
          lineHeight: 1.4,
          resize: "none",
          outline: "none",
          fontFamily: "inherit",
          color: "var(--text-primary)",
          boxShadow: "none",
          borderRadius: 0,
          maxHeight: 160,
          overflowY: "auto",
        }}
      />
      <button
        onClick={onSend}
        disabled={!hasContent || disabled}
        className="cursor-pointer"
        style={{
          width: 40,
          height: 40,
          borderRadius: 9999,
          border: "none",
          backgroundColor: hasContent ? "var(--accent)" : "var(--bg-secondary)",
          color: hasContent ? "#fff" : "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.18s var(--ease), color 0.18s var(--ease), transform 0.15s var(--ease)",
          flexShrink: 0,
        }}
        aria-label="Send message"
      >
        {disabled ? <Loader size={16} className="spin" /> : hasContent ? <ArrowUp size={18} strokeWidth={2.5} /> : <Send size={16} />}
      </button>
    </div>
  );
}

// ── Habit-picker sheet ───────────────────────────────────────────
// Bottom sheet listing every habit the user has. Tapping one fires
// onPick(habitId) so the parent can compose a rich coaching prompt
// and send it to the AI. If the user has no habits, we show a
// friendly nudge instead of an empty list.
import type { Habit } from "@/lib/store";

function HabitPickerSheet({
  open,
  habits,
  onPick,
  onClose,
}: {
  open: boolean;
  habits: Habit[];
  onPick: (habitId: string) => void;
  onClose: () => void;
}) {
  // Lock body scroll while the sheet is open (mobile UX).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a habit to get help with"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="cursor-pointer"
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.44)",
          border: "none",
          padding: 0,
          animation: "sheetFade 0.18s var(--ease) both",
        }}
      />
      {/* Sheet */}
      <div
        style={{
          position: "relative",
          backgroundColor: "var(--bg-card)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: "10px 20px calc(24px + env(safe-area-inset-bottom))",
          maxHeight: "82dvh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.18)",
          animation: "sheetSlideUp 0.28s var(--spring) both",
        }}
      >
        {/* Grab handle */}
        <div
          aria-hidden
          style={{
            width: 44,
            height: 5,
            borderRadius: 9999,
            backgroundColor: "var(--border-strong)",
            margin: "6px auto 14px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Ask Trac
            </div>
            <div
              className="serif"
              style={{
                fontSize: 26,
                lineHeight: 1.1,
                color: "var(--text-primary)",
              }}
            >
              Which habit do you need help with?
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost cursor-pointer"
            aria-label="Close"
            style={{
              padding: 8,
              borderRadius: 9999,
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Habit list OR empty state */}
        {habits.length === 0 ? (
          <div
            style={{
              padding: "36px 8px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
            <div
              style={{
                fontSize: 15,
                color: "var(--text-primary)",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              No habits yet
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              Add a habit first, then come back and I&rsquo;ll help you stick with it.
            </div>
          </div>
        ) : (
          <div
            style={{
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingBottom: 4,
              marginRight: -4,
              paddingRight: 4,
            }}
          >
            {habits.map((h) => {
              const rate = computeRecentCompletionRate(h.completions, 14);
              const streak = computeCurrentStreak(h.completions);
              return (
                <button
                  key={h.id}
                  onClick={() => onPick(h.id)}
                  className="cursor-pointer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-primary)",
                    textAlign: "left",
                    fontFamily: "inherit",
                    width: "100%",
                    transition: "border-color 0.15s var(--ease), transform 0.1s var(--ease)",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 9999,
                      backgroundColor: h.color || "var(--accent)",
                      flexShrink: 0,
                      boxShadow: `0 0 0 3px ${(h.color || "var(--accent)")}22`,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-muted)",
                        marginTop: 3,
                        fontWeight: 500,
                      }}
                    >
                      {streak > 0
                        ? `${streak}-day streak · ${rate}% last 14d`
                        : `${rate}% last 14d`}
                    </div>
                  </div>
                  <ArrowUp
                    size={16}
                    style={{
                      color: "var(--text-muted)",
                      transform: "rotate(90deg)",
                      flexShrink: 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes sheetFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ── Stat helpers (kept local — same math as HabitsPage cards) ───
function computeCurrentStreak(completions: Record<string, boolean>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completions[key]) {
      streak++;
    } else if (i === 0) {
      // today not done yet — allow yesterday to start the streak
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function computeRecentCompletionRate(
  completions: Record<string, boolean>,
  days: number,
): number {
  if (days <= 0) return 0;
  let hits = 0;
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (completions[key]) hits++;
  }
  return Math.round((hits / days) * 100);
}
