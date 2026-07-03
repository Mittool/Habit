"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { Play, Pause, RotateCcw, Settings, X, Check, Timer } from "lucide-react";
import {
  Phase,
  getTimer,
  initTimerOnce,
  setTimerPhase,
  setTimerSeconds,
  setTimerRunning,
  setTimerSessionCount,
  decrementTimerSecond,
  clearTimerInterval,
  startTimerInterval,
} from "@/lib/pomodoro-timer";

export default function PomodoroPage() {
  const { pomodoroSettings, setPomodoroSettings, addFocusSession, todos, incrementPomodoro } =
    useAppStore();

  // Initialise the singleton the first time this component ever mounts.
  initTimerOnce(pomodoroSettings.focusMinutes * 60);
  const g = getTimer();

  const [phase, setPhase] = useState<Phase>(g.phase);
  const [secondsLeft, setSecondsLeft] = useState(g.secondsLeft);
  const [running, setRunning] = useState(g.running);
  const [sessionCount, setSessionCount] = useState(g.sessionCount);
  const [selectedTodo, setSelectedTodo] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>(pomodoroSettings);

  const totalSeconds =
    phase === "focus"
      ? pomodoroSettings.focusMinutes * 60
      : phase === "break"
      ? pomodoroSettings.breakMinutes * 60
      : pomodoroSettings.longBreakMinutes * 60;

  const progress = 1 - secondsLeft / totalSeconds;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;

  const handleComplete = useCallback(() => {
    setTimerRunning(false);
    setRunning(false);
    if (phase === "focus") {
      const newCount = sessionCount + 1;
      setTimerSessionCount(newCount);
      setSessionCount(newCount);
      addFocusSession(pomodoroSettings.focusMinutes);
      if (selectedTodo) incrementPomodoro(selectedTodo);
      if (newCount % pomodoroSettings.sessionsBeforeLongBreak === 0) {
        setTimerPhase("longBreak");
        setTimerSeconds(pomodoroSettings.longBreakMinutes * 60);
        setPhase("longBreak");
        setSecondsLeft(pomodoroSettings.longBreakMinutes * 60);
      } else {
        setTimerPhase("break");
        setTimerSeconds(pomodoroSettings.breakMinutes * 60);
        setPhase("break");
        setSecondsLeft(pomodoroSettings.breakMinutes * 60);
      }
    } else {
      setTimerPhase("focus");
      setTimerSeconds(pomodoroSettings.focusMinutes * 60);
      setPhase("focus");
      setSecondsLeft(pomodoroSettings.focusMinutes * 60);
    }
  }, [phase, sessionCount, pomodoroSettings, selectedTodo, addFocusSession, incrementPomodoro]);

  // Global background interval ticking
  useEffect(() => {
    if (running) {
      setTimerRunning(true);
      startTimerInterval(() => {
        const remaining = decrementTimerSecond();
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          handleComplete();
        }
      });
    } else {
      setTimerRunning(false);
      clearTimerInterval();
    }
    // DO NOT clear the singleton's interval on unmount — the timer must
    // keep ticking while the user navigates to other tabs.
  }, [running, handleComplete]);

  // Sync state back from the singleton while another mount is running it
  useEffect(() => {
    const check = setInterval(() => {
      const t = getTimer();
      if (t.running) setSecondsLeft(t.secondsLeft);
    }, 1000);
    return () => clearInterval(check);
  }, []);

  function reset() {
    setTimerRunning(false);
    clearTimerInterval();
    setRunning(false);
    setTimerSeconds(totalSeconds);
    setSecondsLeft(totalSeconds);
  }

  function switchPhase(p: Phase) {
    setTimerRunning(false);
    clearTimerInterval();
    setRunning(false);
    setTimerPhase(p);
    setPhase(p);
    const secs =
      p === "focus"
        ? pomodoroSettings.focusMinutes * 60
        : p === "break"
        ? pomodoroSettings.breakMinutes * 60
        : pomodoroSettings.longBreakMinutes * 60;
    setTimerSeconds(secs);
    setSecondsLeft(secs);
  }

  function saveSettings() {
    const cleanSettings = {
      focusMinutes: Math.max(1, Math.min(120, parseInt(String(tempSettings.focusMinutes)) || 25)),
      breakMinutes: Math.max(1, Math.min(60, parseInt(String(tempSettings.breakMinutes)) || 5)),
      longBreakMinutes: Math.max(1, Math.min(60, parseInt(String(tempSettings.longBreakMinutes)) || 15)),
      sessionsBeforeLongBreak: Math.max(1, Math.min(12, parseInt(String(tempSettings.sessionsBeforeLongBreak)) || 4)),
    };
    setPomodoroSettings(cleanSettings);
    const targetSecs = phase === "focus"
      ? cleanSettings.focusMinutes * 60
      : phase === "break"
      ? cleanSettings.breakMinutes * 60
      : cleanSettings.longBreakMinutes * 60;
    setTimerSeconds(targetSecs);
    setSecondsLeft(targetSecs);
    setShowSettings(false);
  }

  const mins = Math.floor(Math.max(0, secondsLeft) / 60)
    .toString()
    .padStart(2, "0");
  const secs = (Math.max(0, secondsLeft) % 60).toString().padStart(2, "0");

  const phaseColor =
    phase === "focus" ? "var(--accent)" : phase === "break" ? "#3B82F6" : "#F59E0B";
  const phaseLabel = phase === "focus" ? "Deep Work Focus" : phase === "break" ? "Short Rest Break" : "Long Rest Break";

  const activeTodos = todos.filter((t) => !t.completed);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "24px 20px calc(24px + env(safe-area-inset-bottom))", boxSizing: "border-box", maxWidth: "none" }}>
      {/* Top Bar: Phase Selectors Center */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <div
          style={{
            display: "flex",
            gap: "6px",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "14px",
            padding: "5px",
            border: "1px solid var(--border)",
            maxWidth: "380px",
            width: "100%"
          }}
        >
          {(
            [
              { id: "focus", label: "Focus Block" },
              { id: "break", label: "Short Rest" },
              { id: "longBreak", label: "Long Rest" },
            ] as { id: Phase; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              onClick={() => switchPhase(p.id)}
              className="cursor-pointer"
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "10px",
                border: "none",
                fontSize: "13px",
                fontFamily: "inherit",
                backgroundColor: phase === p.id ? "var(--bg-card)" : "transparent",
                color: phase === p.id ? phaseColor : "var(--text-secondary)",
                fontWeight: phase === p.id ? "600" : "500",
                boxShadow: phase === p.id ? "0 2px 8px var(--shadow)" : "none",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prominent Full-Screen Center Timer Ring */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "24px 0" }}>
        <div style={{ position: "relative", width: "260px", height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="260" height="260" viewBox="0 0 260 260">
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke="var(--border)"
              strokeWidth="10"
            />
            <circle
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              stroke={phaseColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="pomodoro-ring"
              style={{ transition: "stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
            />
          </svg>

          {/* Time display */}
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "64px", fontWeight: "300", color: "var(--text-primary)", letterSpacing: "-3px", lineHeight: 1 }}>
              {mins}:{secs}
            </div>
            <span style={{ fontSize: "12px", fontWeight: "600", color: phaseColor, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "8px" }}>
              {phaseLabel}
            </span>
          </div>
        </div>

        {/* Session dots indicator */}
        <div style={{ display: "flex", gap: "8px", marginTop: "24px", alignItems: "center" }}>
          {Array.from({ length: pomodoroSettings.sessionsBeforeLongBreak }).map((_, i) => (
            <div
              key={i}
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: i < sessionCount % pomodoroSettings.sessionsBeforeLongBreak ? phaseColor : "var(--border)",
                transition: "background-color 0.3s"
              }}
            />
          ))}
          <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginLeft: "4px" }}>
            Block {sessionCount + 1} of {pomodoroSettings.sessionsBeforeLongBreak}
          </span>
        </div>
      </div>

      {/* Controls & Task Link Bottom Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "520px", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center", alignItems: "center" }}>
          <button
            onClick={reset}
            className="cursor-pointer"
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
            title="Reset Timer"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={() => setRunning(!running)}
            className="cursor-pointer"
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: phaseColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              boxShadow: `0 8px 28px ${phaseColor}55`,
              transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            title={running ? "Pause Focus" : "Start Focus"}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {running ? <Pause size={34} /> : <Play size={34} style={{ marginLeft: "4px" }} />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="cursor-pointer"
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
              transition: "all 0.15s",
            }}
            title="Timer Settings"
          >
            <Settings size={20} />
          </button>
        </div>

        {/* Link to active task */}
        {activeTodos.length > 0 && (
          <div style={{ padding: "14px 18px", backgroundColor: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontWeight: "600", fontSize: "13px", flexShrink: 0 }}>
              <Timer size={16} color="var(--accent)" />
              <span>Target Task:</span>
            </div>
            <select
              value={selectedTodo}
              onChange={(e) => setSelectedTodo(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-card)", fontWeight: "500", fontSize: "13px", color: "var(--text-primary)" }}
              className="cursor-pointer"
            >
              <option value="">None (Free Focus)</option>
              {activeTodos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Timer Settings Modal */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: "400px", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                Focus Timer Settings
              </h3>
              <button onClick={() => setShowSettings(false)} className="cursor-pointer" style={{ background: "none", border: "none", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { key: "focusMinutes", label: "Focus Duration (Minutes)" },
                { key: "breakMinutes", label: "Short Rest Break (Minutes)" },
                { key: "longBreakMinutes", label: "Long Rest Break (Minutes)" },
                { key: "sessionsBeforeLongBreak", label: "Focus Blocks Before Long Rest" },
              ].map((field) => (
                <div key={field.key}>
                  <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tempSettings[field.key as keyof typeof tempSettings] ?? ""}
                    onChange={(e) =>
                      setTempSettings((s: any) => ({
                        ...s,
                        [field.key]: e.target.value,
                      }))
                    }
                    style={{ width: "100%", fontWeight: "500" }}
                  />
                </div>
              ))}
              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button className="btn-secondary cursor-pointer" onClick={() => setShowSettings(false)} style={{ flex: 1, padding: "12px" }}>
                  Cancel
                </button>
                <button className="btn-primary cursor-pointer" onClick={saveSettings} style={{ flex: 2, padding: "12px" }}>
                  <Check size={18} /> Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
