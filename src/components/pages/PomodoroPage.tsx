"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Play, Pause, RotateCcw, Settings, X, Check, Timer } from "lucide-react";

type Phase = "focus" | "break" | "longBreak";

export default function PomodoroPage() {
  const { pomodoroSettings, setPomodoroSettings, addFocusSession, todos, incrementPomodoro } =
    useAppStore();

  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(pomodoroSettings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedTodo, setSelectedTodo] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState(pomodoroSettings);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds =
    phase === "focus"
      ? pomodoroSettings.focusMinutes * 60
      : phase === "break"
      ? pomodoroSettings.breakMinutes * 60
      : pomodoroSettings.longBreakMinutes * 60;

  const progress = 1 - secondsLeft / totalSeconds;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;

  const handleComplete = useCallback(() => {
    setRunning(false);
    if (phase === "focus") {
      const newCount = sessionCount + 1;
      setSessionCount(newCount);
      addFocusSession(pomodoroSettings.focusMinutes);
      if (selectedTodo) incrementPomodoro(selectedTodo);
      if (newCount % pomodoroSettings.sessionsBeforeLongBreak === 0) {
        setPhase("longBreak");
        setSecondsLeft(pomodoroSettings.longBreakMinutes * 60);
      } else {
        setPhase("break");
        setSecondsLeft(pomodoroSettings.breakMinutes * 60);
      }
    } else {
      setPhase("focus");
      setSecondsLeft(pomodoroSettings.focusMinutes * 60);
    }
  }, [phase, sessionCount, pomodoroSettings, selectedTodo, addFocusSession, incrementPomodoro]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            handleComplete();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, handleComplete]);

  function reset() {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  }

  function switchPhase(p: Phase) {
    setRunning(false);
    setPhase(p);
    const secs =
      p === "focus"
        ? pomodoroSettings.focusMinutes * 60
        : p === "break"
        ? pomodoroSettings.breakMinutes * 60
        : pomodoroSettings.longBreakMinutes * 60;
    setSecondsLeft(secs);
  }

  function saveSettings() {
    setPomodoroSettings(tempSettings);
    setSecondsLeft(
      phase === "focus"
        ? tempSettings.focusMinutes * 60
        : phase === "break"
        ? tempSettings.breakMinutes * 60
        : tempSettings.longBreakMinutes * 60
    );
    setShowSettings(false);
  }

  const mins = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");

  const phaseColor =
    phase === "focus" ? "var(--accent)" : phase === "break" ? "#6366f1" : "#f59e0b";
  const phaseLabel = phase === "focus" ? "Focus" : phase === "break" ? "Short Break" : "Long Break";

  const activeTodos = todos.filter((t) => !t.completed);

  return (
    <div style={{ padding: "24px", maxWidth: "480px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          Pomodoro Timer
        </h2>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: "6px",
          }}
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Phase selector */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          padding: "4px",
          marginBottom: "32px",
        }}
      >
        {(
          [
            { id: "focus", label: "Focus" },
            { id: "break", label: "Break" },
            { id: "longBreak", label: "Long Break" },
          ] as { id: Phase; label: string }[]
        ).map((p) => (
          <button
            key={p.id}
            onClick={() => switchPhase(p.id)}
            style={{
              flex: 1,
              padding: "8px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
              backgroundColor: phase === p.id ? "var(--bg-card)" : "transparent",
              color: phase === p.id ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: phase === p.id ? "600" : "400",
              boxShadow: phase === p.id ? "0 1px 3px var(--shadow)" : "none",
              transition: "all 0.2s",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Timer ring */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "32px",
        }}
      >
        <div style={{ position: "relative", width: "220px", height: "220px" }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            {/* Background ring */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {/* Progress ring */}
            <circle
              cx="110"
              cy="110"
              r={radius}
              fill="none"
              stroke={phaseColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="pomodoro-ring"
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          {/* Time display */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                fontWeight: "300",
                color: "var(--text-primary)",
                letterSpacing: "-2px",
                fontFamily: "Georgia, serif",
              }}
            >
              {mins}:{secs}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {phaseLabel}
            </div>
          </div>
        </div>

        {/* Session dots */}
        <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
          {Array.from({ length: pomodoroSettings.sessionsBeforeLongBreak }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  i < sessionCount % pomodoroSettings.sessionsBeforeLongBreak
                    ? "var(--accent)"
                    : "var(--border)",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
          Session {sessionCount + 1} of {pomodoroSettings.sessionsBeforeLongBreak}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginBottom: "24px" }}>
        <button
          onClick={reset}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={() => setRunning(!running)}
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            border: "none",
            backgroundColor: phaseColor,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            boxShadow: `0 4px 16px ${phaseColor}44`,
            transition: "transform 0.1s, box-shadow 0.2s",
          }}
        >
          {running ? <Pause size={28} /> : <Play size={28} />}
        </button>
      </div>

      {/* Link to task */}
      {activeTodos.length > 0 && (
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <Timer size={14} color="var(--accent)" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
              Focusing on
            </span>
          </div>
          <select
            value={selectedTodo}
            onChange={(e) => setSelectedTodo(e.target.value)}
            style={{ width: "100%", fontSize: "13px" }}
          >
            <option value="">None selected</option>
            {activeTodos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.text}
              </option>
            ))}
          </select>
          {selectedTodo && (
            <div
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Timer size={12} />
              {todos.find((t) => t.id === selectedTodo)?.pomodoroCount || 0} pomodoros done
            </div>
          )}
        </div>
      )}

      {/* Total focus today */}
      <div
        style={{
          marginTop: "16px",
          padding: "14px 16px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "13px",
          color: "var(--text-muted)",
        }}
      >
        <span>Total focus today</span>
        <span style={{ fontWeight: "600", color: "var(--accent)" }}>
          {sessionCount * pomodoroSettings.focusMinutes} min
        </span>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
        >
          <div className="card fade-in" style={{ width: "100%", maxWidth: "380px", padding: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Timer Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[
                { key: "focusMinutes", label: "Focus duration (min)" },
                { key: "breakMinutes", label: "Short break (min)" },
                { key: "longBreakMinutes", label: "Long break (min)" },
                { key: "sessionsBeforeLongBreak", label: "Sessions before long break" },
              ].map((field) => (
                <div key={field.key}>
                  <label
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={field.key === "sessionsBeforeLongBreak" ? 10 : 60}
                    value={tempSettings[field.key as keyof typeof tempSettings]}
                    onChange={(e) =>
                      setTempSettings((s) => ({
                        ...s,
                        [field.key]: parseInt(e.target.value) || 1,
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  className="btn-secondary"
                  onClick={() => setShowSettings(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={saveSettings}
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Check size={16} /> Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
